import {createTile} from '../components/tile.js';

const LEVEL_NAME={beginner:'初級',intermediate:'中級',advanced:'上級',special:'特例・ルール差編'};
function tileRow(codes,ctx,label){
  if(!codes?.length)return null;
  const isHand=label.includes('手牌');
  const section=document.createElement('section');section.className='panel';section.innerHTML=`<h2>${label}</h2><div class="${isHand?'hand-fit-scroll':'hand-scroll'}"><div class="tile-row data-lesson-tiles${isHand?' hand-fit-row':''}"></div></div>`;
  const row=section.querySelector('.tile-row');
  for(const code of codes){const tile=ctx.tileByCode.get(code);if(tile)row.append(createTile(tile,{interactive:false}))}
  return section;
}
function neighbor(ctx,lesson,delta){
  const same=ctx.lessons.filter(x=>x.level===lesson.level).sort((a,b)=>a.order-b.order);const i=same.findIndex(x=>x.id===lesson.id);return same[i+delta]||null;
}
function endLink(lesson){if(lesson.level==='intro')return {href:'learn?level=intro',label:'入門一覧へ'};if(lesson.level==='beginner')return {href:'beginner-review',label:'初級の総復習へ'};if(lesson.level==='intermediate')return {href:'intermediate-review',label:'中級の総復習へ'};if(lesson.level==='advanced')return {href:'learn?level=advanced',label:'上級一覧へ'};if(lesson.level==='special')return {href:'learn?level=special',label:'特例一覧へ'};return {href:'learn',label:'学ぶへ戻る'}}
function relatedTerms(quality,ctx){
  const terms=(quality?.termRefs||[]).map(id=>ctx.termById.get(id)).filter(Boolean);if(!terms.length)return null;
  const section=document.createElement('section');section.className='panel';section.innerHTML=`<h2>関連用語</h2><p class="muted">わからない言葉は、ここから用語集を開けます。</p><div class="related-term-links">${terms.map(t=>`<a class="secondary" href="#dictionary?term=${encodeURIComponent(t.id)}">${t.nameJa}<small>${t.readingJa}</small></a>`).join('')}</div>`;return section;
}
function renderQuiz(lesson,quality){
  const questions=[lesson.check,...(quality?.checks||[])].filter(Boolean);const quiz=document.createElement('section');quiz.className='panel lesson-check';quiz.innerHTML='<div class="quiz-meta"></div><h2>確認問題</h2><p class="quiz-prompt"></p><div class="quiz-options"></div><div class="feedback" aria-live="polite"></div>';
  let index=0,score=0;const meta=quiz.querySelector('.quiz-meta'),prompt=quiz.querySelector('.quiz-prompt'),out=quiz.querySelector('.quiz-options'),feedback=quiz.querySelector('.feedback');
  const draw=()=>{
    if(index>=questions.length){meta.textContent='確認完了';prompt.innerHTML=`<strong>${questions.length}問中 ${score}問正解</strong>`;out.innerHTML='';feedback.className=`feedback ${score===questions.length?'good':''}`;feedback.innerHTML=score===questions.length?'この章の要点を確認できました。':'間違えた問題の理由を読み直してから、もう一度確認できます。';const row=document.createElement('div');row.className='action-row';const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='もう一度確認する';retry.onclick=()=>{index=0;score=0;draw()};row.append(retry);out.append(row);return;
    }
    const q=questions[index];meta.textContent=`${index+1} / ${questions.length}`;prompt.textContent=q.prompt;out.innerHTML='';feedback.className='feedback';feedback.textContent='';
    q.choices.forEach((choice,i)=>{const b=document.createElement('button');b.type='button';b.textContent=choice;b.onclick=()=>{const ok=i===q.answerIndex;if(ok)score++;[...out.children].forEach((el,n)=>{el.disabled=true;if(n===q.answerIndex)el.dataset.correct='true';if(n===i&&!ok)el.dataset.wrong='true'});feedback.className=`feedback ${ok?'good':'bad'}`;feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${q.explanation}`;const actions=document.createElement('div');actions.className='action-row';const next=document.createElement('button');next.type='button';next.textContent=index+1===questions.length?'結果を見る':'次の問題';next.onclick=()=>{index++;draw()};actions.append(next);feedback.append(actions)};out.append(b)});
  };draw();return quiz;
}

export function renderDataLesson(app,ctx,lesson){
  const level=LEVEL_NAME[lesson.level]||lesson.level;const quality=ctx.lessonQualityById?.get(lesson.id);
  app.innerHTML=`<section class="lesson-head"><div class="eyebrow">${level} ${lesson.order||''}</div><h1>${lesson.title}</h1><p class="lead">${lesson.lead}</p></section>`;
  if(quality?.objective){const goal=document.createElement('section');goal.className='panel goal-panel';goal.innerHTML=`<div class="eyebrow">この章でできるようになること</div><p>${quality.objective}</p>`;app.append(goal)}
  const key=document.createElement('section');key.className='panel';key.innerHTML=`<h2>要点</h2><ol class="explain-list">${lesson.points.map(x=>`<li>${x}</li>`).join('')}</ol>`;app.append(key);
  if(lesson.hand)app.append(tileRow(lesson.hand,ctx,'手牌の例'));
  if(lesson.river)app.append(tileRow(lesson.river,ctx,'河の例'));
  if(lesson.example){const s=document.createElement('section');s.className='callout example-callout';s.innerHTML=`<strong>具体例</strong><br>${lesson.example}`;app.append(s)}
  if(quality?.steps?.length){const steps=document.createElement('section');steps.className='panel';steps.innerHTML=`<h2>考え方の手順</h2><ol class="learning-steps">${quality.steps.map((x,i)=>`<li><span>${i+1}</span><p>${x}</p></li>`).join('')}</ol>`;app.append(steps)}
  if(quality?.mistakes?.length){const mistakes=document.createElement('section');mistakes.className='panel';mistakes.innerHTML=`<h2>よくある間違い</h2><div class="mistake-grid">${quality.mistakes.map(x=>`<article class="mistake-card"><strong>注意</strong><p>${x}</p></article>`).join('')}</div>`;app.append(mistakes)}
  app.append(renderQuiz(lesson,quality));
  const terms=relatedTerms(quality,ctx);if(terms)app.append(terms);
  const prev=neighbor(ctx,lesson,-1),next=neighbor(ctx,lesson,1),end=endLink(lesson);const nav=document.createElement('div');nav.className='lesson-nav';nav.innerHTML=`${prev?`<a class="secondary" href="#${prev.id}">前へ：${prev.title}</a>`:`<a class="secondary" href="#learn?level=${lesson.level}">${LEVEL_NAME[lesson.level]||'学ぶ'}一覧へ</a>`}${next?`<a class="primary" href="#${next.id}">次へ：${next.title}</a>`:`<a class="primary" href="#${end.href}">${end.label}</a>`}`;app.append(nav);
}
