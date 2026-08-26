import {applyCall,CALL_TYPES} from './call.js';
import {applyKan,KAN_TYPES} from './kan.js';
import {resolveHeadBump,settleHand,tenpaiStatus} from './round-context.js';
import {completeHand as completeRoundHand,createMatchState,declareKan as declareRoundKan,declareRiichi as declareRoundRiichi,resolveKan as resolveRoundKan,SEATS} from './round-state.js';
import {createRoundWall,drawLiveTile,revealDoraIndicator,resolveKan as resolveWallKan} from './tile-wall.js';

export const HAND_PHASES=Object.freeze({
  DRAW:'draw',
  DISCARD:'discard',
  RESPONSE:'response',
  AWAITING_RESULT:'awaiting-result',
  COMPLETED:'completed'
});

function assertSeat(seat){
  if(!SEATS.includes(seat))throw new RangeError('unknown seat');
}

function cloneTile(tile){
  if(!tile||typeof tile!=='object'||typeof tile.id!=='string'||typeof tile.code!=='string')throw new TypeError('physical tile is invalid');
  return {...tile};
}

function cloneMeld(meld){
  return {
    ...meld,
    tiles:Array.isArray(meld?.tiles)?meld.tiles.map(tile=>typeof tile==='object'?cloneTile(tile):tile):meld?.tiles
  };
}

function cloneWall(wall){
  if(!wall||!Array.isArray(wall.live)||!Array.isArray(wall.rinshan)||!Array.isArray(wall.doraIndicators)||!Array.isArray(wall.uraIndicators))throw new TypeError('roundWall is invalid');
  if(!Number.isInteger(wall.rinshanIndex)||!Number.isInteger(wall.doraIndex))throw new TypeError('roundWall indexes are invalid');
  return {
    live:wall.live.map(cloneTile),
    rinshan:wall.rinshan.map(cloneTile),
    doraIndicators:wall.doraIndicators.map(cloneTile),
    uraIndicators:wall.uraIndicators.map(cloneTile),
    rinshanIndex:wall.rinshanIndex,
    doraIndex:wall.doraIndex
  };
}

function cloneRoundState(state){
  const next={
    ...state,
    scores:{...state.scores},
    kanDoraIndicators:(state.kanDoraIndicators||[]).map(cloneTile),
    completedRound:state.completedRound?{
      ...state.completedRound,
      kanDoraIndicators:(state.completedRound.kanDoraIndicators||[]).map(cloneTile)
    }:null
  };
  if(state.pendingKan)next.pendingKan={...state.pendingKan,meld:state.pendingKan.meld?cloneMeld(state.pendingKan.meld):null};
  if(state.lastKan)next.lastKan={...state.lastKan,rinshanTile:cloneTile(state.lastKan.rinshanTile),doraIndicator:cloneTile(state.lastKan.doraIndicator),meld:state.lastKan.meld?cloneMeld(state.lastKan.meld):null};
  return next;
}

function cloneResult(result){
  if(!result)return null;
  return {
    ...result,
    best:result.best?{...result.best,score:result.best.score?{...result.best.score,payments:result.best.score.payments?{...result.best.score.payments}:undefined}:result.best.score}:result.best,
    furiten:result.furiten?{...result.furiten,waits:Array.isArray(result.furiten.waits)?[...result.furiten.waits]:result.furiten.waits}:result.furiten,
    settlement:result.settlement?{...result.settlement,payers:{...result.settlement.payers}}:result.settlement,
    ronClaims:Array.isArray(result.ronClaims)?result.ronClaims.map(claim=>({...claim,score:claim.score?{...claim.score}:claim.score})):result.ronClaims,
    headBump:result.headBump?{...result.headBump,priority:Array.isArray(result.headBump.priority)?[...result.headBump.priority]:result.headBump.priority,blocked:Array.isArray(result.headBump.blocked)?[...result.headBump.blocked]:result.headBump.blocked}:result.headBump
  };
}

function emptyPlayers(){
  return Object.fromEntries(SEATS.map(seat=>[seat,{hand:[],melds:[],river:[],riichi:false,riichiTileId:null,riichiWaits:[],temporaryFuriten:false,riichiMissedRon:false}]));
}

function clonePlayers(players){
  return Object.fromEntries(SEATS.map(seat=>{
    const player=players?.[seat];
    if(!player||!Array.isArray(player.hand)||!Array.isArray(player.melds)||!Array.isArray(player.river))throw new TypeError('player state is invalid');
    return [seat,{
      hand:player.hand.map(cloneTile),
      melds:player.melds.map(cloneMeld),
      river:player.river.map(cloneTile),
      riichi:Boolean(player.riichi),
      riichiTileId:typeof player.riichiTileId==='string'?player.riichiTileId:null,
      riichiWaits:Array.isArray(player.riichiWaits)?[...player.riichiWaits]:[],
      temporaryFuriten:Boolean(player.temporaryFuriten),
      riichiMissedRon:Boolean(player.riichiMissedRon)
    }];
  }));
}

function drawTo(wall,players,seat){
  const tile=drawLiveTile(wall);
  if(!tile)throw new Error('not enough live tiles to deal');
  const copy=cloneTile(tile);
  players[seat].hand.push(copy);
  return copy;
}

function dealInitial(wall,dealerSeat){
  assertSeat(dealerSeat);
  const players=emptyPlayers();
  for(let packet=0;packet<3;packet+=1){
    for(const seat of SEATS){
      for(let count=0;count<4;count+=1)drawTo(wall,players,seat);
    }
  }
  for(const seat of SEATS)drawTo(wall,players,seat);
  const dealerDrawn=drawTo(wall,players,dealerSeat);
  return {players,dealerDrawn};
}

function takeFixtureHands(wall,initialHands,dealerSeat){
  assertSeat(dealerSeat);
  const players=emptyPlayers();
  const expected={east:13,south:13,west:13,north:13};
  expected[dealerSeat]=14;
  for(const seat of SEATS){
    const codes=initialHands?.[seat];
    if(!Array.isArray(codes)||codes.length!==expected[seat])throw new TypeError('initialHands.'+seat+' must contain '+expected[seat]+' tile codes');
    for(const code of codes){
      const index=wall.live.findIndex(tile=>tile.code===code);
      if(index<0)throw new RangeError('initialHands contains an unavailable tile: '+code);
      players[seat].hand.push(cloneTile(wall.live.splice(index,1)[0]));
    }
  }
  return {players,dealerDrawn:players[dealerSeat].hand[players[dealerSeat].hand.length-1]};
}

function nextSeat(seat){
  assertSeat(seat);
  return SEATS[(SEATS.indexOf(seat)+1)%SEATS.length];
}

function relativeKanSource(declarerSeat,discarderSeat){
  const distance=(SEATS.indexOf(discarderSeat)-SEATS.indexOf(declarerSeat)+SEATS.length)%SEATS.length;
  if(distance===1)return 'shimocha';
  if(distance===2)return 'toimen';
  if(distance===3)return 'kamicha';
  throw new Error('the kan declarer cannot use their own discard');
}

function relativeCallSource(declarerSeat,discarderSeat){
  return relativeKanSource(declarerSeat,discarderSeat);
}

function markClaimedDiscard(players,pending){
  const river=players[pending.seat].river;
  const index=river.findIndex(tile=>tile.id===pending.tileId);
  if(index<0)throw new Error('the pending discard is missing from the river');
  river[index]={...river[index],claimed:true};
}


function assertFlow(state){
  if(!state||!Object.values(HAND_PHASES).includes(state.phase))throw new TypeError('hand flow state is invalid');
  assertSeat(state.currentSeat);
  if(!state.roundState||state.roundState.phase!=='playing')throw new Error('the round is not playable');
  cloneWall(state.roundWall);
  clonePlayers(state.players);
  if(!Array.isArray(state.doraIndicators))throw new TypeError('dora indicators are invalid');
  if(state.phase===HAND_PHASES.RESPONSE){
    const pending=state.pendingDiscard;
    if(!pending||!SEATS.includes(pending.seat)||typeof pending.tileId!=='string'||typeof pending.code!=='string')throw new TypeError('pending discard is invalid');
  }
}

function cloneFlow(state){
  assertFlow(state);
  return {
    ...state,
    roundState:cloneRoundState(state.roundState),
    roundWall:cloneWall(state.roundWall),
    players:clonePlayers(state.players),
    doraIndicators:state.doraIndicators.map(cloneTile),
    pendingDiscard:state.pendingDiscard?{...state.pendingDiscard}:null,
    lastAction:state.lastAction?{...state.lastAction}:null,
    result:cloneResult(state.result)
  };
}

function takeCopies(hand,code,count){
  let remaining=count;
  const next=[];
  const removed=[];
  for(const tile of hand){
    if(tile.code===code&&remaining>0){
      remaining-=1;
      removed.push(tile);
      continue;
    }
    next.push(tile);
  }
  if(remaining!==0)throw new Error('kan tiles are missing from the hand');
  return {hand:next,removed};
}

function removeCopies(hand,code,count){
  return takeCopies(hand,code,count).hand;
}

function takePhysicalCodes(hand,codes){
  const remaining=[...codes];
  const next=[];
  const removed=[];
  for(const tile of hand){
    const index=remaining.indexOf(tile.code);
    if(index>=0){remaining.splice(index,1);removed.push(tile);continue}
    next.push(tile);
  }
  if(remaining.length)throw new Error('called tiles are missing from the hand');
  return {hand:next,removed};
}

function removePhysicalCodes(hand,codes){
  return takePhysicalCodes(hand,codes).hand;
}

function redDoraCount(tiles=[]){
  return tiles.reduce((count,tile)=>count+(tile?.red===true?1:0),0);
}

function redDoraFromMeld(meld){
  if(Number.isInteger(meld?.redDora)&&meld.redDora>=0)return meld.redDora;
  return redDoraCount(meld?.tiles||[]);
}

function setMeldRedDora(melds,index,count){
  if(count<=0||index<0||index>=melds.length)return melds;
  return melds.map((meld,meldIndex)=>meldIndex===index?{...meld,redDora:count}:meld);
}

function pendingDiscardTile(state,pending){
  return state.players[pending.seat]?.river.find(tile=>tile.id===pending.tileId)||null;
}

function winnerRedDoraCount(player,win,winTile){
  return redDoraCount(player.hand)+player.melds.reduce((count,meld)=>count+redDoraFromMeld(meld),0)+(win==='ron'&&winTile?.red===true?1:0);
}

function codeOf(tile){
  return typeof tile==='string'?tile:tile?.code;
}

function meldCodes(meld){
  return {
    ...meld,
    tiles:Array.isArray(meld?.tiles)?meld.tiles.map(codeOf):meld?.tiles
  };
}

function roundWindCode(roundWind){
  return roundWind==='south'?'2z':'1z';
}

function seatWindCode(roundState,seat){
  const dealerIndex=SEATS.indexOf(roundState.dealerSeat);
  const seatIndex=SEATS.indexOf(seat);
  return ((seatIndex-dealerIndex+SEATS.length)%SEATS.length+1)+'z';
}

function settlementInput(state,{seat,win,winTile,discarderSeat=null,options={}}){
  assertSeat(seat);
  const player=state.players[seat];
  const winCode=codeOf(winTile);
  if(!winCode)throw new TypeError('winTile is required');
  const concealedTiles=player.hand.map(codeOf);
  if(win==='ron')concealedTiles.push(winCode);
  const round=state.roundState;
  const physicalRedDora=winnerRedDoraCount(player,win,winTile);
  const riichi=Boolean(player.riichi)||Boolean(options.riichi);
  return {
    ...options,
    concealedTiles,
    melds:player.melds.map(meldCodes),
    winTile:winCode,
    win,
    dealer:seat===round.dealerSeat,
    seatWind:seatWindCode(round,seat),
    roundWind:roundWindCode(round.roundWind),
    doraIndicators:state.doraIndicators.slice(0,1).map(codeOf),
    kanDoraIndicators:(round.kanDoraIndicators||[]).map(codeOf),
    uraIndicators:state.roundWall.uraIndicators.slice(0,1).map(codeOf),
    kanUraIndicators:state.roundWall.uraIndicators.slice(1,1+(round.kanCount||0)).map(codeOf),
    redDora:physicalRedDora||options.redDora,
    winnerSeat:seat,
    discarderSeat,
    honba:round.honba,
    riichiSticks:round.riichiSticks,
    ownRiver:player.river.map(codeOf),
    dealerSeat:round.dealerSeat,
    riichi,
    temporaryFuriten:Boolean(player.temporaryFuriten)||Boolean(options.temporaryFuriten),
    riichiMissedRon:Boolean(player.riichiMissedRon)||Boolean(options.riichiMissedRon)
  };
}

function normalizeResponseSeats(pending,seats){
  const requested=seats===undefined?SEATS.filter(seat=>seat!==pending.seat):seats;
  if(!Array.isArray(requested))throw new TypeError('seats must be an array');
  const unique=[];
  for(const seat of requested){
    assertSeat(seat);
    if(seat===pending.seat)throw new Error('the discarder cannot respond to their own discard');
    if(!unique.includes(seat))unique.push(seat);
  }
  return unique;
}

function normalizeRonClaimSeats(pending,seats){
  try{return normalizeResponseSeats(pending,seats)}catch(error){
    if(error instanceof Error&&error.message==='the discarder cannot respond to their own discard')throw new Error('the discarder cannot declare ron');
    throw error;
  }
}

function markPassedRonFlags(next,state,responseSeats){
  const temporaryFuritenSeats=[];
  const riichiMissedRonSeats=[];
  for(const seat of responseSeats){
    const ron=checkRon(state,{seat});
    if(!ron.ok)continue;
    if(next.players[seat].riichi){
      next.players[seat].riichiMissedRon=true;
      riichiMissedRonSeats.push(seat);
    }else{
      next.players[seat].temporaryFuriten=true;
      temporaryFuritenSeats.push(seat);
    }
  }
  return {temporaryFuritenSeats,riichiMissedRonSeats};
}

function sameTileCodes(left,right){
  return Array.isArray(left)&&Array.isArray(right)&&left.length===right.length&&left.every((code,index)=>code===right[index]);
}

function claimResultSummary(claim){
  return {
    seat:claim.seat,
    ok:claim.ok,
    error:claim.ok?null:claim.error,
    score:claim.result?.best?.score||null
  };
}

function scoreDeltas(result,winnerSeat){
  const deltas={};
  const payers=result.settlement?.payers||{};
  let paid=0;
  for(const [seat,amount] of Object.entries(payers)){
    deltas[seat]=(deltas[seat]||0)-amount;
    paid+=amount;
  }
  deltas[winnerSeat]=(deltas[winnerSeat]||0)+paid;
  return deltas;
}

function completeWinningFlow(state,result,{winnerSeat,win,winTileId,discarderSeat=null,resultMeta={},actionMeta={}}){
  const current=cloneFlow(state);
  current.roundState=completeRoundHand(current.roundState,{
    outcome:'win',
    winnerSeat,
    scoreDeltas:scoreDeltas(result,winnerSeat),
    winnerCollectsRiichi:true
  });
  current.phase=HAND_PHASES.COMPLETED;
  current.pendingDiscard=null;
  current.drawnTileId=null;
  current.result={
    type:'win',
    win,
    winnerSeat,
    winTileId:winTileId||null,
    discarderSeat,
    score:result.best?.score||null,
    settlement:result.settlement?{...result.settlement,payers:{...result.settlement.payers}}:null,
    ...resultMeta
  };
  current.lastAction={type:'win',win,winnerSeat,winTileId:winTileId||null,discarderSeat,score:result.best?.score?.total||null,...actionMeta};
  return current;
}

function evaluateStateResult(state,params){
  const result=settleHand(settlementInput(state,params));
  return result;
}

function tenpaiStatusForFlow(state){
  return Object.fromEntries(SEATS.map(seat=>{
    const player=state.players[seat];
    return [seat,tenpaiStatus({
      concealedTiles:player.hand.map(codeOf),
      melds:player.melds.map(meldCodes)
    })];
  }));
}

export function checkExhaustiveDraw(state){
  assertFlow(state);
  if(state.phase!==HAND_PHASES.AWAITING_RESULT)throw new Error('the hand is not waiting for a draw result');
  const tenpaiBySeat=tenpaiStatusForFlow(state);
  const tenpaiSeats=SEATS.filter(seat=>tenpaiBySeat[seat].tenpai);
  return {
    ok:true,
    tenpaiBySeat,
    tenpaiSeats,
    dealerTenpai:tenpaiBySeat[state.roundState.dealerSeat].tenpai
  };
}


export function createHandFlow({roundState=createMatchState(),roundWall=null,wallOptions={},initialHands=null,userSeat='east'}={}){
  if(roundState.phase!=='playing')throw new Error('the round is not playable');
  assertSeat(userSeat);
  const wall=roundWall?cloneWall(roundWall):createRoundWall(wallOptions);
  const dealt=initialHands?takeFixtureHands(wall,initialHands,roundState.dealerSeat):dealInitial(wall,roundState.dealerSeat);
  const doraIndicator=revealDoraIndicator(wall);
  if(!doraIndicator)throw new Error('the initial dora indicator is unavailable');
  return {
    roundState:cloneRoundState(roundState),
    roundWall:wall,
    players:dealt.players,
    currentSeat:roundState.dealerSeat,
    userSeat,
    phase:HAND_PHASES.DISCARD,
    turnNumber:0,
    drawnTileId:dealt.dealerDrawn.id,
    doraIndicators:[cloneTile(doraIndicator)],
    pendingDiscard:null,
    result:null,
    lastAction:{type:'deal',seat:roundState.dealerSeat,tileId:dealt.dealerDrawn.id}
  };
}

export function drawForTurn(state){
  const next=cloneFlow(state);
  if(next.phase!==HAND_PHASES.DRAW)throw new Error('the hand is not waiting for a draw');
  const tile=drawLiveTile(next.roundWall);
  if(!tile){
    next.phase=HAND_PHASES.AWAITING_RESULT;
    next.drawnTileId=null;
    next.lastAction={type:'live-wall-exhausted',seat:next.currentSeat};
    return next;
  }
  const copy=cloneTile(tile);
  const player=next.players[next.currentSeat];
  player.hand.push(copy);
  player.temporaryFuriten=false;
  next.phase=HAND_PHASES.DISCARD;
  next.drawnTileId=copy.id;
  next.lastAction={type:'draw',seat:next.currentSeat,tileId:copy.id};
  return next;
}

export function discardTile(state,{seat=state?.currentSeat,tileId}={}){
  const next=cloneFlow(state);
  if(next.phase!==HAND_PHASES.DISCARD)throw new Error('the hand is not waiting for a discard');
  assertSeat(seat);
  if(seat!==next.currentSeat)throw new Error('the seat is not the current seat');
  if(typeof tileId!=='string')throw new TypeError('tileId is required');
  const player=next.players[seat];
  if(player.riichi&&tileId!==next.drawnTileId)throw new Error('リーチ後はツモ切りのみ可能です。');
  const index=player.hand.findIndex(tile=>tile.id===tileId);
  if(index<0)throw new Error('tile is not in the current hand');
  const [discarded]=player.hand.splice(index,1);
  player.river.push(cloneTile(discarded));
  next.currentSeat=nextSeat(seat);
  next.phase=HAND_PHASES.RESPONSE;
  next.pendingDiscard={seat,tileId:discarded.id,code:discarded.code};
  next.turnNumber+=1;
  next.drawnTileId=null;
  next.lastAction={type:'discard',seat,tileId:discarded.id,code:discarded.code};
  return next;
}

export function declareRiichi(state,{seat=state?.currentSeat,tileId=state?.drawnTileId}={}){
  const current=cloneFlow(state);
  if(current.phase!==HAND_PHASES.DISCARD)throw new Error('リーチは捨て牌の前に宣言します。');
  assertSeat(seat);
  if(seat!==current.currentSeat)throw new Error('the seat is not the current seat');
  const player=current.players[seat];
  if(player.riichi)throw new Error('すでにリーチしています。');
  if(player.melds.some(meld=>meld.open))throw new Error('鳴いた後はリーチできません。');
  if(typeof tileId!=='string')throw new TypeError('tileId is required');
  const index=player.hand.findIndex(tile=>tile.id===tileId);
  if(index<0)throw new Error('tile is not in the current hand');
  const remainingHand=player.hand.filter((_tile,candidateIndex)=>candidateIndex!==index);
  const status=tenpaiStatus({
    concealedTiles:remainingHand.map(codeOf),
    melds:player.melds.map(meldCodes)
  });
  if(!status.tenpai)throw new Error('リーチには、捨てた後のテンパイが必要です。');
  current.roundState=declareRoundRiichi(current.roundState,seat);
  const [discarded]=player.hand.splice(index,1);
  player.river.push(cloneTile(discarded));
  player.riichi=true;
  player.riichiTileId=discarded.id;
  player.riichiWaits=[...status.waits];
  current.currentSeat=nextSeat(seat);
  current.phase=HAND_PHASES.RESPONSE;
  current.pendingDiscard={seat,tileId:discarded.id,code:discarded.code};
  current.turnNumber+=1;
  current.drawnTileId=null;
  current.lastAction={type:'riichi-discard',seat,tileId:discarded.id,code:discarded.code,waits:[...status.waits]};
  return current;
}

export function passDiscard(state,{seats}={}){
  const next=cloneFlow(state);
  if(next.phase!==HAND_PHASES.RESPONSE)throw new Error('the hand is not waiting for a discard response');
  const pending=next.pendingDiscard;
  const responseSeats=normalizeResponseSeats(pending,seats);
  const {temporaryFuritenSeats,riichiMissedRonSeats}=markPassedRonFlags(next,state,responseSeats);
  next.pendingDiscard=null;
  next.phase=HAND_PHASES.DRAW;
  next.lastAction={type:'pass-discard',seat:pending.seat,tileId:pending.tileId,code:pending.code,temporaryFuritenSeats,riichiMissedRonSeats};
  return next;
}

export function checkTsumo(state,{seat=state?.currentSeat,options={}}={}){
  assertFlow(state);
  if(state.phase!==HAND_PHASES.DISCARD)throw new Error('tsumo can only be checked before the discard');
  assertSeat(seat);
  if(seat!==state.currentSeat)throw new Error('the seat is not the current seat');
  const tile=state.players[seat].hand.find(candidate=>candidate.id===state.drawnTileId);
  if(!tile)throw new Error('the drawn tile is missing from the current hand');
  return evaluateStateResult(state,{seat,win:'tsumo',winTile:tile,options});
}

export function completeTsumo(state,{seat=state?.currentSeat,options={}}={}){
  const result=checkTsumo(state,{seat,options});
  if(!result.ok)throw new Error(result.error);
  return completeWinningFlow(state,result,{winnerSeat:seat,win:'tsumo',winTileId:state.drawnTileId});
}

export function checkRon(state,{seat=state?.currentSeat,options={}}={}){
  assertFlow(state);
  if(state.phase!==HAND_PHASES.RESPONSE)throw new Error('ron can only be checked during a discard response');
  assertSeat(seat);
  const pending=state.pendingDiscard;
  if(seat===pending.seat)throw new Error('the discarder cannot ron on their own discard');
  return evaluateStateResult(state,{seat,win:'ron',winTile:pendingDiscardTile(state,pending)||pending.code,discarderSeat:pending.seat,options});
}

export function checkRonClaims(state,{seats,options={},optionsBySeat={}}={}){
  assertFlow(state);
  if(state.phase!==HAND_PHASES.RESPONSE)throw new Error('ron can only be checked during a discard response');
  const pending=state.pendingDiscard;
  const claimantSeats=normalizeRonClaimSeats(pending,seats);
  const claims=claimantSeats.map(seat=>{
    const seatOptions=optionsBySeat&&Object.prototype.hasOwnProperty.call(optionsBySeat,seat)?optionsBySeat[seat]:options;
    const result=evaluateStateResult(state,{seat,win:'ron',winTile:pending.code,discarderSeat:pending.seat,options:seatOptions});
    return {
      seat,
      ok:Boolean(result.ok),
      error:result.ok?null:result.error,
      result:result.ok?result:null
    };
  });
  const validSeats=claims.filter(claim=>claim.ok).map(claim=>claim.seat);
  if(!validSeats.length){
    return {
      ok:false,
      discarderSeat:pending.seat,
      tileId:pending.tileId,
      code:pending.code,
      claims,
      claimantSeats:[],
      winnerSeat:null,
      blockedSeats:[],
      priority:[],
      error:'ロンできる人がいません。'
    };
  }
  const resolved=resolveHeadBump({discarderSeat:pending.seat,claimantSeats:validSeats});
  if(!resolved.ok)throw new Error(resolved.error);
  return {
    ok:true,
    discarderSeat:pending.seat,
    tileId:pending.tileId,
    code:pending.code,
    claims,
    claimantSeats:validSeats,
    winnerSeat:resolved.winner,
    blockedSeats:resolved.blocked,
    priority:resolved.priority
  };
}

export function claimRonClaims(state,{seats,options={},optionsBySeat={}}={}){
  const checked=checkRonClaims(state,{seats,options,optionsBySeat});
  if(!checked.ok){
    const failed=checked.claims.find(claim=>!claim.ok);
    throw new Error(failed?.error||checked.error);
  }
  const winnerClaim=checked.claims.find(claim=>claim.seat===checked.winnerSeat&&claim.ok);
  if(!winnerClaim?.result)throw new Error('head-bump winner result is missing');
  const ronClaims=checked.claims.map(claimResultSummary);
  return completeWinningFlow(state,winnerClaim.result,{
    winnerSeat:checked.winnerSeat,
    win:'ron',
    winTileId:checked.tileId,
    discarderSeat:checked.discarderSeat,
    resultMeta:{
      ronClaims,
      ronClaimants:checked.claimantSeats,
      blockedRonClaimants:checked.blockedSeats,
      headBump:{winner:checked.winnerSeat,priority:[...checked.priority],blocked:[...checked.blockedSeats]}
    },
    actionMeta:{
      ronClaimants:checked.claimantSeats,
      blockedRonClaimants:checked.blockedSeats,
      headBumpWinner:checked.winnerSeat
    }
  });
}

export function claimRon(state,{seat=state?.currentSeat,options={}}={}){
  const result=checkRon(state,{seat,options});
  if(!result.ok)throw new Error(result.error);
  const pending=state.pendingDiscard;
  return completeWinningFlow(state,result,{winnerSeat:seat,win:'ron',winTileId:pending.tileId,discarderSeat:pending.seat});
}

export function completeExhaustiveDraw(state,{dealerTenpai}={}){
  const current=cloneFlow(state);
  if(current.phase!==HAND_PHASES.AWAITING_RESULT)throw new Error('the hand is not waiting for a draw result');
  const checked=checkExhaustiveDraw(current);
  const resolvedDealerTenpai=typeof dealerTenpai==='boolean'?dealerTenpai:checked.dealerTenpai;
  current.roundState=completeRoundHand(current.roundState,{outcome:'draw',dealerTenpai:resolvedDealerTenpai});
  current.phase=HAND_PHASES.COMPLETED;
  current.pendingDiscard=null;
  current.drawnTileId=null;
  current.result={
    type:'draw',
    dealerTenpai:resolvedDealerTenpai,
    tenpaiBySeat:checked.tenpaiBySeat,
    tenpaiSeats:checked.tenpaiSeats
  };
  current.lastAction={type:'draw-complete',dealerTenpai:resolvedDealerTenpai,tenpaiSeats:checked.tenpaiSeats};
  return current;
}

export function checkKan(state,{type,seat=state?.currentSeat}={}){
  assertFlow(state);
  assertSeat(seat);
  if(!KAN_TYPES.includes(type))throw new RangeError('unknown kan type');
  const player=state.players[seat];

  if(type==='minkan'){
    if(state.phase!==HAND_PHASES.RESPONSE)throw new Error('a minkan requires an opponent discard response window');
    const pending=state.pendingDiscard;
    if(seat===pending.seat)throw new Error('the discarder cannot call minkan on their own discard');
    if(player.riichi)return {ok:false,code:'riichi-kan-not-allowed',message:'リーチ後は大明槓できません。'};
    return applyKan({
      type,
      concealedTiles:player.hand.map(codeOf),
      openMelds:player.melds,
      discardTile:pending.code,
      from:relativeKanSource(seat,pending.seat),
      ownTurn:false,
      kanCount:state.roundState.kanCount
    });
  }

  if(state.phase!==HAND_PHASES.DISCARD)throw new Error('a kan can only be declared before the discard');
  if(seat!==state.currentSeat)throw new Error('the seat is not the current seat');
  if(!state.drawnTileId)return {ok:false,code:'draw-required',message:'カンは自分のツモのあとに宣言します。'};
  if(player.riichi&&type!=='ankan')return {ok:false,code:'riichi-kan-not-allowed',message:'リーチ後は暗槓以外のカンを宣言できません。'};

  const applied=applyKan({
    type,
    concealedTiles:player.hand.map(codeOf),
    openMelds:player.melds,
    ownTurn:true,
    kanCount:state.roundState.kanCount,
    drawnTile:player.hand.find(tile=>tile.id===state.drawnTileId)?.code||null
  });
  if(!applied.ok)return applied;
  if(!player.riichi)return applied;

  const postKanStatus=tenpaiStatus({
    concealedTiles:applied.concealedTiles,
    melds:applied.openMelds.map(meldCodes)
  });
  const riichiWaits=Array.isArray(player.riichiWaits)?[...player.riichiWaits]:[];
  if(!riichiWaits.length)return {ok:false,code:'riichi-waits-missing',message:'リーチ時の待ち牌がないため、暗槓の可否を判定できません。'};
  if(!sameTileCodes(riichiWaits,postKanStatus.waits))return {
    ...{ok:false,code:'riichi-kan-changes-wait',message:'リーチ後の暗槓で待ち牌が変わるため宣言できません。'},
    riichiWaits,
    postKanWaits:[...postKanStatus.waits]
  };
  return {...applied,riichiWaits,postKanWaits:[...postKanStatus.waits]};
}

export function declareMinkan(state,{seat=state?.currentSeat}={}){
  const current=cloneFlow(state);
  const applied=checkKan(current,{type:'minkan',seat});
  if(!applied.ok)throw new Error(applied.message);
  const pending=current.pendingDiscard;
  const player=current.players[seat];
  const wallResult=resolveWallKan(current.roundWall);
  if(!wallResult.ok)throw new Error(wallResult.message);
  const declared=declareRoundKan(current.roundState,{type:'minkan',seat,meld:applied.meld});
  current.roundState=resolveRoundKan(declared,{
    rinshanTile:wallResult.rinshan,
    doraIndicator:wallResult.doraIndicator
  });
  const removed=takeCopies(player.hand,applied.tileCode,3);
  const melds=applied.openMelds.map(cloneMeld);
  const calledTile=pendingDiscardTile(current,pending);
  player.hand=removed.hand;
  player.melds=setMeldRedDora(melds,melds.length-1,redDoraCount(removed.removed)+(calledTile?.red===true?1:0));
  markClaimedDiscard(current.players,pending);
  player.hand.push(cloneTile(wallResult.rinshan));
  current.currentSeat=seat;
  current.phase=HAND_PHASES.DISCARD;
  current.pendingDiscard=null;
  current.doraIndicators.push(cloneTile(wallResult.doraIndicator));
  current.drawnTileId=wallResult.rinshan.id;
  current.lastAction={
    type:'kan',
    kanType:'minkan',
    seat,
    from:relativeKanSource(seat,pending.seat),
    tileCode:applied.tileCode,
    discardTileId:pending.tileId,
    rinshanTileId:wallResult.rinshan.id,
    doraIndicatorId:wallResult.doraIndicator.id
  };
  return current;
}

export function checkCall(state,{type,seat=state?.currentSeat,callTiles}={}){
  assertFlow(state);
  if(state.phase!==HAND_PHASES.RESPONSE)throw new Error('chi or pon can only be checked during a discard response');
  assertSeat(seat);
  if(!CALL_TYPES.includes(type))throw new RangeError('unknown call type');
  const pending=state.pendingDiscard;
  if(seat===pending.seat)throw new Error('the discarder cannot call on their own discard');
  const player=state.players[seat];
  if(player.riichi)throw new Error('リーチ後はチー・ポンできません。');
  const applied=applyCall({
    type,
    concealedTiles:player.hand.map(codeOf),
    openMelds:player.melds,
    discardTile:pending.code,
    from:relativeCallSource(seat,pending.seat),
    ownTurn:false,
    callTiles
  });
  return applied;
}

export function declareCall(state,{type,seat=state?.currentSeat,callTiles}={}){
  const current=cloneFlow(state);
  const applied=checkCall(current,{type,seat,callTiles});
  if(!applied.ok)throw new Error(applied.message);
  const pending=current.pendingDiscard;
  const player=current.players[seat];
  const removeCodes=[...applied.callTiles];
  removeCodes.splice(removeCodes.indexOf(applied.tileCode),1);
  const removed=takePhysicalCodes(player.hand,removeCodes);
  const melds=applied.openMelds.map(cloneMeld);
  const calledTile=pendingDiscardTile(current,pending);
  player.hand=removed.hand;
  player.melds=setMeldRedDora(melds,melds.length-1,redDoraCount(removed.removed)+(calledTile?.red===true?1:0));
  markClaimedDiscard(current.players,pending);
  current.currentSeat=seat;
  current.phase=HAND_PHASES.DISCARD;
  current.pendingDiscard=null;
  current.drawnTileId=null;
  current.lastAction={
    type:'call',
    callType:type,
    seat,
    from:applied.from,
    tileCode:applied.tileCode,
    callTiles:[...applied.callTiles],
    discardTileId:pending.tileId
  };
  return current;
}

export function declareChi(state,options={}){
  return declareCall(state,{...options,type:'chi'});
}

export function declarePon(state,options={}){
  return declareCall(state,{...options,type:'pon'});
}

/**
 * Resolve every response to a discard for computer-controlled seats.
 *
 * Ron has priority over an open kan or pon, which has priority over chi. If
 * there is no call, all response seats are passed atomically. `passedSeats`
 * is used when the human player has already passed in the same response
 * window; those seats are not considered for another action, but their
 * furiten state is still recorded.
 */
export function advanceAutomaticResponse(state,{seats,passedSeats=[]}={}){
  assertFlow(state);
  if(state.phase!==HAND_PHASES.RESPONSE)throw new Error('the hand is not waiting for a discard response');
  const pending=state.pendingDiscard;
  const allResponseSeats=normalizeResponseSeats(pending);
  const alreadyPassed=normalizeResponseSeats(pending,passedSeats);
  const automaticSeats=(seats===undefined?allResponseSeats.filter(seat=>!alreadyPassed.includes(seat)):normalizeResponseSeats(pending,seats));
  if(automaticSeats.some(seat=>alreadyPassed.includes(seat)))throw new Error('a seat cannot be both automatic and passed');
  const covered=new Set([...automaticSeats,...alreadyPassed]);
  const uncovered=allResponseSeats.filter(seat=>!covered.has(seat));
  if(uncovered.length)throw new Error('automatic response must cover every remaining response seat');

  const ronSeats=automaticSeats.filter(seat=>checkRon(state,{seat}).ok);
  if(ronSeats.length){
    const resolved=claimRonClaims(state,{seats:ronSeats});
    return {...resolved,lastAction:{...resolved.lastAction,automatic:true,automaticSeats:[...automaticSeats]}};
  }

  const priority=automaticSeats.length
    ?resolveHeadBump({discarderSeat:pending.seat,claimantSeats:automaticSeats}).priority.filter(seat=>automaticSeats.includes(seat))
    :[];
  let selected=null;
  for(const seat of priority){
    const minkan=checkKan(state,{type:'minkan',seat});
    if(minkan.ok){selected={type:'minkan',seat};break}
    const pon=checkCall(state,{type:'pon',seat});
    if(pon.ok){selected={type:'pon',seat};break}
  }
  if(!selected){
    for(const seat of priority){
      const chi=checkCall(state,{type:'chi',seat});
      const callTiles=chi.ok?chi.callTiles:chi.callOptions?.[0];
      if(callTiles){selected={type:'chi',seat,callTiles:[...callTiles]};break}
    }
  }

  let working=state;
  if(alreadyPassed.length){
    working=cloneFlow(state);
    markPassedRonFlags(working,state,alreadyPassed);
  }
  if(selected){
    const resolved=selected.type==='minkan'
      ?declareMinkan(working,{seat:selected.seat})
      :declareCall(working,{type:selected.type,seat:selected.seat,callTiles:selected.callTiles});
    return {...resolved,lastAction:{...resolved.lastAction,automatic:true,automaticSeats:[...automaticSeats]}};
  }

  const resolved=passDiscard(state,{seats:allResponseSeats});
  return {...resolved,lastAction:{...resolved.lastAction,automatic:true,automaticSeats:[...automaticSeats]}};
}

export function declareKan(state,{type,seat=state?.currentSeat}={}){
  if(type==='minkan')return declareMinkan(state,{seat});
  const current=cloneFlow(state);
  const applied=checkKan(current,{type,seat});
  if(!applied.ok)throw new Error(applied.message);
  const player=current.players[seat];
  const wall=current.roundWall;
  const wallResult=resolveWallKan(wall);
  if(!wallResult.ok)throw new Error(wallResult.message);
  const declared=declareRoundKan(current.roundState,{type,seat,meld:applied.meld});
  current.roundState=resolveRoundKan(declared,{
    rinshanTile:wallResult.rinshan,
    doraIndicator:wallResult.doraIndicator
  });
  const removeCount=type==='kakan'?1:4;
  const removed=takeCopies(player.hand,applied.tileCode,removeCount);
  const melds=applied.openMelds.map(cloneMeld);
  const previousRedDora=type==='kakan'?redDoraFromMeld(player.melds[applied.meldIndex]):0;
  player.hand=removed.hand;
  player.melds=setMeldRedDora(melds,type==='kakan'?applied.meldIndex:melds.length-1,previousRedDora+redDoraCount(removed.removed));
  player.hand.push(cloneTile(wallResult.rinshan));
  current.doraIndicators.push(cloneTile(wallResult.doraIndicator));
  current.phase=HAND_PHASES.DISCARD;
  current.drawnTileId=wallResult.rinshan.id;
  current.lastAction={type:'kan',kanType:type,seat,tileCode:applied.tileCode,rinshanTileId:wallResult.rinshan.id,doraIndicatorId:wallResult.doraIndicator.id};
  return current;
}

export function completeHand(state,outcome){
  const current=cloneFlow(state);
  if(current.phase===HAND_PHASES.COMPLETED)throw new Error('the hand is already completed');
  current.roundState=completeRoundHand(current.roundState,outcome);
  current.phase=HAND_PHASES.COMPLETED;
  current.pendingDiscard=null;
  current.drawnTileId=null;
  current.result={type:outcome?.outcome||null};
  current.lastAction={type:'complete',outcome:outcome?.outcome||null};
  return current;
}

export function startNextHand(state,options={}){
  const current=cloneFlow(state);
  if(current.phase!==HAND_PHASES.COMPLETED)throw new Error('complete the hand before starting the next hand');
  if(current.roundState.phase!=='playing')throw new Error('the match is already finished');
  return createHandFlow({
    ...options,
    roundState:current.roundState,
    userSeat:current.userSeat
  });
}
