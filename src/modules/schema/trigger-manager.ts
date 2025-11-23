/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Connection } from "../../core/connection";
import { TTriggerEvent } from "../../types/trigger-event.type";
import { TTriggerTiming } from "../../types/trigger-time.type";

export class TriggerManager {
  /**
   * Create a trigger
   */
  async createTrigger(
    name: string,
    timing: TTriggerTiming,
    event: TTriggerEvent,
    table: string,
    statement: string
  ): Promise<void> {
    const conn = Connection.getInstance();
    
    const sql = `
      CREATE TRIGGER ${name}
      ${timing} ${event} ON ${table}
      FOR EACH ROW
      ${statement}
    `;
    
    await conn.execute(sql);
  }

  /**
   * Drop a trigger
   */
  async dropTrigger(name: string): Promise<void> {
    const conn = Connection.getInstance();
    const sql = `DROP TRIGGER IF EXISTS ${name}`;
    await conn.execute(sql);
  }

  /**
   * List all triggers
   */
  async listTriggers(tableName?: string): Promise<any[]> {
    const conn = Connection.getInstance();
    
    let sql = `
      SELECT 
        TRIGGER_NAME,
        EVENT_MANIPULATION,
        EVENT_OBJECT_TABLE,
        ACTION_TIMING,
        ACTION_STATEMENT
      FROM INFORMATION_SCHEMA.TRIGGERS
      WHERE TRIGGER_SCHEMA = DATABASE()
    `;
    
    const params: any[] = [];
    if (tableName) {
      sql += ' AND EVENT_OBJECT_TABLE = ?';
      params.push(tableName);
    }
    
    return await conn.query(sql, params);
  }

  /**
   * Check if trigger exists
   */
  async triggerExists(name: string): Promise<boolean> {
    const conn = Connection.getInstance();
    const result = await conn.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TRIGGERS
      WHERE TRIGGER_SCHEMA = DATABASE()
        AND TRIGGER_NAME = ?
    `, [name]);
    
    return (result as any[])[0].count > 0;
  }

  /**
   * Create audit trigger (tracks changes)
   */
  async createAuditTrigger(
    tableName: string,
    auditTableName: string = `${tableName}_audit`
  ): Promise<void> {
    const conn = Connection.getInstance();

    // Create audit table if not exists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ${auditTableName} (
        audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(64) NOT NULL,
        operation VARCHAR(10) NOT NULL,
        record_id BIGINT UNSIGNED NOT NULL,
        old_data JSON,
        new_data JSON,
        changed_by VARCHAR(255),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_table_record (table_name, record_id),
        INDEX idx_changed_at (changed_at)
      )
    `);

    // Create INSERT trigger
    await this.createTrigger(
      `${tableName}_audit_insert`,
      'AFTER',
      'INSERT',
      tableName,
      `
      BEGIN
        INSERT INTO ${auditTableName} (table_name, operation, record_id, new_data, changed_by)
        VALUES ('${tableName}', 'INSERT', NEW.id, JSON_OBJECT('data', JSON_OBJECT()), USER());
      END
      `
    );

    // Create UPDATE trigger
    await this.createTrigger(
      `${tableName}_audit_update`,
      'AFTER',
      'UPDATE',
      tableName,
      `
      BEGIN
        INSERT INTO ${auditTableName} (table_name, operation, record_id, old_data, new_data, changed_by)
        VALUES ('${tableName}', 'UPDATE', NEW.id, JSON_OBJECT(), JSON_OBJECT(), USER());
      END
      `
    );

    // Create DELETE trigger
    await this.createTrigger(
      `${tableName}_audit_delete`,
      'AFTER',
      'DELETE',
      tableName,
      `
      BEGIN
        INSERT INTO ${auditTableName} (table_name, operation, record_id, old_data, changed_by)
        VALUES ('${tableName}', 'DELETE', OLD.id, JSON_OBJECT(), USER());
      END
      `
    );
  }

  /**
   * Create timestamp trigger (auto-update updated_at)
   */
  async createTimestampTrigger(tableName: string): Promise<void> {
    await this.createTrigger(
      `${tableName}_timestamp_update`,
      'BEFORE',
      'UPDATE',
      tableName,
      `
      BEGIN
        SET NEW.updated_at = CURRENT_TIMESTAMP;
      END
      `
    );
  }
}
