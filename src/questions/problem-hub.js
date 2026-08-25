const WRONG_KEY='wakaranjan-wrong-question-ids-v1';
function shuffled(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function loadWrong(){try{return new Set(JSON.parse(localStorage.getItem(WRONG_KEY)||'[]'))}catch{return new Set()}}
function saveWrong(set){try{localStorage.setItem(WRONG_KEY,JSON.stringify([...set]))}catch{}}
function questionLabel(q,ctx){if(q.yakuRef){const y=ctx.yakuById.get(q.yakuRef);if(y)return y.displayNameJa||y.nameJa}return q.category}
function correctIndex(q){if(q.category==='score'&&Number.isFinite(q.expectedTotal)){const matches=q.choices.map((c,i)=>c.includes(String(q.expectedTotal))?i:-1).filter(i=>i>=0);if(matches.length===1)return matches[0]}return q.answerIndex}

export function renderProblemHub(app,ctx){
  const data=ctx.problemCatalog;const wrong=loadWrong();
  app.innerHTML=`<section class="hero"><div class="eyebrow">問題</div><h1>覚えた内容を、問題で確かめる。</h1><p>3カテゴリから選べます。1回10問。間違えた問題は端末内に保存され、あとでまとめて復習できます。</p></section>
  <section class="feature-grid">${data.categories.map(c=>{const count=data.questions.filter(q=>q.category===c.id).length;return `<button class="feature-card problem-category" type="button" data-category="${c.id}"><strong>${c.name}</strong><span>${c.description}</span><small>${count}問からランダム出題</small></button>`}).join('')}</section>
  <section class="panel"><h2>間違えた問題</h2><p>${wrong.size?`${wrong.size}問が復習待ちです。正解するまで残ります。`:'現在、復習待ちの問題はありません。'}</p><div class="action-row"><button id="wrong-review" class="primary" type="button" ${wrong.size?'':'disabled'}>間違えた問題だけ解く</button>${wrong.size?'<button id="clear-wrong" class="secondary" type="button">復習記録を消す</button>':''}</div></section>
  <div class="lesson-nav"><a class="secondary" href="#home">ホームへ戻る</a></div>`;
  app.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>renderProblemSession(app,ctx,{category:b.dataset.category}));
  app.querySelector('#wrong-review')?.addEventListener('click',()=>renderProblemSession(app,ctx,{wrongOnly:true}));
  app.querySelector('#clear-wrong')?.addEventListener('click',()=>{saveWrong(new Set());renderProblemHub(app,ctx)});
}

export function renderProblemSession(app,ctx,{category=null,wrongOnly=false}={}){
  const data=ctx.problemCatalog;const wrong=loadWrong();
  let pool=data.questions.filter(q=>wrongOnly?wrong.has(q.id):q.category===category);
  if(!pool.length){renderProblemHub(app,ctx);return}
  const size=wrongOnly?Math.min(20,pool.length):Math.min(data.sessionSize||10,pool.length);
  const session=shuffled(pool).slice(0,size);let index=0,correct=0,answered=false;
  const cat=data.categories.find(c=>c.id===category);const title=wrongOnly?'間違えた問題の復習':cat?.name||'問題';
  const render=()=>{
    const q=session[index];
    if(!q){const percent=Math.round(correct/session.length*100);app.innerHTML=`<section class="hero"><div class="eyebrow">${title}</div><h1>${correct} / ${session.length} 問正解</h1><p>正答率 ${percent}% 。間違えた問題は復習リストに残ります。</p><div class="action-row"><button id="same-again" class="primary" type="button">もう一度挑戦</button><a class="secondary" href="#problems">問題一覧へ</a></div></section>`;app.querySelector('#same-again').onclick=()=>renderProblemSession(app,ctx,{category,wrongOnly});return}
    const answer=correctIndex(q);
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">${title}</div><h1>問題 ${index+1} / ${session.length}</h1><p class="lead">${q.prompt}</p></section><section class="panel"><div class="review-progress"><span style="width:${index/session.length*100}%"></span></div><div class="quiz-options" id="problem-options"></div><div class="feedback" id="problem-feedback" aria-live="polite"></div><div class="action-row" id="problem-actions"></div></section>`;
    const options=app.querySelector('#problem-options'),feedback=app.querySelector('#problem-feedback'),actions=app.querySelector('#problem-actions');
    q.choices.forEach((choice,i)=>{const b=document.createElement('button');b.type='button';b.textContent=choice;b.onclick=()=>{if(answered)return;answered=true;const ok=i===answer;if(ok){correct++;wrong.delete(q.id)}else wrong.add(q.id);saveWrong(wrong);feedback.className=`feedback ${ok?'good':'bad'}`;feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${q.explanation}`;[...options.children].forEach((el,n)=>{el.disabled=true;if(n===answer)el.dataset.correct='true';if(n===i&&!ok)el.dataset.wrong='true'});if(q.lessonRef&&ctx.lessonById.has(q.lessonRef)){const a=document.createElement('a');a.className='secondary';a.href=`#${q.lessonRef}`;a.textContent='関連する解説を見る';actions.append(a)}else if(q.yakuRef&&ctx.yakuById.has(q.yakuRef)){const a=document.createElement('a');a.className='secondary';a.href=`#yaku-guide?yaku=${encodeURIComponent(q.yakuRef)}`;a.textContent=`${questionLabel(q,ctx)}を役図鑑で見る`;actions.append(a)}const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=index===session.length-1?'結果を見る':'次の問題';next.onclick=()=>{index++;answered=false;render()};actions.append(next)};options.append(b)});
  };render();
}
