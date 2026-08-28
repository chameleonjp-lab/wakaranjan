import {appendTileRow,createTile} from '../components/tile.js';
import {calculateScore,formatPayment} from '../lib/score.js';

const INITIAL_SCORES={east:25000,south:25000,west:25000,north:25000};
const SEATS=[['east','東家'],['south','南家'],['west','西家'],['north','北家']];
const COMMON_HAND=['1m','2m','3m','3p','4p','5p','6s','7s','8s','2z','2z','5z','5z'];
const EAST_ROUNDS=[
  {
    label:'東1局',
    dealerSeat:'east',
    yourRole:'南家（子）',
    title:'門前でテンパイ。リーチを宣言する？',
    prompt:'リーチ後に待ち牌が捨てられる場面を、案内に沿って確認します。',
    hand:COMMON_HAND,
    river:[],
    choices:[
      {label:'リーチして待つ',correct:true,explanation:'門前でテンパイしているので、リーチを宣言できます。リーチ後に待ち牌が捨てられたらロンします。',score:{han:1,fu:30,dealer:false,win:'ron'},payer:'east',resultText:'リーチ後にロン。子の1翻30符は1,500点です。'},
      {label:'見送る',correct:false,explanation:'この場面では、門前テンパイからリーチへ進みます。まずは「テンパイ→リーチ→ロン」の順番を覚えましょう。'}
    ]
  },
  {
    label:'東2局',
    dealerSeat:'south',
    yourRole:'東家（親）',
    title:'親のツモあがり。支払いを確認する',
    prompt:'あなたが親の局でツモあがりしたとき、他の3人から同じ点数を受け取ります。',
    hand:COMMON_HAND,
    river:[],
    choices:[
      {label:'ツモあがりを確認する',correct:true,explanation:'親のツモあがりでは、子の3人が同じ点数を支払います。',score:{han:1,fu:30,dealer:true,win:'tsumo'},payers:['east','west','north'],resultText:'親の1翻30符ツモは500点オールです。合計1,500点です。'},
      {label:'親だけが全額払う',correct:false,explanation:'ツモあがりは、親か子かで支払い方が変わります。親のツモなら子3人が分けて支払います。'}
    ]
  },
  {
    label:'東3局',
    dealerSeat:'west',
    yourRole:'南家（子）',
    title:'流局した。次の局へ進む',
    prompt:'この局は誰もあがらず流局しました。点数の変化を確認します。',
    hand:COMMON_HAND,
    river:['1z','3z','7z'],
    choices:[
      {label:'流局を確認する',correct:true,explanation:'この案内版では、流局時の点数移動は扱わず、次の局へ進みます。テンパイ・ノーテンや本場は別の練習で詳しく扱います。',resultText:'流局。今回は点数の変化はありません。'}
    ]
  },
  {
    label:'東4局',
    dealerSeat:'north',
    yourRole:'南家（子）',
    title:'最後の局。ロンできる場面を判断する',
    prompt:'自分の河に待ち牌はなく、リーチ後に待ち牌が捨てられました。',
    hand:COMMON_HAND,
    river:[],
    choices:[
      {label:'ロンする',correct:true,explanation:'フリテンではなく、リーチという役もあるためロンできます。',score:{han:2,fu:40,dealer:false,win:'ron'},payer:'north',resultText:'子の2翻40符は2,600点です。'},
      {label:'見送る',correct:false,explanation:'この場面ではフリテンではありません。リーチ後に待ち牌が捨てられたので、ロンできます。'}
    ]
  }
];

function tile(ctx,code,options={}){return createTile(ctx.tileByCode.get(code),options)}
function seatLabel(seat){return SEATS.find(item=>item[0]===seat)?.[1]||seat}
function scoreBoard(scores){
  return '<div class="east-score-grid">'+SEATS.map(([seat,label])=>'<div class="east-score-card'+(seat==='south'?' you':'')+'"><span>'+label+(seat==='south'?'（あなた）':'')+'</span><strong>'+scores[seat].toLocaleString('ja-JP')+'点</strong></div>').join('')+'</div>';
}
function settlement(scores,choice){
  if(!choice.score)return null;
  const result=calculateScore(choice.score);
  scores.south+=result.total;
  if(choice.payer)scores[choice.payer]-=result.total;
  for(const seat of choice.payers||[])scores[seat]-=result.payments.each;
  return result;
}
function renderHand(app,ctx,round){
  const hand=app.querySelector('#east-hand');if(hand)appendTileRow(hand,round.hand.map(code=>ctx.tileByCode.get(code)));
  const river=app.querySelector('#east-river');if(river)round.river.forEach(code=>river.append(tile(ctx,code)));
}
function nav(){return '<div class="lesson-nav"><a class="secondary" href="#practice">対局練習へ戻る</a><a class="primary" href="#home">ホームへ</a></div>'}

export function renderEastRound(app,ctx){
  let index=0;let state='question';let scores={...INITIAL_SCORES};let latestResult=null;let answered=false;
  const render=()=>{
    if(index>=EAST_ROUNDS.length){
      app.innerHTML='<section class="hero"><div class="eyebrow">模擬東風戦（案内版）</div><h1>4局を終えました。</h1><p>局の進行、親子による支払い、流局を一度に確認できました。</p>'+scoreBoard(scores)+'</section><section class="callout"><strong>この版の範囲</strong><br>牌山を自動で引く本格対局ではなく、固定した局面と結果で流れを学ぶ案内版です。連荘、本場、テンパイ・ノーテンの精算、相手の思考は次の段階で扱います。</section><div class="action-row"><button id="east-restart" class="secondary" type="button">もう一度練習する</button><a class="primary" href="#practice">対局練習へ戻る</a></div>';
      app.querySelector('#east-restart').onclick=()=>{index=0;state='question';scores={...INITIAL_SCORES};latestResult=null;answered=false;render()};
      return;
    }
    const round=EAST_ROUNDS[index];
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">模擬東風戦（案内版）</div><h1>'+round.label+'：'+round.title+'</h1><p class="lead">'+round.prompt+'</p></section><section class="practice-surface"><div class="east-round-head"><span>東風戦 '+(index+1)+' / '+EAST_ROUNDS.length+'</span><strong>親：'+seatLabel(round.dealerSeat)+' ・ あなた：'+round.yourRole+'</strong></div>'+scoreBoard(scores)+'<div class="east-round-hand"><h2 class="section-title">あなたの手牌</h2><div id="east-hand"></div><h2 class="section-title">あなたの河</h2><div class="river" id="east-river"></div></div><p class="status">'+(state==='question'?'次の判断を選んでください。':state==='result'?'結果を確認して次の局へ進みます。':'')+'</p><div class="practice-options" id="east-options"></div><div class="feedback" id="east-feedback" aria-live="polite"></div><div class="action-row" id="east-actions"></div></section>'+nav();
    renderHand(app,ctx,round);
    const options=app.querySelector('#east-options');const feedback=app.querySelector('#east-feedback');const actions=app.querySelector('#east-actions');
    if(state==='question'){
      round.choices.forEach((choice,choiceIndex)=>{const b=document.createElement('button');b.type='button';b.className='practice-choice';b.textContent=choice.label;b.onclick=()=>{if(answered)return;answered=true;if(!choice.correct){feedback.className='feedback bad';feedback.innerHTML='<strong>もう一度確認</strong><br>'+choice.explanation;const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='選び直す';retry.onclick=()=>{answered=false;render()};actions.append(retry);return}latestResult=settlement(scores,choice);state='result';render()};options.append(b)});
    }else{
      feedback.className='feedback good';
      feedback.innerHTML='<strong>正解。</strong><br>'+round.choices.find(choice=>choice.correct).explanation+(latestResult?'<br><strong>点数：</strong>'+round.choices.find(choice=>choice.correct).resultText+'（計算結果：'+formatPayment(latestResult)+'）':'<br>'+round.choices.find(choice=>choice.correct).resultText);
      const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=index===EAST_ROUNDS.length-1?'結果を見る':'次の局へ';next.onclick=()=>{index++;state='question';latestResult=null;answered=false;render()};actions.append(next);
    }
  };
  render();
}
