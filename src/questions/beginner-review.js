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

function sameCodes(left,right){
  const a=[...(left||[])].sort();
  const b=[...(right||[])].sort();
  return a.length===b.length&&a.every((code,index)=>code===b[index]);
}

export function renderBeginnerReview(app,ctx){
  const source=ctx.beginnerReview||{};
  const questions=Array.isArray(source.questions)?source.questions:[];
  const sessionSize=Math.min(source.sessionSize||questions.length,questions.length);
  const visualQuestions=questions.filter(question=>question.interaction==='tile-pick');
  const otherQuestions=questions.filter(question=>question.interaction!=='tile-pick');
  const requiredVisual=visualQuestions.slice(0,Math.min(sessionSize,visualQuestions.length));
  const session=shuffled([
    ...requiredVisual,
    ...shuffled(otherQuestions).slice(0,Math.max(0,sessionSize-requiredVisual.length))
  ]);
  let index=0;
  let correct=0;
  let answered=false;

  const tileNames=codes=>(codes||[]).map(code=>ctx.tileByCode.get(code)?.nameJa||code).join('、');
  const appendLessonLink=(question,actions)=>{
    const lesson=ctx.lessonById.get(question.lessonRef);
    if(!lesson)return;
    const link=document.createElement('a');
    link.className='secondary';
    link.href=`#${question.lessonRef}`;
    link.textContent=`「${lesson.title}」を見直す`;
    actions.append(link);
  };

  const render=()=>{
    scrollAppToTop();
    const question=session[index];
    if(!question){
      const percent=session.length?Math.round((correct/session.length)*100):0;
      app.innerHTML=`<section class="hero"><div class="eyebrow">初級 総復習</div><h1>${correct} / ${session.length} 問正解</h1><p>${percent}%でした。苦手な章は解説へ戻って確認できます。</p><div class="action-row"><button class="primary" id="retry" type="button">別の問題でやり直す</button><a class="secondary" href="#learn?level=beginner">一覧へ戻る</a></div></section>`;
      app.querySelector('#retry')?.addEventListener('click',()=>renderBeginnerReview(app,ctx));
      return;
    }

    const isVisual=question.interaction==='tile-pick';
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">初級 総復習　${index+1} / ${session.length}</div><h1>${question.prompt}</h1></section><section class="panel"><div class="review-progress" aria-label="進行状況"><span style="width:${(index+1)/session.length*100}%"></span></div>${isVisual?'<div class="problem-hand-area"><div id="review-visual"></div></div>':''}<div class="problem-choice-area"><h2>${isVisual?'選ぶ':'選択肢'}</h2><div class="quiz-options" id="review-options"></div></div><div class="feedback" id="review-feedback" aria-live="polite"></div><div class="action-row" id="review-actions"></div></section>`;

    const options=app.querySelector('#review-options');
    const feedback=app.querySelector('#review-feedback');
    const actions=app.querySelector('#review-actions');
    const tileButtons=[];

    if(isVisual){
      const visual=app.querySelector('#review-visual');
      const block=document.createElement('div');
      block.className='visual-question-block';
      const label=document.createElement('strong');
      label.textContent='先に見る：手牌';
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
      visual.append(block);

      options.classList.add('tile-answer-options');
      const panel=document.createElement('div');
      panel.className='tile-answer-panel';
      const instruction=document.createElement('p');
      instruction.className='tile-answer-instruction';
      instruction.textContent=question.answerTileCodes?.length===1?'正しい牌を1枚選んでください。':'正しい牌をすべて選んでください。';
      const palette=document.createElement('div');
      palette.className='tile-answer-palette';
      const status=document.createElement('p');
      status.className='tile-answer-status';
      status.setAttribute('aria-live','polite');
      status.textContent='選択中：なし';
      const selected=new Set();
      const submit=document.createElement('button');
      submit.type='button';
      submit.className='primary tile-answer-submit';
      submit.textContent='この牌で回答する';
      submit.disabled=true;

      const finish=(selectedCodes)=>{
        if(answered)return;
        answered=true;
        const expectedCodes=new Set(question.answerTileCodes||[]);
        const ok=sameCodes(selectedCodes,question.answerTileCodes);
        if(ok)correct++;
        feedback.className=`feedback ${ok?'good':'bad'}`;
        feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${question.explanation}${ok?'':`<br><small>選んだ牌：${tileNames(selectedCodes)||'なし'}<br>正解の牌：${tileNames(question.answerTileCodes)}</small>`}`;
        tileButtons.forEach(button=>{
          const code=button.dataset.tileCode;
          button.disabled=true;
          if(expectedCodes.has(code))button.dataset.correct='true';
          if(selected.has(code)&&!expectedCodes.has(code))button.dataset.wrong='true';
        });
        appendLessonLink(question,actions);
        const next=document.createElement('button');
        next.type='button';
        next.className='primary';
        next.textContent=index===session.length-1?'結果を見る':'次の問題';
        next.addEventListener('click',()=>{index++;answered=false;render()});
        actions.append(next);
      };

      for(const code of question.tileChoices||[]){
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
      submit.addEventListener('click',()=>finish([...selected]));
      panel.append(instruction,palette,status,submit);
      options.append(panel);
      return;
    }

    question.choices.forEach((choice,choiceIndex)=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=choice;
      button.addEventListener('click',()=>{
        if(answered)return;
        answered=true;
        const ok=choiceIndex===question.answerIndex;
        if(ok)correct++;
        [...options.children].forEach((item,itemIndex)=>{
          item.disabled=true;
          if(itemIndex===question.answerIndex)item.dataset.correct='true';
          if(itemIndex===choiceIndex&&!ok)item.dataset.wrong='true';
        });
        feedback.className=`feedback ${ok?'good':'bad'}`;
        feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${question.explanation}`;
        appendLessonLink(question,actions);
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
