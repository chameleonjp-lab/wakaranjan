import {createTile} from '../components/tile.js';
import {evaluateHand,indicatorNext} from '../lib/full-hand-evaluator.js';
import {formatPayment} from '../lib/score.js';

const WIND_OPTIONS=[['1z','東'],['2z','南'],['3z','西'],['4z','北']];
const MELD_LABELS={chi:'チー',pon:'ポン',minkan:'大明槓',ankan:'暗槓',kakan:'加槓'};
const SPECIALS=[['ippatsu','一発'],['haitei','海底摸月'],['houtei','河底撈魚'],['rinshan','嶺上開花'],['chankan','搶槓'],['tenhou','天和'],['chiihou','地和']];

function physicalCounts(state){
  const map=new Map();
  for(const c of [...state.hand,...state.melds.flatMap(m=>m.tiles)])map.set(c,(map.get(c)||0)+1);
  return map;
}
function expectedHandSize(state){return 14-state.melds.length*3}
function tileName(ctx,code){return ctx.tileByCode.get(code)?.nameJa||code}
function renderIndicatorList(items,ctx){return items.length?items.map((c,i)=>`<button type="button" class="indicator-chip" data-remove-indicator="${i}">${tileName(ctx,c)} → ${tileName(ctx,indicatorNext(c))} ×</button>`).join(''):'<span class="muted">なし</span>'}

export function renderAutomaticCalculator(app,ctx){
  const state={hand:[],melds:[],winTile:'',win:'ron',riichi:false,doubleRiichi:false,dealer:false,seatWind:'2z',roundWind:'1z',doraIndicators:[],uraIndicators:[],kanDoraIndicators:[],kanUraIndicators:[],redDora:0,ippatsu:false,haitei:false,houtei:false,rinshan:false,chankan:false,tenhou:false,chiihou:false};
  const example=['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','5m'];

  const render=()=>{
    const need=expectedHandSize(state);const counts=physicalCounts(state);
    const indicatorSection=(title,key)=>`<div class="indicator-field"><strong>${title}</strong><div class="indicator-list">${renderIndicatorList(state[key],ctx)}</div><div class="indicator-add"><select data-indicator-select="${key}">${ctx.tiles.map(t=>`<option value="${t.code}">${t.nameJa}</option>`).join('')}</select><button type="button" data-add-indicator="${key}">追加</button></div></div>`;
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">点数計算</div><h1>牌と条件から役・符・点数を自動計算</h1><p class="lead">手牌だけでなく、チー・ポン・カン、ドラ、特殊なあがり方も指定できます。未対応なのは責任払いなど一部の特例です。</p></section>
    <section class="panel"><h2>1. 副露・カン <span class="muted">${state.melds.length}/4組</span></h2><div class="meld-list">${state.melds.length?state.melds.map((m,i)=>`<div class="meld-card"><strong>${MELD_LABELS[m.type]}</strong> ${m.tiles.map(c=>tileName(ctx,c)).join('・')} <button type="button" class="secondary" data-remove-meld="${i}">外す</button></div>`).join(''):'<p class="muted">門前なら追加しません。暗槓は門前扱いのままです。</p>'}</div>
    <div class="meld-builder"><label>種類<select id="meld-type">${Object.entries(MELD_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>基準牌<select id="meld-tile">${ctx.tiles.map(t=>`<option value="${t.code}">${t.nameJa}</option>`).join('')}</select></label><button id="add-meld" type="button" ${state.melds.length>=4?'disabled':''}>組を追加</button></div><p class="muted">チーでは選んだ牌を一番小さい数字として3枚の順子を作ります（1〜7の数牌のみ）。</p></section>
    <section class="panel"><h2>2. 手牌を作る <span class="muted">${state.hand.length}/${need}枚</span></h2><div id="calc-hand" class="tile-row"></div><div class="action-row"><button id="example" type="button" ${state.melds.length?'disabled':''}>門前の例題を入れる</button><button id="clear" class="secondary" type="button">全部消す</button></div></section>
    <section class="panel"><h2>牌を追加</h2><div id="calc-palette" class="tile-grid"></div></section>
    <section class="panel"><h2>3. あがり条件</h2><div class="calc-form">
      <label>あがり牌<select id="win-tile"><option value="">選んでください</option>${[...new Set(state.hand)].map(c=>`<option value="${c}" ${state.winTile===c?'selected':''}>${tileName(ctx,c)}</option>`).join('')}</select></label>
      <label>あがり方<select id="win-kind"><option value="ron" ${state.win==='ron'?'selected':''}>ロン</option><option value="tsumo" ${state.win==='tsumo'?'selected':''}>ツモ</option></select></label>
      <label>自風<select id="seat-wind" ${state.dealer?'disabled':''}>${WIND_OPTIONS.map(([c,n])=>`<option value="${c}" ${(state.dealer?'1z':state.seatWind)===c?'selected':''}>${n}</option>`).join('')}</select></label>
      <label>場風<select id="round-wind">${WIND_OPTIONS.slice(0,2).map(([c,n])=>`<option value="${c}" ${state.roundWind===c?'selected':''}>${n}</option>`).join('')}</select></label>
      <label class="check"><input id="dealer" type="checkbox" ${state.dealer?'checked':''}> 親（自風は東）</label>
      <label class="check"><input id="riichi" type="checkbox" ${state.riichi?'checked':''}> リーチ</label>
      <label class="check"><input id="double-riichi" type="checkbox" ${state.doubleRiichi?'checked':''}> ダブルリーチ</label>
    </div><div class="special-grid">${SPECIALS.map(([k,label])=>`<label class="check"><input type="checkbox" data-special="${k}" ${state[k]?'checked':''}> ${label}</label>`).join('')}</div></section>
    <section class="panel"><h2>4. ドラ</h2><div class="indicator-grid">${indicatorSection('表ドラ表示牌','doraIndicators')}${indicatorSection('裏ドラ表示牌','uraIndicators')}${indicatorSection('槓ドラ表示牌','kanDoraIndicators')}${indicatorSection('槓裏ドラ表示牌','kanUraIndicators')}</div><label class="number-field">赤ドラ枚数 <input id="red-dora" type="number" min="0" max="3" value="${state.redDora}"></label><p class="muted">裏ドラ・槓裏ドラはリーチ時だけ数えます。表示牌そのものではなく、その次の牌がドラです。</p></section>
    <section class="panel"><div class="action-row"><button id="calculate" class="primary" type="button">役と点数を計算</button></div><div id="calc-result" class="feedback" aria-live="polite"></div></section>
    <section class="callout"><strong>現在の対応範囲</strong><br>通常形、七対子、国士無双、副露、暗槓・明槓、標準の通常役、標準役満、表/裏/槓/赤ドラ、海底・河底・嶺上・搶槓・天和・地和に対応しています。責任払い、本場・供託、フリテンの河入力は後続対応です。</section>
    <div class="lesson-nav"><a class="secondary" href="#home">ホームへ戻る</a><a class="primary" href="#lesson-intermediate-05">点数計算の基礎へ</a></div>`;

    const hand=app.querySelector('#calc-hand');
    state.hand.forEach((code,index)=>{const tile=ctx.tileByCode.get(code);hand.append(createTile(tile,{interactive:true,onSelect:()=>{state.hand.splice(index,1);if(!state.hand.includes(state.winTile))state.winTile='';render()}}))});
    const palette=app.querySelector('#calc-palette');
    ctx.tiles.forEach(tile=>{const count=counts.get(tile.code)||0;const el=createTile(tile,{interactive:true,onSelect:()=>{if(state.hand.length<need&&count<4){state.hand.push(tile.code);render()}}});if(state.hand.length>=need||count>=4)el.disabled=true;palette.append(el)});

    app.querySelectorAll('[data-remove-meld]').forEach(b=>b.onclick=()=>{state.melds.splice(Number(b.dataset.removeMeld),1);while(state.hand.length>expectedHandSize(state))state.hand.pop();if(!state.hand.includes(state.winTile))state.winTile='';render()});
    app.querySelector('#add-meld').onclick=()=>{
      const type=app.querySelector('#meld-type').value;const code=app.querySelector('#meld-tile').value;let tiles;
      if(type==='chi'){
        const n=Number(code[0]);const suit=code[1];if(suit==='z'||n>7){alert('チーは1〜7の数牌を基準牌にしてください。');return}tiles=[code,`${n+1}${suit}`,`${n+2}${suit}`];
      }else tiles=Array(type==='pon'?3:4).fill(code);
      const after=[...state.hand,...state.melds.flatMap(m=>m.tiles),...tiles];const c=new Map();for(const x of after)c.set(x,(c.get(x)||0)+1);if([...c.values()].some(n=>n>4)){alert('同じ牌は赤牌を含めて4枚までです。');return}
      state.melds.push({type,tiles});while(state.hand.length>expectedHandSize(state))state.hand.pop();if(!state.hand.includes(state.winTile))state.winTile='';render();
    };
    app.querySelector('#example').onclick=()=>{state.hand=[...example];state.melds=[];state.winTile='5m';state.win='ron';state.riichi=true;state.doubleRiichi=false;state.dealer=false;state.seatWind='2z';render()};
    app.querySelector('#clear').onclick=()=>{state.hand=[];state.melds=[];state.winTile='';state.doraIndicators=[];state.uraIndicators=[];state.kanDoraIndicators=[];state.kanUraIndicators=[];state.redDora=0;render()};
    app.querySelector('#win-tile').onchange=e=>state.winTile=e.target.value;
    app.querySelector('#win-kind').onchange=e=>state.win=e.target.value;
    app.querySelector('#seat-wind').onchange=e=>state.seatWind=e.target.value;
    app.querySelector('#round-wind').onchange=e=>state.roundWind=e.target.value;
    app.querySelector('#dealer').onchange=e=>{state.dealer=e.target.checked;render()};
    app.querySelector('#riichi').onchange=e=>state.riichi=e.target.checked;
    app.querySelector('#double-riichi').onchange=e=>state.doubleRiichi=e.target.checked;
    app.querySelectorAll('[data-special]').forEach(x=>x.onchange=e=>state[e.target.dataset.special]=e.target.checked);
    app.querySelector('#red-dora').onchange=e=>state.redDora=Math.max(0,Math.min(3,Number(e.target.value)||0));
    app.querySelectorAll('[data-add-indicator]').forEach(b=>b.onclick=()=>{const key=b.dataset.addIndicator;const select=app.querySelector(`[data-indicator-select="${key}"]`);state[key].push(select.value);render()});
    app.querySelectorAll('[data-remove-indicator]').forEach(b=>b.onclick=()=>{const parent=b.closest('.indicator-field');const title=parent.querySelector('strong').textContent;const key=title.startsWith('表')?'doraIndicators':title.startsWith('裏')?'uraIndicators':title.startsWith('槓ドラ')?'kanDoraIndicators':'kanUraIndicators';state[key].splice(Number(b.dataset.removeIndicator),1);render()});
    app.querySelector('#calculate').onclick=()=>{
      const out=evaluateHand({concealedTiles:state.hand,melds:state.melds,winTile:state.winTile,win:state.win,riichi:state.riichi,doubleRiichi:state.doubleRiichi,dealer:state.dealer,seatWind:state.dealer?'1z':state.seatWind,roundWind:state.roundWind,doraIndicators:state.doraIndicators,uraIndicators:state.uraIndicators,kanDoraIndicators:state.kanDoraIndicators,kanUraIndicators:state.kanUraIndicators,redDora:state.redDora,...Object.fromEntries(SPECIALS.map(([k])=>[k,state[k]]))});
      const box=app.querySelector('#calc-result');if(!out.ok){box.className='feedback bad';box.textContent=out.error;return}
      const b=out.best;box.className='feedback good';
      if(b.yakumanValue){box.innerHTML=`<strong>${b.yakumanValue>1?`${b.yakumanValue}倍役満`:'役満'}　${formatPayment(b.score)}</strong><br>役：${b.yakuman.map(y=>y.name).join('、')}${out.alternatives.length?`<p class="muted">別の分け方も${out.alternatives.length}通り評価しました。</p>`:''}`;return}
      const doraText=b.dora?`<br>ドラ：${b.dora}翻（${b.doraDetail.map(d=>`${d.name}${d.count}枚`).join('、')}）`:'';
      box.innerHTML=`<strong>${b.han}翻 ${b.fu}符　${formatPayment(b.score)}${b.score.limit?`（${b.score.limit}）`:''}</strong><br>役：${b.yaku.map(y=>`${y.name} ${y.han}翻`).join('、')}${doraText}<br><details><summary>符の内訳</summary>${b.fuItems.map(([n,f])=>`<div>${n}：${f}符</div>`).join('')}</details>${out.alternatives.length?`<p class="muted">別の分け方も${out.alternatives.length}通り評価し、最も高い点数を採用しました。</p>`:''}`;
    };
  };
  render();
}
