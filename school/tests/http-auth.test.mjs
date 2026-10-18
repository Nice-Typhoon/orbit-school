import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.API_TEST_BASE_URL;
test('Real HTTP endpoints reject anonymous editor access and cross-origin writes',{skip:!base},async()=>{
 const origin=new URL(base).origin;
 const session=await fetch(base+'/api/session');assert.equal(session.status,200);assert.equal((await session.json()).role,'anonymous');
 const publicLibrary=await fetch(base+'/api/library');assert.equal(publicLibrary.status,200);const content=await publicLibrary.json();assert.ok(content.library.courses.every(c=>c.published));
 const read=await fetch(base+'/api/admin/library');assert.equal(read.status,401);
 for(const [path,method,body] of [['admin/library','PUT','{}'],['admin/teachers','POST','{"email":"nobody@example.test"}'],['admin/files','POST','{}']]){
  const response=await fetch(base+'/api/'+path,{method,body,headers:{Origin:origin,'Content-Type':'application/json'}});assert.equal(response.status,401,path);
 }
 const cross=await fetch(base+'/api/admin/library',{method:'PUT',body:'{}',headers:{Origin:'https://other.example','Content-Type':'application/json'}});assert.equal(cross.status,403);
});
test('Real HTTP endpoints also reject signed-in users who have no teacher role',{skip:!base||process.env.API_TEST_STUDENT!=='1'},async()=>{
 const signin=await fetch(base+'/signin-with-chatgpt?return_to=%2F',{redirect:'manual'});
 const cookie=signin.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');assert.ok(cookie);
 const session=await fetch(base+'/api/session',{headers:{Cookie:cookie}});assert.equal((await session.json()).role,'student');
 for(const [path,method] of [['admin/library','GET'],['admin/library','PUT'],['admin/teachers','GET'],['admin/files','POST']]){
  const response=await fetch(base+'/api/'+path,{method,...method!=='GET'?{body:'{}'}:{},headers:{Cookie:cookie,Origin:new URL(base).origin,'Content-Type':'application/json'}});assert.equal(response.status,403,path);
 }
});
