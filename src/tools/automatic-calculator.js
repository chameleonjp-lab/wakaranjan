import {createTile} from '../components/tile.js';
import {evaluateClosedHand} from '../lib/hand-evaluator.js';
import {formatPayment} from '../lib/score.js';

const WIND_OPTIONS=[['1z','東'],['2z','南'],['3z','西'],['4z','北']];

export function renderAutomaticCalculator(app,ctx){
  const state={hand:[],winTile:'',win:'ron',riichi:false,dealer:false,seatWind:'1z',roundWind:'1z'};
  const example=['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','5m'];

  const render=()=>{
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">点数計算・試作版</div><h1>門前14枚から役と点数を自動計算</h1><p class="lead">牌を14枚選び、最後に来た牌とあがり方を指定します。現在は門前の通常形と七対子に対応しています。</p></section>
    <section class="panel"><h2>1. 手牌を作る <span class="muted">${state.hand.length}/14枚</span></h2><div id="calc-hand" class="tile-row"></div><div class="action-row"><button id="example" type="button">例題を入れる</button><button id="clear" class="secondary" type="button">全部消す</button></div></section>
    <section class="panel"><h2>牌を追加</h2><div id="calc-palette" class="tile-grid"></div></section>
    <section class="panel"><h2>2. 条件を指定</h2><div class="calc-form">
      <label>あがり牌<select id="win-tile"><option value="">選んでください</option>${[...new Set(state.hand)].map(c=>`<option value="${c}" ${state.winTile===c?'selected':''}>${ctx.tileByCode.get(c)?.nameJa||c}</option>`).join('')}</select></label>
      <label>あがり方<select id="win-kind"><option value="ron" ${state.win==='ron'?'selected':''}>ロン</option><option value="tsumo" ${state.win==='tsumo'?'selected':''}>ツモ</option></select></label>
      <label>自風<select id="seat-wind">${WIND_OPTIONS.map(([c,n])=>`<option value="${c}" ${state.seatWind===c?'selected':''}>${n}</option>`).join('')}</select></label>
      <label>場風<select id="round-wind">${WIND_OPTIONS.slice(0,2).map(([c,n])=>`<option value="${c}" ${state.roundWind===c?'selected':''}>${n}</option>`).join('')}</select></label>
      <label class="check"><input id="dealer" type="checkbox" ${state.dealer?'checked':''}> 親として計算</label>
      <label class="check"><input id="riichi" type="checkbox" ${state.riichi?'checked':''}> リーチ済み</label>
    </div><div class="action-row"><button id="calculate" class="primary" type="button">役と点数を計算</button></div><div id="calc-result" class="feedback" aria-live="polite"></div></section>
    <section class="callout"><strong>現在の対応範囲</strong><br>門前14枚、通常形、七対子、リーチ、門前ツモ、タンヤオ、役牌、ピンフ、一盃口・二盃口、対々和、三色同順、一気通貫、混一色、清一色と基本の符計算に対応しています。副露、カン、役満、ドラ表示牌・赤ドラの自動入力は後続対応です。</section>
    <div class="lesson-nav"><a class="secondary" href="#home">ホームへ戻る</a><a class="primary" href="#lesson-intermediate-05">点数計算の基礎へ</a></div>`;

    const hand=app.querySelector('#calc-hand');
    state.hand.forEach((code,index)=>{const tile=ctx.tileByCode.get(code);hand.append(createTile(tile,{interactive:true,onSelect:()=>{state.hand.splice(index,1);if(!state.hand.includes(state.winTile))state.winTile='';render()}}))});
    const palette=app.querySelector('#calc-palette');
    ctx.tiles.forEach(tile=>{const count=state.hand.filter(c=>c===tile.code).length;const el=createTile(tile,{interactive:true,onSelect:()=>{if(state.hand.length<14&&count<4){state.hand.push(tile.code);render()}}});if(state.hand.length>=14||count>=4)el.disabled=true;palette.append(el)});
    app.querySelector('#example').onclick=()=>{state.hand=[...example];state.winTile='5m';state.win='ron';state.riichi=true;render()};
    app.querySelector('#clear').onclick=()=>{state.hand=[];state.winTile='';render()};
    app.querySelector('#win-tile').onchange=e=>state.winTile=e.target.value;
    app.querySelector('#win-kind').onchange=e=>state.win=e.target.value;
    app.querySelector('#seat-wind').onchange=e=>state.seatWind=e.target.value;
    app.querySelector('#round-wind').onchange=e=>state.roundWind=e.target.value;
    app.querySelector('#dealer').onchange=e=>state.dealer=e.target.checked;
    app.querySelector('#riichi').onchange=e=>state.riichi=e.target.checked;
    app.querySelector('#calculate').onclick=()=>{
      const out=evaluateClosedHand({tiles:state.hand,winTile:state.winTile,win:state.win,riichi:state.riichi,dealer:state.dealer,seatWind:state.seatWind,roundWind:state.roundWind});
      const box=app.querySelector('#calc-result');
      if(!out.ok){box.className='feedback bad';box.textContent=out.error;return}
      const b=out.best;box.className='feedback good';
      box.innerHTML=`<strong>${b.han}翻 ${b.fu}符　${formatPayment(b.score)}${b.score.limit?`（${b.score.limit}）`:''}</strong><br>役：${b.yaku.map(y=>`${y.name} ${y.han}翻`).join('、')}<br><details><summary>符の内訳</summary>${b.fuItems.map(([n,f])=>`<div>${n}：${f}符</div>`).join('')}</details>${out.alternatives.length?`<p class="muted">別の分け方も${out.alternatives.length}通り評価し、最も高い点数を採用しました。</p>`:''}`;
    };
  };
  render();
}
