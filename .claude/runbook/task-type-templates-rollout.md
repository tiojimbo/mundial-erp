# Runbook — Rollout de Task Type Templates + Custom Fields

Cobre TTT-051 (canary 48h) e TTT-052 (rollout escalonado 10/50/100). Use linear, não pule etapas.

**Stakeholders:** Samuel (operador), squad-tasks (oncall), squad-infra (Coolify/Prometheus).
**Pré-requisito de leitura:** `.claude/plan/PLANO-TASK-TYPES-TEMPLATES.md` §"Sprint 5".

---

## 0. Pré-rollout (uma vez, ~30min)

Esta seção habilita observabilidade real. Sem ela, canary é cego — não execute nada além daqui se algum item falhar.

### 0.1 Gerar e configurar METRICS_TOKEN

Gere um token aleatório de 32+ chars e salve em local seguro (1Password/cofre):

```bash
openssl rand -hex 32
```

No Coolify (ou wherever a env var de prod for setada):

- Adicionar `METRICS_TOKEN=<token-gerado>` em `mundial-erp-api`
- Redeploy da API
- **Validação:** quando deploy estabilizar, `curl https://<api-prod>/metrics` deve retornar **401**, e `curl -H "Authorization: Bearer <token>" https://<api-prod>/metrics` deve retornar **200** com texto Prometheus contendo `custom_fields_written_total` e `task_type_templates_instantiated_total`.

### 0.2 Configurar scraper Prometheus

Adicionar job ao `prometheus.yml` (ou equivalente):

```yaml
scrape_configs:
  - job_name: 'mundial-erp-api'
    scrape_interval: 30s
    metrics_path: /metrics
    scheme: https
    static_configs:
      - targets: ['<api-prod-host>:443']
    authorization:
      type: Bearer
      credentials: <METRICS_TOKEN>
```

- **Validação:** no Prometheus, `up{job="mundial-erp-api"}` deve ser `1` em 1 min. Em PromQL: `count(custom_fields_written_total)` retorna pelo menos `0` (label set existente).

### 0.3 Importar dashboard no Grafana

Arquivo: `mundial-erp-api/observability/grafana/tasks-feature.dashboard.json`.

- Importar via Grafana UI (Dashboards → Import → Upload JSON)
- Selecionar datasource Prometheus correto
- Salvar
- **Validação:** abrir dashboard "Tasks feature — RED + outbox + perf"; painéis 5/6/7/8 devem aparecer (mesmo com séries em zero — sem dados ainda).

### 0.4 Confirmar flags estão em **OFF** em prod

```
FEATURE_CUSTOM_FIELDS_WRITE_ENABLED=false
FEATURE_TASK_TYPE_TEMPLATES_ENABLED=false
```

- **Validação:** em prod, `GET /api/v1/custom-field-definitions` retorna 200 (leitura) — `POST` retorna 404. `GET /api/v1/task-type-templates` retorna 404.

### 0.5 Aplicar migrations em prod

```bash
npx prisma migrate deploy
```

Migrations relevantes (todas aditivas, rollback testado em local):

- `20260425_000011_custom_fields`
- `20260425_000012_task_type_templates`
- `20260506_000013_attachment_category`

- **Validação:** `npx prisma migrate status` mostra "Database schema is up to date".

### 0.6 Rodar seed de reference data em prod

```bash
npm run seed:reference-data
```

- **Validação:** queries diretas:
  - `SELECT count(*) FROM custom_task_types WHERE is_builtin=true` → 4
  - `SELECT count(*) FROM custom_field_definitions WHERE is_builtin=true` → 24
  - `SELECT count(*) FROM task_type_templates` → 2

---

## 1. TTT-051 — Canary 48h

Ativar as 2 flags em **um único workspace interno** e observar 48h.

### 1.1 Escolher workspace canary

Sugestão: workspace pessoal "Mundial Telhas" (id estável: `cmou6gmr3001i0a17wmfybvp2` em local, conferir em prod). Critérios: workspace controlado por você, baixo volume de tasks, time já avisado.

### 1.2 Ligar flags (canary)

**Importante (D8 do plano):** ligar M1 **antes** de M2. Se ligar só M2 sem M1, custom fields ficam read-only mas template aplica descrição → confunde usuário sem dar feature completa.

Se as flags forem globais hoje (são em `env.validation.ts`):

1. Ligar `FEATURE_CUSTOM_FIELDS_WRITE_ENABLED=true` em prod (Coolify)
2. Redeploy API
3. **Smoke test:** `POST /api/v1/custom-field-definitions {key:"smoke_test", type:"TEXT", label:"Smoke"}` autenticado → 201; `DELETE` esse mesmo id → 200
4. Aguardar 30min observando dashboard painel 5 (write rate). Se zero erros 5xx no painel 1 → seguir
5. Ligar `FEATURE_TASK_TYPE_TEMPLATES_ENABLED=true`
6. Redeploy
7. **Smoke test:** `POST /api/v1/tasks {customTypeId:"builtin-order", title:"Smoke pedido", processId:"<id>"}` → 201 com `markdownContent` populado; `GET /api/v1/task-type-templates/builtin-order` → 200

### 1.3 Jornada manual no canary (T+0)

Você (Samuel) executa **uma vez**:

1. Login no frontend de prod
2. Criar task tipo Pedido — preencher os 17 campos (CNPJ, valores, etc.)
3. Anexar 1 PDF clicando no chip "Comprovante pagamento" — chip deve ficar verde
4. Criar task tipo Requisição com `type=VENDA` — `linked_order_number` vira obrigatório
5. Conferir Task View renderiza tudo

Se algo quebrar visivelmente → **abortar** (seção 4) e abrir incident.

### 1.4 SLIs a observar (48h)

Dashboard "Tasks feature — RED + outbox + perf":

| Painel | Métrica | Threshold de abort |
|---|---|---|
| 1 | error rate `/tasks/*` | > 1% sustentado 15min |
| 1 | p95 `/tasks/*` | > 500ms sustentado 15min |
| 2 | DLQ size outbox | > 0 por 5min |
| 5 | `custom_fields_written_total` | série ausente após 1h de uso (= métrica não emite, problema de wiring) |
| 6 | `task_type_templates_instantiated_total` | série ausente após criar uma task com builtin-order |
| 7 | hit ratio templates cache | < 0.5 sustentado 30min após o aquecimento (10 min) |
| 8 | redis_error_total | rate > 1/min sustentado 5min |

**Cadência de check:** T+1h, T+6h, T+24h, T+48h. Se algum threshold disparar → seção 4.

### 1.5 Critério de sucesso (T+48h)

Para liberar TTT-052:

- Dashboard estável (nenhum threshold disparado)
- Task no canary sem regressão visível
- Logs do worker sem erro relacionado a `CUSTOM_FIELD_VALUE_CHANGED`
- Métrica `custom_fields_written_total` > 0 (você usou)
- Métrica `task_type_templates_instantiated_total` > 0 (você usou)

Se OK → seguir para TTT-052. Se não → seção 4.

---

## 2. TTT-052 — Rollout escalonado 10/50/100

**Pré:** TTT-051 fechado em sucesso.

> **Limitação atual:** as 2 flags são **globais** no `env.validation.ts` — não há gate per-workspace nativo. Pra realmente fazer 10/50/100, há 2 opções:
>
> - **Opção A (recomendada se o app não tem muitos workspaces):** liga global e monitora; se incidente, desliga. Simples, mas afeta todos de uma vez.
> - **Opção B (mais seguro, mais trabalhoso):** adicionar tabela `feature_flags_workspace` ou checar via `workspace.settings.features` antes de habilitar guards. Vira RFC nova; estimar 1 sprint.
>
> Se Mundial Telhas tem ≤ 5 workspaces hoje, **A** está bem. Confirme com Samuel antes.

### 2.1 Etapa 10% (D+0 a D+7)

Se Opção A: pular (já está global desde TTT-051).
Se Opção B: ligar em ~10% dos workspaces (+ canary). Observar dashboard diariamente. Aborts da seção 4 valem aqui.

### 2.2 Etapa 50% (D+7 a D+14)

Idem — escalar para 50% se nenhum incident em 7d.

### 2.3 Etapa 100% (D+14 a D+21)

Liga em 100%. Observar 7d completos antes de declarar fechado.

### 2.4 Critério de sucesso final

- 7 dias consecutivos com 100% de workspaces ativos
- Zero alerta P1+ no período
- Postmortem zero (nada de "fix urgente")

---

## 3. Rollback per-workspace (testar antes de prod)

Se um workspace específico der problema:

### Cenário 1: degradar para read-only mas manter dados

```bash
# 1. Desligar só write de custom fields
FEATURE_CUSTOM_FIELDS_WRITE_ENABLED=false
# 2. Redeploy
```

Efeito: editores no Task View viram read-only; M2 (templates) continua aplicando descrição default + chips de anexo. Dados ficam intactos no banco.

### Cenário 2: voltar ao sistema pré-mudança

```bash
FEATURE_CUSTOM_FIELDS_WRITE_ENABLED=false
FEATURE_TASK_TYPE_TEMPLATES_ENABLED=false
# Redeploy
```

Efeito: Pedido/Requisição voltam a parecer task comum (CustomTaskType continua só ícone+nome+cor). Dados em `custom_field_values` e `task_type_templates` ficam intactos — basta religar as flags.

### Cenário 3 (último recurso): rollback de schema

Só se uma migration causar problema sério. Aplicar **na ordem reversa**:

```bash
# 1. attachment_category
psql -f mundial-erp-api/prisma/rollbacks/attachment_category.down.sql
# 2. task_type_templates
psql -f mundial-erp-api/prisma/rollbacks/task_type_templates.down.sql
# 3. custom_fields
psql -f mundial-erp-api/prisma/rollbacks/custom_fields.down.sql
```

⚠️ Antes de rodar, confirmar `_prisma_migrations` table para evitar migrate dev tentar reaplicar. Backup do banco obrigatório.

---

## 4. Critérios de abort (qualquer momento)

Se **qualquer um** disparar, executar Cenário 2 do rollback imediatamente:

- Error rate `/tasks/*` > 1% sustentado 15min
- p95 `/tasks/*` > 500ms sustentado 15min
- DLQ outbox > 0 por 5min
- Redis error rate > 1/min sustentado 5min
- Cliente reporta task quebrada (tipo Pedido) — frontend não renderiza, 5xx, etc.

Após abort:
1. Não tentar religar nas 24h seguintes
2. Abrir incident no Linear/squad-tasks
3. Atualizar [project_erp_task-types-semantics](../../memory/project_erp_task-types-semantics.md) com aprendizado
4. Refinar este runbook se faltou critério

---

## 5. Pós-rollout (TTT-053 — após critério de sucesso final)

Atualizar memórias com resultado real:

1. `project_erp_task-types-semantics.md` — adicionar "Rollout completo em D+21 sem alerta P1"
2. `project_erp_task-type-templates-roadmap.md` — começar planejar próximo builtin (sugestão: `builtin-invoice` reusa client_*)
3. Postmortem (mesmo se zero incident): "O que poderia ter dado errado?" curto

Se algum risco previsto no plano se materializou, criar memória nova `feedback_erp_*` com lição.

---

## 6. Comandos de smoke úteis

### Conferir métricas estão emitindo

```bash
curl -sH "Authorization: Bearer $METRICS_TOKEN" https://<api>/metrics \
  | grep -E "custom_fields_written_total|task_type_templates_instantiated_total"
```

### Conferir endpoint /custom-field-definitions

```bash
curl -sH "Authorization: Bearer $JWT" \
     -H "X-Workspace-Id: $WS_ID" \
     https://<api>/api/v1/custom-field-definitions | jq '.data | length'
```

Esperado: número >= 24 (24 builtins).

### Conferir um template

```bash
curl -sH "Authorization: Bearer $JWT" -H "X-Workspace-Id: $WS_ID" \
     https://<api>/api/v1/task-type-templates/builtin-order | jq '.data.fields | length'
```

Esperado: 17.

### Forçar tráfego de teste (gera métricas)

Crie 5 tasks tipo Pedido seguidas e veja painel 6 reagir em 1-2min.

---

## 7. Histórico

- `2026-05-06` — Runbook criado por Claude após Sprint 4+5 (parte código) fecharem
- `<DATA>` — Canary iniciado por Samuel (preencher quando rodar)
- `<DATA>` — Rollout 10% / 50% / 100% (preencher)
- `<DATA>` — Fechado pós T+21 sem incident (preencher)
