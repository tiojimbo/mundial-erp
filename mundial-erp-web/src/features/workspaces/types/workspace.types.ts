import type { User } from '@/types/auth.types';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';

export type WorkspacePlan = 'FREE' | 'PRO' | 'ENTERPRISE';

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

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
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
};

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: InviteStatus;
  expiresAt: string;
  token?: string;
  createdAt: string;
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

export type AddMemberPayload = {
  userId: string;
  role: WorkspaceRole;
};

export type CreateInvitePayload = {
  email: string;
  role: WorkspaceRole;
};

export type WorkspaceFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

export type WorkspaceMemberFilters = {
  page?: number;
  limit?: number;
  role?: WorkspaceRole;
};

export type WorkspaceInviteFilters = {
  page?: number;
  limit?: number;
  status?: InviteStatus;
};

export type SelectWorkspaceResponse = {
  accessToken: string;
  refreshToken: string;
  workspace: Workspace;
};
