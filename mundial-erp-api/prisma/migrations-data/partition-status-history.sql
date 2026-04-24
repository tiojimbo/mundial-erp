-- =============================================================================
-- MANUAL DATA MIGRATION — work_item_status_history -> partitioned table
-- -----------------------------------------------------------------------------
-- Gatilho (ver docs/capacity-planning.md): executar APENAS quando a tabela
-- ultrapassar 10M rows. Ate la, a tabela ordinaria com indice em
-- (work_item_id, entered_at DESC) atende a carga sem necessidade de particao.
--
-- Estrategia:
-- RANGE PARTITION em `entered_at`. Partitions mensais cobrindo -24 meses ate
-- +12 meses (total 37 particoes + DEFAULT catch-all). Novas particoes devem
-- ser criadas mensalmente por job (ver section "AUTOMACAO" no fim).
--
-- Downtime esperado: ~30 segundos no passo ATTACH com LOCK EXCLUSIVE. O resto
-- do procedimento roda online usando a tabela original como fonte.
--
-- Pre-requisitos:
--   1. Feature flag TASKS_STATUS_HISTORY_READONLY = true (bloqueia writes
--      por 30s durante o ATTACH final). A aplicacao deve tratar o erro e
--      encolhar para fila retry.
--   2. Workers BullMQ do outbox (task-outbox) PAUSADOS — eles escrevem em
--      work_item_status_history em STATUS_CHANGED.
--   3. Backup fresco (pg_dump) do banco inteiro.
--   4. Testado EM STAGING com volume producao (ver runbook).
--
-- Autor de execucao: DBA + SRE on-call.
-- Duracao total estimada (10M rows): 10-25 minutos.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Criar nova tabela particionada (nome temporario)
-- -----------------------------------------------------------------------------

CREATE TABLE "work_item_status_history_new" (
    "id"               TEXT         NOT NULL,
    "work_item_id"     TEXT         NOT NULL,
    "status_id"        TEXT         NOT NULL,
    "entered_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at"          TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "by_user_id"       TEXT,
    -- PK precisa incluir a coluna de particao (restricao PG).
    CONSTRAINT "work_item_status_history_new_pkey" PRIMARY KEY ("id", "entered_at")
) PARTITION BY RANGE ("entered_at");

-- -----------------------------------------------------------------------------
-- 2. Criar particoes -24 meses ate +12 meses (mensais)
-- -----------------------------------------------------------------------------
-- Script gera 37 particoes nomeadas `wish_p_YYYY_MM`. Cada particao cobre
-- `[primeiro dia do mes, primeiro dia do mes seguinte)`. Ajustar o anchor
-- (`NOW()`) conforme a data de execucao.

DO $$
DECLARE
    start_month DATE;
    cur_month   DATE;
    next_month  DATE;
    partition_name TEXT;
BEGIN
    start_month := date_trunc('month', NOW() - INTERVAL '24 months')::DATE;

    FOR i IN 0..36 LOOP
        cur_month := start_month + (i * INTERVAL '1 month');
        next_month := cur_month + INTERVAL '1 month';
        partition_name := 'wish_p_' || to_char(cur_month, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF "work_item_status_history_new"
             FOR VALUES FROM (%L) TO (%L);',
            partition_name,
            cur_month,
            next_month
        );
    END LOOP;
END
$$;

-- Particao DEFAULT para absorver linhas fora do range (evita INSERT error).
CREATE TABLE IF NOT EXISTS "wish_p_default"
    PARTITION OF "work_item_status_history_new"
    DEFAULT;

-- -----------------------------------------------------------------------------
-- 3. Indices na tabela particionada (propagam para particoes)
-- -----------------------------------------------------------------------------
-- Indice principal: hot-path (work_item_id, entered_at DESC) mesmo nome que
-- em schema.prisma.
CREATE INDEX IF NOT EXISTS "idx_status_history_task_entered"
    ON "work_item_status_history_new" ("work_item_id", "entered_at" DESC);

-- Indice auxiliar para queries por status.
CREATE INDEX IF NOT EXISTS "idx_status_history_status"
    ON "work_item_status_history_new" ("status_id", "entered_at" DESC);

-- -----------------------------------------------------------------------------
-- 4. Copiar dados em batches de 10k por particao (pode ser paralelizado)
-- -----------------------------------------------------------------------------
-- NOTA: para 10M rows, considerar rodar este INSERT em chunks via batch por
-- mes (WHERE entered_at >= 'YYYY-MM-01' AND entered_at < 'YYYY-MM-01 + 1 month')
-- em paralelo (ate 4 conexoes). Para esta migration manual assumimos um
-- INSERT em single-shot dentro da transaction principal.

INSERT INTO "work_item_status_history_new"
    ("id", "work_item_id", "status_id", "entered_at", "left_at", "duration_seconds", "by_user_id")
SELECT "id", "work_item_id", "status_id", "entered_at", "left_at", "duration_seconds", "by_user_id"
FROM   "work_item_status_history";

-- -----------------------------------------------------------------------------
-- 5. Recriar FKs
-- -----------------------------------------------------------------------------

ALTER TABLE "work_item_status_history_new"
    ADD CONSTRAINT "work_item_status_history_work_item_id_fkey"
    FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_item_status_history_new"
    ADD CONSTRAINT "work_item_status_history_status_id_fkey"
    FOREIGN KEY ("status_id") REFERENCES "workflow_statuses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 6. Rename atomico (este e o passo que pede LOCK EXCLUSIVE — ~30s downtime)
-- -----------------------------------------------------------------------------
-- Durante os passos 6, a feature flag TASKS_STATUS_HISTORY_READONLY deve ser
-- true para que a aplicacao nao tente escrever durante a troca.

ALTER TABLE "work_item_status_history"     RENAME TO "work_item_status_history_old";
ALTER TABLE "work_item_status_history_new" RENAME TO "work_item_status_history";

-- Renomear indice (Postgres nao renomeia indices automaticamente no RENAME TABLE).
-- OBS: indice foi criado acima com nome definitivo; nao precisa renomear.

COMMIT;

-- =============================================================================
-- POS-MIGRATION
-- =============================================================================
-- 1. Desligar feature flag TASKS_STATUS_HISTORY_READONLY.
-- 2. Retomar workers BullMQ (task-outbox).
-- 3. VALIDAR contagem: SELECT COUNT(*) FROM work_item_status_history_old;
--    DEVE ser igual a SELECT COUNT(*) FROM work_item_status_history.
-- 4. Apos 7 dias de observacao sem incidentes:
--    DROP TABLE "work_item_status_history_old";
--
-- =============================================================================
-- AUTOMACAO DE NOVAS PARTICOES
-- =============================================================================
-- Job semanal (pg_cron ou @Cron NestJS) que cria a particao para M+2 caso
-- ainda nao exista. Exemplo pg_cron:
--
--   SELECT cron.schedule(
--     'create-status-history-partition',
--     '0 2 * * 0',
--     $$
--       DO $block$
--       DECLARE
--         target DATE := date_trunc('month', NOW() + INTERVAL '2 months')::DATE;
--         next_month DATE := target + INTERVAL '1 month';
--         partition_name TEXT := 'wish_p_' || to_char(target, 'YYYY_MM');
--       BEGIN
--         EXECUTE format(
--           'CREATE TABLE IF NOT EXISTS %I PARTITION OF "work_item_status_history"
--            FOR VALUES FROM (%L) TO (%L);',
--           partition_name, target, next_month
--         );
--       END $block$;
--     $$
--   );
--
-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- Se a migracao falhar ANTES do COMMIT: BEGIN/COMMIT automatico reverte tudo.
--
-- Se a migracao foi COMMITADA mas apresenta regressao:
--
--   BEGIN;
--
--   -- 1. Feature flag READONLY novamente.
--   -- 2. Workers BullMQ PAUSADOS.
--
--   -- 3. Se `work_item_status_history_old` ainda existe (pos-migration < 7 dias):
--   ALTER TABLE "work_item_status_history"     RENAME TO "work_item_status_history_failed";
--   ALTER TABLE "work_item_status_history_old" RENAME TO "work_item_status_history";
--
--   -- 4. Desligar feature flag, retomar workers.
--   -- 5. Investigar causa raiz no ambiente de staging.
--   -- 6. Quando decidir apagar a tabela particionada falha:
--   DROP TABLE "work_item_status_history_failed";
--
--   COMMIT;
--
-- Se `work_item_status_history_old` ja foi dropada (>7 dias), NAO HA rollback
-- direto. Recorrer a pg_dump restore no pre-migracao.
-- =============================================================================
