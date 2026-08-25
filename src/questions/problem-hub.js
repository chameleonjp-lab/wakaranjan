import {createTile} from '../components/tile.js';

const WRONG_KEY='wakaranjan-wrong-question-ids-v1';
const STATS_KEY='wakaranjan-question-stats-v1';
function shuffled(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function loadWrong(){try{return new Set(JSON.parse(localStorage.getItem(WRONG_KEY)||'[]'))}catch{return new Set()}}
function saveWrong(set){try{localStorage.setItem(WRONG_KEY,JSON.stringify([...set]))}catch{}}
function loadStats(){try{return JSON.parse(localStorage.getItem(STATS_KEY)||'{}')}catch{return {}}}
function saveStats(stats){try{localStorage.setItem(STATS_KEY,JSON.stringify(stats))}catch{}}
function skillOf(q){return q.skill||q.yakuRef||q.lessonRef||q.category}
function recordStat(stats,q,ok){const key=skillOf(q);const s=stats[key]||{correct:0,wrong:0};s[ok?'correct':'wrong']++;stats[key]=s;saveStats(stats)}
function weaknessScore(q,stats){const s=stats[skillOf(q)]||{correct:0,wrong:0};const attempts=s.correct+s.wrong;const rate=attempts?s.wrong/attempts:.5;return rate*5+Math.min(s.wrong,4)+(attempts<3?(3-attempts)*.7:0)+Math.random()*.8}
function adaptiveSample(pool,size,stats){return [...pool].sort((a,b)=>weaknessScore(b,stats)-weaknessScore(a,stats)).slice(0,size)}
function questionLabel(q,ctx){if(q.yakuRef){const y=ctx.yakuById.get(q.yakuRef);if(y)return y.displayNameJa||y.nameJa}return q.category}
function correctIndex(q){if(q.category==='score'&&Number.isFinite(q.expectedTotal)){const matches=q.choices.map((c,i)=>c.includes(String(q.expectedTotal))?i:-1).filter(i=>i>=0);if(matches.length===1)return matches[0]}return q.answerIndex}
function renderTileRow(codes,ctx,label){if(!codes?.length)return null;const wrap=document.createElement('div');wrap.className='visual-question-block';if(label){const h=document.createElement('strong');h.textContent=label;wrap.append(h)}const row=document.createElement('div');row.className='tile-row visual-question-tiles';for(const code of codes){const tile=ctx.tileByCode.get(code);if(tile)row.append(createTile(tile,{interactive:false}))}wrap.append(row);return wrap}
function renderVisualQuestion(app,q,ctx){const host=app.querySelector('#problem-visual');if(!host||q.presentation!=='tiles')return;const hand=renderTileRow(q.handTiles,ctx,'手牌');if(hand)host.append(hand);const river=renderTileRow(q.riverTiles,ctx,'自分の河');if(river)host.append(river);if(q.winTile){const tile=ctx.tileByCode.get(q.winTile);if(tile){const win=document.createElement('div');win.className='visual-win-tile';const label=document.createElement('strong');label.textContent='あがり牌';win.append(label,createTile(tile,{interactive:false}));host.append(win)}}}
function statSummary(data,stats){return data.categories.map(c=>{const qs=data.questions.filter(q=>q.category===c.id);let correct=0,wrong=0;for(const q of qs){const s=stats[skillOf(q)];if(s){correct+=s.correct||0;wrong+=s.wrong||0}}const total=correct+wrong;return {name:c.name,total,rate:total?Math.round(correct/total*100):null}})}

export function renderProblemHub(app,ctx){
  const data=ctx.problemCatalog;const wrong=loadWrong();const stats=loadStats();const summary=statSummary(data,stats);
  app.innerHTML=`<section class="hero"><div class="eyebrow">問題</div><h1>覚えた内容を、問題で確かめる。</h1><p>文章問題に加え、実際の牌姿を見て答える問題も出題します。学習結果はこの端末だけに保存されます。</p></section>
  <section class="feature-grid">${data.categories.map(c=>{const count=data.questions.filter(q=>q.category===c.id).length;return `<button class="feature-card problem-category" type="button" data-category="${c.id}"><strong>${c.name}</strong><span>${c.description}</span><small>${count}問からランダム出題</small></button>`}).join('')}</section>
  <section class="panel"><h2>苦手を優先して練習</h2><p>これまでの正解・不正解から、間違いが多い分野やまだ解いた回数が少ない分野を優先します。</p><div class="action-row"><button id="adaptive-review" class="primary" type="button">苦手優先10問</button></div><div class="skill-summary">${summary.map(s=>`<div><strong>${s.name}</strong><span>${s.total?`${s.rate}%（${s.total}回答）`:'まだ記録なし'}</span></div>`).join('')}</div></section>
  <section class="panel"><h2>間違えた問題</h2><p>${wrong.size?`${wrong.size}問が復習待ちです。正解するまで残ります。`:'現在、復習待ちの問題はありません。'}</p><div class="action-row"><button id="wrong-review" class="primary" type="button" ${wrong.size?'':'disabled'}>間違えた問題だけ解く</button>${wrong.size?'<button id="clear-wrong" class="secondary" type="button">復習記録を消す</button>':''}<button id="clear-stats" class="secondary" type="button">学習記録を消す</button></div></section>
  <div class="lesson-nav"><a class="secondary" href="#home">ホームへ戻る</a></div>`;
  app.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>renderProblemSession(app,ctx,{category:b.dataset.category}));
  app.querySelector('#adaptive-review')?.addEventListener('click',()=>renderProblemSession(app,ctx,{adaptive:true}));
  app.querySelector('#wrong-review')?.addEventListener('click',()=>renderProblemSession(app,ctx,{wrongOnly:true}));
  app.querySelector('#clear-wrong')?.addEventListener('click',()=>{saveWrong(new Set());renderProblemHub(app,ctx)});
  app.querySelector('#clear-stats')?.addEventListener('click',()=>{try{localStorage.removeItem(STATS_KEY)}catch{};renderProblemHub(app,ctx)});
}

export function renderProblemSession(app,ctx,{category=null,wrongOnly=false,adaptive=false}={}){
  const data=ctx.problemCatalog;const wrong=loadWrong();const stats=loadStats();
  let pool=data.questions.filter(q=>wrongOnly?wrong.has(q.id):adaptive?true:q.category===category);
  if(!pool.length){renderProblemHub(app,ctx);return}
  const size=wrongOnly?Math.min(20,pool.length):Math.min(data.sessionSize||10,pool.length);
  const session=adaptive?adaptiveSample(pool,size,stats):shuffled(pool).slice(0,size);let index=0,correct=0,answered=false;
  const cat=data.categories.find(c=>c.id===category);const title=wrongOnly?'間違えた問題の復習':adaptive?'苦手優先練習':cat?.name||'問題';
  const render=()=>{
    const q=session[index];
    if(!q){const percent=Math.round(correct/session.length*100);app.innerHTML=`<section class="hero"><div class="eyebrow">${title}</div><h1>${correct} / ${session.length} 問正解</h1><p>正答率 ${percent}% 。この結果は苦手優先出題に反映されます。</p><div class="action-row"><button id="same-again" class="primary" type="button">もう一度挑戦</button><a class="secondary" href="#problems">問題一覧へ</a></div></section>`;app.querySelector('#same-again').onclick=()=>renderProblemSession(app,ctx,{category,wrongOnly,adaptive});return}
    const answer=correctIndex(q);
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">${title}</div><h1>問題 ${index+1} / ${session.length}</h1><p class="lead">${q.prompt}</p></section><section class="panel"><div class="review-progress"><span style="width:${index/session.length*100}%"></span></div><div id="problem-visual"></div><div class="quiz-options" id="problem-options"></div><div class="feedback" id="problem-feedback" aria-live="polite"></div><div class="action-row" id="problem-actions"></div></section>`;
    renderVisualQuestion(app,q,ctx);
    const options=app.querySelector('#problem-options'),feedback=app.querySelector('#problem-feedback'),actions=app.querySelector('#problem-actions');
    q.choices.forEach((choice,i)=>{const b=document.createElement('button');b.type='button';b.textContent=choice;b.onclick=()=>{if(answered)return;answered=true;const ok=i===answer;if(ok){correct++;wrong.delete(q.id)}else wrong.add(q.id);saveWrong(wrong);recordStat(stats,q,ok);feedback.className=`feedback ${ok?'good':'bad'}`;feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${q.explanation}`;[...options.children].forEach((el,n)=>{el.disabled=true;if(n===answer)el.dataset.correct='true';if(n===i&&!ok)el.dataset.wrong='true'});if(q.lessonRef&&ctx.lessonById.has(q.lessonRef)){const a=document.createElement('a');a.className='secondary';a.href=`#${q.lessonRef}`;a.textContent='関連する解説を見る';actions.append(a)}else if(q.yakuRef&&ctx.yakuById.has(q.yakuRef)){const a=document.createElement('a');a.className='secondary';a.href=`#yaku-guide?yaku=${encodeURIComponent(q.yakuRef)}`;a.textContent=`${questionLabel(q,ctx)}を役図鑑で見る`;actions.append(a)}const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=index===session.length-1?'結果を見る':'次の問題';next.onclick=()=>{index++;answered=false;render()};actions.append(next)};options.append(b)});
  };render();
}
