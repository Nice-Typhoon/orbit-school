export let session={role:'loading',user:null,signIn:'/signin-with-chatgpt?return_to=%2F%23%2Fadmin',signOut:'/signout-with-chatgpt?return_to=%2F%23%2Fadmin'};
let revision=0;
const libraryOf=d=>({platform:d.platform,subjects:d.subjects,courses:d.courses});
let savedLibrary=null;
export const canEdit=()=>['owner','teacher'].includes(session.role);
export const isOwner=()=>session.role==='owner';
export async function api(path,options={}){
 const response=await fetch('/api/'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body&&!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers}});
 let result;try{result=await response.json();}catch{throw new Error('Сервис временно недоступен. Обновите страницу.');}
 if(!response.ok){if(response.status===401||response.status===403){session.role=response.status===401?'anonymous':'student';window.dispatchEvent(new Event('teacher-access-changed'));}const e=new Error(result.error||'Не удалось выполнить запрос.');e.status=response.status;throw e;}
 return result;
}
export async function loadLibrary(){
 session=await api('session');
 const result=await api(canEdit()?'admin/library':'library');revision=result.revision;savedLibrary=structuredClone(result.library);return result.library;
}
export async function saveLibrary(data){
 if(!canEdit())throw new Error('Редактирование доступно только преподавателям.');
 const library=libraryOf(data),result=await api('admin/library',{method:'PUT',body:JSON.stringify({library,revision})});revision=result.revision;savedLibrary=structuredClone(library);
}
export function restoreLibrary(data){if(savedLibrary)Object.assign(data,structuredClone(savedLibrary));}
export async function uploadPdf(file,kind){const body=new FormData();body.set('file',file);body.set('kind',kind);return api('admin/files',{method:'POST',body});}
export async function fetchPdf(id){const response=await fetch('/api/files/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Файл недоступен. Возможно, он был загружен только в старой версии этого браузера.');return response.blob();}
