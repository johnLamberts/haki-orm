# HakiORM - Node.js MySQL ORM

A lightweight, TypeScript-first ORM for Node.js built on MySQL. Inspired by Laravel's Eloquent and Mongoose, Haki ORM brings modern, intuitive database interactions to SQL while keeping your workflow simple and type-safe.

### Why HakiORM?
  - Works naturally with TypeScript types for safe queries
  - Provides am active record & repostiory pattern
  - Fluent query builder similar to NoSQL API (mongoose, firebase)
  - Built-in transactions, soft deletes, pagination, caching and job scheduling
  - Optimized for performance monitoring and large scale operations
  - Designed for developer productivity, not just RAW SQL

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
- [Advanced Features](#advanced-features)
- [Utilities](#utilities)
- [API Reference](#api-reference)

##  Features

### Core Features
- **Active Record Pattern**: Intuitive model-based data manipulation
- **Query Builder**: Fluent, chainable query interface
- **Transactions**: ACID-compliant transaction support
- **Connections**: Efficient connection pooling

### Advanced Features
- **Repository Pattern**: Clean data access layer
<!-- - **Pagination**: Multiple pagination strategies (standard, simple, cursor)
- **Soft Deletes**: Non-destructive data deletion
- **Schema Management**: Index and trigger management
- **Job Scheduling**: Cron-like task scheduling
- **Database Jobs**: Pre-built maintenance tasks -->

### Utilities
<!-- - **Query Logging**: Track and analyze SQL queries -->
<!-- - **Batch Processing**: Efficient bulk operations -->
<!-- - **SQL Sanitization**: Prevent SQL injection -->
<!-- - **Caching**: Flexible caching layer -->
- **Data Generation**: Test data creation
- **Performance Monitoring**: Track operation performance
<!-- - **Validation**: Comprehensive data validation -->
<!-- - **String Helpers**: Utility functions for strings -->

## 📦 Installation

```bash

npm install @haki-orm/mysql mysql2

```

## Quick Start

### 1. Setup Connection

```typescript
import { Connection, Model } from './orm-library';

const connection = new Connection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'myapp',
  connectionLimit: 10
});

await connection.connect();
Model.setConnection(connection);
```

### 2. Define Models

```typescript
class User extends Model {
  static tableName = 'users';
  static fillable = ['name', 'email', 'age'];
  static hidden = ['password'];
}

class Post extends Model {
  static tableName = 'posts';
  static fillable = ['title', 'content', 'user_id'];
}
```

### 3. Basic CRUD Operations

```typescript
// Create
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});

// Read
const foundUser = await User.find(1);
const allUsers = await User.all();
const admins = await User.where('role', '=', 'admin');

// Update
await user.update({ age: 31 });

// Delete
await user.delete();
```

## Core Features

### Query Builder

Build complex queries with a fluent interface:

```typescript
const posts = await Post.query()
  .select('posts.*', 'users.name as author')
  .join('users', 'posts.user_id', '=', 'users.id')
  .where('posts.published', '=', true)
  .where('posts.views', '>', 100)
  .orderBy('posts.created_at', 'DESC')
  .limit(10)
  .get();
```

### Transactions

Ensure data integrity with transactions:

```typescript
await Transaction.run(connection, async (trx) => {
  await trx.execute(
    'INSERT INTO users (name) VALUES (?)',
    ['John']
  );
  
  await trx.execute(
    'INSERT INTO profiles (user_id) VALUES (?)',
    [1]
  );
});
```

### Repository Pattern

Clean separation of data access logic:

```typescript
const userRepo = new Repository(User);

const user = await userRepo.findBy('email', 'john@example.com');
const users = await userRepo.findMany([1, 2, 3]);
const latest = await userRepo.latest('created_at', 5);

await userRepo.chunk(100, async (users) => {
  // Process 100 users at a time
});
```

<!-- ### Pagination

Multiple pagination strategies:

```typescript
const paginator = new Paginator(User.query());

// Standard pagination
const page = await paginator.paginate(1, 20);
console.log(`Page ${page.currentPage} of ${page.lastPage}`);

// Simple pagination (no count)
const simple = await paginator.simplePaginate(1, 20);

// Cursor pagination (infinite scroll)
const cursor = await paginator.cursorPaginate(null, 20);
```

### Soft Deletes

Non-destructive deletion:

```typescript
class Post extends SoftDeleteModel {
  static tableName = 'posts';
}

const post = await Post.find(1);
await post.delete(); // Soft delete

const trashed = await Post.onlyTrashed();
await post.restore();
await post.forceDelete(); // Permanent delete
```

## 🎯 Advanced Features

### Index Management

```typescript
const indexManager = new IndexManager(connection);

await indexManager.createIndex('users', ['email'], 'idx_email', 'UNIQUE');
await indexManager.createFulltextIndex('posts', ['title', 'content']);

const indexes = await indexManager.listIndexes('users');
await indexManager.optimizeTable('users');
```

### Trigger Management

```typescript
const triggerManager = new TriggerManager(connection);

// Create audit triggers
await triggerManager.createAuditTrigger('users', 'users_audit');

// Create timestamp triggers
await triggerManager.createTimestampTrigger('posts');

const triggers = await triggerManager.listTriggers('users');
```

### Job Scheduling

```typescript
const scheduler = new JobScheduler();
const dbJobs = new DatabaseJobs(connection, scheduler);

// Cleanup old records daily at 2 AM
dbJobs.registerCleanupJob('logs', 'created_at', 30, '0 2 * * *');

// Optimize tables weekly
dbJobs.registerOptimizeJob(['users', 'posts'], '0 4 * * 0');

scheduler.start();
``` -->

## 🛠 Utilities

<!-- ### Query Logging

```typescript
const logger = new QueryLogger();
logger.enable();

logger.log('SELECT * FROM users', [], 25);

const slowQueries = logger.getSlowQueries(1000);
const stats = logger.getStats();
```

### Batch Processing

```typescript
const users = [...]; // Large array

await BatchProcessor.batchInsert(connection, 'users', users, 100);

await BatchProcessor.processWithProgress(
  users,
  50,
  async (batch) => batch,
  (processed, total) => console.log(`${processed}/${total}`)
);
```

### Caching

```typescript
const cache = new CacheManager({ ttl: 3600 });

cache.set('user:1', userData, 300);
const user = cache.get('user:1');

const posts = await cache.remember('posts:latest', async () => {
  return await Post.query().limit(10).get();
});
``` -->

### Data Generation

```typescript
const user = DataGenerator.generateUser();
const users = DataGenerator.generateUsers(100);
const products = DataGenerator.generateProducts(50);

const email = DataGenerator.randomEmail();
const name = DataGenerator.randomName();
const date = DataGenerator.randomDate();
```

### Performance Monitoring

```typescript
const monitor = new PerformanceMonitor();

await monitor.measure('fetch-users', async () => {
  return await User.query().limit(100).get();
});

const stats = monitor.getStats('fetch-users');
const slowest = monitor.getSlowestOperations(5);
const report = monitor.generateReport();
```

<!-- ### Validation

```typescript
const validator = Validator.make(data, {
  name: 'required|minLength:3',
  email: 'required|email',
  age: 'required|numeric|min:18'
});

if (validator.fails()) {
  console.log(validator.getErrors());
}
```

### String Helpers

```typescript
StringHelpers.camelCase('user-name');        // userName
StringHelpers.snakeCase('userName');         // user_name
StringHelpers.kebabCase('userName');         // user-name
StringHelpers.pascalCase('user-name');       // UserName
StringHelpers.plural('user');                // users
StringHelpers.slug('Hello World!');          // hello-world
StringHelpers.truncate('Long text', 10);     // Long te...
``` -->

## 📚 API Reference

### Connection

```typescript
const connection = new Connection(config);
await connection.connect();
await connection.disconnect();
await connection.query(sql, params);
await connection.execute(sql, params);
const stats = await connection.getStats();
```

### Model

```typescript
static async all<T>(): Promise<T[]>
static async find<T>(id): Promise<T | null>
static async findBy<T>(column, value): Promise<T | null>
static async create<T>(data): Promise<T>
static async where<T>(column, operator, value): Promise<T[]>
async save(): Promise<this>
async update(data): Promise<this>
async delete(): Promise<void>
async refresh(): Promise<this>
```

### Query Builder

```typescript
select(...columns)
where(column, operator, value)
orWhere(column, operator, value)
whereIn(column, values)
whereNull(column)
whereLike(column, pattern)
join(table, first, operator, second)
leftJoin(table, first, operator, second)
orderBy(column, direction)
groupBy(...columns)
limit(value)
offset(value)
async get()
async first()
async count()
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this in your projects!

## 🙏 Acknowledgments

Built with TypeScript and MySQL2, inspired by Laravel's Eloquent ORM.

---

For more examples and detailed documentation, check out the `usage.ts` file.
