INSERT INTO "space_members" ("space_id", "user_id", "permission", "added_at", "added_by")
SELECT
  s.id AS space_id,
  COALESCE(
    (SELECT wm.user_id FROM "workspace_members" wm WHERE wm.workspace_id = s.workspace_id AND wm.role = 'OWNER'  ORDER BY wm.joined_at ASC LIMIT 1),
    (SELECT wm.user_id FROM "workspace_members" wm WHERE wm.workspace_id = s.workspace_id AND wm.role = 'ADMIN'  ORDER BY wm.joined_at ASC LIMIT 1),
    (SELECT wm.user_id FROM "workspace_members" wm WHERE wm.workspace_id = s.workspace_id                         ORDER BY wm.joined_at ASC LIMIT 1)
  ) AS user_id,
  'FULL_EDIT'::"MemberPermission" AS permission,
  CURRENT_TIMESTAMP AS added_at,
  NULL AS added_by
FROM "spaces" s
WHERE s.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "space_members" sm WHERE sm.space_id = s.id
  )
  AND COALESCE(
    (SELECT wm.user_id FROM "workspace_members" wm WHERE wm.workspace_id = s.workspace_id AND wm.role = 'OWNER'  ORDER BY wm.joined_at ASC LIMIT 1),
    (SELECT wm.user_id FROM "workspace_members" wm WHERE wm.workspace_id = s.workspace_id AND wm.role = 'ADMIN'  ORDER BY wm.joined_at ASC LIMIT 1),
    (SELECT wm.user_id FROM "workspace_members" wm WHERE wm.workspace_id = s.workspace_id                         ORDER BY wm.joined_at ASC LIMIT 1)
  ) IS NOT NULL;

UPDATE "work_item_tags" t
SET space_id = (
  SELECT s.id
  FROM "spaces" s
  WHERE s.workspace_id = t.workspace_id
  ORDER BY s.position ASC, s.created_at ASC
  LIMIT 1
)
WHERE t.space_id IS NULL
  AND EXISTS (SELECT 1 FROM "spaces" s WHERE s.workspace_id = t.workspace_id);
