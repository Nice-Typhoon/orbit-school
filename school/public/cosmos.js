// Presentation routes keep the existing school IDs and shared library intact.
export const schoolPlanets = [
 {id:'primary',planet:'mars',name:'Марс',grades:'1–4',title:'Начальная школа',tag:'Первая орбита',description:'Большое путешествие начинается с маленького «почему?». Учимся, играем и открываем мир.',motto:'Любопытство — твоя суперсила',note:'Для самых любопытных',order:'01'},
 {id:'junior',planet:'jupiter',name:'Юпитер',grades:'5–7',title:'Младшая средняя школа',tag:'Орбита открытий',description:'Больше вопросов, больше идей, больше пространства для открытий. Найди то, что тебя увлекает.',motto:'Твоим идеям нужно больше места',note:'Расширяем горизонты',order:'02'},
 {id:'middle',planet:'saturn',name:'Сатурн',grades:'7–9',title:'Средняя школа',tag:'Орбита возможностей',description:'Собираем знания в единую систему, пробуем сложное и находим собственный путь.',motto:'Всё постепенно встаёт на свои орбиты',note:'Находим свой маршрут',order:'03'},
 {id:'senior',planet:'uranus',name:'Уран',grades:'10–11',title:'Старшая школа',tag:'Орбита больших идей',description:'Погружаемся глубже, связываем знания и готовимся к следующему большому шагу.',motto:'Следующая большая идея — твоя',note:'Думаем на шаг вперёд',order:'04'},
 {id:'ege',planet:'neptune',name:'Нептун',grades:'ЕГЭ',title:'Подготовка к ЕГЭ',tag:'Орбита уверенности',description:'Повторяем главное, разбираем задачи и превращаем знания в уверенность перед экзаменом.',motto:'Дальше — только твои возможности',note:'Готовимся уверенно',order:'05'}
];
export const planetSchool=id=>schoolPlanets.find(s=>s.id===id);
export const courseInSchool=(course,id)=>id==='ege'?course.level==='Подготовка к ЕГЭ':course.schools.includes(id)&&!(id==='senior'&&course.level==='Подготовка к ЕГЭ');
export function planetVisual(name,extra=''){
 const allowed=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
 const kind=allowed.includes(name)?name:'neptune';
 const continents=kind==='earth'?'<svg class="earth-continents" viewBox="0 0 100 100" aria-hidden="true"><path d="m11 22 12-9 15 2 8 9-6 11-11 1-3 10-9-4-5-12Zm29 27 12 4 4 13-8 17-8-9-1-13-6-6Zm23-37 16 5 12 14-7 12-12-3-2 11-10-5-8-14 7-6Zm10 52 12-4 7 10-6 9-13-3Z" fill="#81ac7c"/><path d="m3 58 21-5 12 3m20-43 27 14M61 66l30-10" fill="none" stroke="#e9f5ed" stroke-width="3" opacity=".45"/></svg>':'';
 return `<span class="celestial planet-${kind} ${extra}" aria-hidden="true"><span class="planet-rings ring-back"></span><span class="planet-sphere"><span class="planet-texture"></span>${continents}<span class="planet-night"></span></span><span class="planet-rings ring-front"></span></span>`;
}
export function planetRoute(school){return `#/school/${school.id}`;}
