import type {
  CustomFieldDefinition,
  CustomFieldType,
} from './custom-field.types';

export function makeCustomFieldDefinition(
  overrides: Partial<CustomFieldDefinition> & {
    id?: string;
    name?: string;
    type?: CustomFieldType;
  } = {},
): CustomFieldDefinition {
  const name = overrides.name ?? 'Campo';
  return {
    id: overrides.id ?? 'def-1',
    workspaceId: overrides.workspaceId ?? 'ws-1',
    name,
    label: overrides.label ?? name,
    description: overrides.description ?? null,
    type: overrides.type ?? 'TEXT',
    required: overrides.required ?? false,
    options: overrides.options ?? [],
    config: overrides.config ?? null,
    defaultValue: overrides.defaultValue ?? null,
    validation: overrides.validation ?? null,
    pinned: overrides.pinned ?? false,
    visibleToGuests: overrides.visibleToGuests ?? true,
    fillMethod: overrides.fillMethod ?? 'manual',
    fixed: overrides.fixed ?? false,
    position: overrides.position ?? 0,
    spaceId: overrides.spaceId ?? null,
    folderId: overrides.folderId ?? null,
    listId: overrides.listId ?? null,
    taskTypeId: overrides.taskTypeId ?? null,
    createdById: overrides.createdById ?? null,
    creator: overrides.creator ?? null,
    groupId: overrides.groupId ?? null,
    groupName: overrides.groupName ?? null,
    groupPosition: overrides.groupPosition ?? null,
    groupColor: overrides.groupColor ?? null,
    group: overrides.group ?? null,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}
