export const normalizeEmail=value=>String(value||'').trim().toLowerCase();
export function roleFor(user,ownerEmail,teacher){
 if(!user?.userId||!user?.email)return 'anonymous';
 const email=normalizeEmail(user.email),owner=normalizeEmail(ownerEmail);
 if(owner&&email===owner)return 'owner';
 if(teacher&&normalizeEmail(teacher.email)===email&&(!teacher.user_id||teacher.user_id===user.userId))return 'teacher';
 return 'student';
}
export function assertWriteOrigin(request){
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)throw Object.assign(new Error('Недопустимый источник запроса.'),{status:403});
}
export function assertTeacher(identity){if(!['owner','teacher'].includes(identity.role))throw Object.assign(new Error(identity.role==='anonymous'?'Требуется вход.':'Доступ разрешён только преподавателям.'),{status:identity.role==='anonymous'?401:403});}
export function assertOwner(identity){if(identity.role!=='owner')throw Object.assign(new Error('Только владелец может управлять преподавателями.'),{status:identity.role==='anonymous'?401:403});}
