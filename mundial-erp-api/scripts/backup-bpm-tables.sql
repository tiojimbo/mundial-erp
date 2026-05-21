-- Sprint 7 — HPP-124
-- Backup das 4 tabelas de runtime BPM antes do DROP da HPP-126.
-- Substituir YYYYMMDD pela data de execucao em prod.
-- Rodar em transacao manual e validar contagens antes/depois.

BEGIN;

CREATE TABLE process_instances_legacy_YYYYMMDD AS
  SELECT * FROM process_instances;

CREATE TABLE activity_instances_legacy_YYYYMMDD AS
  SELECT * FROM activity_instances;

CREATE TABLE task_instances_legacy_YYYYMMDD AS
  SELECT * FROM task_instances;

CREATE TABLE handoff_instances_legacy_YYYYMMDD AS
  SELECT * FROM handoff_instances;

SELECT 'process_instances'   AS tbl, COUNT(*) FROM process_instances
UNION ALL
SELECT 'activity_instances', COUNT(*) FROM activity_instances
UNION ALL
SELECT 'task_instances',     COUNT(*) FROM task_instances
UNION ALL
SELECT 'handoff_instances',  COUNT(*) FROM handoff_instances;

SELECT 'process_instances_legacy_YYYYMMDD'   AS tbl, COUNT(*) FROM process_instances_legacy_YYYYMMDD
UNION ALL
SELECT 'activity_instances_legacy_YYYYMMDD', COUNT(*) FROM activity_instances_legacy_YYYYMMDD
UNION ALL
SELECT 'task_instances_legacy_YYYYMMDD',     COUNT(*) FROM task_instances_legacy_YYYYMMDD
UNION ALL
SELECT 'handoff_instances_legacy_YYYYMMDD',  COUNT(*) FROM handoff_instances_legacy_YYYYMMDD;

COMMIT;
