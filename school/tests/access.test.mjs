import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roleFor,assertTeacher,assertOwner,assertWriteOrigin} from '../lib/access.mjs';
import {validateLibrary} from '../lib/library-validation.mjs';
import {initialData} from '../public/data.js';
const owner={userId:'site-owner-id',email:'owner@example.test'};
const teacher={userId:'site-teacher-id',email:'teacher@example.test'};
test('Default is denied; signing in alone does not grant editing',()=>{
 assert.equal(roleFor(null,'owner@example.test',null),'anonymous');
 assert.equal(roleFor(teacher,'owner@example.test',null),'student');
 assert.equal(roleFor(owner,'',null),'student');
 assert.throws(()=>assertTeacher({role:'anonymous'}),e=>e.status===401);
 assert.throws(()=>assertTeacher({role:'student'}),e=>e.status===403);
});
test('Only the owner or an explicitly authorized teacher can edit',()=>{
 assert.equal(roleFor(owner,' OWNER@example.test ',null),'owner');
 assert.equal(roleFor(teacher,'owner@example.test',{email:'teacher@example.test',user_id:'site-teacher-id'}),'teacher');
 assert.equal(roleFor(teacher,'owner@example.test',{email:'teacher@example.test',user_id:'another-id'}),'student');
 assert.equal(roleFor(teacher,'owner@example.test',null),'student');
 assert.doesNotThrow(()=>assertTeacher({role:'teacher'}));
 assert.throws(()=>assertOwner({role:'teacher'}),e=>e.status===403);
 assert.doesNotThrow(()=>assertOwner({role:'owner'}));
});
test('Cross-origin and originless writes are rejected',()=>{
 assert.throws(()=>assertWriteOrigin(new Request('https://school.example/api/admin/library',{method:'PUT'})),e=>e.status===403);
 assert.throws(()=>assertWriteOrigin(new Request('https://school.example/api/admin/library',{method:'PUT',headers:{Origin:'https://attacker.example'}})),e=>e.status===403);
 assert.doesNotThrow(()=>assertWriteOrigin(new Request('https://school.example/api/admin/library',{method:'PUT',headers:{Origin:'https://school.example'}})));
});
test('Server validates nested courses and rejects malformed import data',()=>{
 const seed=initialData();assert.ok(validateLibrary(seed));
 const invalid=structuredClone(seed);invalid.courses[0].modules[0].lessons[0].questions[0].answer='not an option';
 assert.throws(()=>validateLibrary(invalid),e=>e.status===400);
 const traversal=structuredClone(seed);traversal.courses[0].modules[0].lessons[0].attachments.push({id:'../../secret',name:'x.pdf',size:12,kind:'notes'});
 assert.throws(()=>validateLibrary(traversal),e=>e.status===400);
 const duplicate=structuredClone(seed);duplicate.courses.push(duplicate.courses[0]);assert.throws(()=>validateLibrary(duplicate),e=>e.status===400);
});
