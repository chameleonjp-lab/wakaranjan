import {scrollAppToTop} from '../lib/navigation.js';

function shuffled(items){
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}

export function renderIntroReview(app,ctx){
  const source=ctx.introReview;
  const session=shuffled(source.questions).slice(0,Math.min(source.sessionSize,source.questions.length));
  let index=0;
  let correct=0;
  let answered=false;

  const render=()=>{
    scrollAppToTop();
    const q=session[index];
    if(!q){
      const percent=Math.round((correct/session.length)*100);
      app.innerHTML=`<section class="hero"><div class="eyebrow">入門 総復習</div><h1>${correct} / ${session.length} 問正解</h1><p>${percent}%でした。間違えた内容は、解説ページへ戻って確認できます。</p><div class="action-row"><button class="primary" id="retry-review" type="button">別の問題でやり直す</button><a class="secondary" href="#learn?level=intro">入門一覧へ戻る</a></div></section>`;
      app.querySelector('#retry-review')?.addEventListener('click',()=>renderIntroReview(app,ctx));
      return;
    }

    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">入門 総復習</div><h1>問題 ${index+1} / ${session.length}</h1><p class="lead">${q.prompt}</p></section><section class="panel"><div class="review-progress" aria-label="進行状況"><span style="width:${((index)/session.length)*100}%"></span></div><div class="quiz-options" id="review-options"></div><div class="feedback" id="review-feedback" aria-live="polite"></div><div class="action-row" id="review-actions"></div></section>`;

    const options=app.querySelector('#review-options');
    const feedback=app.querySelector('#review-feedback');
    const actions=app.querySelector('#review-actions');

    q.choices.forEach((choice,choiceIndex)=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=choice;
      button.disabled=answered;
      button.addEventListener('click',()=>{
        if(answered)return;
        answered=true;
        const isCorrect=choiceIndex===q.answerIndex;
        if(isCorrect) correct++;
        feedback.className=`feedback ${isCorrect?'good':'bad'}`;
        feedback.innerHTML=`<strong>${isCorrect?'正解':'不正解'}</strong><br>${q.explanation}`;
        [...options.querySelectorAll('button')].forEach((b,i)=>{
          b.disabled=true;
          if(i===q.answerIndex) b.setAttribute('data-correct','true');
          if(i===choiceIndex&&!isCorrect) b.setAttribute('data-wrong','true');
        });
        const lesson=ctx.lessonById.get(q.lessonRef);
        if(lesson){
          const link=document.createElement('a');
          link.className='secondary';
          link.href=`#${q.lessonRef}`;
          link.textContent=`「${lesson.title}」を見直す`;
          actions.append(link);
        }
        const next=document.createElement('button');
        next.type='button';
        next.className='primary';
        next.textContent=index===session.length-1?'結果を見る':'次の問題';
        next.addEventListener('click',()=>{index++;answered=false;render()});
        actions.append(next);
      });
      options.append(button);
    });
  };

  render();
}
