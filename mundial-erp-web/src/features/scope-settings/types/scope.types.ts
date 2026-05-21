export type ScopeKind = 'spaces' | 'folders' | 'lists';

export type Visibility = 'PUBLIC' | 'PRIVATE';

export type Permission = 'FULL_EDIT' | 'EDIT' | 'COMMENT' | 'VIEW';

export type MemberSource = 'direct' | 'inherited';

export type ScopeMember = {
  spaceId?: string;
  folderId?: string;
  listId?: string;
  userId: string;
  permission: Permission;
  source: MemberSource;
  inherited: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar?: string | null;
  };
};

export type ResourcesMetadata = {
  filters: Array<{
    field: string;
    label: string;
    operators: string[];
  }>;
  sortOptions: Array<{
    field: string;
    label: string;
  }>;
};

export const SCOPE_LABEL: Record<ScopeKind, string> = {
  spaces: 'Departamento',
  folders: 'Área',
  lists: 'Processo',
};
