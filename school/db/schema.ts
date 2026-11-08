import {sqliteTable,text,integer,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const library=sqliteTable('library',{
 id:text('id').primaryKey(), content:text('content').notNull(),
 revision:integer('revision').notNull().default(1), updatedAt:text('updated_at').notNull(),
 indexedRevision:integer('indexed_revision').notNull().default(0),
});
export const teachers=sqliteTable('teachers',{
 email:text('email').primaryKey(), userId:text('user_id'), createdAt:text('created_at').notNull(),
});

export const publishedCourses=sqliteTable('published_courses',{
 id:text('id').primaryKey(), content:text('content').notNull(),
});
export const publishedFiles=sqliteTable('published_files',{
 id:text('id').primaryKey(),
});
export const lessonProgress=sqliteTable('lesson_progress',{
 userId:text('user_id').notNull(),
 courseId:text('course_id').notNull(),
 lessonId:text('lesson_id').notNull(),
 completedAt:text('completed_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.courseId,t.lessonId]})]);
export const trainingAttempts=sqliteTable('training_attempts',{
 userId:text('user_id').notNull(),
 id:text('id').notNull(),
 courseId:text('course_id').notNull(),
 moduleId:text('module_id').notNull(),
 title:text('title').notNull(),
 right:integer('right').notNull(),
 total:integer('total').notNull(),
 date:text('date').notNull(),
},t=>[
 primaryKey({columns:[t.userId,t.id]}),
 index('training_attempts_user_date').on(t.userId,t.date,t.id),
]);
