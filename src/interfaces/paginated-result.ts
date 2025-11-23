export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    from: number;
    to: number;
    hasMore: boolean;
    hasPrevious: boolean;
  };
  links: {
    first: number;
    last: number;
    prev: number | null;
    next: number | null;
  }
}
