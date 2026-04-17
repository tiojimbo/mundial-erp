export type CompanySettings = {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string;
  ie: string | null;
  im: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  logoUrl: string | null;
  description: string | null;
  updatedAt: string;
};

export type UpdateCompanyPayload = {
  name?: string;
  tradeName?: string;
  cnpj?: string;
  ie?: string;
  im?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  complement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  description?: string;
};

export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
/** @deprecated Departments are now dynamic. Kept for backward compat in user/auth types. */
export type Department = string;

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: Department;
};

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  department?: Department;
  isActive?: boolean;
};

export type UserFilters = {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  department?: Department;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type DepartmentConfig = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPrivate: boolean;
  isDefault: boolean;
  isProtected: boolean;
  isActive: boolean;
  areas: AreaConfig[];
  createdAt: string;
  updatedAt: string;
};

export type AreaConfig = {
  id: string;
  name: string;
  slug: string;
  departmentId: string;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
};

export type CreateDepartmentPayload = {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isPrivate?: boolean;
};

export type UpdateDepartmentPayload = {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isPrivate?: boolean;
  isActive?: boolean;
};

export type CreateAreaPayload = {
  name: string;
  departmentId: string;
  description?: string;
  isPrivate?: boolean;
  icon?: string;
  color?: string;
  useSpaceStatuses?: boolean;
};

export type UpdateAreaPayload = {
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type WorkflowStatusConfig = {
  id: string;
  name: string;
  category: 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';
  color: string;
  icon: string | null;
  sortOrder: number;
  departmentId: string;
  isDefault: boolean;
};

export type ProcessConfig = {
  id: string;
  name: string;
  processType: 'BPM' | 'LIST';
  departmentId: string;
  areaId: string;
  area: AreaConfig | null;
  featureRoute: string | null;
  description: string | null;
  isProtected: boolean;
  isActive: boolean;
  activities: ActivityConfig[];
  createdAt: string;
  updatedAt: string;
};

export type ActivityConfig = {
  id: string;
  name: string;
  processId: string;
  description: string | null;
  order: number;
  slaHours: number | null;
  isActive: boolean;
};

export type CreateProcessPayload = {
  name: string;
  areaId?: string;
  departmentId?: string;
  description?: string;
  isPrivate?: boolean;
  processType?: 'LIST' | 'BPM';
};

export type UpdateProcessPayload = {
  name?: string;
  areaId?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateActivityPayload = {
  name: string;
  processId: string;
  description?: string;
  order: number;
  slaHours?: number;
};

export type UpdateActivityPayload = {
  name?: string;
  description?: string;
  order?: number;
  slaHours?: number;
  isActive?: boolean;
};

export type UpdateAccountPayload = {
  fullName?: string;
  email?: string;
  currentPassword?: string;
  password?: string;
};

export type UserPreferences = {
  themeColor: string;
  themeMode: 'light' | 'dark' | 'system';
  twoFactorSms: boolean;
  twoFactorTotp: boolean;
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  OPERATOR: 'Operador',
  VIEWER: 'Visualizador',
};

/** @deprecated Departments are now dynamic. Kept for backward compat. */
export const DEPARTMENT_LABELS: Record<string, string> = {
  COMERCIAL: 'Comercial',
  COMPRAS: 'Compras',
  FINANCEIRO: 'Financeiro',
  PRODUCAO: 'Produção',
  ADMINISTRACAO: 'Administração',
};
