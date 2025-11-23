/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Connection } from "../../core/connection";
import { TIndexType } from "../../types/index.type";

export class IndexManager {
  private _tableName: string;

  constructor(tableName: string){
    this._tableName = tableName;
  }

  /**
   * Create an index on table
   */
  async createIndex(
    name: string,
    columns: string | string[],
    type: TIndexType = 'INDEX'
  ): Promise<void> {
    const conn = Connection.getInstance();
    const cols = Array.isArray(columns) ? columns : [columns];
    const columnList = cols.join(', ');

    const sql = `CREATE ${type} ${name} ON ${this._tableName} (${columnList})`;
    await conn.execute(sql);
  }

  /**
   * Drop an index
   */
  async dropIndex(name: string): Promise<void> {
    const conn = Connection.getInstance();
    const sql = `DROP INDEX ${name} ON ${this._tableName}`;
    await conn.execute(sql);
  }

  /**
   * Create a unique index
   */
  async createUniqueIndex(name: string, columns: string | string[]): Promise<void> {
    await this.createIndex(name, columns, 'UNIQUE');
  }

  /**
   * Create a fulltext index
   */
  async createFulltextIndex(name: string, columns: string | string[]): Promise<void> {
    await this.createIndex(name, columns, 'FULLTEXT');
  }

  /**
   * List all indexes on table
   */
  async listIndexes(): Promise<any[]> {
    const conn = Connection.getInstance();
    const sql = `SHOW INDEX FROM ${this._tableName}`;
    return await conn.query(sql);
  }

  /**
   * Check if index exists
   */
  async indexExists(name: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.some((idx: any) => idx.Key_name === name);
  }

  /**
   * Analyze table indexes for optimization suggestions
   */
  async analyzeIndexes(): Promise<any> {
    const conn = Connection.getInstance();
    
    // Get table stats
    const stats = await conn.query(`
      SELECT 
        INDEX_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX,
        COLUMN_NAME,
        CARDINALITY,
        INDEX_TYPE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [this._tableName]);

    // Get unused indexes
    const unusedIndexes = await conn.query(`
      SELECT 
        t.TABLE_SCHEMA,
        t.TABLE_NAME,
        s.INDEX_NAME
      FROM INFORMATION_SCHEMA.TABLES t
      LEFT JOIN INFORMATION_SCHEMA.STATISTICS s 
        ON t.TABLE_SCHEMA = s.TABLE_SCHEMA 
        AND t.TABLE_NAME = s.TABLE_NAME
      LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage i
        ON s.TABLE_SCHEMA = i.OBJECT_SCHEMA
        AND s.TABLE_NAME = i.OBJECT_NAME
        AND s.INDEX_NAME = i.INDEX_NAME
      WHERE t.TABLE_SCHEMA = DATABASE()
        AND t.TABLE_NAME = ?
        AND s.INDEX_NAME IS NOT NULL
        AND s.INDEX_NAME != 'PRIMARY'
        AND (i.COUNT_STAR = 0 OR i.COUNT_STAR IS NULL)
    `, [this._tableName]);

    return {
      indexes: stats,
      unusedIndexes,
      suggestions: this.generateIndexSuggestions(stats),
    };
  }

  private generateIndexSuggestions(stats: any[]): string[] {
    const suggestions: string[] = [];

    // Check for missing indexes on foreign keys
    // Check for redundant indexes
    // Check for low cardinality indexes

    if (stats.length === 0) {
      suggestions.push('No indexes found. Consider adding indexes on frequently queried columns.');
    }

    return suggestions;
  }
}
