import { Connection } from "../src/core/connection";
import { SoftDeleteModel } from "../src/modules/soft-delete";

interface TestArticleAttributes {
  id?: number;
  title: string;
  content: string;
  deleted_at?: Date | null;
}

class TestArticle extends SoftDeleteModel<TestArticleAttributes> {
  protected static _config = {
    table: 'test_articles',
    primaryKey: 'id',
  };
}

describe('SoftDeleteModel', () => {
  beforeAll(async () => {
    Connection.initialize({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'test_db',
    });
    await Connection.getInstance().connect();

    const conn = Connection.getInstance();
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS test_articles (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        deleted_at TIMESTAMP NULL DEFAULT NULL
      )
    `);
  });

  afterAll(async () => {
    const conn = Connection.getInstance();
    await conn.execute('DROP TABLE IF EXISTS test_articles');
    await Connection.getInstance().close();
  });

  beforeEach(async () => {
    const conn = Connection.getInstance();
    await conn.execute('TRUNCATE TABLE test_articles');
  });

  test('should soft delete record', async () => {
    const article = await TestArticle.create({
      title: 'Test Article',
      content: 'Content here',
    });

    await article.delete();

    // Regular query should not find it
    const notFound = await TestArticle.find(article.get('id')!);
    expect(notFound).toBeNull();

    // Check deleted_at is set
    expect(article.get('deleted_at')).toBeDefined();
    // expect(article.isDeleted()).toBe(true);
  });

  test('should query only non-deleted records', async () => {
    await TestArticle.create({ title: 'Article 1', content: 'Content 1' });
    const article2 = await TestArticle.create({ title: 'Article 2', content: 'Content 2' });
    await TestArticle.create({ title: 'Article 3', content: 'Content 3' });

    await article2.delete();

    const results = await TestArticle.query().execute();
    expect(results.length).toBe(2);
  });

  test('should query with trashed records', async () => {
    await TestArticle.create({ title: 'Article 1', content: 'Content 1' });
    const article2 = await TestArticle.create({ title: 'Article 2', content: 'Content 2' });
    await TestArticle.create({ title: 'Article 3', content: 'Content 3' });

    await article2.delete();

    const results = await TestArticle.withTrashed().execute();
    expect(results.length).toBe(3);
  });

  test('should query only trashed records', async () => {
    const article1 = await TestArticle.create({ title: 'Article 1', content: 'Content 1' });
    const article2 = await TestArticle.create({ title: 'Article 2', content: 'Content 2' });
    await TestArticle.create({ title: 'Article 3', content: 'Content 3' });

    await article1.delete();
    await article2.delete();

    const results = await TestArticle.onlyTrashed().execute();
    expect(results.length).toBe(2);
  });

  test('should restore deleted record', async () => {
    const article = await TestArticle.create({
      title: 'Test Article',
      content: 'Content here',
    });

    await article.delete();
    // expect(article.isDeleted()).toBe(true);

    await article.restore();
    // expect(article.isDeleted()).toBe(false);

    // Should be findable again
    const found = await TestArticle.find(article.get('id')!);
    expect(found).not.toBeNull();
  });

  test('should force delete record permanently', async () => {
    const article = await TestArticle.create({
      title: 'Test Article',
      content: 'Content here',
    });

    const id = article.get('id')!;
    await article.forceDelete();

    // Should not be findable even with withTrashed
    const notFound = await TestArticle.withTrashed()
      .where('id', '=', id)
      .first();
    expect(notFound).toBeNull();
  });
});
