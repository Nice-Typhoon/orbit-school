CREATE TABLE `lesson_progress` (
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`completed_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `course_id`, `lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `published_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `published_files` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_attempts` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`course_id` text NOT NULL,
	`module_id` text NOT NULL,
	`title` text NOT NULL,
	`right` integer NOT NULL,
	`total` integer NOT NULL,
	`date` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `training_attempts_user_date` ON `training_attempts` (`user_id`,`date`,`id`);
--> statement-breakpoint
ALTER TABLE library ADD COLUMN indexed_revision integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE VIEW published_course_source AS
 SELECT json_extract(course.value, '$.id') AS id, course.value AS content
 FROM library, json_each(library.content, '$.courses') AS course
 WHERE library.id = 'main' AND json_extract(course.value, '$.published') = 1;
--> statement-breakpoint
CREATE VIEW published_file_source AS
 SELECT DISTINCT json_extract(file.value, '$.id') AS id
 FROM published_courses,
      json_each(published_courses.content, '$.modules') AS module,
      json_each(module.value, '$.lessons') AS lesson,
      json_each(lesson.value, '$.attachments') AS file
 WHERE json_type(file.value, '$.id') = 'text';
--> statement-breakpoint
CREATE TRIGGER library_index_after_insert AFTER INSERT ON library
 WHEN NEW.id = 'main'
 BEGIN
  INSERT INTO published_courses SELECT * FROM published_course_source;
  INSERT INTO published_files SELECT * FROM published_file_source;
  UPDATE library SET indexed_revision=NEW.revision WHERE id=NEW.id;
 END;
--> statement-breakpoint
CREATE TRIGGER library_index_after_update AFTER UPDATE OF content ON library
 WHEN NEW.id = 'main'
 BEGIN
  DELETE FROM published_files;
  DELETE FROM published_courses;
  INSERT INTO published_courses SELECT * FROM published_course_source;
  INSERT INTO published_files SELECT * FROM published_file_source;
  UPDATE library SET indexed_revision=NEW.revision WHERE id=NEW.id;
 END;
