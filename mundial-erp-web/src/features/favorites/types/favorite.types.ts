export type FavoriteEntityType =
  | 'SPACE'
  | 'FOLDER'
  | 'LIST'
  | 'TASK'
  | 'CHAT_CHANNEL';

export type FavoritePosition = 'TOP' | 'SIDEBAR' | 'BOTTOM';

export type FavoriteEntitySummary = {
  id: string;
  name: string;
  icon?: string | null;
  folderId?: string | null;
  spaceId?: string | null;
  listId?: string | null;
};

export type Favorite = {
  id: string;
  userId: string;
  workspaceId: string;
  entityType: FavoriteEntityType;
  entityId: string;
  position: FavoritePosition;
  order: number;
  createdAt: string;
  updatedAt: string;
  entity: FavoriteEntitySummary | null;
};

export type FavoritesGrouped = {
  TOP: Favorite[];
  SIDEBAR: Favorite[];
  BOTTOM: Favorite[];
};

export type FavoriteCheckResponse = {
  favorited: boolean;
  favorite: Favorite | null;
};

export type CreateFavoritePayload = {
  entityType: FavoriteEntityType;
  entityId: string;
  position?: FavoritePosition;
  order?: number;
};
