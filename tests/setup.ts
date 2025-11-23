import { Connection } from "@/index";

export async function setupTestDatabase() {

  // Initialize + connect
  await Connection.initialize({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'test_db',
    connectionLimit: 5,
  });

    await Connection.getInstance().connect();


}

export async function teardownTestDatabase() {
  const conn = Connection.getInstance();
  if (conn) {
    await conn.close();
  }
}

export async function cleanDatabase() {
  const conn = Connection.getInstance();
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('DROP TABLE IF EXISTS posts');
  await conn.query('DROP TABLE IF EXISTS users');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
}
