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

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserFilters = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type StatusInlineConfig = {
  id: string;
  name: string;
  type: 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';
  color: string;
  position: number;
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
  statuses?: StatusInlineConfig[];
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

export type AreaDetailConfig = AreaConfig & {
  useSpaceStatuses?: boolean;
  statuses?: StatusInlineConfig[];
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
  defaultTaskTypeId?: string | null;
};

export type CreateAreaPayload = {
  name: string;
  spaceId: string;
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
  isPrivate?: boolean;
  icon?: string;
  color?: string;
  /**
   * Se `true`, a área herda os statuses do departamento.
   * Se alterado para `false`, o backend copia os statuses atuais do
   * departamento para a área (ver `AreasService.update`).
   */
  useSpaceStatuses?: boolean;
  defaultTaskTypeId?: string | null;
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
  spaceId: string | null;
  defaultTaskTypeId: string | null;
  defaultTaskType: {
    id: string;
    value: string;
    pluralName: string | null;
    description: string | null;
    icon: string | null;
    spaceId: string | null;
  } | null;
  featureRoute: string | null;
  description: string | null;
  isProtected: boolean;
  isActive: boolean;
  activities: ActivityConfig[];
  statusInheritance?: 'SPACE' | 'FOLDER' | 'CUSTOM';
  statuses?: Array<{
    id: string;
    name: string;
    color: string;
    type: 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';
    position: number;
  }>;
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
  folderId: string;
  description?: string;
  isPrivate?: boolean;
};

export type UpdateProcessPayload = {
  name?: string;
  description?: string;
  isActive?: boolean;
  defaultTaskTypeId?: string | null;
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
  currentPassword?: string;
  password?: string;
  avatar?: string;
  themeColor?: string;
  appearance?: 'LIGHT' | 'DARK' | 'AUTO';
};

export type UserPreferences = {
  themeColor: string;
  themeMode: 'light' | 'dark' | 'system';
  twoFactorSms: boolean;
  twoFactorTotp: boolean;
};
