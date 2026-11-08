import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {initialData} from '../lib/course-seed.mjs';
import {gradeAnswers} from '../lib/learning.mjs';
import {publicLibrary} from '../public/data.js';

test('The public library omits draft courses, answer keys and explanations',()=>{
 const seed=initialData();
 seed.courses[0].published=false;
 const visible=publicLibrary(seed);
 assert.ok(visible.courses.every(course=>course.published));
 assert.ok(!visible.courses.some(course=>course.id===seed.courses[0].id));
 const questions=visible.courses.flatMap(course=>course.modules.flatMap(module=>module.lessons.flatMap(lesson=>lesson.questions)));
 assert.ok(questions.length>0);
 assert.ok(questions.every(question=>!Object.hasOwn(question,'answer')&&!Object.hasOwn(question,'explanation')));
});

test('Answers are matched to the current questions and graded on the server',()=>{
 const questions=[
  {id:'a',type:'text',answer:'Ёлка',explanation:'Пояснение'},
  {id:'b',type:'choice',answer:'1',options:['1','2'],explanation:'Пояснение'},
 ];
 const answers=[{id:'a',value:' еЛКа '},{id:'b',value:'2'}];
 assert.equal(gradeAnswers(questions,answers).right,1);
 assert.throws(()=>gradeAnswers(questions,[...answers].reverse()),{status:400});
 assert.throws(()=>gradeAnswers(questions,[answers[0],{id:'b',value:'другой вариант'}]),{status:400});
});

test('Existing libraries can populate the indexes and withdrawing a course removes file access',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(readFileSync(new URL('../drizzle/0000_kind_eternity.sql',import.meta.url),'utf8'));
  const course={id:'course',published:true,modules:[{lessons:[{attachments:[{id:'file'}]}]}]};
  const content=()=>JSON.stringify({courses:[course]});
  db.prepare("INSERT INTO library (id,content,revision,updated_at) VALUES ('main',?,1,'2026-01-01')").run(content());
  db.exec(readFileSync(new URL('../drizzle/0001_student_backend.sql',import.meta.url),'utf8'));
  assert.equal(db.prepare("SELECT id FROM published_files WHERE id='file'").get(),undefined);
  db.exec("UPDATE library SET content=content WHERE indexed_revision<>revision");
  assert.equal(db.prepare("SELECT id FROM published_files WHERE id='file'").get()?.id,'file');
  assert.equal(db.prepare("SELECT id FROM published_courses WHERE id='course'").get()?.id,'course');
  course.published=false;
  db.prepare("UPDATE library SET content=?,revision=revision+1 WHERE id='main'").run(content());
  assert.equal(db.prepare("SELECT id FROM published_files WHERE id='file'").get(),undefined);
  assert.equal(db.prepare("SELECT id FROM published_courses WHERE id='course'").get(),undefined);
 }finally{db.close();}
});
