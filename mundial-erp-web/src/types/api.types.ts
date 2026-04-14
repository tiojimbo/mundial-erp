export type ApiResponse<T> = {
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export type CursorPaginatedResponse<T> = {
  data: T[];
  meta: {
    cursor: {
      next: string | null;
      hasMore: boolean;
    };
  };
};

export type ApiError = {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
};
