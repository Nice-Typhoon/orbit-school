export const schools = [
  {id:'senior', grades:'10–11',title:'Старшая школа',desc:'Углубляем знания и уверенно готовимся к ЕГЭ',tag:'Следующий шаг — твой',theme:'purple',icon:'planet'},
  {id:'middle', grades:'7–9',title:'Средняя школа',desc:'Разбираемся в сложном и находим свои интересы',tag:'Время открытий',theme:'green',icon:'rocket'},
  {id:'junior', grades:'5–7',title:'Младшая средняя',desc:'Пробуем новое, исследуем и учимся мыслить',tag:'Больше любопытства',theme:'peach',icon:'telescope'},
  {id:'primary', grades:'1–4',title:'Начальная школа',desc:'Знакомимся с большим миром маленькими шагами',tag:'Начало приключения',theme:'blue',icon:'star'}
];
export const themes = {purple:'Космос',green:'Сад открытий',peach:'Тёплая мастерская',blue:'Океан идей'};
export function uid(){return crypto.randomUUID();}
export const allLessons=c=>c.modules.flatMap(m=>m.lessons);
export const questionCount=c=>allLessons(c).reduce((n,l)=>n+l.questions.length,0);
export function trainingQuestions(module) {
 return module.lessons.flatMap(lesson=>{
  const example=lesson.theory.match(/```[\w+#-]*\n([\s\S]*?)```/)?.[1]||'';
  return lesson.questions.map(question=>({
   ...question,
   context:/пример|строки/.test(question.text)?example:'',
  }));
 }).slice(0,100);
}

export function publicLibrary(library) {
 return {
  platform:library.platform,
  subjects:library.subjects,
  courses:library.courses.filter(course=>course.published).map(course=>({
   ...course,
   modules:course.modules.map(module=>({
    ...module,
    lessons:module.lessons.map(lesson=>({
     ...lesson,
     questions:lesson.questions.map(({id,text,type,options})=>({id,text,type,options})),
    })),
   })),
  })),
 };
}
