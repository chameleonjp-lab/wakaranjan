import {scrollAppToTop} from '../lib/navigation.js';

function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

export function renderIntermediateReview(app,ctx){
  const source=ctx.intermediateReview;
  const session=shuffle(source.questions).slice(0,Math.min(source.sessionSize,source.questions.length));
  let index=0,correct=0,answered=false;
  const render=()=>{
    scrollAppToTop();
    const q=session[index];
    if(!q){app.innerHTML=`<section class="hero"><div class="eyebrow">中級 点数計算 総復習</div><h1>${correct} / ${session.length} 問正解</h1><p>翻・符・親子・ロン/ツモ・満貫以上をまとめて確認しました。</p><div class="action-row"><button class="primary" id="retry" type="button">もう一度</button><a class="secondary" href="#learn?level=intermediate">一覧へ戻る</a></div></section>`;app.querySelector('#retry').addEventListener('click',()=>renderIntermediateReview(app,ctx));return}
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">中級 点数計算 総復習</div><h1>問題 ${index+1} / ${session.length}</h1><p class="lead">${q.prompt}</p></section><section class="panel"><div class="review-progress"><span style="width:${index/session.length*100}%"></span></div><div class="quiz-options" id="opts"></div><div class="feedback" id="fb" aria-live="polite"></div><div class="action-row" id="actions"></div></section>`;
    const opts=app.querySelector('#opts'),fb=app.querySelector('#fb'),actions=app.querySelector('#actions');
    q.choices.forEach((choice,i)=>{const b=document.createElement('button');b.type='button';b.textContent=choice;b.disabled=answered;b.addEventListener('click',()=>{if(answered)return;answered=true;const ok=i===q.answerIndex;if(ok)correct++;fb.className=`feedback ${ok?'good':'bad'}`;fb.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${q.explanation}`;[...opts.querySelectorAll('button')].forEach((x,n)=>{x.disabled=true;if(n===q.answerIndex)x.dataset.correct='true';if(n===i&&!ok)x.dataset.wrong='true'});const lesson=ctx.lessonById.get(q.lessonRef);if(lesson){const a=document.createElement('a');a.className='secondary';a.href=`#${q.lessonRef}`;a.textContent=`「${lesson.title}」を見直す`;actions.append(a)}const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=index===session.length-1?'結果を見る':'次の問題';next.addEventListener('click',()=>{index++;answered=false;render()});actions.append(next)});opts.append(b)})
  };render();
}
