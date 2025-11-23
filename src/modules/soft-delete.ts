/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ResultSetHeader } from "mysql2/promise";
import { Connection } from "../core/connection";
import { Model } from "../core/model";
import { QueryBuilder } from "../core/query-builder";

export class SoftDeleteModel<T = any> extends Model<T> {
  protected static softDeleteColumn = 'deleted_at'

  static override query(): QueryBuilder<any> {
    const qb = new QueryBuilder<any>(this._config.table)
      .where(this.softDeleteColumn, 'IS NULL', undefined)
    return qb;
  }

  static withTrashed<M extends SoftDeleteModel>(): QueryBuilder<M> {
    return new QueryBuilder<M>(this._config.table);
  }

static onlyTrashed<M extends SoftDeleteModel>(): QueryBuilder<M> {
    return new QueryBuilder<M>(this._config.table)
      .where(this.softDeleteColumn, 'IS NOT NULL', undefined);
  }

  override async delete(): Promise<void> {
    if (!this.exists) return;

    const config = (this.constructor as typeof Model)._config;
    const conn = Connection.getInstance();
    const pk = config.primaryKey || 'id';
    const softDeleteCol = (this.constructor as typeof SoftDeleteModel).softDeleteColumn;
    
    const sql = `UPDATE ${config.table} SET ${softDeleteCol} = CURRENT_TIMESTAMP WHERE ${pk} = ?`;
    await conn.query(sql, [this.attributes[pk]]);
  }

  async forceDelete(): Promise<void> {
    if (!this.exists) return;

    const config = (this.constructor as typeof Model)._config;
    const conn = Connection.getInstance();
    const pk = config.primaryKey || 'id';
    
    const sql = `DELETE FROM ${config.table} WHERE ${pk} = ?`;
    await conn.query(sql, [this.attributes[pk]]);
    
    this.exists = false;
  }

  async restore(): Promise<void> {
    if (!this.exists) return;

    const config = (this.constructor as typeof Model)._config;
    const conn = Connection.getInstance();
    const pk = config.primaryKey || 'id';
    const softDeleteCol = (this.constructor as typeof SoftDeleteModel).softDeleteColumn;
    
    const sql = `UPDATE ${config.table} SET ${softDeleteCol} = NULL WHERE ${pk} = ?`;
    await conn.query(sql, [this.attributes[pk]]);
  }

  static async restoreMany(where: Record<string, any>): Promise<number> {
    const config = this._config;
    const conn = Connection.getInstance();
    const softDeleteCol = this.softDeleteColumn;
    
    const whereFields = Object.keys(where);
    const whereClause = whereFields.map(f => `${f} = ?`).join(' AND ');
    const values = whereFields.map(f => where[f]);
    
    const [result] = await conn.execute<ResultSetHeader>(
      `UPDATE ${config.table} SET ${softDeleteCol} = NULL WHERE ${whereClause}`,
      values
    );
    
    return result.affectedRows;
  }

  isDeleted(): boolean {
    const softDeleteCol = (this.constructor as typeof SoftDeleteModel).softDeleteColumn;
    return this.attributes[softDeleteCol] !== null && this.attributes[softDeleteCol] !== undefined;
  }

  isTrashed(): boolean {
    return this.isDeleted();
  }

}
