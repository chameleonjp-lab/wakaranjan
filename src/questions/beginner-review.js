import {scrollAppToTop} from '../lib/navigation.js';

function shuffled(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}

export function renderBeginnerReview(app,ctx){
  const source=ctx.beginnerReview;
  const session=shuffled(source.questions).slice(0,Math.min(source.sessionSize,source.questions.length));
  let index=0,correct=0,answered=false;
  const render=()=>{
    scrollAppToTop();
    const q=session[index];
    if(!q){const percent=Math.round(correct/session.length*100);app.innerHTML=`<section class="hero"><div class="eyebrow">初級 総復習</div><h1>${correct} / ${session.length} 問正解</h1><p>${percent}%でした。苦手な章は解説へ戻って確認できます。</p><div class="action-row"><button class="primary" id="retry" type="button">別の問題でやり直す</button><a class="secondary" href="#learn?level=beginner">一覧へ戻る</a></div></section>`;app.querySelector('#retry').onclick=()=>renderBeginnerReview(app,ctx);return}
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">初級 総復習</div><h1>問題 ${index+1} / ${session.length}</h1><p class="lead">${q.prompt}</p></section><section class="panel"><div class="review-progress"><span style="width:${index/session.length*100}%"></span></div><div class="quiz-options" id="opts"></div><div class="feedback" id="fb" aria-live="polite"></div><div class="action-row" id="acts"></div></section>`;
    const opts=app.querySelector('#opts'),fb=app.querySelector('#fb'),acts=app.querySelector('#acts');
    q.choices.forEach((choice,n)=>{const b=document.createElement('button');b.type='button';b.textContent=choice;b.onclick=()=>{if(answered)return;answered=true;const ok=n===q.answerIndex;if(ok)correct++;[...opts.children].forEach((x,j)=>{x.disabled=true;if(j===q.answerIndex)x.dataset.correct='true';else if(j===n)x.dataset.wrong='true'});fb.className=`feedback ${ok?'good':'bad'}`;fb.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${q.explanation}`;const lesson=ctx.lessonById.get(q.lessonRef);if(lesson){const a=document.createElement('a');a.className='secondary';a.href=`#${q.lessonRef}`;a.textContent=`「${lesson.title}」を見直す`;acts.append(a)}const next=document.createElement('button');next.type='button';next.textContent=index===session.length-1?'結果を見る':'次の問題';next.onclick=()=>{index++;answered=false;render()};acts.append(next)};opts.append(b)})
  };
  render();
}
