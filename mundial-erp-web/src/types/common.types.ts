export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type SortParams = {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type SearchParams = PaginationParams &
  SortParams & {
    search?: string;
  };
