# Capacity Planning — Tasks feature

Documento de referencia para operacoes de escala/capacity nas tabelas
relacionadas a feature Tasks. Gatilhos, thresholds e procedimentos.

## Indice

- [Tabelas monitoradas](#tabelas-monitoradas)
- [work_item_status_history — particionamento](#work_item_status_history--particionamento)
- [task_outbox_events — vacuum e cleanup](#task_outbox_events--vacuum-e-cleanup)
- [work_item_activities — arquivamento](#work_item_activities--arquivamento)

## Tabelas monitoradas

| Tabela                      | Gatilho de acao    | Acao                                              |
| --------------------------- | ------------------ | ------------------------------------------------- |
| `work_item_status_history`  | > 10.000.000 rows  | Particionar por mes (ver abaixo)                  |
| `task_outbox_events`        | > 500.000 rows     | Verificar cron de cleanup + tuning vacuum         |
| `work_item_activities`      | > 50.000.000 rows  | Arquivar rows > 18 meses para tabela cold         |
| `work_item_comments`        | > 10.000.000 rows  | Avaliar particionar por ano                       |

Query padrao de monitoramento (rodar semanalmente):

```sql
SELECT
    schemaname || '.' || relname                     AS table_full_name,
    n_live_tup                                        AS live_rows,
    pg_size_pretty(pg_total_relation_size(relid))     AS total_size
FROM   pg_stat_user_tables
WHERE  relname IN (
    'work_item_status_history',
    'task_outbox_events',
    'work_item_activities',
    'work_item_comments',
    'work_items'
)
ORDER  BY n_live_tup DESC;
```

## `work_item_status_history` — particionamento

### Gatilho

Acionar o procedimento quando a tabela passar de **10 milhoes de rows**.
Abaixo disso, o indice composto `(work_item_id, entered_at DESC)` mantem
queries hot-path em p95 < 10ms.

Para time-in-status agregado por workspace (dashboards), o planejador usa
index-only scan; particionar antes desse volume gera mais overhead de
planning do que beneficio.

### Estrategia

- RANGE PARTITION em `entered_at`.
- Particoes mensais, cobrindo `-24 meses` ate `+12 meses`.
- Particao `DEFAULT` catch-all.
- Job semanal cria particao para `M+2` (colchao de 2 meses).

### Downtime esperado

**~30 segundos** — janela do `ALTER TABLE ... RENAME` final. Durante esta
janela a aplicacao deve ter a feature flag `TASKS_STATUS_HISTORY_READONLY`
ligada para bloquear writes e serializar reads.

O resto da migracao (criar particoes, copiar dados, criar indices, criar
FKs) roda online sem bloquear a tabela original.

### Runbook passo-a-passo

#### Staging (obrigatorio antes de prod)

1. **Snapshot do volume de prod**: `pg_dump -Fc -t work_item_status_history`
   do banco de producao para o banco de staging.
2. **Medir baseline**:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM work_item_status_history
   WHERE work_item_id = '<uuid>'
   ORDER BY entered_at DESC LIMIT 10;
   ```
3. **Rodar a migracao** em staging:
   ```bash
   psql "$DATABASE_URL_STAGING" -v ON_ERROR_STOP=1 \
       -f prisma/migrations-data/partition-status-history.sql
   ```
4. **Validar contagem**:
   ```sql
   SELECT COUNT(*) FROM work_item_status_history;      -- nova particionada
   SELECT COUNT(*) FROM work_item_status_history_old;  -- original
   ```
   Devem ser iguais.
5. **Re-medir**: mesma query do passo 2. p95 deve estar igual ou melhor.
6. **Teste de writes**: rodar smoke test escrevendo algumas rows via API e
   verificando que caem na particao correta.
7. **Documentar resultados** no ADR.

#### Producao

1. **Anunciar janela** de manutencao (~5min conservador) ao time.
2. **Backup fresco** (pg_dump full).
3. **Ligar feature flag** `TASKS_STATUS_HISTORY_READONLY = true` (deploy config).
4. **Pausar workers BullMQ**:
   ```bash
   # Sinal SIGTERM para os pods de worker — eles terminam o job atual e saem.
   kubectl scale deploy/mundial-erp-worker --replicas=0
   ```
5. **Rodar a migracao**:
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
       -f prisma/migrations-data/partition-status-history.sql
   ```
6. **Validar contagem** (mesma query do staging).
7. **Retomar workers**:
   ```bash
   kubectl scale deploy/mundial-erp-worker --replicas=3
   ```
8. **Desligar feature flag** `TASKS_STATUS_HISTORY_READONLY = false`.
9. **Monitorar** p95 da API de time-in-status por 2h.
10. **Apos 7 dias sem incidentes**: `DROP TABLE work_item_status_history_old`.

### Rollback

Ver secao `ROLLBACK` no arquivo
[`prisma/migrations-data/partition-status-history.sql`](../prisma/migrations-data/partition-status-history.sql).

Resumo:

- Enquanto `work_item_status_history_old` existir (janela de 7 dias):
  `RENAME` reverso em < 30s, zero perda.
- Apos drop do `_old`: restore via pg_dump (perde eventos recentes).

## `task_outbox_events` — vacuum e cleanup

### Cleanup automatico

Service `TaskOutboxCleanupService` (ver `src/modules/task-outbox/`) roda:

- Toda **madrugada de domingo as 03:00** (cron `0 3 * * 0`).
- Apaga `status=COMPLETED AND processed_at < NOW() - INTERVAL '30 days'`.
- Apaga `status=DEAD AND created_at < NOW() - INTERVAL '90 days'`.
- Alerta (log.error) se uma execucao apagar > 100.000 rows.

### Vacuum tuning

Se a tabela crescer > 500k rows ativos, considerar:

```sql
ALTER TABLE task_outbox_events SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10
);
```

Isso faz autovacuum agir com 5% de dead tuples (padrao 20%) e reduz custo
por iteracao — importante para tabelas com INSERT + UPDATE frequentes.

## `work_item_activities` — arquivamento

### Gatilho

> 50 milhoes de rows (estimativa: 500 writes/dia/task ativa * 100k tasks ativas * 365 dias).

### Estrategia proposta (nao implementada — TSK futuro)

1. Criar tabela cold `work_item_activities_archive` com schema identico.
2. Job mensal move rows com `created_at < NOW() - INTERVAL '18 months'`.
3. API de feed lista apenas a tabela hot por default; query opt-in
   `?include_archive=true` faz UNION ALL.
4. Indice GIN em `payload` (JSONB) NAO e migrado para a cold — queries no
   arquivo sao apenas por `work_item_id + created_at`.

### Alternativa

Se a distribuicao for muito enviesada (poucas tasks com muitas activities),
considerar particionar por hash de `work_item_id` em 8-16 particoes em vez
de arquivar por tempo.

## Referencias

- ADR-003 — Outbox pattern
- PLANO-TASKS.md §R14 / §R15
- [PostgreSQL declarative partitioning docs](https://www.postgresql.org/docs/current/ddl-partitioning.html)
