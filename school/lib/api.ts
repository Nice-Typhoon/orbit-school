import {env} from 'cloudflare:workers';
import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../app/chatgpt-auth';
import {roleFor,normalizeEmail,assertTeacher,assertOwner,assertWriteOrigin} from './access.mjs';
import {validateLibrary} from './library-validation.mjs';
import {initialData,allLessons} from '../public/data.js';

type Identity={user:any;role:string};
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error=(message:string,status:number)=>Object.assign(new Error(message),{status});
function database(){if(!env.DB)throw error('Хранилище временно недоступно.',503);return env.DB;}
async function identity():Promise<Identity>{
 const user=await getChatGPTUser();
 if(!user)return {user:null,role:'anonymous'};
 const teacher=await database().prepare('SELECT email,user_id FROM teachers WHERE email=?').bind(normalizeEmail(user.email)).first();
 const role=roleFor(user,env.OWNER_EMAIL,teacher);
 if(role==='teacher'&&teacher&&!teacher.user_id){
  await database().prepare('UPDATE teachers SET user_id=? WHERE email=? AND user_id IS NULL').bind(user.userId,normalizeEmail(user.email)).run();
  const bound=await database().prepare('SELECT email,user_id FROM teachers WHERE email=?').bind(normalizeEmail(user.email)).first();
  return {user,role:roleFor(user,env.OWNER_EMAIL,bound)};
 }
 return {user,role};
}
async function library(){
 let row=await database().prepare("SELECT content,revision FROM library WHERE id='main'").first<{content:string,revision:number}>();
 if(!row){const seed=initialData();await database().prepare('INSERT OR IGNORE INTO library (id,content,revision,updated_at) VALUES (?,?,?,?)').bind('main',JSON.stringify({platform:seed.platform,subjects:seed.subjects,courses:seed.courses}),1,new Date().toISOString()).run();row=await database().prepare("SELECT content,revision FROM library WHERE id='main'").first<{content:string,revision:number}>();}
 if(!row)throw error('Не удалось открыть библиотеку.',503);
 return {library:JSON.parse(row.content),revision:row.revision};
}
async function body(req:Request,max=2*1024*1024){if(!req.headers.get('content-type')?.includes('application/json'))throw error('Требуется JSON.',415);const text=await req.text();if(new TextEncoder().encode(text).length>max)throw error('Слишком большой запрос.',413);try{return JSON.parse(text);}catch{throw error('Некорректный JSON.',400);}}
function canReadFile(lib:any,id:string){return lib.courses.some((c:any)=>c.published&&allLessons(c).some((l:any)=>(l.attachments||[]).some((f:any)=>f.id===id)));}

export async function handleApi(req:Request,segments:string[]){
 try{
  const path=segments.join('/');
  if(!['GET','HEAD'].includes(req.method))assertWriteOrigin(req);
  if(path==='session'&&req.method==='GET'){
   const who=await identity();return json({role:who.role,user:who.user?{name:who.user.displayName,email:who.user.email}:null,signIn:chatGPTSignInPath('/#/admin'),signOut:chatGPTSignOutPath('/#/admin')});
  }
  if(path==='library'&&req.method==='GET'){
   const result=await library();return json({library:{...result.library,courses:result.library.courses.filter((c:any)=>c.published)},revision:result.revision});
  }
  if(path.startsWith('admin/')){
   const who=await identity();assertTeacher(who);
   if(path==='admin/library'){
    if(req.method==='GET')return json(await library());
    if(req.method==='PUT'){
     const input=await body(req),lib=validateLibrary(input.library);
     if(!Number.isSafeInteger(input.revision)||input.revision<1)throw error('Нужна версия библиотеки.',400);
     const updated=await database().prepare("UPDATE library SET content=?,revision=revision+1,updated_at=? WHERE id='main' AND revision=? RETURNING revision").bind(JSON.stringify(lib),new Date().toISOString(),input.revision).first<{revision:number}>();
     if(!updated)throw error('Библиотеку изменил другой преподаватель. Обновите страницу перед сохранением.',409);
     return json({revision:updated.revision});
    }
   }
   if(path==='admin/teachers'){
    assertOwner(who);
    if(req.method==='GET')return json({teachers:(await database().prepare('SELECT email,created_at FROM teachers ORDER BY email').all()).results});
    if(req.method==='POST'){
     const input=await body(req,4096),email=normalizeEmail(input.email);
     if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw error('Укажите корректный email.',400);
     if(email===normalizeEmail(env.OWNER_EMAIL))throw error('У владельца уже есть доступ.',400);
     await database().prepare('INSERT OR IGNORE INTO teachers (email,user_id,created_at) VALUES (?,NULL,?)').bind(email,new Date().toISOString()).run();return json({ok:true});
    }
    if(req.method==='DELETE'){
     const input=await body(req,4096),email=normalizeEmail(input.email);
     await database().prepare('DELETE FROM teachers WHERE email=?').bind(email).run();return json({ok:true});
    }
   }
   if(path==='admin/files'&&req.method==='POST'){
    if(!env.BUCKET)throw error('Хранилище файлов недоступно.',503);
    const limit=20*1024*1024;if(Number(req.headers.get('content-length'))>limit+65536)throw error('Файл больше 20 МБ.',413);
    const form=await req.formData(),file=form.get('file');
    if(!(file instanceof File)||!file.size||file.size>limit||!['notes','presentation'].includes(String(form.get('kind'))))throw error('Нужен PDF-файл до 20 МБ.',400);
    if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw error('Нужен файл в формате PDF.',400);
    const id=crypto.randomUUID(),name=file.name.slice(0,200),kind=String(form.get('kind'));
    await env.BUCKET.put(id,file.stream(),{httpMetadata:{contentType:'application/pdf'},customMetadata:{name,owner:who.user.userId}});
    return json({id,name,kind,size:file.size},201);
   }
   return json({error:'Маршрут не найден.'},404);
  }
  if(segments[0]==='files'&&segments.length===2&&req.method==='GET'){
   const id=segments[1];if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw error('Файл не найден.',404);
   const lib=await library();
   if(!canReadFile(lib.library,id)){const who=await identity();assertTeacher(who);}
   const file=await env.BUCKET?.get(id);if(!file)throw error('Файл не найден.',404);
   return new Response(file.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  return json({error:'Маршрут не найден.'},404);
 }catch(e:any){return json({error:e.status?e.message:'Сервис временно недоступен. Повторите позже.'},e.status||503);}
}
