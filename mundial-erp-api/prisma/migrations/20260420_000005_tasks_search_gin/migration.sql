-- =============================================================================
-- Tasks Search GIN — Migration 5 (Sprint 8 / R16)
-- -----------------------------------------------------------------------------
-- Adiciona suporte a busca fuzzy (ILIKE + trigram) em `work_items.title` e
-- `work_items.description`, acelerando a query `GET /tasks?q=...` quando
-- a cardinalidade da tabela passa de 100k rows.
--
-- Indices criados:
--   - idx_work_items_title_trgm   GIN (title gin_trgm_ops)
--   - idx_work_items_desc_trgm    GIN (description gin_trgm_ops) WHERE IS NOT NULL
--
-- Extension:
--   pg_trgm — fornecida pelo core do PostgreSQL (contrib), nao requer
--   instalacao externa. CREATE EXTENSION e idempotente.
--
-- Impacto:
--   - INSERT/UPDATE em work_items ficam ~15-25% mais lentos devido ao GIN
--     fastupdate. Aceitavel dado que writes em task ja sao I/O-bound.
--   - Select com `title ILIKE '%foo%'` passa de seq scan full para index scan.
--
-- Additive-only: zero alteracoes em tabelas existentes. Rollback documentado
-- no final deste arquivo.
-- =============================================================================

-- 1. Extension (idempotente — CREATE EXTENSION IF NOT EXISTS e seguro).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN index em `title` (nunca null, nao precisa filtro parcial).
CREATE INDEX IF NOT EXISTS "idx_work_items_title_trgm"
    ON "work_items" USING gin ("title" gin_trgm_ops);

-- 3. GIN index em `description` (nullable — indice parcial evita armazenar
--    tuplas NULL inuteis e reduz tamanho do indice).
CREATE INDEX IF NOT EXISTS "idx_work_items_desc_trgm"
    ON "work_items" USING gin ("description" gin_trgm_ops)
    WHERE "description" IS NOT NULL;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- Executar manualmente via psql:
--
--   DROP INDEX IF EXISTS "idx_work_items_desc_trgm";
--   DROP INDEX IF EXISTS "idx_work_items_title_trgm";
--
--   -- CUIDADO: so dropar a extension se NENHUMA outra tabela/indice usar.
--   -- Query para checar:
--   --   SELECT n.nspname, t.relname, i.relname AS index_name
--   --   FROM   pg_index x
--   --   JOIN   pg_class i ON i.oid = x.indexrelid
--   --   JOIN   pg_class t ON t.oid = x.indrelid
--   --   JOIN   pg_namespace n ON n.oid = t.relnamespace
--   --   JOIN   pg_am am ON am.oid = i.relam
--   --   WHERE  am.amname = 'gin';
--   DROP EXTENSION IF EXISTS pg_trgm;
-- =============================================================================
