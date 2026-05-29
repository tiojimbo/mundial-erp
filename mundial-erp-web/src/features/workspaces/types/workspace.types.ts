import type { User } from '@/types/auth.types';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'GUEST';

export type WorkspacePlan = 'FREE' | 'PRO' | 'ENTERPRISE';

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  color?: string | null;
  plan: WorkspacePlan;
  createdAt: string;
};

export type WorkspaceUI = Workspace & {
  initials: string;
  bgColor: string;
  fgColor: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
};

export type WorkspaceUser = {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  accepted: boolean;
  permission: WorkspaceRole;
  canCreateViews: boolean;
  canManageTags: boolean;
  joinedAt: string;
};

export type WorkspaceUsersResponse = {
  users: WorkspaceUser[];
  total: number;
};

export type WorkspaceSeats = {
  membersUsed: number;
  membersTotal: number;
  guestsUsed: number;
  guestsTotal: number;
};

export type CreateWorkspacePayload = {
  name: string;
  slug: string;
  logoUrl?: string;
  color?: string;
};

export type UpdateWorkspacePayload = Partial<CreateWorkspacePayload>;

export type BulkAddUsersPayload = {
  users: { email: string; permission: WorkspaceRole }[];
};

export type BulkInvitedUser = {
  id: string;
  email: string;
  name: string | null;
  permission: WorkspaceRole;
  accepted: boolean;
  isNewUser: boolean;
};

export type BulkAddResponse = {
  invited: BulkInvitedUser[];
  skipped: string[];
};

export type WorkspaceFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

export type WorkspaceUsersFilters = {
  page?: number;
  limit?: number;
  showPending?: boolean;
};

export type SelectWorkspaceResponse = {
  accessToken: string;
  refreshToken: string;
  workspace: Workspace;
};
