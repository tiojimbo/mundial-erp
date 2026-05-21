BEGIN;

DELETE FROM work_items
WHERE list_id IN (
  SELECT id FROM lists
  WHERE space_id IN (SELECT id FROM spaces WHERE deleted_at IS NOT NULL)
     OR folder_id IN (SELECT id FROM folders WHERE space_id IN (SELECT id FROM spaces WHERE deleted_at IS NOT NULL))
);

DELETE FROM process_views
WHERE list_id IN (
  SELECT id FROM lists
  WHERE space_id IN (SELECT id FROM spaces WHERE deleted_at IS NOT NULL)
     OR folder_id IN (SELECT id FROM folders WHERE space_id IN (SELECT id FROM spaces WHERE deleted_at IS NOT NULL))
);

DELETE FROM lists
WHERE space_id IN (SELECT id FROM spaces WHERE deleted_at IS NOT NULL)
   OR folder_id IN (SELECT id FROM folders WHERE space_id IN (SELECT id FROM spaces WHERE deleted_at IS NOT NULL));

DELETE FROM statuses
WHERE space_id IN (SELECT id FROM spaces WHERE deleted_at IS NOT NULL)
   OR folder_id IN (SELECT id FROM folders WHERE space_id IN (SELECT id FROM spaces WHERE deleted_at IS NOT NULL));

DELETE FROM folders WHERE space_id IN (SELECT id FROM spaces WHERE deleted_at IS NOT NULL);
DELETE FROM spaces WHERE deleted_at IS NOT NULL;

UPDATE spaces SET deleted_at = NOW() WHERE workspace_id IS NULL AND deleted_at IS NULL;

DROP INDEX spaces_slug_key;
CREATE UNIQUE INDEX spaces_workspace_id_slug_key ON spaces(workspace_id, slug);

DROP INDEX folders_slug_key;
CREATE UNIQUE INDEX folders_space_id_slug_key ON folders(space_id, slug);

DROP INDEX lists_slug_key;
CREATE UNIQUE INDEX lists_space_id_slug_key ON lists(space_id, slug);

COMMIT;
