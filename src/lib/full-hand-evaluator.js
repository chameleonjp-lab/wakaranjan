import {calculateScore} from './score.js';
import {countTiles,decomposeStandardPartial,decomposeChiitoitsu,decomposeKokushi,waitCandidates,isTerminalOrHonor,isHonor} from './hand.js';

const DRAGONS=new Set(['5z','6z','7z']);
const WINDS=new Set(['1z','2z','3z','4z']);
const GREEN=new Set(['2s','3s','4s','6s','8s','6z']);
const TERMINALS=new Set(['1m','9m','1p','9p','1s','9s']);
const KOKUSHI=new Set([...TERMINALS,'1z','2z','3z','4z','5z','6z','7z']);
const validMeldTypes=new Set(['chi','pon','minkan','ankan','kakan']);

function indicatorNext(code){
  const n=Number(code[0]);const suit=code[1];
  if('mps'.includes(suit))return `${n===9?1:n+1}${suit}`;
  if(suit!=='z')return null;
  if(n<=4)return `${n===4?1:n+1}z`;
  return `${n===7?5:n+1}z`;
}

function normalizeMeld(raw,index){
  if(!raw||!validMeldTypes.has(raw.type))throw new Error(`副露${index+1}の種類が不正です。`);
  if(!Array.isArray(raw.tiles))throw new Error(`副露${index+1}の牌がありません。`);
  const tiles=[...raw.tiles];
  countTiles(tiles);
  if(raw.type==='chi'){
    if(tiles.length!==3||tiles.some(isHonor))throw new Error(`副露${index+1}のチーが不正です。`);
    const sorted=[...tiles].sort();const suit=sorted[0][1];const nums=sorted.map(t=>Number(t[0])).sort((a,b)=>a-b);
    if(sorted.some(t=>t[1]!==suit)||nums[1]!==nums[0]+1||nums[2]!==nums[1]+1)throw new Error(`副露${index+1}のチーが順子ではありません。`);
    return {type:'sequence',source:'declared',callType:'chi',tiles,open:true,kan:false};
  }
  const expected=raw.type==='pon'?3:4;
  if(tiles.length!==expected||!tiles.every(t=>t===tiles[0]))throw new Error(`副露${index+1}の${raw.type}が同一牌で構成されていません。`);
  return {type:'triplet',source:'declared',callType:raw.type,tiles,open:raw.type!=='ankan',kan:raw.type!=='pon'};
}

function allPhysicalTiles(concealed,melds){return [...concealed,...melds.flatMap(m=>m.tiles)]}
function isClosed(melds){return melds.every(m=>!m.open)}
function hasTerminal(m){return m.tiles.some(t=>TERMINALS.has(t))}
function hasTerminalOrHonor(m){return m.tiles.some(isTerminalOrHonor)}
function hasHonor(m){return m.tiles.some(isHonor)}
function isValuePair(pair,seatWind,roundWind){return DRAGONS.has(pair)||pair===seatWind||pair===roundWind}
function closedHan(closed,closedValue,openValue){return closed?closedValue:openValue}
function tripLike(m){return m.type==='triplet'}
function seqLike(m){return m.type==='sequence'}
function tripCode(m){return tripLike(m)?m.tiles[0]:null}
function uniqueYaku(items){const map=new Map();for(const y of items)if(!map.has(y.id))map.set(y.id,y);return [...map.values()]}

function concealedTripletForSanankou(m,index,v,win){
  if(!tripLike(m))return false;
  if(m.source==='declared')return !m.open;
  if(win==='ron'&&v.wait==='shanpon'&&v.winGroup===index)return false;
  return true;
}

function normalYaku(v,ctx){
  const {win,riichi,doubleRiichi,ippatsu,haitei,houtei,rinshan,chankan,seatWind,roundWind}=ctx;
  const closed=ctx.closed;const melds=v.allMelds;const tiles=ctx.allTiles;const y=[];
  if(doubleRiichi&&closed)y.push({id:'yaku-double-riichi',name:'ダブルリーチ',han:2});
  else if(riichi&&closed)y.push({id:'yaku-riichi',name:'リーチ',han:1});
  if(ippatsu&&closed&&(riichi||doubleRiichi))y.push({id:'yaku-ippatsu',name:'一発',han:1});
  if(win==='tsumo'&&closed)y.push({id:'yaku-menzen-tsumo',name:'門前ツモ',han:1});
  if(haitei&&win==='tsumo')y.push({id:'yaku-haitei',name:'海底摸月',han:1});
  if(houtei&&win==='ron')y.push({id:'yaku-houtei',name:'河底撈魚',han:1});
  if(rinshan&&win==='tsumo'&&melds.some(m=>m.kan))y.push({id:'yaku-rinshan',name:'嶺上開花',han:1});
  if(chankan&&win==='ron')y.push({id:'yaku-chankan',name:'搶槓',han:1});
  if(tiles.every(t=>!isTerminalOrHonor(t)))y.push({id:'yaku-tanyao',name:'タンヤオ',han:1});
  if(v.type==='chiitoitsu')y.push({id:'yaku-chiitoitsu',name:'七対子',han:2});

  if(v.type==='standard'){
    const trips=melds.filter(tripLike);const seqs=melds.filter(seqLike);
    for(const code of ['5z','6z','7z'])if(trips.some(m=>tripCode(m)===code))y.push({id:`yaku-${code==='5z'?'haku':code==='6z'?'hatsu':'chun'}`,name:code==='5z'?'白':code==='6z'?'發':'中',han:1});
    if(trips.some(m=>tripCode(m)===roundWind))y.push({id:'yaku-bakaze',name:'場風牌',han:1});
    if(trips.some(m=>tripCode(m)===seatWind))y.push({id:'yaku-jikaze',name:'自風牌',han:1});
    if(trips.length===4)y.push({id:'yaku-toitoi',name:'対々和',han:2});

    const concealedTripCount=melds.filter((m,i)=>concealedTripletForSanankou(m,i,v,win)).length;
    if(concealedTripCount>=3)y.push({id:'yaku-sanankou',name:'三暗刻',han:2});
    if(melds.filter(m=>m.kan).length>=3)y.push({id:'yaku-sankantsu',name:'三槓子',han:2});

    for(let n=1;n<=9;n++){
      const codes=[`${n}m`,`${n}p`,`${n}s`];
      if(codes.every(c=>trips.some(m=>tripCode(m)===c))){y.push({id:'yaku-sanshoku-doukou',name:'三色同刻',han:2});break}
    }
    const dragonTrips=['5z','6z','7z'].filter(c=>trips.some(m=>tripCode(m)===c));
    if(dragonTrips.length===2&&DRAGONS.has(v.pair))y.push({id:'yaku-shousangen',name:'小三元',han:2});

    const pinfu=closed&&seqs.length===4&&!isValuePair(v.pair,seatWind,roundWind)&&v.wait==='ryanmen';
    if(pinfu)y.push({id:'yaku-pinfu',name:'ピンフ',han:1});

    if(closed){
      const seqCounts=new Map();
      for(const m of seqs.filter(m=>m.source!=='declared')){const k=m.tiles.join('');seqCounts.set(k,(seqCounts.get(k)||0)+1)}
      const pairs=[...seqCounts.values()].reduce((n,c)=>n+Math.floor(c/2),0);
      if(pairs>=2)y.push({id:'yaku-ryanpeikou',name:'二盃口',han:3});
      else if(pairs===1)y.push({id:'yaku-iipeikou',name:'一盃口',han:1});
    }

    for(let n=1;n<=7;n++){
      const has=suit=>seqs.some(m=>m.tiles[0]===`${n}${suit}`&&m.tiles[1]===`${n+1}${suit}`&&m.tiles[2]===`${n+2}${suit}`);
      if(['m','p','s'].every(has)){y.push({id:'yaku-sanshoku-doujun',name:'三色同順',han:closedHan(closed,2,1)});break}
    }
    for(const suit of ['m','p','s']){
      const starts=[1,4,7];
      if(starts.every(n=>seqs.some(m=>m.tiles.join('')===`${n}${suit}${n+1}${suit}${n+2}${suit}`))){y.push({id:'yaku-ittsuu',name:'一気通貫',han:closedHan(closed,2,1)});break}
    }

    const groups=[...melds,{type:'pair',tiles:[v.pair,v.pair]}];
    const everyYao=groups.every(hasTerminalOrHonor);const everyTerminal=groups.every(hasTerminal);const anyHonor=tiles.some(isHonor);const hasSeq=seqs.length>0;
    if(everyTerminal&&hasSeq)y.push({id:'yaku-junchan',name:'純全帯么九',han:closedHan(closed,3,2)});
    else if(everyYao&&anyHonor&&hasSeq)y.push({id:'yaku-chanta',name:'混全帯么九',han:closedHan(closed,2,1)});
  }

  if(tiles.every(isTerminalOrHonor))y.push({id:'yaku-honroutou',name:'混老頭',han:2});
  const suits=new Set(tiles.filter(t=>!isHonor(t)).map(t=>t[1]));const honor=tiles.some(isHonor);
  if(suits.size===1&&honor)y.push({id:'yaku-honitsu',name:'混一色',han:closedHan(closed,3,2)});
  else if(suits.size===1&&!honor)y.push({id:'yaku-chinitsu',name:'清一色',han:closedHan(closed,6,5)});
  return uniqueYaku(y);
}

function isChuuren(tiles,closed){
  if(!closed||tiles.length!==14||tiles.some(isHonor))return false;
  const suits=new Set(tiles.map(t=>t[1]));if(suits.size!==1)return false;
  const c=Array(10).fill(0);for(const t of tiles)c[Number(t[0])]++;
  return c[1]>=3&&c[9]>=3&&[2,3,4,5,6,7,8].every(n=>c[n]>=1);
}

function yakumanYaku(v,ctx){
  const {allTiles:tiles,closed,win,tenhou,chiihou}=ctx;const melds=v.allMelds||[];const y=[];
  if(tenhou&&closed)y.push({id:'yaku-tenhou',name:'天和',yakuman:1});
  if(chiihou&&closed)y.push({id:'yaku-chiihou',name:'地和',yakuman:1});
  if(v.type==='kokushi')y.push({id:'yaku-kokushi',name:'国士無双',yakuman:1});
  if(v.type==='standard'){
    const trips=melds.filter(tripLike);const codes=trips.map(tripCode);
    const concealedTrips=melds.filter((m,i)=>concealedTripletForSanankou(m,i,v,win)).length;
    if(concealedTrips===4)y.push({id:'yaku-suuankou',name:'四暗刻',yakuman:1});
    if(['5z','6z','7z'].every(c=>codes.includes(c)))y.push({id:'yaku-daisangen',name:'大三元',yakuman:1});
    const windTrips=['1z','2z','3z','4z'].filter(c=>codes.includes(c));
    if(windTrips.length===4)y.push({id:'yaku-daisuushii',name:'大四喜',yakuman:1});
    else if(windTrips.length===3&&WINDS.has(v.pair))y.push({id:'yaku-shousuushii',name:'小四喜',yakuman:1});
    if(melds.filter(m=>m.kan).length===4)y.push({id:'yaku-suukantsu',name:'四槓子',yakuman:1});
  }
  if(tiles.every(isHonor))y.push({id:'yaku-tsuuiisou',name:'字一色',yakuman:1});
  if(tiles.every(t=>GREEN.has(t)))y.push({id:'yaku-ryuuiisou',name:'緑一色',yakuman:1});
  if(tiles.every(t=>TERMINALS.has(t)))y.push({id:'yaku-chinroutou',name:'清老頭',yakuman:1});
  if(isChuuren(tiles,closed))y.push({id:'yaku-chuuren',name:'九蓮宝燈',yakuman:1});
  return uniqueYaku(y);
}

function fuFor(v,ctx){
  if(v.type==='chiitoitsu')return {fu:25,items:[['七対子',25]]};
  if(v.type!=='standard')return {fu:0,items:[]};
  const yaku=normalYaku(v,ctx);const pinfu=yaku.some(y=>y.id==='yaku-pinfu');
  if(pinfu&&ctx.win==='tsumo')return {fu:20,items:[['ピンフツモ',20]]};
  let fu=20;const items=[['副底',20]];
  if(ctx.closed&&ctx.win==='ron'){fu+=10;items.push(['門前ロン',10])}
  else if(ctx.win==='tsumo'){fu+=2;items.push(['ツモ',2])}
  if(isValuePair(v.pair,ctx.seatWind,ctx.roundWind)){fu+=2;items.push(['翻牌の雀頭',2])}
  v.allMelds.forEach((m,i)=>{
    if(!tripLike(m))return;
    const yao=isTerminalOrHonor(m.tiles[0]);
    let open=m.open;
    if(m.source!=='declared'&&ctx.win==='ron'&&v.wait==='shanpon'&&v.winGroup===i)open=true;
    const add=m.kan?(yao?(open?16:32):(open?8:16)):(yao?(open?4:8):(open?2:4));
    fu+=add;items.push([`${yao?'么九牌':'中張牌'}の${open?'明':'暗'}${m.kan?'槓':'刻'}`,add]);
  });
  if(['kanchan','penchan','tanki'].includes(v.wait)){fu+=2;items.push(['待ち',2])}
  if(!ctx.closed&&ctx.win==='ron'&&fu===20){fu=30;items.push(['副露した平和形ロンの最低符',10])}
  const rounded=Math.ceil(fu/10)*10;if(rounded!==fu)items.push(['10符単位へ切り上げ',rounded-fu]);
  return {fu:rounded,items};
}

function doraBreakdown(allTiles,ctx){
  const groups=[['表ドラ',ctx.doraIndicators||[]],['槓ドラ',ctx.kanDoraIndicators||[]]];
  if(ctx.riichi||ctx.doubleRiichi){groups.push(['裏ドラ',ctx.uraIndicators||[]],['槓裏ドラ',ctx.kanUraIndicators||[]])}
  const detail=[];let count=0;
  for(const [name,indicators] of groups){
    for(const indicator of indicators){const dora=indicatorNext(indicator);if(!dora)continue;const n=allTiles.filter(t=>t===dora).length;if(n){count+=n;detail.push({name,indicator,dora,count:n})}}
  }
  const red=Math.max(0,Number(ctx.redDora)||0);count+=red;if(red)detail.push({name:'赤ドラ',count:red});
  return {count,detail};
}

function buildVariants(concealed,declared,winTile){
  if(!declared.length){
    const special=[...decomposeChiitoitsu(concealed),...decomposeKokushi(concealed)];
    const standard=decomposeStandardPartial(concealed,4);
    return [...standard,...special].flatMap(d=>waitCandidates(d,winTile)).map(v=>({...v,allMelds:v.type==='standard'?v.melds.map(m=>({...m,source:'concealed',open:false,kan:false})):[]}));
  }
  const target=4-declared.length;if(target<0)return [];
  return decomposeStandardPartial(concealed,target).flatMap(d=>waitCandidates(d,winTile)).map(v=>{
    const concealedMelds=v.melds.map(m=>({...m,source:'concealed',open:false,kan:false}));
    return {...v,allMelds:[...concealedMelds,...declared]};
  });
}

export function evaluateHand(input={}){
  const concealed=[...(input.concealedTiles||input.tiles||[])];
  let declared;try{declared=(input.melds||[]).map(normalizeMeld)}catch(e){return {ok:false,error:e.message}}
  if(declared.length>4)return {ok:false,error:'副露・カンは4組までです。'};
  const expected=14-declared.length*3;
  if(concealed.length!==expected)return {ok:false,error:`手牌は、副露${declared.length}組なら${expected}枚（あがり牌を含む）指定してください。`};
  if(!input.winTile||!concealed.includes(input.winTile))return {ok:false,error:'あがり牌を手牌に含めて指定してください。'};
  const physical=allPhysicalTiles(concealed,declared);
  try{countTiles(physical)}catch(e){return {ok:false,error:e.message}}
  const closed=isClosed(declared);
  if((input.riichi||input.doubleRiichi||input.ippatsu)&&!closed)return {ok:false,error:'副露した手ではリーチ・ダブルリーチ・一発を指定できません。'};
  if(input.haitei&&input.win!=='tsumo')return {ok:false,error:'海底摸月はツモあがりで指定してください。'};
  if(input.houtei&&input.win!=='ron')return {ok:false,error:'河底撈魚はロンあがりで指定してください。'};
  if(input.rinshan&&(input.win!=='tsumo'||!declared.some(m=>m.kan)))return {ok:false,error:'嶺上開花はカン後のツモあがりで指定してください。'};
  if(input.chankan&&input.win!=='ron')return {ok:false,error:'搶槓はロンあがりで指定してください。'};

  const ctx={...input,win:input.win||'ron',seatWind:input.seatWind||'1z',roundWind:input.roundWind||'1z',closed,allTiles:physical};
  const variants=buildVariants(concealed,declared,input.winTile);if(!variants.length)return {ok:false,error:'現在の牌と副露では、あがり形に分解できません。'};
  const candidates=[];
  for(const v of variants){
    const yakuman=yakumanYaku(v,ctx);const yakumanValue=yakuman.reduce((n,y)=>n+y.yakuman,0);
    if(yakumanValue>0){const score=calculateScore({yakumanValue,dealer:Boolean(input.dealer),win:ctx.win});candidates.push({decomposition:v,yakuman,yakumanValue,yaku:[],yakuHan:0,dora:0,doraDetail:[],han:0,fu:0,fuItems:[],score});continue}
    if(v.type==='kokushi')continue;
    const yaku=normalYaku(v,ctx);const yakuHan=yaku.reduce((n,y)=>n+y.han,0);if(yakuHan<1)continue;
    const dora=doraBreakdown(physical,ctx);const {fu,items}=fuFor(v,ctx);const han=yakuHan+dora.count;const score=calculateScore({han,fu,dealer:Boolean(input.dealer),win:ctx.win});
    candidates.push({decomposition:v,yaku,yakuHan,dora:dora.count,doraDetail:dora.detail,han,fu,fuItems:items,score,yakuman:[],yakumanValue:0});
  }
  if(!candidates.length)return {ok:false,error:'あがり形ですが役がありません。ドラだけではあがれません。'};
  candidates.sort((a,b)=>b.score.total-a.score.total||b.yakumanValue-a.yakumanValue||b.han-a.han||b.fu-a.fu);
  return {ok:true,best:candidates[0],alternatives:candidates.slice(1),closed};
}

export {indicatorNext};
