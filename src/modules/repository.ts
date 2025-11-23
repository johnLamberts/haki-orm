/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Model } from "../core/model";
import { QueryBuilder } from "../core/query-builder";
import { IPaginatedResult } from "../interfaces/paginated-result";
import { ModelConstructor } from "../types/model.type";
import { Paginator } from "./paginator";

export abstract class Repository<T, M extends Model<T> = Model<T>> {
  protected model: ModelConstructor<T, M>;

  constructor(model: ModelConstructor<T, M>) {
    this.model = model;
  }

  async findById(id: any): Promise<M | null> {
    return await this.model.find(id);
  }

  async findAll(): Promise<M[]> {
    return await this.model.all();
  }

 async findBy<K extends keyof T>(field: K, value: T[K]): Promise<M | null> {
  const row = await this.query()
    .where(field as string, '=', value as any)
    .first();

  return row ? this.model.hydrate(row) : null;
}

 async findMany(ids: any[]): Promise<M[]> {
    if (ids.length === 0) return [];
    return await this.query().whereIn('id', ids).execute();
  }

async findManyBy<K extends keyof T>(field: K, value: T[K]): Promise<M[]> {
  const rows = await this.query()
    .where(field as string, "=", value as any)
    .execute();

  return rows.map(row => {
    const instance = new this.model(); // create instance
    instance.fill(row as unknown as Partial<T>);  // pass attributes, not Model
    instance['exists'] = true;
    instance['original'] = { ...row };
    return instance;
  });
} 

  async create(data: Partial<T>): Promise<M> {
    return await this.model.create(data);
  }
  
  async createMany(data: Partial<T>[]): Promise<void> {
    if(data.length === 0) return;
    await this.model.insert(data);
  }

  async update(id: any, data: Partial<T>): Promise<M | null> {
    const instance = await this.findById(id);
    if (!instance) return null;

    instance.fill(data);
    await instance.save();
    return instance;
  }

  async updateMany(where: Record<string, any>, data: Partial<T>): Promise<number> {
    return await this.model.updateWhere(data, where);
  }

  async delete(id: any): Promise<boolean> {
    const instance = await this.findById(id);
    if (!instance) return false;

    await instance.delete();
    return true;
  }

  async deleteMany(where: Record<string, any>): Promise<number> {
    return await this.model.deleteWhere(where);
  }

  query(): QueryBuilder<M> {
    return this.model.query();
  }

  async count(where?: Record<string, any>): Promise<number> {
    const qb = this.query();

    if(where) {
      for (const [key, value] of Object.entries(where)) {
        qb.where(key, '=', value);
      }
    }

    return await qb.count();
  }

   async exists(where: Record<string, any>): Promise<boolean> {
    return await this.count(where) > 0;
  }

  async first(where?: Record<string, any>): Promise<M | null> {
    const qb = this.query();
    
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        qb.where(key, '=', value);
      }
    }
    
    return await qb.first();
  }

  // Pagination
  async paginate(page: number = 1, perPage: number = 15): Promise<IPaginatedResult<M>> {
    return await Paginator.paginate(this.query(), page, perPage);
  }

  async paginateWhere(
    where: Record<string, any>,
    page: number = 1,
    perPage: number = 15
  ): Promise<IPaginatedResult<M>> {
    const qb = this.query();
    
    for (const [key, value] of Object.entries(where)) {
      qb.where(key, '=', value);
    }
    
    return await Paginator.paginate(qb, page, perPage);
  }

  // Aggregations
  async sum(field: string, where?: Record<string, any>): Promise<number> {
    const qb = this.query();
    
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        qb.where(key, '=', value);
      }
    }
    
    return await qb.sum(field);
  }

  async avg(field: string, where?: Record<string, any>): Promise<number> {
    const qb = this.query();
    
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        qb.where(key, '=', value);
      }
    }
    
    return await qb.avg(field);
  }

  async min(field: string, where?: Record<string, any>): Promise<number> {
    const qb = this.query();
    
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        qb.where(key, '=', value);
      }
    }
    
    return await qb.min(field);
  }

  async max(field: string, where?: Record<string, any>): Promise<number> {
    const qb = this.query();
    
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        qb.where(key, '=', value);
      }
    }
    
    return await qb.max(field);
  }

  // Bulk operations
  async chunk(size: number, callback: (items: M[]) => Promise<boolean | void>): Promise<void> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const items = await this.query()
        .limit(size)
        .offset(offset)
        .execute();

      if (items.length === 0) break;

      const shouldContinue = await callback(items);
      if (shouldContinue === false) break;

      offset += size;
      hasMore = items.length === size;
    }
  }

  // Utility methods
  async pluck(field: string, where?: Record<string, any>): Promise<any[]> {
    const qb = this.query();
    
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        qb.where(key, '=', value);
      }
    }
    
    return await qb.pluck(field);
  }

  async findWhere(where: Record<string, any>): Promise<M[]> {
    const qb = this.query();
    
    for (const [key, value] of Object.entries(where)) {
      qb.where(key, '=', value);
    }
    
    return await qb.execute();
  }

  async findOneWhere(where: Record<string, any>): Promise<M | null> {
    return await this.first(where);
  }
}
