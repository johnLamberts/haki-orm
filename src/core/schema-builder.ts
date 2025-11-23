/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export class SchemaBuilder {
  private tableName: string;
  private columns: string[] = [];
  private primaryKey?: string;

  constructor(table: string) {
    this.tableName = table;
  }

  unsigned(columnIndex: number = -1): this {
    const idx = columnIndex === -1 ? this.columns.length - 1 : columnIndex;
    this.columns[idx] += ' UNSIGNED';
    return this;
  }

  id(name: string = 'id'): this {
    this.columns.push(`${name} BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`);
    this.primaryKey = name;
    return this;
  }

  string(name: string, length: number = 255): this {
    this.columns.push(`${name} VARCHAR(${length})`);
    return this;
  }

  text(name: string): this {
    this.columns.push(`${name} TEXT`);
    return this;
  }

  integer(name: string): this {
    this.columns.push(`${name} INT`);
    return this;
  }

  bigInteger(name: string): this {
    this.columns.push(`${name} BIGINT`);
    return this;
  }

  float(name: string): this {
    this.columns.push(`${name} FLOAT`);
    return this;
  }

  decimal(name: string, precision: number = 10, scale: number = 2): this {
    this.columns.push(`${name} DECIMAL(${precision}, ${scale})`);
    return this;
  }

  boolean(name: string): this {
    this.columns.push(`${name} BOOLEAN`);
    return this;
  }

  date(name: string): this {
    this.columns.push(`${name} DATE`);
    return this;
  }

  datetime(name: string): this {
    this.columns.push(`${name} DATETIME`);
    return this;
  }

  timestamp(name: string): this {
    this.columns.push(`${name} TIMESTAMP`);
    return this;
  }

  timestamps(): this {
    this.columns.push(`created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    this.columns.push(`updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    return this;
  }

  json(name: string): this {
    this.columns.push(`${name} JSON`);
    return this;
  }

  nullable(columnIndex: number = -1): this {
    const idx = columnIndex === -1 ? this.columns.length - 1 : columnIndex;
    this.columns[idx] += ' NULL';
    return this;
  }

  notNullable(columnIndex: number = -1): this {
    const idx = columnIndex === -1 ? this.columns.length - 1 : columnIndex;
    this.columns[idx] += ' NOT NULL';
    return this;
  }

  unique(columnIndex: number = -1): this {
    const idx = columnIndex === -1 ? this.columns.length - 1 : columnIndex;
    this.columns[idx] += ' UNIQUE';
    return this;
  }

  default(value: any, columnIndex: number = -1): this {
    const idx = columnIndex === -1 ? this.columns.length - 1 : columnIndex;
    const defaultValue = typeof value === 'string' ? `'${value}'` : value;
    this.columns[idx] += ` DEFAULT ${defaultValue}`;
    return this;
  }

  foreign(column: string, references: string, on: string): this {
    this.columns.push(`FOREIGN KEY (${column}) REFERENCES ${on}(${references})`);
    return this;
  }

  toCreateSQL(): string {
    return `CREATE TABLE IF NOT EXISTS ${this.tableName} (\n  ${this.columns.join(',\n  ')}\n)`;
  }
}
