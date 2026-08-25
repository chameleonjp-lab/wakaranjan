import {calculateScore} from './score.js';
import {decomposeHand,waitCandidates,isTerminalOrHonor,isHonor} from './hand.js';

const DRAGONS=new Set(['5z','6z','7z']);
const allTiles=d=>d.type==='chiitoitsu'?d.pairs.flatMap(x=>[x,x]):[d.pair,d.pair,...d.melds.flatMap(m=>m.tiles)];
const seqKey=m=>m.type==='sequence'?m.tiles.join(''):null;
const valuePair=(pair,seatWind,roundWind)=>DRAGONS.has(pair)||pair===seatWind||pair===roundWind;

function yakuFor(v,{win='ron',riichi=false,seatWind='1z',roundWind='1z'}={}){
  const yaku=[];const tiles=allTiles(v);
  if(riichi)yaku.push({id:'yaku-riichi',name:'リーチ',han:1});
  if(win==='tsumo')yaku.push({id:'yaku-menzen-tsumo',name:'門前ツモ',han:1});
  if(tiles.every(t=>!isTerminalOrHonor(t)))yaku.push({id:'yaku-tanyao',name:'タンヤオ',han:1});
  if(v.type==='chiitoitsu')yaku.push({id:'yaku-chiitoitsu',name:'七対子',han:2});
  if(v.type==='standard'){
    const trips=v.melds.filter(m=>m.type==='triplet');
    for(const code of ['5z','6z','7z'])if(trips.some(m=>m.tiles[0]===code))yaku.push({id:`yaku-${code==='5z'?'haku':code==='6z'?'hatsu':'chun'}`,name:code==='5z'?'白':code==='6z'?'發':'中',han:1});
    if(trips.some(m=>m.tiles[0]===roundWind))yaku.push({id:'yaku-bakaze',name:'場風牌',han:1});
    if(trips.some(m=>m.tiles[0]===seatWind))yaku.push({id:'yaku-jikaze',name:'自風牌',han:1});
    if(trips.length===4)yaku.push({id:'yaku-toitoi',name:'対々和',han:2});
    const seqs=v.melds.filter(m=>m.type==='sequence');
    const pinfu=seqs.length===4&&!valuePair(v.pair,seatWind,roundWind)&&v.wait==='ryanmen';
    if(pinfu)yaku.push({id:'yaku-pinfu',name:'ピンフ',han:1});
    const counts=new Map();for(const m of seqs){const k=seqKey(m);counts.set(k,(counts.get(k)||0)+1)}
    const peikouPairs=[...counts.values()].reduce((n,c)=>n+Math.floor(c/2),0);
    if(peikouPairs>=2)yaku.push({id:'yaku-ryanpeikou',name:'二盃口',han:3});
    else if(peikouPairs===1)yaku.push({id:'yaku-iipeikou',name:'一盃口',han:1});
    for(let n=1;n<=7;n++){
      const pat=[`${n}m${n+1}m${n+2}m`,`${n}p${n+1}p${n+2}p`,`${n}s${n+1}s${n+2}s`];
      if(pat.every(k=>counts.has(k))){yaku.push({id:'yaku-sanshoku-doujun',name:'三色同順',han:2});break}
    }
    for(const suit of ['m','p','s']){
      if([`1${suit}2${suit}3${suit}`,`4${suit}5${suit}6${suit}`,`7${suit}8${suit}9${suit}`].every(k=>counts.has(k))){yaku.push({id:'yaku-ittsuu',name:'一気通貫',han:2});break}
    }
  }
  const suits=new Set(tiles.filter(t=>!isHonor(t)).map(t=>t[1]));const hasHonor=tiles.some(isHonor);
  if(suits.size===1&&hasHonor)yaku.push({id:'yaku-honitsu',name:'混一色',han:3});
  else if(suits.size===1&&!hasHonor)yaku.push({id:'yaku-chinitsu',name:'清一色',han:6});
  return yaku;
}

function fuFor(v,{win='ron',seatWind='1z',roundWind='1z'}={}){
  if(v.type==='chiitoitsu')return {fu:25,items:[['七対子',25]]};
  const yaku=yakuFor(v,{win,seatWind,roundWind});const pinfu=yaku.some(y=>y.id==='yaku-pinfu');
  if(pinfu&&win==='tsumo')return {fu:20,items:[['ピンフツモ',20]]};
  let fu=20;const items=[['副底',20]];
  if(win==='ron'){fu+=10;items.push(['門前ロン',10])}else{fu+=2;items.push(['ツモ',2])}
  if(valuePair(v.pair,seatWind,roundWind)){fu+=2;items.push(['役牌の雀頭',2])}
  v.melds.forEach((m,i)=>{
    if(m.type!=='triplet')return;
    const terminal=isTerminalOrHonor(m.tiles[0]);
    const openByRon=win==='ron'&&v.wait==='shanpon'&&v.winGroup===i;
    const add=terminal?(openByRon?4:8):(openByRon?2:4);
    fu+=add;items.push([`${terminal?'么九牌':'中張牌'}の${openByRon?'明刻':'暗刻'}`,add]);
  });
  if(['kanchan','penchan','tanki'].includes(v.wait)){fu+=2;items.push(['待ち',2])}
  const rounded=Math.ceil(fu/10)*10;
  if(rounded!==fu)items.push(['10符単位へ切り上げ',rounded-fu]);
  return {fu:rounded,items};
}

function doraCount(codes,doraCodes=[]){return codes.reduce((n,t)=>n+doraCodes.filter(d=>d===t).length,0)}

export function evaluateClosedHand({tiles,winTile,win='ron',riichi=false,dealer=false,seatWind='1z',roundWind='1z',doraCodes=[],redDora=0}={}){
  if(!Array.isArray(tiles)||tiles.length!==14)return {ok:false,error:'門前の手牌を14枚指定してください。'};
  if(!tiles.includes(winTile))return {ok:false,error:'あがり牌が手牌に含まれていません。'};
  let decomps;try{decomps=decomposeHand(tiles)}catch(e){return {ok:false,error:e.message}}
  if(!decomps.length)return {ok:false,error:'通常形または七対子のあがり形ではありません。'};
  const variants=decomps.flatMap(d=>waitCandidates(d,winTile));const candidates=[];
  for(const v of variants){
    const yaku=yakuFor(v,{win,riichi,seatWind,roundWind});const yakuHan=yaku.reduce((s,y)=>s+y.han,0);
    if(yakuHan<1)continue;
    const dora=doraCount(tiles,doraCodes)+redDora;const {fu,items}=fuFor(v,{win,seatWind,roundWind});
    const han=yakuHan+dora;const score=calculateScore({han,fu,dealer,win});
    candidates.push({decomposition:v,yaku,yakuHan,dora,han,fu,fuItems:items,score});
  }
  if(!candidates.length)return {ok:false,error:'あがり形ですが、現在の条件では役がありません。ドラだけではあがれません。'};
  candidates.sort((a,b)=>b.score.total-a.score.total||b.han-a.han||b.fu-a.fu);
  return {ok:true,best:candidates[0],alternatives:candidates.slice(1)};
}
