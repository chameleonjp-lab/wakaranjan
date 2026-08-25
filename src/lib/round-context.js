import {evaluateHand} from './full-hand-evaluator.js';
import {calculateScore} from './score.js';
import {countTiles,decomposeStandardPartial,decomposeChiitoitsu,decomposeKokushi} from './hand.js';

const SEATS=['east','south','west','north'];
const PAO_YAKUMAN=new Set(['yaku-daisangen','yaku-daisuushii','yaku-suukantsu']);

function tileCodes(){
  const out=[];
  for(const suit of ['m','p','s'])for(let n=1;n<=9;n++)out.push(`${n}${suit}`);
  for(let n=1;n<=7;n++)out.push(`${n}z`);
  return out;
}
function shapeCompletes(concealed,meldCount){
  if(meldCount===0&&(decomposeChiitoitsu(concealed).length||decomposeKokushi(concealed).length))return true;
  return decomposeStandardPartial(concealed,4-meldCount).length>0;
}

export function winningShapeTiles(input={}){
  const concealed=[...(input.concealedTiles||input.tiles||[])];
  const winTile=input.winTile;const index=concealed.indexOf(winTile);
  if(index<0)return [];
  concealed.splice(index,1);
  const melds=input.melds||[];const physicalBase=[...concealed,...melds.flatMap(m=>m.tiles||[])];const waits=[];
  for(const code of tileCodes()){
    try{countTiles([...physicalBase,code]);if(shapeCompletes([...concealed,code],melds.length))waits.push(code)}catch{}
  }
  return waits;
}

export function furitenStatus(input={}){
  const waits=winningShapeTiles(input);const river=new Set(input.ownRiver||[]);const ownDiscard=waits.find(t=>river.has(t))||null;
  const temporary=Boolean(input.temporaryFuriten);const riichiMiss=Boolean(input.riichiMissedRon);
  return {active:Boolean(ownDiscard||temporary||riichiMiss),waits,ownDiscard,temporary,riichiMiss};
}

function addPayment(map,seat,amount){if(!seat||!amount)return;map[seat]=(map[seat]||0)+amount}
function normalPayments(score,{winnerSeat,discarderSeat,honba=0}){
  const payers={};
  if(score.win==='ron')addPayment(payers,discarderSeat,score.total+honba*300);
  else for(const seat of SEATS){
    if(seat===winnerSeat)continue;
    const amount=score.dealer?score.payments.each:(seat==='east'?score.payments.dealer:score.payments.child);
    addPayment(payers,seat,amount+honba*100);
  }
  return payers;
}
function yakumanRonValue(dealer){return dealer?48000:32000}

function applySinglePao(result,{winnerSeat,discarderSeat,honba=0,pao}){
  const best=result.best;if(!best.yakumanValue||!pao)return null;
  if(!PAO_YAKUMAN.has(pao.yakumanId))return {error:'責任払いを指定できるのは大三元・大四喜・四槓子です。'};
  if(!best.yakuman.some(y=>y.id===pao.yakumanId))return {error:'指定した責任払いの役満が成立していません。'};
  if(!SEATS.includes(pao.responsibleSeat)||pao.responsibleSeat===winnerSeat)return {error:'責任者の位置が不正です。'};
  const payers={};const oneYakuman=yakumanRonValue(Boolean(best.score.dealer));const remaining=best.yakumanValue-1;
  if(best.score.win==='tsumo'){
    addPayment(payers,pao.responsibleSeat,oneYakuman+honba*300);
    if(remaining>0){
      const rest=normalPayments(calculateScore({han:0,fu:20,dealer:Boolean(best.score.dealer),win:'tsumo',yakuman:remaining}),{winnerSeat,honba:0});
      for(const [seat,amount] of Object.entries(rest))addPayment(payers,seat,amount);
    }
  }else{
    if(discarderSeat===pao.responsibleSeat)addPayment(payers,discarderSeat,oneYakuman+honba*300);
    else{addPayment(payers,pao.responsibleSeat,oneYakuman/2+honba*300);addPayment(payers,discarderSeat,oneYakuman/2)}
    if(remaining>0)addPayment(payers,discarderSeat,yakumanRonValue(Boolean(best.score.dealer))*remaining);
  }
  return {payers,paoApplied:true};
}

export function settleHand(input={}){
  const result=evaluateHand(input);if(!result.ok)return result;
  const winnerSeat=input.winnerSeat||({1:'east',2:'south',3:'west',4:'north'}[Number((input.seatWind||'1z')[0])]);
  if(!SEATS.includes(winnerSeat))return {ok:false,error:'あがり者の位置が不正です。'};
  if(Boolean(input.dealer)!==(winnerSeat==='east'))return {ok:false,error:'親指定とあがり者の位置が一致していません。'};
  const discarderSeat=input.discarderSeat;
  if(result.best.score.win==='ron'&&(!SEATS.includes(discarderSeat)||discarderSeat===winnerSeat))return {ok:false,error:'ロン時は、あがり者以外の放銃者を指定してください。'};
  const honba=Math.max(0,Math.trunc(Number(input.honba)||0));const riichiSticks=Math.max(0,Math.trunc(Number(input.riichiSticks)||0));
  const furiten=furitenStatus(input);
  if(result.best.score.win==='ron'&&furiten.active){
    const reason=furiten.ownDiscard?`自分の河に待ち牌 ${furiten.ownDiscard} があります。`:furiten.riichiMiss?'リーチ後にロンを見逃しているためフリテンです。':'同巡内フリテンです。';
    return {ok:false,error:`ロンできません。${reason}`,furiten};
  }
  let paymentInfo=applySinglePao(result,{winnerSeat,discarderSeat,honba,pao:input.pao});
  if(paymentInfo?.error)return {ok:false,error:paymentInfo.error};
  if(!paymentInfo)paymentInfo={payers:normalPayments(result.best.score,{winnerSeat,discarderSeat,honba}),paoApplied:false};
  const paymentsTotal=Object.values(paymentInfo.payers).reduce((a,b)=>a+b,0);const riichiBonus=riichiSticks*1000;
  return {...result,furiten,settlement:{winnerSeat,honba,riichiSticks,riichiBonus,payers:paymentInfo.payers,paoApplied:paymentInfo.paoApplied,handGain:paymentsTotal+riichiBonus}};
}

export function resolveHeadBump({discarderSeat,claimantSeats=[]}={}){
  const d=SEATS.indexOf(discarderSeat);if(d<0)return {ok:false,error:'放銃者の位置が不正です。'};
  const unique=[...new Set(claimantSeats)].filter(s=>SEATS.includes(s)&&s!==discarderSeat);if(!unique.length)return {ok:false,error:'ロン宣言者がいません。'};
  const priority=[1,2,3].map(step=>SEATS[(d+step)%4]);const winner=priority.find(seat=>unique.includes(seat));
  return {ok:true,winner,blocked:unique.filter(s=>s!==winner),priority};
}
