export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  avatarUrl?: string;
  createdAt: string;
};

export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export type Department =
  | 'COMERCIAL'
  | 'COMPRAS'
  | 'FINANCEIRO'
  | 'PRODUCAO'
  | 'ADMINISTRACAO';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user: User;
  tokens: AuthTokens;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};
