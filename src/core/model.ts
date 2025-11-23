/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ResultSetHeader } from "mysql2/promise";
import { IModelConfig } from "../interfaces/model-config";
import { Connection } from "./connection";
import { QueryBuilder } from "./query-builder";

export abstract class Model<T = any> {
  protected static _config: IModelConfig;
  protected attributes: Record<string, any> = {};
  protected original: Record<string, any> = {};
  protected exists: boolean = false;
  protected isDirty: boolean = false;

  public static getConfig(): IModelConfig {
    return (this as any)._config;
  }

  static query<M extends Model>(): QueryBuilder<M> {
    return new QueryBuilder<M>(this._config.table);
  }

  static async find<M extends Model>(this: new () => M, id: any): Promise<M | null> {
    const config = (this as any)._config as IModelConfig;
    const result = await new QueryBuilder<any>(config.table)
      .where(config.primaryKey || 'id', '=', id)
      .first();

    if (!result) return null;

    const instance = new this();
    instance.hydrate(result);
    return instance;
  }

static async findOrFail<M extends Model>(this: new () => M, id: any): Promise<M> {
    const result = await (this as any).find(id);
    if (!result) {
      throw new Error(`Model not found with id: ${id}`);
    }
    return result;
  }

  static async findMany<M extends Model>(this: new () => M, ids: any[]): Promise<M[]> {
    if (ids.length === 0) return [];
    
    const config = (this as any)._config as IModelConfig;
    const results = await new QueryBuilder<any>(config.table)
      .whereIn(config.primaryKey || 'id', ids)
      .execute();
    
    return results.map(row => {
      const instance = new this();
      instance.hydrate(row);
      return instance;
    });
  }

  static async all<M extends Model>(this: new () => M): Promise<M[]> {
    const config = (this as any)._config as IModelConfig;
    const results = await new QueryBuilder<any>(config.table).execute();
    
    return results.map(row => {
      const instance = new this();
      instance.hydrate(row);
      return instance;
    });
  }

  static async create<M extends Model<U>, U = any>(this: new () => M, data: Partial<U>): Promise<M> {
    const instance = new this();
    instance.fill(data);
    await instance.save();
    return instance;
  }

  static async insertGetId(data: Partial<any>): Promise<number> {
    const config = this._config;
    const conn = Connection.getInstance();
    
    const fillable = this.getFillableData(data);
    const fields = Object.keys(fillable);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(f => fillable[f]);
    
    const sql = `INSERT INTO ${config.table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const [result] = await conn.execute<ResultSetHeader>(sql, values);
    return result.insertId;
  }

  static async insert<U = any>(data: Partial<U> | Partial<U>[]): Promise<void> {
    const config = this._config;
    const conn = Connection.getInstance();
    const records = Array.isArray(data) ? data : [data];
    
    if (records.length === 0) return;

    // Batch insert for performance
    const batchSize = 1000;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const fillable = this.getFillableData(batch[0]);
      const fields = Object.keys(fillable);
      
      const placeholders = batch.map(() => 
        `(${fields.map(() => '?').join(', ')})`
      ).join(', ');
      
      const values = batch.flatMap(record => {
        const filled = this.getFillableData(record);
        return fields.map(field => filled[field]);
      });
      
      const sql = `INSERT INTO ${config.table} (${fields.join(', ')}) VALUES ${placeholders}`;
      await conn.execute(sql, values);
    }
  }

  static async updateWhere<U = any>(data: Partial<U>, where?: Record<string, any>): Promise<number> {
    const config = this._config;
    const conn = Connection.getInstance();
    
    const fillable = this.getFillableData(data);
    const fields = Object.keys(fillable);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => fillable[f]);
    
    let sql = `UPDATE ${config.table} SET ${setClause}`;
    
    if (where && Object.keys(where).length > 0) {
      const whereFields = Object.keys(where);
      const whereClause = whereFields.map(f => `${f} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      values.push(...whereFields.map(f => where[f]));
    }
    
    const [result] = await conn.execute<ResultSetHeader>(sql, values);
    return result.affectedRows || 0;
  }

  static async deleteWhere(where: Record<string, any>): Promise<number> {
    const config = this._config;
    const conn = Connection.getInstance();
    
    const whereFields = Object.keys(where);
    const whereClause = whereFields.map(f => `${f} = ?`).join(' AND ');
    const values = whereFields.map(f => where[f]);
    
    const sql = `DELETE FROM ${config.table} WHERE ${whereClause}`;
    const [result] = await conn.execute<ResultSetHeader>(sql, values);
    return result.affectedRows || 0;
  }

  private static getFillableData(data: any): Record<string, any> {
    const config = this._config;
    
    if (config.fillable && config.fillable.length > 0) {
      const fillable: Record<string, any> = {};
      for (const key of config.fillable) {
        if (key in data) {
          fillable[key] = data[key];
        }
      }
      return fillable;
    }
    
    if (config.guarded && config.guarded.length > 0) {
      const guarded: Record<string, any> = {};
      for (const key in data) {
        if (!config.guarded.includes(key)) {
          guarded[key] = data[key];
        }
      }
      return guarded;
    }
    
    return { ...data };
  }

  fill(data: Partial<T>): this {
    const fillableData = (this.constructor as typeof Model).getFillableData(data);
    
    Object.assign(this.attributes, fillableData);
    this.isDirty = true;
    return this;
  }

  static hydrate<T, M extends Model<T>>(this: new () => M, data: T): M {
    const instance = new this();
    instance.hydrate(data);
    return instance;
  }

  protected hydrate(data: any): void {
    this.attributes = this.castAttributes(data);
    this.original = { ...this.attributes };
    this.exists = true;
    this.isDirty = false;
  }

  private castAttributes(data: any): any {
    const config = (this.constructor as typeof Model)._config;
    if (!config.casts) return data;

    const casted: any = { ...data };
    for (const [key, type] of Object.entries(config.casts)) {
      if (key in casted && casted[key] !== null) {
        switch (type) {
          case 'number':
            casted[key] = Number(casted[key]);
            break;
          case 'boolean':
            casted[key] = Boolean(casted[key]);
            break;
          case 'date':
            casted[key] = new Date(casted[key]);
            break;
          case 'json':
            casted[key] = typeof casted[key] === 'string' ? JSON.parse(casted[key]) : casted[key];
            break;
        }
      }
    }
    return casted;
  }

  async save(): Promise<this> {
    if (!this.isDirty && this.exists) return this;

    const config = (this.constructor as typeof Model)._config;
    const conn = Connection.getInstance();
    const pk = config.primaryKey || 'id';

    if (this.exists) {
      const changed = this.getDirty();
      if (Object.keys(changed).length === 0) return this;

      const fields = Object.keys(changed);
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = [...fields.map(f => changed[f]), this.attributes[pk]];
      
      const sql = `UPDATE ${config.table} SET ${setClause} WHERE ${pk} = ?`;
      await conn.execute(sql, values);
      
      this.original = { ...this.attributes };
      this.isDirty = false;
    } else {
      const fillableData = (this.constructor as typeof Model).getFillableData(this.attributes);
      const fields = Object.keys(fillableData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(f => fillableData[f]);
      
      const sql = `INSERT INTO ${config.table} (${fields.join(', ')}) VALUES (${placeholders})`;
      const [result] = await conn.execute<ResultSetHeader>(sql, values);
      
      this.attributes[pk] = result.insertId;
      this.exists = true;
      this.original = { ...this.attributes };
      this.isDirty = false;
    }

    return this;
  }

  async delete(): Promise<void> {
    if (!this.exists) return;

    const config = (this.constructor as typeof Model)._config;
    const conn = Connection.getInstance();
    const pk = config.primaryKey || 'id';
    
    const sql = `DELETE FROM ${config.table} WHERE ${pk} = ?`;
    await conn.execute(sql, [this.attributes[pk]]);
    
    this.exists = false;
  }

  async refresh(): Promise<this> {
    if (!this.exists) return this;

    const config = (this.constructor as typeof Model)._config;
    const pk = config.primaryKey || 'id';
    
    const result = await new QueryBuilder<any>(config.table)
      .where(pk, '=', this.attributes[pk])
      .first();
    
    if (result) {
      this.hydrate(result);
    }
    
    return this;
  }

  getDirty(): Record<string, any> {
    const dirty: Record<string, any> = {};
    for (const key in this.attributes) {
      const currentValue = this.attributes[key];
      const originalValue = this.original[key];

      let isDifferent = true;
      
      if (currentValue instanceof Date && originalValue instanceof Date) {
        if (currentValue.getTime() === originalValue.getTime()) {
          isDifferent = false;
        }
      } 
      else if (currentValue === originalValue) {
        isDifferent = false;
      }
      // Note: Deep comparison for JSON objects (cast: 'json') would require a utility library here.

      if (isDifferent) {
        dirty[key] = currentValue;
      }
    }
    return dirty;
  }

  isDirtyModel(): boolean {
    return this.isDirty || Object.keys(this.getDirty()).length > 0;
  }

  toJSON(): T {
    const config = (this.constructor as typeof Model)._config;
    const json = { ...this.attributes };
    
    if (config.hidden) {
      for (const key of config.hidden) {
        delete json[key];
      }
    }
    
    return json as T;
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.attributes[key as string];
  }

  set<K extends keyof T>(key: K, value: T[K]): this {
    this.attributes[key as string] = value;
    this.isDirty = true;
    return this;
  }
}
