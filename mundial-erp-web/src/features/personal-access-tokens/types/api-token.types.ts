export type ApiTokenUser = {
  id: string;
  name: string;
  email: string;
};

export type ApiToken = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: ApiTokenUser;
};

export type ApiTokenCreated = ApiToken & {
  token: string;
};

export type CreateApiTokenPayload = {
  name: string;
};
