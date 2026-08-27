const KEY='wakaranjan-lesson-progress-v1';
function fallback(){return {completed:[],lastLesson:null}}
function normalize(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return fallback();
  const completed=Array.isArray(value.completed)?value.completed.filter(id=>typeof id==='string'):[];
  const lastLesson=typeof value.lastLesson==='string'?value.lastLesson:null;
  return {completed,lastLesson};
}
function load(){
  try{return normalize(JSON.parse(localStorage.getItem(KEY)||'{"completed":[],"lastLesson":null}'))}
  catch{return fallback()}
}
function save(v){try{localStorage.setItem(KEY,JSON.stringify(normalize(v)))}catch{}}
export function getLessonProgress(){const p=load();return {completed:new Set(p.completed),lastLesson:p.lastLesson}}
export function markLessonComplete(id){const p=load();const set=new Set(p.completed);set.add(id);save({completed:[...set],lastLesson:id})}
export function markLessonVisited(id){const p=load();save({completed:p.completed,lastLesson:id})}
export function clearLessonProgress(){try{localStorage.removeItem(KEY)}catch{}}
export function attachLessonProgress(app,id,{onChange}={}){markLessonVisited(id);const current=getLessonProgress();const wrap=document.createElement('section');wrap.className='panel progress-panel';wrap.innerHTML=`<h2>この章の学習記録</h2><p>${current.completed.has(id)?'この章は学習済みです。':'内容を確認できたら「学習済みにする」を押してください。'}</p><div class="action-row"><button class="primary" type="button" id="lesson-complete" ${current.completed.has(id)?'disabled':''}>${current.completed.has(id)?'学習済み':'学習済みにする'}</button></div>`;app.append(wrap);wrap.querySelector('#lesson-complete')?.addEventListener('click',e=>{markLessonComplete(id);e.currentTarget.disabled=true;e.currentTarget.textContent='学習済み';wrap.querySelector('p').textContent='この章は学習済みです。';onChange?.()})}
