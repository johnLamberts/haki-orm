/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { QueryBuilder } from "../core/query-builder";
import { IPaginatedResult } from "../interfaces/paginated-result";

export class Paginator{
  static async paginate<T>(
    query: QueryBuilder<T>,
    page: number = 1,
    perPage: number = 15
  ): Promise<IPaginatedResult<T>> {
    // Validate inputs
    page = Math.max(1, Math.floor(page));
    perPage = Math.max(1, Math.min(1000, Math.floor(perPage))); // Max 1000 per page
    
    const offset = (page - 1) * perPage;
    
    // Clone query for count to avoid mutation
    const countQuery = query.clone();
    const total = await countQuery.count();
    
    // Get paginated data
    const data = await query
      .limit(perPage)
      .offset(offset)
      .execute();

    const lastPage = Math.ceil(total / perPage) || 1;
    const from = total > 0 ? offset + 1 : 0;
    const to = Math.min(offset + perPage, total);
    const hasMore = page < lastPage;
    const hasPrevious = page > 1;

    return {
      data,
      meta: {
        total,
        perPage,
        currentPage: page,
        lastPage,
        from,
        to,
        hasMore,
        hasPrevious,
      },
      links: {
        first: 1,
        last: lastPage,
        prev: hasPrevious ? page - 1 : null,
        next: hasMore ? page + 1 : null,
      },
    };
  }

  static async simplePaginate<T>(
    query: QueryBuilder<T>,
    page: number = 1,
    perPage: number = 15
  ): Promise<{ data: T[]; hasMore: boolean; page: number }> {
    page = Math.max(1, Math.floor(page));
    perPage = Math.max(1, Math.min(1000, Math.floor(perPage)));
    
    const offset = (page - 1) * perPage;
    
    // Fetch one extra to check if there are more pages
    const data = await query
      .limit(perPage + 1)
      .offset(offset)
      .execute();

    const hasMore = data.length > perPage;
    
    // Remove the extra item
    if (hasMore) {
      data.pop();
    }

    return {
      data,
      hasMore,
      page,
    };
  }

  static async cursorPaginate<T>(
    query: QueryBuilder<T>,
    cursor: any = null,
    perPage: number = 15,
    cursorField: string = 'id'
  ): Promise<{ data: T[]; nextCursor: any | null; hasMore: boolean }> {
    perPage = Math.max(1, Math.min(1000, Math.floor(perPage)));
    
    if (cursor) {
      query.where(cursorField, '>', cursor);
    }
    
    // Fetch one extra to check if there are more pages
    const data = await query
      .orderBy(cursorField, 'ASC')
      .limit(perPage + 1)
      .execute();

    const hasMore = data.length > perPage;
    
    // Remove the extra item
    if (hasMore) {
      data.pop();
    }

    const nextCursor = hasMore && data.length > 0 
      ? (data[data.length - 1] as any)[cursorField]
      : null;

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  static getPageNumbers(currentPage: number, lastPage: number, maxVisible: number = 7): number[] {
    if (lastPage <= maxVisible) {
      return Array.from({ length: lastPage }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - halfVisible);
    let end = Math.min(lastPage, currentPage + halfVisible);

    if (currentPage <= halfVisible) {
      end = maxVisible;
    } else if (currentPage >= lastPage - halfVisible) {
      start = lastPage - maxVisible + 1;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  
}
