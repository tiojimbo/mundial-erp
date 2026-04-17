export type SidebarProcess = {
  id: string;
  name: string;
  slug: string;
  processType: 'LIST' | 'BPM';
  description: string | null;
  featureRoute: string | null;
  isPrivate: boolean;
  isProtected: boolean;
  sortOrder: number;
};

export type SidebarArea = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPrivate: boolean;
  sortOrder: number;
  isDefault: boolean;
  processes: SidebarProcess[];
};

export type SidebarDepartment = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPrivate: boolean;
  isDefault: boolean;
  isProtected: boolean;
  sortOrder: number;
  areas: SidebarArea[];
  directProcesses: SidebarProcess[];
};
