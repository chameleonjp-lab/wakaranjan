import {createTile} from '../components/tile.js';

const LEVEL_NAME={beginner:'初級',intermediate:'中級',advanced:'上級',special:'特例・ルール差編'};
function tileRow(codes,ctx,label){
  if(!codes?.length)return null;
  const section=document.createElement('section');section.className='panel';section.innerHTML=`<h2>${label}</h2><div class="tile-row data-lesson-tiles"></div>`;
  const row=section.querySelector('.tile-row');
  for(const code of codes){const tile=ctx.tileByCode.get(code);if(tile)row.append(createTile(tile,{interactive:false}))}
  return section;
}
function neighbor(ctx,lesson,delta){
  const same=ctx.lessons.filter(x=>x.level===lesson.level).sort((a,b)=>a.order-b.order);const i=same.findIndex(x=>x.id===lesson.id);return same[i+delta]||null;
}
function endLink(lesson){if(lesson.level==='beginner')return {href:'beginner-review',label:'初級の総復習へ'};if(lesson.level==='intermediate')return {href:'intermediate-review',label:'中級の総復習へ'};return {href:'home',label:'一覧へ戻る'}}

export function renderDataLesson(app,ctx,lesson){
  let answered=false;
  const level=LEVEL_NAME[lesson.level]||lesson.level;
  app.innerHTML=`<section class="lesson-head"><div class="eyebrow">${level} ${lesson.order||''}</div><h1>${lesson.title}</h1><p class="lead">${lesson.lead}</p></section><section class="panel"><h2>要点</h2><ol class="explain-list">${lesson.points.map(x=>`<li>${x}</li>`).join('')}</ol></section>`;
  if(lesson.hand)app.append(tileRow(lesson.hand,ctx,'手牌の例'));
  if(lesson.river)app.append(tileRow(lesson.river,ctx,'河の例'));
  if(lesson.example){const s=document.createElement('section');s.className='callout';s.innerHTML=`<strong>例</strong><br>${lesson.example}`;app.append(s)}
  const quiz=document.createElement('section');quiz.className='panel';quiz.innerHTML=`<h2>確認問題</h2><p>${lesson.check.prompt}</p><div id="data-lesson-options" class="quiz-options"></div><div id="data-lesson-feedback" class="feedback" aria-live="polite"></div>`;app.append(quiz);
  const out=quiz.querySelector('#data-lesson-options'),feedback=quiz.querySelector('#data-lesson-feedback');
  lesson.check.choices.forEach((choice,i)=>{const b=document.createElement('button');b.type='button';b.textContent=choice;b.addEventListener('click',()=>{if(answered)return;answered=true;const ok=i===lesson.check.answerIndex;feedback.className=`feedback ${ok?'good':'bad'}`;feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${lesson.check.explanation}`;[...out.children].forEach((el,n)=>{el.disabled=true;if(n===lesson.check.answerIndex)el.dataset.correct='true';if(n===i&&!ok)el.dataset.wrong='true'})});out.append(b)});
  const prev=neighbor(ctx,lesson,-1),next=neighbor(ctx,lesson,1),end=endLink(lesson);const nav=document.createElement('div');nav.className='lesson-nav';nav.innerHTML=`${prev?`<a class="secondary" href="#${prev.id}">前へ：${prev.title}</a>`:'<a class="secondary" href="#home">一覧へ戻る</a>'}${next?`<a class="primary" href="#${next.id}">次へ：${next.title}</a>`:`<a class="primary" href="#${end.href}">${end.label}</a>`}`;app.append(nav);
}
