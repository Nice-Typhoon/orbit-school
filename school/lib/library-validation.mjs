import {schools,themes} from '../public/data.js';
export function validateLibrary(d){
 const fail=()=>{throw Object.assign(new Error('Некорректная структура библиотеки.'),{status:400});};
 const text=(v,n=100000)=>typeof v==='string'&&v.length<=n;
 const array=(v,n=2000)=>Array.isArray(v)&&v.length<=n;
 if(!d||!text(d.platform,30)||!d.platform.trim()||!array(d.subjects,100)||!array(d.courses,300))fail();
 const ids=new Set();const unique=id=>{if(!text(id,100)||!id||ids.has(id)||['__proto__','constructor','prototype'].includes(id))fail();ids.add(id);};
 const schoolIds=new Set(schools.map(s=>s.id));
 for(const s of d.subjects){unique(s.id);if(!text(s.title,80)||!s.title.trim()||!text(s.desc,250)||!text(s.icon,30)||!Object.hasOwn(themes,s.theme)||!array(s.schools,4)||!s.schools.length||s.schools.some(x=>!schoolIds.has(x)))fail();}
 for(const c of d.courses){
  unique(c.id);const sub=d.subjects.find(s=>s.id===c.subject);
  if(!sub||!text(c.title,100)||!c.title.trim()||!text(c.desc,400)||!text(c.icon,30)||!text(c.level,60)||typeof c.published!=='boolean'||!Object.hasOwn(themes,c.theme)||!array(c.schools,4)||!c.schools.length||c.schools.some(x=>!sub.schools.includes(x))||!array(c.modules,100))fail();
  if(c.published&&(!c.modules.length||!c.desc.trim()))fail();
  for(const m of c.modules){unique(m.id);if(!text(m.title,150)||!m.title.trim()||!array(m.lessons,200)||c.published&&!m.lessons.length)fail();
   for(const l of m.lessons){unique(l.id);if(!text(l.title,150)||!l.title.trim()||!text(l.theory)||!l.theory.trim()||!array(l.questions,100)||!array(l.attachments,30))fail();
    for(const q of l.questions){unique(q.id);if(!text(q.text,3000)||!q.text.trim()||!['choice','text'].includes(q.type)||!text(q.answer,3000)||!q.answer.trim()||!text(q.explanation,5000)||!q.explanation.trim()||!array(q.options,30)||q.options.some(x=>!text(x,3000)))fail();if(q.type==='choice'&&(q.options.length<2||new Set(q.options).size!==q.options.length||!q.options.includes(q.answer)))fail();}
    for(const f of l.attachments){if(!text(f.id,100)||!/^[a-zA-Z0-9-]+$/.test(f.id)||!text(f.name,200)||!['notes','presentation'].includes(f.kind)||!Number.isSafeInteger(f.size)||f.size<1||f.size>20*1024*1024)fail();}
   }
  }
 }
 return {platform:d.platform,subjects:d.subjects,courses:d.courses};
}
