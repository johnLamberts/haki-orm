// import { config } from "dotenv";
// import { Connection } from "../src/core/connection";
// import { Transaction } from "../src/core/transaction";
// import { CreatePostsTable } from "./migrations/create_posts_table";
// import { CreateUsersTable } from "./migrations/create_users_table";
// import { Post } from "./models/post";
// import { User } from "./models/user";
// config();

// async function main() {
//   // Initialize connection
//   Connection.initialize({
//     host: 'localhost',
//     user: 'root',
//     password: 'password',
//     database: 'my_app',
//     connectionLimit: 10,
//   });

//   await Connection.getInstance().connect();

//   // ============ CRUD OPERATIONS ============

//   // Create a user
//   const user = await User.create({
//     email: 'john@example.com',
//     name: 'John Doe',
//     password: 'hashed_password',
//   });
//   console.log('Created user:', user.toJSON());

//   // Find by ID
//   const foundUser = await User.find(user.id!);
//   console.log('Found user:', foundUser?.toJSON());

//   // Update
//   foundUser?.set('name', 'John Smith');
//   await foundUser?.save();

//   // Custom query
//   const johnUser = await User.findByEmail('john@example.com');
//   console.log('Found by email:', johnUser?.toJSON());

//   // ============ QUERY BUILDER ============

//   // Complex queries
//   const activeUsers = await User.query()
//     .select('id', 'name', 'email')
//     .where('created_at', '>', '2024-01-01')
//     .orderBy('created_at', 'DESC')
//     .limit(10)
//     .execute();

//   // Joins
//   const postsWithAuthors = await Post.query()
//     .select('posts.*', 'users.name as author_name')
//     .join('users', 'posts.user_id = users.id')
//     .where('posts.published', '=', true)
//     .execute();

//   // Aggregations
//   const postCount = await Post.query()
//     .where('user_id', '=', user.id!)
//     .count();
//   console.log('Post count:', postCount);

//   // ============ RELATIONSHIPS ============

//   // Create related records
//   const post = await Post.create({
//     user_id: user.id!,
//     title: 'My First Post',
//     content: 'This is the content...',
//     published: true,
//   });

//   // Load relationships
//   const userPosts = await user.posts();
//   const postAuthor = await post.author();

//   // ============ TRANSACTIONS ============

//   await Transaction.run(async (trx) => {
//     // All queries in this block are part of the transaction
//     await trx.query(
//       'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
//       ['jane@example.com', 'Jane Doe', 'hashed_password']
//     );

//     await trx.query(
//       'UPDATE users SET name = ? WHERE email = ?',
//       ['Jane Smith', 'jane@example.com']
//     );

//     // If any error occurs, transaction will rollback automatically
//   });

//   // ============ BULK OPERATIONS ============

//   // Bulk insert
//   await User.insert([
//     { email: 'user1@example.com', name: 'User 1', password: 'pass1' },
//     { email: 'user2@example.com', name: 'User 2', password: 'pass2' },
//     { email: 'user3@example.com', name: 'User 3', password: 'pass3' },
//   ]);

//   // Bulk update
//   await User.update(
//     { name: 'Updated Name' },
//     { email: 'user1@example.com' }
//   );

//   // Bulk delete
//   await User.delete({ email: 'user1@example.com' });

//   // ============ RAW QUERIES ============

//   const conn = Connection.getInstance();
//   const rawResults = await conn.query<any[]>(
//     'SELECT * FROM users WHERE created_at > ?',
//     ['2024-01-01']
//   );

//   // Clean up
//   await Connection.getInstance().close();
// }

// // Run migrations
// export async function runMigrations() {
//   Connection.initialize({
//     host: 'localhost',
//     user: 'root',
//     password: process.env.DB_PASSWORD as string,
//     database: 'my_app',
//   });

//   await Connection.getInstance().connect();

//   const migrations = [
//     new CreateUsersTable(),
//     new CreatePostsTable(),
//   ];

//   for (const migration of migrations) {
//     await migration.up();
//     console.log(`Ran migration: ${migration.constructor.name}`);
//   }

//   await Connection.getInstance().close();
// }


