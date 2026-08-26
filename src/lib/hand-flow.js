import {applyKan,KAN_TYPES} from './kan.js';
import {completeHand as completeRoundHand,createMatchState,declareKan as declareRoundKan,resolveKan as resolveRoundKan,SEATS} from './round-state.js';
import {createRoundWall,drawLiveTile,revealDoraIndicator,resolveKan as resolveWallKan} from './tile-wall.js';

export const HAND_PHASES=Object.freeze({
  DRAW:'draw',
  DISCARD:'discard',
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

function emptyPlayers(){
  return Object.fromEntries(SEATS.map(seat=>[seat,{hand:[],melds:[],river:[]}]));
}

function clonePlayers(players){
  return Object.fromEntries(SEATS.map(seat=>{
    const player=players?.[seat];
    if(!player||!Array.isArray(player.hand)||!Array.isArray(player.melds)||!Array.isArray(player.river))throw new TypeError('player state is invalid');
    return [seat,{
      hand:player.hand.map(cloneTile),
      melds:player.melds.map(cloneMeld),
      river:player.river.map(cloneTile)
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

function assertFlow(state){
  if(!state||!Object.values(HAND_PHASES).includes(state.phase))throw new TypeError('hand flow state is invalid');
  assertSeat(state.currentSeat);
  if(!state.roundState||state.roundState.phase!=='playing')throw new Error('the round is not playable');
  cloneWall(state.roundWall);
  clonePlayers(state.players);
  if(!Array.isArray(state.doraIndicators))throw new TypeError('dora indicators are invalid');
}

function cloneFlow(state){
  assertFlow(state);
  return {
    ...state,
    roundState:cloneRoundState(state.roundState),
    roundWall:cloneWall(state.roundWall),
    players:clonePlayers(state.players),
    doraIndicators:state.doraIndicators.map(cloneTile),
    lastAction:state.lastAction?{...state.lastAction}:null
  };
}

function removeCopies(hand,code,count){
  let remaining=count;
  const next=[];
  for(const tile of hand){
    if(tile.code===code&&remaining>0){
      remaining-=1;
      continue;
    }
    next.push(tile);
  }
  if(remaining!==0)throw new Error('kan tiles are missing from the hand');
  return next;
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
  next.players[next.currentSeat].hand.push(copy);
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
  const index=player.hand.findIndex(tile=>tile.id===tileId);
  if(index<0)throw new Error('tile is not in the current hand');
  const [discarded]=player.hand.splice(index,1);
  player.river.push(cloneTile(discarded));
  next.currentSeat=nextSeat(seat);
  next.phase=HAND_PHASES.DRAW;
  next.turnNumber+=1;
  next.drawnTileId=null;
  next.lastAction={type:'discard',seat,tileId:discarded.id,code:discarded.code};
  return next;
}

export function declareKan(state,{type,seat=state?.currentSeat}={}){
  const current=cloneFlow(state);
  if(current.phase!==HAND_PHASES.DISCARD)throw new Error('a kan can only be declared before the discard');
  assertSeat(seat);
  if(seat!==current.currentSeat)throw new Error('the seat is not the current seat');
  if(!KAN_TYPES.includes(type))throw new RangeError('unknown kan type');
  if(type==='minkan')throw new Error('minkan requires an opponent discard response window');
  const player=current.players[seat];
  const applied=applyKan({
    type,
    concealedTiles:player.hand.map(tile=>tile.code),
    openMelds:player.melds,
    ownTurn:true,
    kanCount:current.roundState.kanCount,
    drawnTile:current.drawnTileId?player.hand.find(tile=>tile.id===current.drawnTileId)?.code||null:null
  });
  if(!applied.ok)throw new Error(applied.message);
  const wall=current.roundWall;
  const wallResult=resolveWallKan(wall);
  if(!wallResult.ok)throw new Error(wallResult.message);
  const declared=declareRoundKan(current.roundState,{type,seat,meld:applied.meld});
  current.roundState=resolveRoundKan(declared,{
    rinshanTile:wallResult.rinshan,
    doraIndicator:wallResult.doraIndicator
  });
  const removeCount=type==='kakan'?1:4;
  player.hand=removeCopies(player.hand,applied.tileCode,removeCount);
  player.melds=applied.openMelds.map(cloneMeld);
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
  current.drawnTileId=null;
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
