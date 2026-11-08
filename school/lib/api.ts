import {env} from 'cloudflare:workers';
import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../app/chatgpt-auth';
import {roleFor,normalizeEmail,assertTeacher,assertOwner,assertWriteOrigin} from './access.mjs';
import {validateLibrary} from './library-validation.mjs';
import {allLessons,publicLibrary,trainingQuestions} from '../public/data.js';
import {initialData} from './course-seed.mjs';
import {gradeAnswers} from './learning.mjs';

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
 const query=database().prepare("SELECT content,revision,indexed_revision FROM library WHERE id='main'");
 type LibraryRow={content:string,revision:number,indexed_revision:number};
 let row=await query.first<LibraryRow>();
 if(!row){const seed=initialData();await database().prepare('INSERT OR IGNORE INTO library (id,content,revision,updated_at) VALUES (?,?,?,?)').bind('main',JSON.stringify({platform:seed.platform,subjects:seed.subjects,courses:seed.courses}),1,new Date().toISOString()).run();row=await query.first<LibraryRow>();}
 if(!row)throw error('Не удалось открыть библиотеку.',503);
 if(row.indexed_revision!==row.revision)await ensurePublishedIndex();
 return {library:JSON.parse(row.content),revision:row.revision};
}
async function body(req:Request,max=2*1024*1024){
 if(!req.headers.get('content-type')?.includes('application/json'))throw error('Требуется JSON.',415);
 if(Number(req.headers.get('content-length'))>max)throw error('Слишком большой запрос.',413);
 const reader=req.body?.getReader(),decoder=new TextDecoder();
 let bytes=0,text='';
 if(reader){
  for(;;){
   const chunk=await reader.read();
   if(chunk.done)break;
   bytes+=chunk.value.byteLength;
   if(bytes>max){await reader.cancel();throw error('Слишком большой запрос.',413);}
   text+=decoder.decode(chunk.value,{stream:true});
  }
  text+=decoder.decode();
 }
 try{return JSON.parse(text);}catch{throw error('Некорректный JSON.',400);}
}

const libraryCacheKey=(req:Request)=>new Request(new URL('/__orbita/public-library-v2',req.url));
const edgeCache=()=>(globalThis.caches as CacheStorage & {default?:Cache})?.default;

async function ensurePublishedIndex(){
 await database().prepare("UPDATE library SET content=content WHERE id='main' AND indexed_revision<>revision").run();
}

async function indexedItem(statement:D1PreparedStatement){
 let row=await statement.first<{content?:string}>();
 if(!row){
  const stale=await database().prepare("SELECT 1 FROM library WHERE id='main' AND indexed_revision<>revision").first();
  if(stale)await ensurePublishedIndex();
  row=await statement.first<{content?:string}>();
 }
 return row;
}

async function publishedLibrary(req:Request){
 const key=libraryCacheKey(req);
 const cache=edgeCache();
 const cached=await cache?.match(key).catch(()=>undefined);
 if(cached)return new Response(cached.body,{headers:{
  'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
 }});
 const result=await library();
 const response=json({library:publicLibrary(result.library),revision:result.revision});
 if(cache){
  const cacheCopy=new Response(response.clone().body,{headers:{'Cache-Control':'public, max-age=30','Content-Type':'application/json'}});
  await cache.put(key,cacheCopy).catch(()=>{});
 }
 return response;
}

function identifier(value:unknown):string{
 if(typeof value!=='string'||!value.length||value.length>100)throw error('Некорректный идентификатор.',400);
 return value;
}

async function learningProfile(){
 const user=await getChatGPTUser();
 if(!user)throw error('Требуется вход.',401);
 const db=database();
 const [lessons,attempts,count]=await db.batch<Record<string,unknown>>([
  db.prepare('SELECT course_id,lesson_id FROM lesson_progress WHERE user_id=?').bind(user.userId),
  db.prepare('SELECT id,course_id AS courseId,title,"right",total,date FROM training_attempts WHERE user_id=? ORDER BY date DESC,id DESC LIMIT 100').bind(user.userId),
  db.prepare('SELECT count(*) AS total FROM training_attempts WHERE user_id=?').bind(user.userId),
 ]);
 const progress:Record<string,string[]>=Object.create(null);
 for(const lesson of lessons.results)(progress[String(lesson.course_id)]??=[]).push(String(lesson.lesson_id));
 return json({progress,attempts:attempts.results.reverse(),attemptCount:count.results[0]?.total??0});
}

async function submitLearning(req:Request,kind:'lesson'|'training'){
 const input=await body(req);
 if(!input||typeof input!=='object')throw error('Некорректные данные задания.',400);
 const courseId=identifier(input.courseId);
 const user=await getChatGPTUser();
 if(Object.hasOwn(input,'account')&&input.account!==(user?.userId??null)){
  throw error('Сеанс изменился. Обновите страницу перед отправкой ответа.',401);
 }
 const db=database();
 const row=await indexedItem(db.prepare('SELECT content FROM published_courses WHERE id=?').bind(courseId));
 if(!row?.content)throw error('Курс недоступен.',404);
 const course=JSON.parse(row.content);
 const date=new Date().toISOString();
 if(kind==='lesson'){
  const lessonId=identifier(input.lessonId);
  const lessons=allLessons(course) as {id:string;questions:Parameters<typeof gradeAnswers>[0]}[];
  const lesson=lessons.find(item=>item.id===lessonId);
  if(!lesson)throw error('Урок недоступен.',404);
  const result=gradeAnswers(lesson.questions,input.answers);
  const completed=result.right===result.total;
  if(user&&completed)await db.prepare('INSERT OR IGNORE INTO lesson_progress (user_id,course_id,lesson_id,completed_at) VALUES (?,?,?,?)')
   .bind(user.userId,courseId,lesson.id,date).run();
  return json({...result,completed});
 }
 const moduleId=identifier(input.moduleId);
 const module=course.modules.find((item:any)=>item.id===moduleId);
 if(!module)throw error('Тема недоступна.',404);
 const questions=trainingQuestions(module);
 if(!questions.length)throw error('В этой теме пока нет заданий.',404);
 const result=gradeAnswers(questions,input.answers);
 const id=identifier(input.id);
 const attempt={id,courseId,title:module.title,right:result.right,total:result.total,date};
 if(user){
  const saved=await db.prepare(`INSERT INTO training_attempts (user_id,id,course_id,module_id,title,"right",total,date)
   VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,id) DO NOTHING RETURNING date`)
   .bind(user.userId,id,courseId,moduleId,attempt.title,attempt.right,attempt.total,date).first<{date:string}>();
  if(!saved){
   const existing=await db.prepare(`SELECT title,date FROM training_attempts
    WHERE user_id=? AND id=? AND course_id=? AND module_id=? AND "right"=? AND total=?`)
    .bind(user.userId,id,courseId,moduleId,attempt.right,attempt.total).first<{title:string,date:string}>();
   if(!existing)throw error('Эта попытка уже завершена. Начните новую тренировку.',409);
   Object.assign(attempt,existing);
  }
 }
 return json({...result,attempt});
}

export async function handleApi(req:Request,segments:string[]){
 try{
  const path=segments.join('/');
  if(!['GET','HEAD'].includes(req.method))assertWriteOrigin(req);
  if(path==='session'&&req.method==='GET'){
   const who=await identity();return json({role:who.role,user:who.user?{id:who.user.userId,name:who.user.displayName,email:who.user.email}:null,signIn:chatGPTSignInPath('/#/admin'),signOut:chatGPTSignOutPath('/#/admin'),studySignIn:chatGPTSignInPath('/#/profile'),studySignOut:chatGPTSignOutPath('/#/profile')});
  }
  if(path==='library'&&req.method==='GET'){
   return await publishedLibrary(req);
  }
  if(path==='learning'&&req.method==='GET')return await learningProfile();
  if(path==='learning/lesson'&&req.method==='POST')return await submitLearning(req,'lesson');
  if(path==='learning/training'&&req.method==='POST')return await submitLearning(req,'training');
  if(path.startsWith('admin/')){
   const who=await identity();assertTeacher(who);
   if(path==='admin/library'){
    if(req.method==='GET')return json(await library());
    if(req.method==='PUT'){
     const input=await body(req),lib=validateLibrary(input.library);
     if(!Number.isSafeInteger(input.revision)||input.revision<1)throw error('Нужна версия библиотеки.',400);
     const updated=await database().prepare("UPDATE library SET content=?,revision=revision+1,updated_at=? WHERE id='main' AND revision=? RETURNING revision").bind(JSON.stringify(lib),new Date().toISOString(),input.revision).first<{revision:number}>();
     if(!updated)throw error('Библиотеку изменил другой преподаватель. Обновите страницу перед сохранением.',409);
     await edgeCache()?.delete(libraryCacheKey(req)).catch(()=>{});
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
   const published=await indexedItem(database().prepare('SELECT 1 FROM published_files WHERE id=?').bind(id));
   if(!published){const who=await identity();assertTeacher(who);}
   const file=await env.BUCKET?.get(id);if(!file)throw error('Файл не найден.',404);
   return new Response(file.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  return json({error:'Маршрут не найден.'},404);
 }catch(e:any){return json({error:e.status?e.message:'Сервис временно недоступен. Повторите позже.'},e.status||503);}
}
