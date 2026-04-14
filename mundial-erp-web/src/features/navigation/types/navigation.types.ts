export type SidebarProcess = {
  id: string;
  name: string;
  slug: string;
  processType: string;
  featureRoute: string | null;
  isProtected: boolean;
  sortOrder: number;
};

export type SidebarArea = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isDefault: boolean;
  processes: SidebarProcess[];
};

export type SidebarDepartment = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  isPrivate: boolean;
  isDefault: boolean;
  isProtected: boolean;
  sortOrder: number;
  areas: SidebarArea[];
};
