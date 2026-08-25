const DEFAULT_SCORES={east:25000,south:25000,west:25000,north:25000};
const SEAT_ORDER=['east','south','west','north'];
const SEAT_LABELS={east:'東家',south:'南家',west:'西家',north:'北家'};
const WIND_LABELS={east:'東',south:'南'};
const WIND_ORDER=['east','south'];
const MATCH_TYPES=['east-only','hanchan'];

function assertSeat(seat){
  if(!SEAT_ORDER.includes(seat))throw new RangeError('unknown seat');
}

function assertInteger(value,name,{minimum=0,maximum=Number.MAX_SAFE_INTEGER}={}){
  if(!Number.isSafeInteger(value)||value<minimum||value>maximum)throw new RangeError(name+' must be an integer in range');
}

function normalizeScores(scores={}){
  if(scores===null||typeof scores!=='object')throw new TypeError('scores must be an object');
  const next={...DEFAULT_SCORES,...scores};
  for(const seat of SEAT_ORDER)assertInteger(next[seat],\`scores.\${seat}\`,{minimum:-Number.MAX_SAFE_INTEGER});
  return next;
}

function applyScoreDeltas(scores,scoreDeltas={}){
  if(scoreDeltas===null||typeof scoreDeltas!=='object')throw new TypeError('scoreDeltas must be an object');
  const next={...scores};
  for(const [seat,delta] of Object.entries(scoreDeltas)){
    assertSeat(seat);
    assertInteger(delta,\`scoreDeltas.\${seat}\`,{minimum:-Number.MAX_SAFE_INTEGER});
    next[seat]+=delta;
  }
  return next;
}

function assertPlaying(state){
  if(!state||state.phase!=='playing')throw new Error('the match is not playable');
  for(const seat of SEAT_ORDER)assertInteger(state.scores?.[seat],\`scores.\${seat}\`,{minimum:-Number.MAX_SAFE_INTEGER});
  assertSeat(state.dealerSeat);
  assertInteger(state.honba,'honba');
  assertInteger(state.riichiSticks,'riichiSticks');
}

function nextSeat(seat){
  assertSeat(seat);
  return SEAT_ORDER[(SEAT_ORDER.indexOf(seat)+1)%SEAT_ORDER.length];
}

function advanceHand(state,honba){
  const dealerSeat=nextSeat(state.dealerSeat);
  if(state.handNumber<4){
    return {...state,roundWind:state.roundWind,handNumber:state.handNumber+1,dealerSeat,honba,continued:false};
  }
  if(state.matchType==='hanchan'&&state.roundWind==='east'){
    return {...state,roundWind:'south',handNumber:1,dealerSeat,honba,continued:false};
  }
  return {...state,phase:'finished',honba,continued:false};
}

/**
 * Create the state for the next hand.
 *
 * Project standard:
 * - A dealer win or dealer-tenpai draw continues the same hand.
 * - Every continuation draw/dealer win adds one honba.
 * - A non-dealer win moves to the next hand and resets honba.
 * - Riichi sticks stay on the table until a win collects them.
 */
export function createMatchState({matchType='east-only',scores=DEFAULT_SCORES,roundWind='east',handNumber=1,dealerSeat='east',honba=0,riichiSticks=0}={}){
  if(!MATCH_TYPES.includes(matchType))throw new RangeError('unknown matchType');
  if(!WIND_ORDER.includes(roundWind))throw new RangeError('unknown roundWind');
  assertInteger(handNumber,'handNumber',{minimum:1,maximum:4});
  assertSeat(dealerSeat);
  assertInteger(honba,'honba');
  assertInteger(riichiSticks,'riichiSticks');
  return {
    matchType,
    phase:'playing',
    roundWind,
    handNumber,
    dealerSeat,
    honba,
    riichiSticks,
    scores:normalizeScores(scores),
    completedRound:null,
    lastOutcome:null,
    lastWinnerSeat:null,
    lastDealerTenpai:null,
    continued:false
  };
}

export function roundLabel(state){
  if(!state||!WIND_LABELS[state.roundWind])throw new RangeError('unknown round state');
  return WIND_LABELS[state.roundWind]+state.handNumber+'局'+(state.honba?state.honba+'本場':'');
}

export function declareRiichi(state,seat){
  assertPlaying(state);
  assertSeat(seat);
  if(state.scores[seat]<1000)throw new RangeError('riichi requires at least 1000 points');
  const scores={...state.scores,[seat]:state.scores[seat]-1000};
  return {...state,scores,riichiSticks:state.riichiSticks+1};
}

export function completeHand(state,{outcome,winnerSeat=null,dealerTenpai=false,scoreDeltas={},winnerCollectsRiichi=true}={}){
  assertPlaying(state);
  if(outcome!=='win'&&outcome!=='draw')throw new RangeError('outcome must be win or draw');
  if(outcome==='win'){
    assertSeat(winnerSeat);
    if(typeof winnerCollectsRiichi!=='boolean')throw new TypeError('winnerCollectsRiichi must be boolean');
  }else{
    if(winnerSeat!==null)throw new Error('draw cannot have a winner');
    if(typeof dealerTenpai!=='boolean')throw new TypeError('dealerTenpai must be boolean');
  }

  const completedRound={
    roundWind:state.roundWind,
    handNumber:state.handNumber,
    dealerSeat:state.dealerSeat,
    honba:state.honba
  };
  const scores=applyScoreDeltas(state.scores,scoreDeltas);
  let riichiSticks=state.riichiSticks;
  if(outcome==='win'&&winnerCollectsRiichi){
    scores[winnerSeat]+=riichiSticks*1000;
    riichiSticks=0;
  }
  const completed={
    ...state,
    scores,
    riichiSticks,
    lastOutcome:outcome,
    lastWinnerSeat:outcome==='win'?winnerSeat:null,
    lastDealerTenpai:outcome==='draw'?dealerTenpai:null,
    completedRound,
    continued:false
  };

  if(outcome==='win'&&winnerSeat===state.dealerSeat){
    return {...completed,honba:state.honba+1,continued:true};
  }
  if(outcome==='draw'&&dealerTenpai){
    return {...completed,honba:state.honba+1,continued:true};
  }
  return advanceHand(completed,outcome==='draw'?state.honba+1:0);
}

export const SEAT_LABEL_MAP=Object.freeze({...SEAT_LABELS});
export const SEATS=Object.freeze([...SEAT_ORDER]);
