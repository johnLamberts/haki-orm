/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Connection, Model, Repository } from "../src";

interface TestUserAttributes {
  id?: number;
  email: string;
  name: string;
  age: number;
  active?: boolean;
}

class TestUser extends Model<TestUserAttributes> {
  protected static override _config = {
    table: 'test_users_complete',
    primaryKey: 'id',
  };
}

class TestUserRepository extends Repository<TestUserAttributes, TestUser> {
  constructor() {
    super(TestUser as any);
  }

  async findByEmail(email: string): Promise<TestUser | null> {
    return await this.findOneWhere({ email });
  }

  async findAdults(): Promise<TestUser[]> {
    return await this.findWhere({ active: true });
  }
}

describe('Repository Complete', () => {
  let repo: TestUserRepository;

  beforeAll(async () => {
    await Connection.initialize({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'test_db',
    });
    await Connection.getInstance().connect();

    const conn = Connection.getInstance();
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS test_users_complete (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        age INT NOT NULL,
        active BOOLEAN DEFAULT TRUE
      )
    `);
  });

  afterAll(async () => {
    const conn = Connection.getInstance();
    await conn.execute('DROP TABLE IF EXISTS test_users_complete');
    await Connection.getInstance().close();
  });

  beforeEach(async () => {
    const conn = Connection.getInstance();
    await conn.execute('TRUNCATE TABLE test_users_complete');
    repo = new TestUserRepository();
  });

  test('should create multiple records', async () => {
    await repo.createMany([
      { email: 'user1@test.com', name: 'User 1', age: 25 },
      { email: 'user2@test.com', name: 'User 2', age: 30 },
    ]);

    const count = await repo.count();
    expect(count).toBe(2);
  });

  test('should find many by IDs', async () => {
    const user1 = await repo.create({ email: 'user1@test.com', name: 'User 1', age: 25 });
    const user2 = await repo.create({ email: 'user2@test.com', name: 'User 2', age: 30 });

    const users = await repo.findMany([user1.get('id')!, user2.get('id')!]);
    expect(users.length).toBe(2);
  });

  test('should update many records', async () => {
    await repo.createMany([
      { email: 'user1@test.com', name: 'User 1', age: 25, active: true },
      { email: 'user2@test.com', name: 'User 2', age: 30, active: true },
    ]);

    const updated = await repo.updateMany({ active: true }, { age: 40 });
    expect(updated).toBe(2);
  });

  test('should delete many records', async () => {
    await repo.createMany([
      { email: 'user1@test.com', name: 'User 1', age: 25, active: false },
      { email: 'user2@test.com', name: 'User 2', age: 30, active: true },
    ]);

    const deleted = await repo.deleteMany({ active: false });
    expect(deleted).toBe(1);
    expect(await repo.count()).toBe(1);
  });

  test('should check existence', async () => {
    await repo.create({ email: 'test@test.com', name: 'Test', age: 25 });
    
    expect(await repo.exists({ email: 'test@test.com' })).toBe(true);
    expect(await repo.exists({ email: 'notfound@test.com' })).toBe(false);
  });

  test('should calculate aggregations', async () => {
    await repo.createMany([
      { email: 'user1@test.com', name: 'User 1', age: 20 },
      { email: 'user2@test.com', name: 'User 2', age: 30 },
      { email: 'user3@test.com', name: 'User 3', age: 40 },
    ]);

    expect(await repo.sum('age')).toBe(90);
    expect(await repo.avg('age')).toBe(30);
    expect(await repo.min('age')).toBe(20);
    expect(await repo.max('age')).toBe(40);
  });

  test('should process in chunks', async () => {
    await repo.createMany(
      Array.from({ length: 100 }, (_, i) => ({
        email: `user${i}@test.com`,
        name: `User ${i}`,
        age: 20 + i,
      }))
    );

    let totalProcessed = 0;
    await repo.chunk(25, async (items) => {
      totalProcessed += items.length;
    });

    expect(totalProcessed).toBe(100);
  });

  test('should pluck values', async () => {
    await repo.createMany([
      { email: 'user1@test.com', name: 'User 1', age: 25 },
      { email: 'user2@test.com', name: 'User 2', age: 30 },
    ]);

    const emails = await repo.pluck('email');
    expect(emails).toContain('user1@test.com');
    expect(emails).toContain('user2@test.com');
  });

  test('should paginate results', async () => {
    await repo.createMany(
      Array.from({ length: 50 }, (_, i) => ({
        email: `user${i}@test.com`,
        name: `User ${i}`,
        age: 20 + i,
      }))
    );

    const page1 = await repo.paginate(1, 10);
    expect(page1.data.length).toBe(10);
    expect(page1.meta.total).toBe(50);
    expect(page1.meta.lastPage).toBe(5);
    expect(page1.links.next).toBe(2);
  });
});
