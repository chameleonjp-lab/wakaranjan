import {appendTileRow,createTile} from '../components/tile.js';
import {renderEastRound} from './east-round.js';
import {renderWallPractice} from './wall-practice.js';
import {renderKanPractice} from './kan-practice.js';
import {renderHandFlow} from './hand-flow.js';
import {renderRoundFlow} from './round-flow.js';

const INITIAL_HAND=['2m','3m','4m','5p','6p','7p','2s','3s','4s','6s','7s','1z','1z'];
const DRAW_TILE='5s';
const CALL_STEPS=[
  {title:'チー',from:'上家',hand:['3m','4m'],discard:'5m',choices:['チーする','見送る'],answer:0,explanation:'チーは上家が捨てた牌に対してできます。3萬・4萬に5萬を加えると順子になります。'},
  {title:'ポン',from:'他家',hand:['5z','5z'],discard:'5z',choices:['ポンする','見送る'],answer:0,explanation:'ポンは、他の3人の誰が捨てた牌に対してもできます。同じ牌3枚の組を作ります。'},
  {title:'見送る',from:'上家',hand:['3m','3m'],discard:'4m',choices:['鳴く','見送る'],answer:1,explanation:'3萬2枚だけでは、4萬を使った順子も刻子も作れません。形が作れない鳴きはできません。'}
];
const RIICHI_HAND=['1m','2m','3m','3p','4p','5p','6s','7s','8s','2z','2z','5z','5z'];
const FURITEN_STEPS=[
  {title:'自分の河に待ち牌がある',hand:RIICHI_HAND,river:['5z'],prompt:'自分の河に待ち牌の白がある状態で、他家が白を捨てました。ロンできますか？',choices:['ロンできる','ロンできない'],answer:1,explanation:'自分が待ち牌を捨てているため、フリテンです。フリテン中はロンできません。ただし、ツモならあがれます。'},
  {title:'同巡内に見逃した',hand:RIICHI_HAND,river:['2z'],prompt:'自分の河に待ち牌はありません。直前に他家が白を捨てたときロンを見逃し、同じ巡内にもう一度白が捨てられました。ロンできますか？',choices:['ロンできる','ロンできない'],answer:1,explanation:'ロンを見逃した同じ巡の間は、同じ待ち牌でロンできません。自分の番を経ると解除されます。'}
];

function tile(ctx,code,options={}){return createTile(ctx.tileByCode.get(code),options)}
function nav(){return '<div class="lesson-nav"><a class="secondary" href="#practice">対局練習へ戻る</a><a class="primary" href="#menu">メニューへ</a></div>'}
function tileBlock(ctx,label,codes,className='practice-tile-block'){
  const box=document.createElement('div');box.className=className;
  const title=document.createElement('strong');title.textContent=label;box.append(title);
  const row=document.createElement('div');row.className='tile-row hand-fit-row';codes.forEach(code=>row.append(tile(ctx,code)));box.append(row);
  return box;
}
function renderPracticeIndex(app){
  app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習</div><h1>牌を動かして、判断を練習する。</h1><p class="lead">最初は短い操作から始め、鳴き・リーチ・フリテンへ進みます。時間制限はなく、間違えてもすぐにやり直せます。</p></section><section class="callout"><strong>迷ったら、上から順に進めてください。</strong><br>手を動かす練習、正しいか判断する練習、一局の流れを見る練習を分けています。</section><section class="practice-group"><h2>はじめて</h2><div class="feature-grid practice-grid"><a class="feature-card practice-card practice-recommended" href="#practice?mode=draw-discard"><strong>1. ツモと捨て牌</strong><span>1枚取って、1枚捨てる基本操作</span></a><a class="feature-card practice-card practice-recommended" href="#practice?mode=calls"><strong>2. 鳴き</strong><span>手牌と相手の捨て牌を見て、鳴けるか判断</span></a><a class="feature-card practice-card practice-recommended" href="#practice?mode=riichi"><strong>3. リーチとあがり</strong><span>テンパイ、リーチ、ロンの順番</span></a></div></section><section class="practice-group"><h2>そのあと</h2><div class="feature-grid practice-grid"><a class="feature-card practice-card" href="#practice?mode=furiten"><strong>フリテン</strong><span>ロンできない場面とツモの関係</span></a><a class="feature-card practice-card" href="#practice?mode=round"><strong>一局を体験する</strong><span>案内付き、実牌、局の進み方を1つの入口から選べます</span></a></div></section><details class="practice-details"><summary>詳しい練習を開く</summary><div class="feature-grid practice-grid"><a class="feature-card practice-card" href="#practice?mode=wall"><strong>牌山と王牌</strong><span>牌山、王牌、ドラ表示牌を確認</span></a><a class="feature-card practice-card" href="#practice?mode=kan"><strong>カンと嶺上ツモ</strong><span>暗槓・大明槓・加槓の後の処理を確認</span></a></div></details>'+nav();
}
function renderRoundMenu(app){
  app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習</div><h1>一局を体験する</h1><p class="lead">一局に関わる練習を、目的に合わせて選べます。迷ったら「操作を覚える」から始めてください。</p></section><section class="practice-round-menu" aria-labelledby="round-menu-title"><h2 id="round-menu-title">どの練習をしますか？</h2><div class="feature-grid practice-grid"><article class="feature-card practice-round-choice"><h3>操作を覚える</h3><p>ツモからロンまでを、案内に沿って短く体験します。</p><a class="primary" href="#lesson-intro-06">案内付き一局を始める</a></article><article class="feature-card practice-round-choice"><h3>判断して進める</h3><p>実際の牌山で、捨て牌や他家の応答を確認します。</p><a class="primary" href="#practice?mode=hand-flow">実牌で一局を始める</a></article><article class="feature-card practice-round-choice"><h3>流れを見る</h3><p>局の進み方や東風戦を、順番に見ていきます。</p><div class="practice-round-links"><a class="secondary" href="#practice?mode=round-flow">局の進み方</a><a class="secondary" href="#practice?mode=east-round">模擬東風戦</a></div></article></div></section>'+nav();
}
function renderDrawDiscard(app,ctx){
  let state='ready';let hand=[...INITIAL_HAND];let river=[];
  const render=()=>{
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習 1</div><h1>ツモと捨て牌</h1><p class="lead">自分の番は、山から1枚取って、手牌から1枚捨てます。</p></section><section class="practice-surface"><p id="draw-message" class="status"></p><div class="practice-step-list"><span class="active">1 ツモ</span><span class="'+(state!=='ready'?'active':'')+'">2 捨てる</span><span class="'+(state==='done'?'active':'')+'">3 確認</span></div><div class="practice-hand" id="draw-hand"></div><h2 class="section-title">自分の河</h2><div class="river" id="draw-river"></div><div class="action-row" id="draw-actions"></div><div class="feedback" id="draw-feedback"></div></section>'+nav();
    const message=app.querySelector('#draw-message');const handBox=app.querySelector('#draw-hand');const riverBox=app.querySelector('#draw-river');const feedback=app.querySelector('#draw-feedback');const actions=app.querySelector('#draw-actions');
    if(state==='ready'){message.textContent='まず「1枚ツモする」を押してください。';}
    if(state==='drawn'){message.textContent='14枚になりました。捨てたい牌を1枚タップしてください。';}
    if(state==='done'){message.textContent='1枚取って1枚捨てる流れを確認できました。';feedback.className='feedback good';feedback.textContent='正解・不正解のない操作練習です。実際の対局では、何を残すかを考えて捨てます。';}
    appendTileRow(handBox,hand.map(code=>ctx.tileByCode.get(code)),{rowClass:'hand-fit-row',interactive:state==='drawn',drawnIndex:state==='drawn'?hand.length-1:-1,onSelect:(_tile,_options,_element,index)=>{if(state==='drawn'){river.push(hand[index]);hand.splice(index,1);state='done';render()}}});
    river.forEach(code=>riverBox.append(tile(ctx,code)));
    if(state==='ready'){const b=document.createElement('button');b.className='primary';b.type='button';b.textContent='1枚ツモする';b.onclick=()=>{hand.push(DRAW_TILE);state='drawn';render()};actions.append(b)}
    if(state==='done'){const b=document.createElement('button');b.className='secondary';b.type='button';b.textContent='もう一度練習する';b.onclick=()=>{hand=[...INITIAL_HAND];river=[];state='ready';render()};actions.append(b)}
  };
  render();
}
function renderCalls(app,ctx){
  let index=0;let answered=false;
  const render=()=>{
    const step=CALL_STEPS[index];
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習 2</div><h1>鳴き</h1><p class="lead">捨てた人と、手元の牌を見て、鳴けるか判断します。</p></section><section class="practice-surface"><p class="status">'+step.title+'の練習 '+(index+1)+' / '+CALL_STEPS.length+'</p><p>'+step.from+'が牌を捨てました。まず牌を見てから判断します。</p><div class="selection-area selection-area-hand"><h2>先に見る：手牌と捨て牌</h2><div class="practice-call-layout"><div id="call-hand"></div><div class="practice-discard"><strong>'+step.from+'の捨て牌</strong><div id="call-discard"></div></div></div></div><div class="selection-area selection-area-choices"><h2>選択肢</h2><div class="practice-options" id="call-options"></div></div><div class="feedback" id="call-feedback" aria-live="polite"></div><div class="action-row" id="call-actions"></div></section>'+nav();
    app.querySelector('#call-hand').append(tileBlock(ctx,'あなたの手牌',step.hand));
    app.querySelector('#call-discard').append(tile(ctx,step.discard,{drawn:true}));
    const options=app.querySelector('#call-options');const feedback=app.querySelector('#call-feedback');const actions=app.querySelector('#call-actions');
    step.choices.forEach((choice,choiceIndex)=>{const b=document.createElement('button');b.type='button';b.className='practice-choice';b.textContent=choice;b.onclick=()=>{if(answered)return;answered=true;const ok=choiceIndex===step.answer;feedback.className='feedback '+(ok?'good':'bad');feedback.innerHTML='<strong>'+(ok?'正解':'もう一度確認')+'</strong><br>'+step.explanation;[...options.children].forEach(el=>el.disabled=true);const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=index===CALL_STEPS.length-1?'鳴きの練習を終える':'次の場面';next.onclick=()=>{if(index===CALL_STEPS.length-1){location.hash='#practice';return}index++;answered=false;render()};actions.append(next)};options.append(b)});
  };
  render();
}
function renderRiichi(app,ctx){
  let state='question';
  const render=()=>{
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習 3</div><h1>リーチとあがり</h1><p class="lead">テンパイしているか、リーチ後にロンできるかを順番に確認します。</p></section><section class="practice-surface"><p class="status">'+(state==='question'?'まず手牌と待ち牌を見てください。':state==='wait'?'リーチ後、他家が白を捨てました。':'ロンできました。')+'</p><div class="selection-area selection-area-hand"><h2>先に見る：手牌と待ち牌</h2><div id="riichi-hand"></div><div class="practice-discard"><strong>待ち牌</strong><div id="riichi-waits"></div></div></div><div class="selection-area selection-area-choices"><h2>選択肢</h2><div class="practice-options" id="riichi-options"></div></div><div class="feedback" id="riichi-feedback" aria-live="polite"></div></section>'+nav();
    app.querySelector('#riichi-hand').append(tileBlock(ctx,'あなたの手牌（13枚）',RIICHI_HAND));
    const waits=app.querySelector('#riichi-waits');['2z','5z'].forEach(code=>waits.append(tile(ctx,code,{drawn:true})));
    const options=app.querySelector('#riichi-options');const feedback=app.querySelector('#riichi-feedback');
    if(state==='question'){
      ['リーチする','見送る'].forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.className='practice-choice';b.textContent=label;b.onclick=()=>{feedback.className='feedback '+(i===0?'good':'bad');feedback.textContent=i===0?'正解。門前でテンパイしているのでリーチを宣言できます。':'この練習では、門前テンパイからリーチへ進みます。';if(i===0){state='wait';const next=document.createElement('button');next.className='primary';next.type='button';next.textContent='次へ';next.onclick=render;options.innerHTML='';options.append(next)}};options.append(b)});
    }else if(state==='wait'){const b=document.createElement('button');b.className='primary';b.type='button';b.textContent='ロンする';b.onclick=()=>{state='done';render()};options.append(b)}else{feedback.className='feedback good';feedback.innerHTML='<strong>あがりです。</strong><br>テンパイを確認してからリーチし、リーチ後に待ち牌が捨てられたらロンします。';const b=document.createElement('a');b.className='secondary';b.href='#practice?mode=furiten';b.textContent='次はフリテンを練習する';options.append(b)}
  };
  render();
}
function renderFuriten(app,ctx){
  let index=0;let answered=false;
  const render=()=>{
    const step=FURITEN_STEPS[index];
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習 4</div><h1>フリテン</h1><p class="lead">待ち牌があっても、条件によってはロンできない状態があります。</p></section><section class="practice-surface"><p class="status">'+step.title+' '+(index+1)+' / '+FURITEN_STEPS.length+'</p><p>'+step.prompt+'</p><div class="selection-area selection-area-hand"><h2>先に見る：手牌と自分の河</h2><div id="furiten-hand"></div><div class="practice-discard"><strong>自分の河</strong><div id="furiten-river"></div></div></div><div class="selection-area selection-area-choices"><h2>選択肢</h2><div class="practice-options" id="furiten-options"></div></div><div class="feedback" id="furiten-feedback" aria-live="polite"></div><div class="action-row" id="furiten-actions"></div></section>'+nav();
    app.querySelector('#furiten-hand').append(tileBlock(ctx,'あなたの手牌（テンパイ）',step.hand));
    const river=app.querySelector('#furiten-river');step.river.forEach(code=>river.append(tile(ctx,code)));
    const options=app.querySelector('#furiten-options');const feedback=app.querySelector('#furiten-feedback');const actions=app.querySelector('#furiten-actions');
    step.choices.forEach((choice,choiceIndex)=>{const b=document.createElement('button');b.type='button';b.className='practice-choice';b.textContent=choice;b.onclick=()=>{if(answered)return;answered=true;const ok=choiceIndex===step.answer;feedback.className='feedback '+(ok?'good':'bad');feedback.innerHTML='<strong>'+(ok?'正解':'もう一度確認')+'</strong><br>'+step.explanation;[...options.children].forEach(el=>el.disabled=true);const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=index===FURITEN_STEPS.length-1?'フリテンの練習を終える':'次の場面';next.onclick=()=>{if(index===FURITEN_STEPS.length-1){location.hash='#practice';return}index++;answered=false;render()};actions.append(next)};options.append(b)});
  };
  render();
}
export function renderPracticeHub(app,ctx){
  const mode=new URLSearchParams((location.hash.split('?')[1]||'')).get('mode');
  if(mode==='round')return renderRoundMenu(app);
  if(mode==='draw-discard')return renderDrawDiscard(app,ctx);
  if(mode==='wall')return renderWallPractice(app,ctx);
  if(mode==='kan')return renderKanPractice(app,ctx);
  if(mode==='hand-flow')return renderHandFlow(app,ctx);
  if(mode==='round-flow')return renderRoundFlow(app);
  if(mode==='calls')return renderCalls(app,ctx);
  if(mode==='riichi')return renderRiichi(app,ctx);
  if(mode==='furiten')return renderFuriten(app,ctx);
  if(mode==='east-round')return renderEastRound(app,ctx);
  renderPracticeIndex(app);
}
