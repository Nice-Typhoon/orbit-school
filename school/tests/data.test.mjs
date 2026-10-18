import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,schools,themes,allLessons} from '../public/data.js';

test('Seed module can load in a Worker global scope without generating randomness',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID(){throw new Error('Randomness outside a request');}}});
 try{const module=await import('../public/data.js?worker-regression');assert.ok(module.initialData().courses.length);assert.deepEqual(module.initialData(),module.initialData());}
 finally{if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto;}
});

test('Every published course has valid lessons, school availability and answer keys',()=>{
 const data=initialData(),ids=new Set();
 function unique(id){assert.ok(id);assert.ok(!ids.has(id),`Duplicate ID: ${id}`);ids.add(id);}
 for(const s of data.subjects)unique(s.id);
 for(const c of data.courses){
  unique(c.id);assert.ok(Object.hasOwn(themes,c.theme));
  const subject=data.subjects.find(s=>s.id===c.subject);assert.ok(subject);
  assert.ok(c.schools.length);assert.ok(c.schools.every(id=>subject.schools.includes(id)&&schools.some(s=>s.id===id)));
  if(c.published)assert.ok(allLessons(c).length>0,`Empty published course: ${c.title}`);
  for(const m of c.modules){unique(m.id);assert.ok(m.title);assert.ok(m.lessons.length);
   for(const l of m.lessons){unique(l.id);assert.ok(l.title);assert.ok(l.theory);assert.ok(Array.isArray(l.attachments));
    for(const q of l.questions){unique(q.id);assert.ok(q.text);assert.ok(q.answer);assert.ok(q.explanation);
     if(q.type==='choice'){assert.ok(q.options.length>=2);assert.ok(q.options.includes(q.answer));assert.equal(q.options.length,new Set(q.options).size);}
    }
   }
  }
 }
 assert.ok(data.courses.some(c=>c.level==='Подготовка к ЕГЭ'&&c.schools.includes('senior')));
 assert.ok(data.courses.some(c=>c.schools.includes('primary')));
});
