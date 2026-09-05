import {createTile} from '../components/tile.js';
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
  const questions=Array.isArray(source?.questions)?source.questions:[];
  const sessionSize=Math.min(source.sessionSize||questions.length,questions.length);
  const visualQuestions=questions.filter(question=>question.interaction==='tile-pick');
  const otherQuestions=questions.filter(question=>question.interaction!=='tile-pick');
  const requiredVisual=visualQuestions.slice(0,Math.min(sessionSize,visualQuestions.length));
  const session=shuffled([...requiredVisual,...shuffled(otherQuestions).slice(0,Math.max(0,sessionSize-requiredVisual.length))]);
  let index=0;
  let correct=0;
  let answered=false;

  const tileNames=codes=>(codes||[]).map(code=>ctx.tileByCode.get(code)?.nameJa||code).join('、');
  const renderVisual=question=>{
    const host=app.querySelector('#review-visual');
    if(!host||question.interaction!=='tile-pick')return;
    const block=document.createElement('div');
    block.className='visual-question-block';
    const label=document.createElement('strong');
    label.textContent='先に見る：牌';
    const row=document.createElement('div');
    row.className='tile-row visual-question-tiles hand-fit-row';
    for(const code of question.handTiles||[]){
      const tile=ctx.tileByCode.get(code);
      if(!tile)continue;
      const element=createTile(tile,{interactive:false});
      element.dataset.tileCode=code;
      row.append(element);
    }
    block.append(label,row);
    host.append(block);
  };

  const render=()=>{
    scrollAppToTop();
    const q=session[index];
    if(!q){
      const percent=Math.round((correct/session.length)*100);
      app.innerHTML=`<section class="hero"><div class="eyebrow">入門 総復習</div><h1>${correct} / ${session.length} 問正解</h1><p>${percent}%でした。間違えた内容は、解説ページへ戻って確認できます。</p><div class="action-row"><button class="primary" id="retry-review" type="button">別の問題でやり直す</button><a class="secondary" href="#learn?level=intro">入門一覧へ戻る</a></div></section>`;
      app.querySelector('#retry-review')?.addEventListener('click',()=>renderIntroReview(app,ctx));
      return;
    }

    const isVisual=q.interaction==='tile-pick';
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">入門 総復習　${index+1} / ${session.length}</div><h1>${q.prompt}</h1></section><section class="panel"><div class="review-progress" aria-label="進行状況"><span style="width:${(index+1)/session.length*100}%"></span></div>${isVisual?'<div class="problem-hand-area"><div id="review-visual"></div></div>':''}<div class="problem-choice-area"><h2>${isVisual?'選ぶ':'選択肢'}</h2><div class="quiz-options" id="review-options"></div></div><div class="feedback" id="review-feedback" aria-live="polite"></div><div class="action-row" id="review-actions"></div></section>`;

    const options=app.querySelector('#review-options');
    const feedback=app.querySelector('#review-feedback');
    const actions=app.querySelector('#review-actions');

    renderVisual(q);

    if(isVisual){
      options.classList.add('tile-answer-options');
      const panel=document.createElement('div');
      panel.className='tile-answer-panel';
      const instruction=document.createElement('p');
      instruction.className='tile-answer-instruction';
      instruction.textContent=q.answerTileCodes?.length===1?'正しい牌を1枚選んでください。':'正しい牌をすべて選んでください。';
      const palette=document.createElement('div');
      palette.className='tile-answer-palette';
      const status=document.createElement('p');
      status.className='tile-answer-status';
      status.setAttribute('aria-live','polite');
      status.textContent='選択中：なし';
      const selected=new Set();
      const tileButtons=[];
      const submit=document.createElement('button');
      submit.type='button';
      submit.className='primary tile-answer-submit';
      submit.textContent='この牌で回答する';
      submit.disabled=true;
      for(const code of q.tileChoices||[]){
        const tile=ctx.tileByCode.get(code);
        if(!tile)continue;
        const button=createTile(tile,{interactive:true,onSelect:(_tile,_red,element)=>{
          if(answered)return;
          if(selected.has(code)){
            selected.delete(code);
            element.classList.remove('selected');
          }else{
            selected.add(code);
            element.classList.add('selected');
          }
          element.setAttribute('aria-pressed',selected.has(code)?'true':'false');
          status.textContent='選択中：'+(tileNames([...selected])||'なし');
          submit.disabled=selected.size===0;
        }});
        button.classList.add('tile-answer-tile');
        button.dataset.tileCode=code;
        tileButtons.push(button);
        palette.append(button);
      }
      const sameCodes=(left,right)=>{
        const a=[...(left||[])].sort(),b=[...(right||[])].sort();
        return a.length===b.length&&a.every((code,position)=>code===b[position]);
      };
      submit.addEventListener('click',()=>{
        if(answered)return;
        answered=true;
        const selectedCodes=[...selected];
        const expectedCodes=new Set(q.answerTileCodes||[]);
        const ok=sameCodes(selectedCodes,q.answerTileCodes);
        if(ok)correct++;
        feedback.className=`feedback ${ok?'good':'bad'}`;
        feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${q.explanation}${ok?'':`<br><small>選んだ牌：${tileNames(selectedCodes)}<br>正解の牌：${tileNames(q.answerTileCodes)}</small>`}`;
        tileButtons.forEach(button=>{
          const code=button.dataset.tileCode;
          button.disabled=true;
          if(expectedCodes.has(code))button.dataset.correct='true';
          if(selected.has(code)&&!expectedCodes.has(code))button.dataset.wrong='true';
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
      panel.append(instruction,palette,status,submit);
      options.append(panel);
      return;
    }

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
