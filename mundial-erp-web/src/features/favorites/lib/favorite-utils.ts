import {
  Star,
  Folder,
  LayoutList,
  CheckSquare,
  Hash,
  type LucideIcon,
} from 'lucide-react';
import type {
  SidebarArea,
  SidebarDepartment,
  SidebarProcess,
} from '@/features/navigation/types/navigation.types';
import type { Favorite, FavoriteEntityType } from '../types/favorite.types';

export function favoriteIcon(type: FavoriteEntityType): LucideIcon {
  switch (type) {
    case 'SPACE':
      return Star;
    case 'FOLDER':
      return Folder;
    case 'LIST':
      return LayoutList;
    case 'TASK':
      return CheckSquare;
    case 'CHAT_CHANNEL':
      return Hash;
  }
}

function resolveSpace(
  tree: SidebarDepartment[] | undefined,
  spaceId: string,
): SidebarDepartment | null {
  return tree?.find((d) => d.id === spaceId) ?? null;
}

function resolveFolder(
  tree: SidebarDepartment[] | undefined,
  folderId: string,
): { dept: SidebarDepartment; area: SidebarArea } | null {
  for (const dept of tree ?? []) {
    const area = dept.areas.find((a) => a.id === folderId);
    if (area) return { dept, area };
  }
  return null;
}

function resolveList(
  tree: SidebarDepartment[] | undefined,
  listId: string,
): {
  dept: SidebarDepartment;
  area: SidebarArea | null;
  process: SidebarProcess;
} | null {
  for (const dept of tree ?? []) {
    for (const area of dept.areas) {
      const process = area.processes.find((p) => p.id === listId);
      if (process) return { dept, area, process };
    }
    const direct = dept.directProcesses.find((p) => p.id === listId);
    if (direct) return { dept, area: null, process: direct };
  }
  return null;
}

export function favoriteHref(
  fav: Favorite,
  tree: SidebarDepartment[] | undefined,
): string | null {
  switch (fav.entityType) {
    case 'SPACE': {
      const dept = resolveSpace(tree, fav.entityId);
      return dept ? `/d/${dept.slug}` : null;
    }
    case 'FOLDER': {
      const found = resolveFolder(tree, fav.entityId);
      return found ? `/d/${found.dept.slug}/a/${found.area.slug}` : null;
    }
    case 'LIST': {
      const found = resolveList(tree, fav.entityId);
      if (!found) return null;
      return (
        found.process.featureRoute ??
        `/d/${found.dept.slug}/p/${found.process.slug}`
      );
    }
    case 'TASK':
      return `/tasks/${fav.entityId}`;
    case 'CHAT_CHANNEL':
      return `/chat/${fav.entityId}`;
  }
}

export function favoriteLabel(
  fav: Favorite,
  tree: SidebarDepartment[] | undefined,
): string {
  switch (fav.entityType) {
    case 'SPACE':
      return (
        resolveSpace(tree, fav.entityId)?.name ??
        fav.entity?.name ??
        fav.entityId
      );
    case 'FOLDER':
      return (
        resolveFolder(tree, fav.entityId)?.area.name ??
        fav.entity?.name ??
        fav.entityId
      );
    case 'LIST':
      return (
        resolveList(tree, fav.entityId)?.process.name ??
        fav.entity?.name ??
        fav.entityId
      );
    default:
      return fav.entity?.name ?? fav.entityId;
  }
}
