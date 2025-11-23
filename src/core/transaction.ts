import { PoolConnection, RowDataPacket } from "mysql2/promise";
import { Connection } from "./connection";

export class Transaction {
  private _connection: PoolConnection;
  private completed = false;
  private _rolledBack = false;

  constructor(connection: PoolConnection) {
    this._connection = connection;
  }

  async begin(): Promise<void> {
    if(!this._connection) return;

    if(this.completed) 
      throw new Error('Transaction already completed');

    await this._connection.beginTransaction();
  }


  async commit(): Promise<void> {
    if(this.completed) {
      throw new Error('Transaction already completed')
    }

    if(this._rolledBack)
        throw new Error('Transaction was rolled back.');

    await this._connection.commit();
    this.completed = true;
    this._connection.release();
  }

  async rollback(): Promise<void> {
    if(this.completed) {
      throw new Error('Transaction already completed')
    }


    if(!this._rolledBack) {
      await this._connection.rollback();
      this.completed = true;
      this._connection?.release();
    }
  }

  async query<T = any>(sql: string, values?: any[]): Promise<T[]> {
    if (!this._connection) {
    throw new Error("Database connection not established");
  }

  const [rows] = await this._connection.execute<RowDataPacket[]>(sql, values);
  return rows as unknown as T[];
  }

  isCompleted(): boolean {
    return this.completed;
  }

  isRolledBack(): boolean {
    return this._rolledBack;
  }


  static async run<T>(callback: (trx: Transaction) => Promise<T>): Promise<T> {
    const conn = Connection.getInstance();
    const connection = await conn.getConnection();

    const trx = new Transaction(connection);

    try {
      await trx.begin();
      const result = await callback(trx);
      await trx.commit();
      return result;
    } catch(error) {
      await trx.rollback();
      throw error;
    }
  } 

  static async batch<T>(callbacks: Array<(trx: Transaction) => Promise<T>>): Promise<T[]> {
    const results: T[] = [];

    await this.run(async(trx) => {
      for(const callback of callbacks) {
        const result = await callback(trx);
        results.push(result);
      }
    });
    return results;
  }
}
