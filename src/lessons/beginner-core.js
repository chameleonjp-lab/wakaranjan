import {createTile} from '../components/tile.js';

function tile(ctx,code,options={}){return createTile(ctx.tileByCode.get(code),options)}
const NAV_LABELS={'lesson-beginner-02':'鳴き','lesson-beginner-03':'リーチ','lesson-beginner-04':'フリテン','lesson-beginner-05':'初級役','lesson-beginner-06':'ドラ','lesson-beginner-07':'初級総合一局'};
function addNav(app,prev,next){const nav=document.createElement('div');nav.className='lesson-nav';nav.innerHTML=`<a class="secondary" href="#${prev}">前へ：${NAV_LABELS[prev]||'前の章'}</a><a class="primary" href="#${next}">次へ：${NAV_LABELS[next]||'次の章'}</a>`;app.append(nav)}
function visualRow(ctx,codes){const row=document.createElement('div');row.className='tile-row hand-fit-row';codes.forEach(code=>row.append(tile(ctx,code)));return row}
function visualDecision(ctx,{title,hand,river,handLabel='手牌',riverLabel='自分の河'}){const panel=document.createElement('section');panel.className='panel lesson-visual';panel.innerHTML=`<h2>${title}</h2><div class="visual-decision-grid"><div><strong>${handLabel}</strong><div class="visual-hand-slot"></div></div><div><strong>${riverLabel}</strong><div class="visual-river-slot river"></div></div></div>`;panel.querySelector('.visual-hand-slot').append(visualRow(ctx,hand));panel.querySelector('.visual-river-slot').replaceChildren(...river.map(code=>tile(ctx,code)));return panel}
function displayExampleHand(example){const codes=[...(example?.tiles||[])];if(example?.winTile&&codes.length===14){const index=codes.indexOf(example.winTile);if(index>=0)codes.splice(index,1)}return codes}
function appendYakuExample(card,y,ctx){
  const example=ctx.yakuExamples?.[y.id];
  if(!example)return;
  const visual=document.createElement('div');visual.className='yaku-focus-visual';
  const heading=document.createElement('strong');heading.textContent='牌姿を先に見る';
  const handLabel=document.createElement('span');handLabel.className='yaku-focus-label';handLabel.textContent='手牌（13枚）';
  const row=document.createElement('div');row.className='tile-row hand-fit-row yaku-example-row';
  displayExampleHand(example).forEach(code=>{const item=ctx.tileByCode.get(code);if(item)row.append(createTile(item,{interactive:false}))});
  const win=document.createElement('div');win.className='yaku-focus-win';
  const winLabel=document.createElement('span');winLabel.className='yaku-focus-label';winLabel.textContent='あがり牌（完成する牌）';
  const winTile=ctx.tileByCode.get(example.winTile);if(winTile)win.append(winLabel,createTile(winTile,{interactive:false,drawn:true}));
  visual.append(heading,handLabel,row,win);card.append(visual);
}
function quiz(app,questions){let i=0,score=0;const box=document.createElement('section');box.className='panel';app.append(box);const render=()=>{if(i>=questions.length){box.innerHTML=`<h2>確認終了</h2><p><strong>${questions.length}問中 ${score}問正解</strong></p><button class="primary" type="button" id="retry">もう一度</button>`;box.querySelector('#retry').onclick=()=>{i=0;score=0;render()};return}const q=questions[i];box.innerHTML=`<div class="eyebrow">確認 ${i+1}/${questions.length}</div><h2>${q.q}</h2><div class="quiz-options">${q.options.map((o,n)=>`<button type="button" data-i="${n}">${o}</button>`).join('')}</div><div class="feedback" aria-live="polite"></div>`;const fb=box.querySelector('.feedback');box.querySelectorAll('.quiz-options button').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.i);const ok=n===q.answer;if(ok)score++;box.querySelectorAll('.quiz-options button').forEach((x,j)=>{x.disabled=true;if(j===q.answer)x.dataset.correct='true';else if(j===n)x.dataset.wrong='true'});fb.className=`feedback ${ok?'good':'bad'}`;fb.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${q.explain}<div class="action-row"><button type="button" id="nextq">${i+1===questions.length?'結果を見る':'次の問題'}</button></div>`;fb.querySelector('#nextq').onclick=()=>{i++;render()}})};render()}

function yakuLabel(y){return y.displayNameJa||y.nameJa}
function yakuOpenLabel(y){return y.openHan===null?'門前限定':`鳴いても成立${y.openHan!==y.closedHan?`（${y.openHan}翻）`:''}`}
function yakuChoices(yaku,index){
  const distractors=[];
  for(let offset=1;distractors.length<3&&offset<yaku.length+1;offset++){
    const candidate=yaku[(index+offset)%yaku.length];
    if(candidate&&candidate.id!==yaku[index].id&&!distractors.some(item=>item.id===candidate.id))distractors.push(candidate);
  }
  const choices=[yaku[index],...distractors];
  choices.sort(()=>Math.random()-.5);
  return choices;
}

export function renderBeginner03(app,ctx){
  const data=ctx.beginnerCore.riichi;
  app.innerHTML='<section class="lesson-head"><div class="eyebrow">初級 3</div><h1>リーチ</h1><p class="lead">門前でテンパイしたら、1000点棒を出して「リーチ」と宣言できます。</p></section>';
  const p=document.createElement('section');p.className='panel';p.innerHTML=`<h2>リーチできる条件</h2><ol>${data.requirements.map(x=>`<li>${x}</li>`).join('')}</ol><div class="callout">${data.note}</div><h2>宣言した後</h2><ul>${data.afterDeclaration.map(x=>`<li>${x}</li>`).join('')}</ul>`;app.append(p);
  const riichi=visualDecision(ctx,{title:'牌で確認：門前テンパイ',hand:['1m','2m','3m','3p','4p','5p','6s','7s','8s','2z','2z','5z','5z'],river:[],riverLabel:'供託するもの'});
  riichi.querySelector('.visual-river-slot').className='score-stick-box';riichi.querySelector('.score-stick-box').innerHTML='<span class="score-stick" aria-label="1000点棒">1000点棒</span><small>リーチを宣言すると供託します</small>';app.append(riichi);
  quiz(app,[{q:'ポンした手でテンパイしました。リーチできますか？',options:['できる','できない'],answer:1,explain:'ポンすると門前ではないため、通常のリーチはできません。'},{q:'門前でテンパイしています。リーチ宣言で卓に出すものは？',options:['100点棒','1000点棒','5000点棒'],answer:1,explain:'リーチ棒として1000点棒を1本供託します。'},{q:'リーチ後にあがり牌を見逃しました。その後ロンできますか？',options:['できる','できない'],answer:1,explain:'リーチ後の見逃しはフリテンとなり、その局はロンできません。ツモあがりは可能です。'}]);
  addNav(app,'lesson-beginner-02','lesson-beginner-04');
}

export function renderBeginner04(app,ctx){
  app.innerHTML='<section class="lesson-head"><div class="eyebrow">初級 4</div><h1>フリテン</h1><p class="lead">待ち牌でも、条件によってはロンできません。これをフリテンと呼びます。</p></section>';
  const grid=document.createElement('div');grid.className='shape-grid';ctx.beginnerCore.furiten.forEach(f=>{const a=document.createElement('article');a.className='shape-card';a.innerHTML=`<h2>${f.name}</h2><p>${f.description}</p><p class="muted">解消：${f.clears}</p>`;grid.append(a)});app.append(grid);
  const ex=visualDecision(ctx,{title:'一番大事な確認',hand:['1m','2m','3m','4p','5p','6p','2s','3s','4s','6m','7m','5z','5z'],river:['3m','9p','2p']});
  const note=document.createElement('p');note.innerHTML='この手は<strong>3萬・6萬待ち</strong>です。自分の河に3萬があるため、6萬が出てもロンできません。';ex.append(note);const callout=document.createElement('div');callout.className='callout';callout.textContent='フリテンでもツモあがりはできます。';ex.append(callout);app.append(ex);
  quiz(app,[{q:'3萬・6萬待ち。自分の河に3萬があります。他家が6萬を捨てました。',options:['ロンできる','ロンできない'],answer:1,explain:'自分の待ち牌の一つである3萬を捨てているため、6萬もロンできません。'},{q:'フリテン中に自分であがり牌をツモりました。',options:['ツモあがりできる','あがれない'],answer:0,explain:'フリテンが禁止するのはロンです。ツモあがりはできます。'},{q:'リーチ後にあがり牌を一度見逃しました。',options:['次巡からロンできる','その局はロンできない'],answer:1,explain:'リーチ後の見逃しによるフリテンは、その局では解消しません。'}]);
  addNav(app,'lesson-beginner-03','lesson-beginner-05');
}

export function renderBeginner05(app,ctx){
  const yaku=ctx.beginnerCore.beginnerYakuIds.map(id=>ctx.yakuById.get(id)).filter(Boolean);
  let index=0;let score=0;let answered=false;
  const showResult=()=>{app.innerHTML=`<section class="hero"><div class="eyebrow">初級5 完了</div><h1>初級役を確認しました</h1><p><strong>${yaku.length}役中 ${score}問正解</strong></p><p>牌姿を見て、役の名前・成立条件・門前限定かどうかを確認しました。</p><div class="action-row"><button class="primary" id="retry-yaku" type="button">もう一度</button><a class="secondary" href="#lesson-beginner-06">次：ドラ</a></div></section>`;app.querySelector('#retry-yaku').onclick=()=>{index=0;score=0;answered=false;render()}};
  const render=()=>{
    const current=yaku[index];
    const choices=yakuChoices(yaku,index);
    const answerIndex=choices.findIndex(choice=>choice.id===current.id);
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">初級 5</div><h1>初級役</h1><p class="lead">牌姿を1つずつ見て、成立する役を選びます。答え合わせで、その役の特徴を覚えます。</p></section><section class="panel yaku-focus"><div class="eyebrow">役 '+(index+1)+' / '+yaku.length+'</div><h2>牌姿を見て、成立する役を選んでください</h2><div class="selection-area selection-area-hand"><h3>先に見る：手牌とあがり牌</h3><div id="yaku-focus-visual"></div></div><div class="selection-area selection-area-choices"><h3>選択肢</h3><div class="quiz-options" id="yaku-focus-options"></div></div><div class="feedback" id="yaku-focus-feedback" aria-live="polite"></div><div class="action-row" id="yaku-focus-actions"></div></section>';
    appendYakuExample(app.querySelector('#yaku-focus-visual'),current,ctx);
    const options=app.querySelector('#yaku-focus-options');const feedback=app.querySelector('#yaku-focus-feedback');const actions=app.querySelector('#yaku-focus-actions');
    choices.forEach((choice,choiceIndex)=>{const button=document.createElement('button');button.type='button';button.textContent=yakuLabel(choice);button.onclick=()=>{if(answered)return;answered=true;const ok=choiceIndex===answerIndex;if(ok)score++;[...options.children].forEach((item,itemIndex)=>{item.disabled=true;if(itemIndex===answerIndex)item.dataset.correct='true';else if(itemIndex===choiceIndex)item.dataset.wrong='true'});const example=ctx.yakuExamples?.[current.id];feedback.className='feedback '+(ok?'good':'bad');feedback.innerHTML='<strong>'+(ok?'正解':'不正解')+'</strong><br><strong class="yaku-answer-name">'+yakuLabel(current)+'（'+current.readingJa+'）</strong><br>'+current.summary+'<br><small>'+yakuOpenLabel(current)+'。'+(example?.note||'')+'</small>';const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=index===yaku.length-1?'結果を見る':'次の役';next.onclick=()=>{if(index===yaku.length-1){showResult();return}index++;answered=false;render()};actions.append(next)};options.append(button)});
    addNav(app,'lesson-beginner-04','lesson-beginner-06');
  };
  render();
}

export function renderBeginner06(app,ctx){
  const d=ctx.beginnerCore.dora;
  app.innerHTML=`<section class="lesson-head"><div class="eyebrow">初級 6</div><h1>ドラ</h1><p class="lead">ドラは持っていると点数を増やします。ただし、ドラだけではあがれません。</p></section><section class="panel"><h2>表示牌の「次」がドラ</h2><p>${d.rule}</p><div class="callout">9の次は1、北の次は東、中の次は白に戻ります。</div></section>`;
  const grid=document.createElement('div');grid.className='shape-grid';d.examples.forEach(e=>{const a=document.createElement('article');a.className='shape-card';a.innerHTML='<h2>表示牌 → ドラ</h2><div class="tile-row"></div>';const row=a.querySelector('.tile-row');row.append(tile(ctx,e.indicator));const arrow=document.createElement('strong');arrow.textContent='→';row.append(arrow,tile(ctx,e.dora));grid.append(a)});app.append(grid);
  quiz(app,[{q:'ドラ表示牌が九筒です。ドラは？',options:['八筒','九筒','一筒'],answer:2,explain:'数牌は9の次が1に戻るため、一筒がドラです。'},{q:'ドラ表示牌が北です。ドラは？',options:['東','南','白'],answer:0,explain:'風牌は東→南→西→北→東の順です。'},{q:'役がなく、ドラだけ2枚あります。あがれますか？',options:['あがれる','あがれない'],answer:1,explain:'ドラは翻を追加しますが役ではありません。別に1つ以上の役が必要です。'}]);
  addNav(app,'lesson-beginner-05','lesson-beginner-07');
}
