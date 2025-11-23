/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Pool, PoolConnection, PoolOptions, ResultSetHeader, createPool } from "mysql2/promise";
import { IConnectionStats } from "../interfaces/connection-stats";
import { IDatabaseConfig } from "../interfaces/database-config";

export class Connection {
  private static _instance: Connection;
  private _pool: Pool | null = null;
  private _config: IDatabaseConfig;
  private _connected: boolean = false;
  private _retries = 3;
  private _retryDelay = 1000; 
  
  private constructor(config: IDatabaseConfig) {
    this._config = config;
  }

  static async initialize(config: IDatabaseConfig): Promise<Connection> {
    if (!Connection._instance) {
      Connection._instance = new Connection(config);
      await Connection._instance.connect();
    }
    return Connection._instance;
  }

  static getInstance(): Connection {
    if(!Connection._instance) {
      throw new Error("Connection not initialized. Call initialize() first.")
    }
    return Connection._instance;
  }

  async connect(): Promise<void> {
    if (this._pool && this._connected) return;

    const poolConfig: PoolOptions = {
      host: this._config.host,
      port: this._config.port || 3306,
      user: this._config.user,
      password: this._config.password,
      database: this._config.database,
      connectionLimit: this._config.connectionLimit || 10,
      queueLimit: this._config.queueLimit || 0,
      waitForConnections: this._config.waitForConnections ?? true,
      charset: this._config.charset || 'utf8mb4',
      timezone: this._config.timezone || '+00:00',
      multipleStatements: this._config.multipleStatements || false,
      connectTimeout: this._config.connectTimeout || 10000,
      idleTimeout: this._config.idleTimeout || 60000,
      enableKeepAlive: this._config.enableKeepAlive ?? true,
      keepAliveInitialDelay: this._config.keepAliveInitialDelay || 10000,
    }

    this._pool = createPool(poolConfig);

    // Test Connection
    for (let attempt = 1; attempt <= this._retries; attempt++) {
      try {
        this._pool = createPool(poolConfig);
        const conn = await this._pool.getConnection();
        await conn.ping();
        conn.release();
        this._connected = true;
        return;
      } catch (error) {
        console.error(`Connection attempt ${attempt} failed:`, error);
        
        if (attempt === this._retries) {
          throw new Error(`Failed to connect after ${this._retries} attempts: ${error}`);
        }
        
        await this.sleep(this._retryDelay * attempt);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getPool(): Pool {
    if(!this._pool)
      throw new Error("Connection pool not initialized. Call connect() first.");

    return this._pool;
  }

  async getConnection(): Promise<PoolConnection> {
    return this.getPool().getConnection();
  }

  async query<T = any>(sql: string, values?: any[]): Promise<T> {
    try {
      const [rows] = await this.getPool().execute(sql, values);
      return rows as T;
    } catch (error) {
      console.error('Query error:', { sql, values, error });
      throw error;
    }
  }

  async execute<T = any>(sql: string, values?: any[]): Promise<[T, ResultSetHeader]> {
    try {
      return this.getPool().execute(sql, values) as unknown as Promise<[T, ResultSetHeader]>;
    } catch (error) {
      console.error('Execute error:', { sql, values, error });
      throw error;
    }
  }

  async getStats(): Promise<IConnectionStats> {
    if (!this._pool) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        queuedRequests: 0,
      };
    }

    const poolStats = (this._pool as any).pool;
    return {
      totalConnections: poolStats?._allConnections?.length || 0,
      activeConnections: poolStats?._acquiringConnections?.length || 0,
      idleConnections: poolStats?._freeConnections?.length || 0,
      queuedRequests: poolStats?._connectionQueue?.length || 0,
    };
  }

  isConnected(): boolean {
    return this._connected;
  }

  async ping(): Promise<boolean> {
    try {
      const conn = await this.getConnection();
      await conn.ping();
      conn.release();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
      this._connected = false;
    }
  }

}
