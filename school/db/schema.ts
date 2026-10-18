import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const library=sqliteTable('library',{
 id:text('id').primaryKey(), content:text('content').notNull(),
 revision:integer('revision').notNull().default(1), updatedAt:text('updated_at').notNull(),
});
export const teachers=sqliteTable('teachers',{
 email:text('email').primaryKey(), userId:text('user_id'), createdAt:text('created_at').notNull(),
});
