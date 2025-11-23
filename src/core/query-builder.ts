/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { IJoinClause } from "../interfaces/join-clause";
import { IOrderClause } from "../interfaces/order-clause";
import { IWhereClause } from "../interfaces/where-clause";
import { TJoinType } from "../types/join.type";
import { TOrderDirection } from "../types/order-direction.type";
import { TWhereOperator } from "../types/where-operator.type";
import { Connection } from "./connection";

export class QueryBuilder<T = any> {
  private _tableName: string;
  private _selectFields: string[]  = ["*"];
  private _whereClauses: IWhereClause[] = [];
  private _joinClauses: IJoinClause[] = [];
  private _orderClauses: IOrderClause[] = [];
  private _limitValue?: number;
  private _offsetValue?: number;
  private _groupByFields: string[] = [];
  private _havingClause?: string;
  private _params: any[] = [];
  private _distinctFlag = false;
  private _forUpdateFlag = false;
  private _lockInShareModeFlag = false;

  constructor(table: string) {
    this._tableName = table;
  }

  select(...fields: string[]): this {
    this._selectFields = fields.length > 0 ? fields : ['*'];
    return this;
  }


  where(field: string, operator: TWhereOperator, value?: any): this {
    this._whereClauses.push({
      field, 
      operator, 
      value, 
      logic: this._whereClauses.length === 0 ? 'AND' : 'AND'
    });

    if(value !== undefined && operator !== 'IS NULL' && operator !== 'IS NOT NULL') {
      if(operator === 'IN' || operator === 'NOT IN') {
        this._params.push(...value);
      } else {
        this._params.push(value);
      }
    }

    return this;
  }

  orWhere(field: string, operator: TWhereOperator, value?: any): this {
    this._whereClauses.push({
      field,
      operator,
      value,
      logic: 'OR',
    });
    if (value !== undefined && operator !== 'IS NULL' && operator !== 'IS NOT NULL') {
      if (operator === 'IN' || operator === 'NOT IN') {
        this._params.push(...value);
      } else {
        this._params.push(value);
      }
    }
    return this;
  }

  whereIn(field: string, values: any[]): this {
    return this.where(field, 'IN', values);
  }

  whereNotIn(field: string, values: any[]): this {
    return this.where(field, 'NOT IN', values);
  }

  whereBetween(field: string, min: any, max: any): this {
    this._whereClauses.push({
      field,
      operator: 'BETWEEN',
      value: [min, max],
      logic: this._whereClauses.length === 0 ? 'AND' : 'AND',
    });
    this._params.push(min, max);
    return this;
  }

  whereNull(field: string): this {
    return this.where(field, 'IS NULL');
  }

  whereNotNull(field: string): this {
    return this.where(field, 'IS NOT NULL');
  }

  whereRaw(sql: string, bindings?: any[]): this {
    // For complex where clauses
    this._whereClauses.push({
      field: sql,
      operator: '=' as TWhereOperator,
      value: undefined,
      logic: this._whereClauses.length === 0 ? 'AND' : 'AND',
    });
    if (bindings) {
      this._params.push(...bindings);
    }
    return this;
  }

  // private addWhereClause(field: string, operator: TWhereOperator, value: any, logic: 'AND' | 'OR'): void {
  //   this._whereClauses.push({
  //     field,
  //     operator,
  //     value,
  //     logic: this._whereClauses.length === 0 ? 'AND' : logic,
  //   });

  //   if (value !== undefined && operator !== 'IS NULL' && operator !== 'IS NOT NULL') {
  //     if (operator === 'IN' || operator === 'NOT IN') {
  //       this._params.push(...value);
  //     } else {
  //       this._params.push(value);
  //     }
  //   }
  // }


  join(table: string, on: string, type: TJoinType = 'INNER'): this {
    this._joinClauses.push({ type, table, on });
    return this;
  }

  leftJoin(table: string, on: string): this {
    return this.join(table, on, 'LEFT');
  }

  rightJoin(table: string, on: string): this {
    return this.join(table, on, 'RIGHT');
  }
  crossJoin(table: string): this {
    return this.join(table, '', 'CROSS');
  }


  orderBy(field: string, direction: TOrderDirection = 'ASC'): this {
    this._orderClauses.push({ field, direction });
    return this;
  }

  orderByRaw(sql: string): this {
    this._orderClauses.push({ field: sql, direction: 'ASC' });
    return this;
  }

  groupBy(...fields: string[]): this {
    this._groupByFields.push(...fields);
    return this;
  }

  having(condition: string): this {
    this._havingClause = condition;
    return this;
  }

  limit(value: number): this {
    this._limitValue = Math.max(0, Math.floor(value));
    return this;
  }

  offset(value: number): this {
    this._offsetValue = Math.max(0, Math.floor(value));
    return this;
  }

  forUpdate(): this {
    this._forUpdateFlag = true;
    return this;
  }

  lockInShareMode(): this {
    this._lockInShareModeFlag = true;
    return this;
  }

  toSQL(): { sql: string; params: any[] } {
    const parts: string[] = [];
    
    // SELECT
    parts.push('SELECT');
    if (this._distinctFlag) parts.push('DISTINCT');
    parts.push(this._selectFields.join(', '));
    
    // FROM
    parts.push('FROM', this._tableName);

    // JOINS
    for (const j of this._joinClauses) {
      if (j.type === 'CROSS') {
        parts.push(`CROSS JOIN ${j.table}`);
      } else {
        parts.push(`${j.type} JOIN ${j.table} ON ${j.on}`);
      }
    }

    // WHERE
    if (this._whereClauses.length > 0) {
      parts.push(this.buildWhereClause());
    }

    // GROUP BY
    if (this._groupByFields.length > 0) {
      parts.push('GROUP BY', this._groupByFields.join(', '));
    }

    // HAVING
    if (this._havingClause) {
      parts.push('HAVING', this._havingClause);
    }

    // ORDER BY
    if (this._orderClauses.length > 0) {
      const orderBy = this._orderClauses
        .map(o => `${o.field} ${o.direction}`)
        .join(', ');
      parts.push('ORDER BY', orderBy);
    }

    // LIMIT & OFFSET
    if (this._limitValue !== undefined) {
      parts.push('LIMIT', String(this._limitValue));
    }
    if (this._offsetValue !== undefined) {
      parts.push('OFFSET', String(this._offsetValue));
    }

    // LOCKING
    if (this._forUpdateFlag) {
      parts.push('FOR UPDATE');
    } else if (this._lockInShareModeFlag) {
      parts.push('LOCK IN SHARE MODE');
    }

    return { sql: parts.join(' '), params: this._params };
  }

  private buildWhereClause(): string {
    const clauses = this._whereClauses.map((w, i) => {
      const logic = i === 0 ? 'WHERE' : w.logic;
      
      if (w.operator === 'IS NULL' || w.operator === 'IS NOT NULL') {
        return `${logic} ${w.field} ${w.operator}`;
      } else if (w.operator === 'IN' || w.operator === 'NOT IN') {
        const placeholders = w.value.map(() => '?').join(', ');
        return `${logic} ${w.field} ${w.operator} (${placeholders})`;
      } else if (w.operator === 'BETWEEN') {
        return `${logic} ${w.field} BETWEEN ? AND ?`;
      } else {
        return `${logic} ${w.field} ${w.operator} ?`;
      }
    });
    return clauses.join(' ');
  }

  async execute(): Promise<T[]> {
    const { sql, params } = this.toSQL();
    const conn = Connection.getInstance();
    return await conn.query<T[]>(sql, params);
  }

  async first(): Promise<T | null> {
    this.limit(1);
    const results = await this.execute();
    return results.length > 0 ? results[0] : null;
  }

  async count(): Promise<number> {
    const originalFields = this._selectFields;
    const originalDistinct = this._distinctFlag;
    
    this._selectFields = ['COUNT(*) as count'];
    this._distinctFlag = false;
    
    const { sql, params } = this.toSQL();
    
    this._selectFields = originalFields;
    this._distinctFlag = originalDistinct;
    
    const conn = Connection.getInstance();
    const result = await conn.query<Array<{ count: number }>>(sql, params);
    return Number(result[0]?.count) || 0;
  }

  async exists(): Promise<boolean> {
    return (await this.count()) > 0;
  }

  async pluck(field: string): Promise<any[]> {
    this.select(field);
    const results = await this.execute();
    return results.map((r: any) => r[field]);
  }

  async avg(field: string): Promise<number> {
    this._selectFields = [`AVG(${field}) as avg`];
    const { sql, params } = this.toSQL();
    const conn = Connection.getInstance();
    const result = await conn.query<Array<{ avg: number }>>(sql, params);
    return Number(result[0]?.avg) || 0;
  }

  async sum(field: string): Promise<number> {
    this._selectFields = [`SUM(${field}) as sum`];
    const { sql, params } = this.toSQL();
    const conn = Connection.getInstance();
    const result = await conn.query<Array<{ sum: number }>>(sql, params);
    return Number(result[0]?.sum) || 0;
  }

  async min(field: string): Promise<number> {
    this._selectFields = [`MIN(${field}) as min`];
    const { sql, params } = this.toSQL();
    const conn = Connection.getInstance();
    const result = await conn.query<Array<{ min: number }>>(sql, params);
    return Number(result[0]?.min) || 0;
  }

  async max(field: string): Promise<number> {
    this._selectFields = [`MAX(${field}) as max`];
    const { sql, params } = this.toSQL();
    const conn = Connection.getInstance();
    const result = await conn.query<Array<{ max: number }>>(sql, params);
    return Number(result[0]?.max) || 0;
  }

  chunk(size: number, callback: (rows: T[], page: number) => Promise<boolean | void>): AsyncGenerator<T[], void, unknown> {
    return this.chunkGenerator(size, callback);
  }

  private async *chunkGenerator(size: number, callback: (rows: T[], page: number) => Promise<boolean | void>): AsyncGenerator<T[], void, unknown> {
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const clone = this.clone();
      clone.limit(size).offset(page * size);
      
      const rows = await clone.execute();
      
      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      const shouldContinue = await callback(rows, page);
      if (shouldContinue === false) {
        hasMore = false;
      }

      yield rows;
      page++;
      
      if (rows.length < size) {
        hasMore = false;
      }
    }
  }

  clone(): QueryBuilder<T> {
    const clone = new QueryBuilder<T>(this._tableName);
    clone._selectFields = [...this._selectFields];
    clone._whereClauses = [...this._whereClauses];
    clone._joinClauses = [...this._joinClauses];
    clone._orderClauses = [...this._orderClauses];
    clone._groupByFields = [...this._groupByFields];
    clone._params = [...this._params];
    clone._limitValue = this._limitValue;
    clone._offsetValue = this._offsetValue;
    clone._havingClause = this._havingClause;
    clone._distinctFlag = this._distinctFlag;
    clone._forUpdateFlag = this._forUpdateFlag;
    clone._lockInShareModeFlag = this._lockInShareModeFlag;
    return clone;
  }
}
