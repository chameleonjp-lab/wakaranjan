import {appendTileRow,createTile} from '../components/tile.js';
import {calculateScore,formatPayment} from '../lib/score.js';
import {settleHand} from '../lib/round-context.js';

const INITIAL_SCORES={east:25000,south:25000,west:25000,north:25000};
const SEATS=[['east','東家'],['south','南家'],['west','西家'],['north','北家']];
const COMMON_CHILD_HAND=['2m','3m','4m','6m','7m','8m','3p','4p','5p','6s','7s','8s','2z','2z'];
const COMMON_PARENT_HAND=[...COMMON_CHILD_HAND];
const CHILD_RON={concealedTiles:COMMON_CHILD_HAND,winTile:'2z',win:'ron',riichi:true,dealer:false,seatWind:'2z',roundWind:'1z',discarderSeat:'east'};
const PARENT_TSUMO={concealedTiles:COMMON_PARENT_HAND,winTile:'2z',win:'tsumo',riichi:true,dealer:true,seatWind:'1z',roundWind:'1z'};
const CHILD_DORA_RON={...CHILD_RON,doraIndicators:['1m']};
export const EAST_ROUNDS=[
  {
    label:'東1局',
    dealerSeat:'east',
    yourRole:'南家（子）',
    title:'門前でテンパイ。リーチを宣言する？',
    prompt:'リーチ後に待ち牌が捨てられる場面を、案内に沿って確認します。',
    hand:COMMON_CHILD_HAND,
    evaluation:CHILD_RON,
    river:[],
    choices:[
      {label:'リーチして待つ',correct:true,explanation:'門前でテンパイしているので、リーチを宣言できます。リーチ後に待ち牌が捨てられたらロンします。'},
      {label:'見送る',correct:false,explanation:'この場面では、門前テンパイからリーチへ進みます。まずは「テンパイ→リーチ→ロン」の順番を覚えましょう。'}
    ]
  },
  {
    label:'東2局',
    dealerSeat:'south',
    yourRole:'東家（親）',
    title:'親のツモあがり。支払いを確認する',
    prompt:'あなたが親の局でツモあがりしたとき、他の3人から同じ点数を受け取ります。',
    hand:COMMON_PARENT_HAND,
    evaluation:PARENT_TSUMO,
    river:[],
    choices:[
      {label:'ツモあがりを確認する',correct:true,explanation:'親のツモあがりでは、子の3人が同じ点数を支払います。'},
      {label:'親だけが全額払う',correct:false,explanation:'ツモあがりは、親か子かで支払い方が変わります。親のツモなら子3人が分けて支払います。'}
    ]
  },
  {
    label:'東3局',
    dealerSeat:'west',
    yourRole:'南家（子）',
    title:'流局した。次の局へ進む',
    prompt:'この局は誰もあがらず流局しました。点数の変化を確認します。',
    hand:COMMON_CHILD_HAND,
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
    hand:COMMON_CHILD_HAND,
    evaluation:CHILD_DORA_RON,
    river:[],
    choices:[
      {label:'ロンする',correct:true,explanation:'フリテンではなく、リーチとドラがあるためロンできます。'},
      {label:'見送る',correct:false,explanation:'この場面ではフリテンではありません。リーチ後に待ち牌が捨てられたので、ロンできます。'}
    ]
  }
];

function tile(ctx,code,options={}){return createTile(ctx.tileByCode.get(code),options)}
function seatLabel(seat){return SEATS.find(item=>item[0]===seat)?.[1]||seat}
function scoreBoard(scores,userSeat='south'){
  return '<div class="east-score-grid">'+SEATS.map(([seat,label])=>'<div class="east-score-card'+(seat===userSeat?' you':'')+'"><span>'+label+(seat===userSeat?'（あなた）':'')+'</span><strong>'+scores[seat].toLocaleString('ja-JP')+'点</strong></div>').join('')+'</div>';
}
function settlement(scores,round){
  if(!round.evaluation)return null;
  const result=settleHand({...round.evaluation,winnerSeat:'south',dealerSeat:round.dealerSeat});
  if(!result.ok)return result;
  scores.south+=result.settlement.handGain;
  for(const [seat,amount] of Object.entries(result.settlement.payers))scores[seat]-=amount;
  return result;
}
function resultText(result){
  if(!result)return '';
  if(!result.ok)return result.error;
  const best=result.best;const score=best.yakumanValue?`${best.yakumanValue}倍役満`: `${best.han}翻${best.fu}符`;
  const payers=Object.entries(result.settlement.payers).map(([seat,amount])=>`${seatLabel(seat)}から${amount.toLocaleString('ja-JP')}点`).join('、');
  return `${score}、${formatPayment(best.score)}。${payers||'点数の移動はありません'}。`;
}
function renderHand(app,ctx,round){
  const hand=app.querySelector('#east-hand');if(hand)appendTileRow(hand,(round.evaluation?.concealedTiles||round.hand||[]).map(code=>ctx.tileByCode.get(code)),{rowClass:'hand-fit-row'});
  const river=app.querySelector('#east-river');if(river)round.river.forEach(code=>river.append(tile(ctx,code)));
}
function nav(){return '<div class="lesson-nav"><a class="secondary" href="#practice">対局練習へ戻る</a><a class="primary" href="#menu">メニューへ</a></div>'}

export function renderEastRound(app,ctx){
  let index=0;let state='question';let scores={...INITIAL_SCORES};let latestResult=null;let answered=false;
  const render=()=>{
    if(index>=EAST_ROUNDS.length){
      app.innerHTML='<section class="hero"><div class="eyebrow">模擬東風戦（案内版）</div><h1>4局を終えました。</h1><p>局の進行、親子による支払い、流局を一度に確認できました。</p>'+scoreBoard(scores)+'</section><section class="callout"><strong>この版の範囲</strong><br>牌山を自動で引く本格対局ではなく、固定した局面と結果で流れを学ぶ案内版です。連荘、本場、テンパイ・ノーテンの精算、相手の思考は次の段階で扱います。</section><div class="action-row"><button id="east-restart" class="secondary" type="button">もう一度練習する</button><a class="primary" href="#practice">対局練習へ戻る</a></div>';
      app.querySelector('#east-restart').onclick=()=>{index=0;state='question';scores={...INITIAL_SCORES};latestResult=null;answered=false;render()};
      return;
    }
    const round=EAST_ROUNDS[index];
    const yourRole=round.dealerSeat==='south'?'東家（親）':'南家（子）';
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">模擬東風戦（案内版）</div><h1>'+round.label+'：'+round.title+'</h1><p class="lead">'+round.prompt+'</p></section><section class="practice-surface"><div class="east-round-head"><span>東風戦 '+(index+1)+' / '+EAST_ROUNDS.length+'</span><strong>親：'+seatLabel(round.dealerSeat)+' ・ あなた：'+yourRole+'</strong></div>'+scoreBoard(scores)+'<p class="status">'+(state==='question'?'まず牌と場面を見てください。':state==='result'?'結果を確認して次の局へ進みます。':'')+'</p><div class="selection-area selection-area-hand"><h2>先に見る：手牌と河</h2><div class="east-round-hand"><h3 class="section-title">あなたの手牌</h3><div id="east-hand"></div><h3 class="section-title">あなたの河</h3><div class="river" id="east-river"></div></div></div><div class="selection-area selection-area-choices"><h2>選択肢</h2><div class="practice-options" id="east-options"></div></div><div class="feedback" id="east-feedback" aria-live="polite"></div><div class="action-row" id="east-actions"></div></section>'+nav();
    renderHand(app,ctx,round);
    const options=app.querySelector('#east-options');const feedback=app.querySelector('#east-feedback');const actions=app.querySelector('#east-actions');
    if(state==='question'){
      round.choices.forEach((choice,choiceIndex)=>{const b=document.createElement('button');b.type='button';b.className='practice-choice';b.textContent=choice.label;b.onclick=()=>{if(answered)return;answered=true;if(!choice.correct){feedback.className='feedback bad';feedback.innerHTML='<strong>もう一度確認</strong><br>'+choice.explanation;const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='選び直す';retry.onclick=()=>{answered=false;render()};actions.append(retry);return}latestResult=settlement(scores,round);if(latestResult&&!latestResult.ok){feedback.className='feedback bad';feedback.innerHTML='<strong>この局面を計算できません</strong><br>'+latestResult.error;return}state='result';render()};options.append(b)});
    }else{
      feedback.className='feedback good';
      feedback.innerHTML='<strong>正解。</strong><br>'+round.choices.find(choice=>choice.correct).explanation+(latestResult?'<br><strong>点数：</strong>'+resultText(latestResult):'');
      const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=index===EAST_ROUNDS.length-1?'結果を見る':'次の局へ';next.onclick=()=>{index++;state='question';latestResult=null;answered=false;render()};actions.append(next);
    }
  };
  render();
}
