import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialData} from '../lib/course-seed.mjs';

const base=process.env.API_TEST_BASE_URL;
const allowMockIdentity=process.env.API_TEST_WORKER_HEADERS==='1'&&base&&new URL(base).hostname==='127.0.0.1';
const course=initialData().courses.find(item=>item.id==='first-code');
const module=course.modules[0];
const lesson=module.lessons[0];
const answers=lesson.questions.map(question=>({id:question.id,value:question.answer}));

const learner=id=>({
 'oai-authenticated-user-id':id,
 'oai-authenticated-user-email':id+'@example.test',
});
function post(path,body,headers={}){
 return fetch(base+'/api/learning/'+path,{
  method:'POST',headers:{Origin:new URL(base).origin,'Content-Type':'application/json',...headers},
  body:JSON.stringify(body),
 });
}

test('Guest grading works and the public catalog contains no answer keys',{skip:!base},async()=>{
 const response=await fetch(base+'/api/library');
 assert.equal(response.status,200);
 const {library}=await response.json();
 const questions=library.courses.find(item=>item.id===course.id).modules[0].lessons[0].questions;
 assert.ok(questions.length);
 assert.ok(questions.every(question=>!Object.hasOwn(question,'answer')&&!Object.hasOwn(question,'explanation')));
 assert.equal((await fetch(base+'/course-seed.mjs')).status,404);
 assert.equal((await fetch(base+'/api/learning')).status,401);
 const invalid=await post('lesson',{courseId:course.id,lessonId:lesson.id,answers:[]});
 assert.equal(invalid.status,400);
 const valid=await post('lesson',{courseId:course.id,lessonId:lesson.id,answers});
 assert.equal(valid.status,200);
 const grade=await valid.json();
 assert.equal(grade.completed,true);
 assert.equal(grade.right,answers.length);
});

test('Server records progress per account and retries do not duplicate attempts',{skip:!allowMockIdentity},async()=>{
 const headers=learner('qa-'+crypto.randomUUID());
 const peer=learner('qa-'+crypto.randomUUID());
 const profile=async identity=>{
  const response=await fetch(base+'/api/learning',{headers:identity});
  assert.equal(response.status,200);
  return response.json();
 };
 const graded=await post('lesson',{courseId:course.id,lessonId:lesson.id,answers},headers);
 assert.equal(graded.status,200);
 const wrongAccount=await post('lesson',{courseId:course.id,lessonId:lesson.id,answers,account:peer['oai-authenticated-user-id']},headers);
 assert.equal(wrongAccount.status,401);
 const submission={id:crypto.randomUUID(),courseId:course.id,moduleId:module.id,answers};
 const first=await post('training',submission,headers);
 const retry=await post('training',submission,headers);
 assert.equal(first.status,200);
 assert.equal(retry.status,200);
 assert.deepEqual((await retry.json()).attempt,(await first.json()).attempt);
 const saved=await profile(headers);
 assert.deepEqual(saved.progress[course.id],[lesson.id]);
 assert.equal(saved.attemptCount,1);
 assert.equal(saved.attempts[0].right,answers.length);
 const other=await profile(peer);
 assert.deepEqual(other.progress,{});
 assert.deepEqual(other.attempts,[]);
 assert.equal((await fetch(base+'/api/admin/library',{headers})).status,403);
});

test('Published PDFs are readable and withdrawing the course restores the access check',{skip:!allowMockIdentity},async()=>{
 const admin=base+'/api/admin/';
 const headers={...learner('qa-owner'),Origin:new URL(base).origin};
 const original=await (await fetch(admin+'library',{headers})).json();
 assert.ok(original.library);
 const save=async(library,revision)=>{
  const response=await fetch(admin+'library',{
   method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({library,revision}),
  });
  assert.equal(response.status,200);
  return (await response.json()).revision;
 };
 const pdf=await readFile(new URL('./viewer-fixture.pdf',import.meta.url));
 const form=new FormData();
 form.append('kind','notes');
 form.append('file',new Blob([pdf],{type:'application/pdf'}),'test.pdf');
 const upload=await fetch(admin+'files',{method:'POST',headers,body:form});
 assert.equal(upload.status,201);
 const attachment=await upload.json();
 const updated=structuredClone(original.library);
 const published=updated.courses.find(item=>item.id===course.id);
 published.modules[0].lessons[0].attachments.push(attachment);
 const url=base+'/api/files/'+attachment.id;
 let revision=original.revision;
 try{
  revision=await save(updated,revision);
  const file=await fetch(url);
  assert.equal(file.status,200);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()),pdf);
  published.published=false;
  revision=await save(updated,revision);
  assert.equal((await fetch(url)).status,401);
  assert.equal((await fetch(url,{headers})).status,200);
 }finally{
  if(revision!==original.revision)await save(original.library,revision);
 }
});
