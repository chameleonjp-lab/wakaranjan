import {createTile} from '../components/tile.js';

const LEVEL_NAME={beginner:'初級',intermediate:'中級',advanced:'上級',special:'特例・ルール差編'};
function tileRow(codes,ctx,label){
  if(!codes?.length)return null;
  const isHand=label.includes('手牌');
  const section=document.createElement('section');section.className='panel lesson-content-panel';section.innerHTML=`<div class="panel-role">見る</div><h2>${label}</h2><div class="${isHand?'hand-fit-scroll':'hand-scroll'}"><div class="tile-row data-lesson-tiles${isHand?' hand-fit-row':''}"></div></div>`;
  const row=section.querySelector('.tile-row');
  for(const code of codes){const tile=ctx.tileByCode.get(code);if(tile)row.append(createTile(tile,{interactive:false}))}
  return section;
}
function quizVisual(lesson,ctx){
  const codes=lesson.hand||[];if(!codes.length)return null;
  const visual=document.createElement('div');visual.className='lesson-check-visual';
  visual.innerHTML='<div class="panel-role">見る</div><strong>先に見る：この章の牌姿</strong><div class="hand-fit-scroll"><div class="tile-row hand-fit-row"></div></div>';
  const row=visual.querySelector('.tile-row');codes.forEach(code=>{const tile=ctx.tileByCode.get(code);if(tile)row.append(createTile(tile,{interactive:false}))});
  return visual;
}
function neighbor(ctx,lesson,delta){
  const same=ctx.lessons.filter(x=>x.level===lesson.level).sort((a,b)=>a.order-b.order);const i=same.findIndex(x=>x.id===lesson.id);return same[i+delta]||null;
}
function endLink(lesson){if(lesson.level==='intro')return {href:'learn?level=intro',label:'入門一覧へ'};if(lesson.level==='beginner')return {href:'beginner-review',label:'初級の総復習へ'};if(lesson.level==='intermediate')return {href:'intermediate-review',label:'中級の総復習へ'};if(lesson.level==='advanced')return {href:'learn?level=advanced',label:'上級一覧へ'};if(lesson.level==='special')return {href:'learn?level=special',label:'特例一覧へ'};return {href:'learn',label:'学ぶへ戻る'}}
function relatedTerms(quality,ctx){
  const terms=(quality?.termRefs||[]).map(id=>ctx.termById.get(id)).filter(Boolean);if(!terms.length)return null;
  const section=document.createElement('section');section.className='panel';section.innerHTML=`<h2>関連用語</h2><p class="muted">わからない言葉は、ここから用語集を開けます。</p><div class="related-term-links">${terms.map(t=>`<a class="secondary" href="#dictionary?term=${encodeURIComponent(t.id)}">${t.nameJa}<small>${t.readingJa}</small></a>`).join('')}</div>`;return section;
}
function sameCodes(left,right){const a=[...(left||[])].sort(),b=[...(right||[])].sort();return a.length===b.length&&a.every((code,index)=>code===b[index])}
function tileNames(codes,ctx){return (codes||[]).map(code=>ctx.tileByCode.get(code)?.nameJa||code).join('、')}
function questionGroup(question){return question?.skill||question?.topic||question?.interaction||''}
function renderQuiz(lesson,quality,ctx){
  const visualQuestion=lesson.visualCheck?{...lesson.visualCheck,interaction:'tile-pick',presentation:'tiles',handTiles:lesson.hand||[]}:null;
  const questions=[visualQuestion,lesson.check,...(quality?.checks||[])].filter(Boolean);
  const quiz=document.createElement('section');
  quiz.className='panel lesson-check';
  quiz.innerHTML='<div class="panel-role">解く</div><div class="quiz-meta"></div><h2>確認問題</h2><div class="lesson-check-visual-slot"></div><p class="quiz-prompt"></p><div class="quiz-options"></div><div class="feedback" aria-live="polite"></div>';
  let index=0,score=0,answered=false,retrying=false;
  const mistakes=[];
  const meta=quiz.querySelector('.quiz-meta');
  const prompt=quiz.querySelector('.quiz-prompt');
  const out=quiz.querySelector('.quiz-options');
  const feedback=quiz.querySelector('.feedback');
  const visual=quizVisual(lesson,ctx);
  if(visual)quiz.querySelector('.lesson-check-visual-slot').append(visual);

  const recordMistake=(questionIndex,q,selectedCodes=[])=>{
    const existing=mistakes.find(item=>item.questionIndex===questionIndex);
    if(existing){existing.selectedCodes=selectedCodes;return}
    mistakes.push({questionIndex,question:q,selectedCodes});
  };
  const renderMistakes=(items)=>{
    if(!items.length)return;
    const section=document.createElement('section');
    section.className='session-mistakes';
    section.innerHTML='<h3>間違えた問題を見直す</h3><p>最大3問を再掲します。牌や設問をもう一度見て、1問だけやり直せます。</p><div class="session-mistake-list"></div>';
    const list=section.querySelector('.session-mistake-list');
    items.slice(0,3).forEach(mistake=>{
      const card=document.createElement('article');
      card.className='session-mistake';
      const title=document.createElement('h3');
      title.textContent=mistake.question.prompt;
      card.append(title);
      if(mistake.question.interaction==='tile-pick'){
        const visual=quizVisual(lesson,ctx);
        if(visual){visual.classList.add('session-mistake-visual');card.append(visual)}
        const detail=document.createElement('p');
        detail.className='muted';
        detail.textContent=`選んだ牌：${tileNames(mistake.selectedCodes,ctx)||'なし'}／正解の牌：${tileNames(mistake.question.answerTileCodes,ctx)}`;
        card.append(detail);
      }
      const retry=document.createElement('button');
      retry.type='button';
      retry.className='secondary';
      retry.textContent='この問題をもう一度';
      retry.onclick=()=>{index=mistake.questionIndex;retrying=true;answered=false;draw()};
      card.append(retry);
      list.append(card);
    });
    if(items.length>3){
      const more=document.createElement('p');
      more.className='muted';
      more.textContent=`ほかに${items.length-3}問あります。上の「もう一度確認する」で全問をやり直せます。`;
      section.append(more);
    }
    out.append(section);
  };
  const appendNext=(label)=>{
    const actions=document.createElement('div');
    actions.className='action-row';
    const next=document.createElement('button');
    next.type='button';
    next.className='primary';
    const retryingNow=retrying;
    next.textContent=retryingNow?'結果へ':label;
    next.onclick=()=>{
      if(retryingNow){retrying=false;index=questions.length}else index++;
      answered=false;
      draw();
    };
    actions.append(next);
    feedback.append(actions);
  };
  const appendRecovery=(question,currentIndex)=>{
    const group=questionGroup(question);
    const candidateIndex=questions.findIndex((item,index)=>index>currentIndex&&questionGroup(item)===group);
    if(candidateIndex<0)return;
    const actions=document.createElement('div');
    actions.className='action-row recovery-actions';
    const retry=document.createElement('button');
    retry.type='button';
    retry.className='secondary';
    retry.textContent='この章をもう1問';
    retry.onclick=()=>{
      const [followUp]=questions.splice(candidateIndex,1);
      questions.splice(index+1,0,followUp);
      index++;
      answered=false;
      retrying=false;
      draw();
    };
    actions.append(retry);
    feedback.append(actions);
  };
  const draw=()=>{
    if(index>=questions.length){
      const outstanding=mistakes.filter(item=>!item.resolved);
      meta.textContent='確認完了';
      prompt.innerHTML=`<strong>最初の確認：${questions.length}問中 ${score}問正解</strong>`;
      out.innerHTML='';
      feedback.className=`feedback ${outstanding.length?'bad':'good'}`;
      feedback.textContent=outstanding.length?'間違えた問題を選ぶと、その問題だけもう一度確認できます。':'この章の要点を確認できました。';
      renderMistakes(outstanding);
      const row=document.createElement('div');
      row.className='action-row';
      const retry=document.createElement('button');
      retry.type='button';
      retry.className='secondary';
      retry.textContent='もう一度確認する';
      retry.onclick=()=>{index=0;score=0;answered=false;retrying=false;mistakes.length=0;draw()};
      row.append(retry);
      out.append(row);
      return;
    }
    const q=questions[index];
    const isVisual=q.interaction==='tile-pick';
    meta.textContent=`${index+1} / ${questions.length}`;
    prompt.textContent=q.prompt;
    out.innerHTML='';
    out.classList.toggle('tile-answer-options',isVisual);
    feedback.className='feedback';
    feedback.textContent='';
    answered=false;
    if(isVisual){
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
      const buttons=[];
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
          if(selected.has(code)){selected.delete(code);element.classList.remove('selected')}
          else{selected.add(code);element.classList.add('selected')}
          element.setAttribute('aria-pressed',selected.has(code)?'true':'false');
          status.textContent='選択中：'+(tileNames([...selected],ctx)||'なし');
          submit.disabled=selected.size===0;
        }});
        button.classList.add('tile-answer-tile');
        button.dataset.tileCode=code;
        buttons.push(button);
        palette.append(button);
      }
      submit.onclick=()=>{
        if(answered)return;
        answered=true;
        const expected=new Set(q.answerTileCodes||[]);
        const selectedCodes=[...selected];
        const ok=sameCodes(selectedCodes,q.answerTileCodes);
        if(!retrying){
          if(ok)score++;
          else recordMistake(index,q,selectedCodes);
        }else if(ok){
          const mistake=mistakes.find(item=>item.questionIndex===index);
          if(mistake)mistake.resolved=true;
        }
        feedback.className=`feedback ${ok?'good':'bad'}`;
        feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${q.explanation}${ok?'':`<br><small>選んだ牌：${tileNames(selectedCodes,ctx)||'なし'}<br>正解の牌：${tileNames(q.answerTileCodes,ctx)}</small>`}`;
        buttons.forEach(button=>{
          const code=button.dataset.tileCode;
          button.disabled=true;
          if(expected.has(code))button.dataset.correct='true';
          if(selected.has(code)&&!expected.has(code))button.dataset.wrong='true';
        });
        if(!ok&&!retrying)appendRecovery(q,index);
        appendNext(index+1===questions.length?'結果を見る':'次の問題');
      };
      panel.append(instruction,palette,status,submit);
      out.append(panel);
      return;
    }
    q.choices.forEach((choice,i)=>{
      const b=document.createElement('button');
      b.type='button';
      b.textContent=choice;
      b.onclick=()=>{
        if(answered)return;
        answered=true;
        const ok=i===q.answerIndex;
        if(!retrying){
          if(ok)score++;
          else recordMistake(index,q);
        }else if(ok){
          const mistake=mistakes.find(item=>item.questionIndex===index);
          if(mistake)mistake.resolved=true;
        }
        [...out.children].forEach((el,n)=>{
          el.disabled=true;
          if(n===q.answerIndex)el.dataset.correct='true';
          if(n===i&&!ok)el.dataset.wrong='true';
        });
        feedback.className=`feedback ${ok?'good':'bad'}`;
        feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${q.explanation}`;
        if(!ok&&!retrying)appendRecovery(q,index);
        appendNext(index+1===questions.length?'結果を見る':'次の問題');
      };
      out.append(b);
    });
  };
  draw();
  return quiz;
}

export function renderDataLesson(app,ctx,lesson){
  const level=LEVEL_NAME[lesson.level]||lesson.level;const quality=ctx.lessonQualityById?.get(lesson.id);
  app.innerHTML=`<section class="lesson-head"><div class="eyebrow">${level} ${lesson.order||''}</div><h1>${lesson.title}</h1><p class="lead">${lesson.lead}</p></section>`;
  const flow=document.createElement('ol');flow.className='lesson-flow';flow.setAttribute('aria-label','この章の進み方');flow.innerHTML=`<li><span>1</span><strong>見る</strong><small>要点と例</small></li><li><span>2</span><strong>${lesson.visualCheck?'触る':'考える'}</strong><small>${lesson.visualCheck?'牌を選ぶ':'手順を整理'}</small></li><li><span>3</span><strong>解く</strong><small>確認問題</small></li>`;app.append(flow);
  if(quality?.objective){const goal=document.createElement('section');goal.className='panel goal-panel lesson-content-panel';goal.innerHTML=`<div class="panel-role">目標</div><div class="eyebrow">この章でできるようになること</div><p>${quality.objective}</p>`;app.append(goal)}
  const key=document.createElement('section');key.className='panel lesson-content-panel';key.innerHTML=`<div class="panel-role">見る</div><h2>要点</h2><ol class="explain-list">${lesson.points.map(x=>`<li>${x}</li>`).join('')}</ol>`;app.append(key);
  if(lesson.hand)app.append(tileRow(lesson.hand,ctx,'手牌の例'));
  if(lesson.river)app.append(tileRow(lesson.river,ctx,'河の例'));
  if(lesson.example){const s=document.createElement('section');s.className='callout example-callout lesson-content-panel';s.innerHTML=`<div class="panel-role">具体例</div><strong>具体例</strong><br>${lesson.example}`;app.append(s)}
  if(quality?.steps?.length){const steps=document.createElement('section');steps.className='panel lesson-content-panel';steps.innerHTML=`<div class="panel-role">考える</div><h2>考え方の手順</h2><ol class="learning-steps">${quality.steps.map((x,i)=>`<li><span>${i+1}</span><p>${x}</p></li>`).join('')}</ol>`;app.append(steps)}
  if(quality?.mistakes?.length){const mistakes=document.createElement('section');mistakes.className='panel lesson-content-panel';mistakes.innerHTML=`<div class="panel-role">注意</div><h2>よくある間違い</h2><div class="mistake-grid">${quality.mistakes.map(x=>`<article class="mistake-card"><strong>注意</strong><p>${x}</p></article>`).join('')}</div>`;app.append(mistakes)}
  app.append(renderQuiz(lesson,quality,ctx));
  const terms=relatedTerms(quality,ctx);if(terms)app.append(terms);
  const prev=neighbor(ctx,lesson,-1),next=neighbor(ctx,lesson,1),end=endLink(lesson);const nav=document.createElement('div');nav.className='lesson-nav';nav.innerHTML=`${prev?`<a class="secondary" href="#${prev.id}">前へ：${prev.title}</a>`:`<a class="secondary" href="#learn?level=${lesson.level}">${LEVEL_NAME[lesson.level]||'学ぶ'}一覧へ</a>`}${next?`<a class="primary" href="#${next.id}">次へ：${next.title}</a>`:`<a class="primary" href="#${end.href}">${end.label}</a>`}`;app.append(nav);
}
