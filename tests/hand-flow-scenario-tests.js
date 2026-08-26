import assert from 'node:assert/strict';
import {advanceAutomaticResponse,declareRiichi,discardTile,drawForTurn,HAND_PHASES} from '../src/lib/hand-flow.js';
import {createHandFlowScenario,HAND_FLOW_SCENARIOS,isHandFlowScenarioPhase} from '../src/practice/hand-flow-scenarios.js';

const wallOptions={random:()=>0.5};

const originalRandom=Math.random;
let randomStartA;
let randomStartB;
try{
  Math.random=()=>0;
  randomStartA=createHandFlowScenario('random');
  Math.random=()=>0.99;
  randomStartB=createHandFlowScenario('random');
}finally{
  Math.random=originalRandom;
}
assert.notDeepEqual(randomStartA.players.east.hand.map(tile=>tile.id),randomStartB.players.east.hand.map(tile=>tile.id),'the normal scenario keeps random wall behavior');
assert.equal(HAND_FLOW_SCENARIOS.random.deterministicWall,false,'only fixed scenarios opt into a deterministic wall');

const callStart=createHandFlowScenario('call',{wallOptions});
assert.equal(callStart.players.east.hand.at(-1).code,'5m','the call scenario gives the dealer a 5m as the drawn tile');
const callResponse=discardTile(callStart,{seat:'east',tileId:callStart.drawnTileId});
const called=advanceAutomaticResponse(callResponse,{seats:['south','west','north']});
assert.equal(called.lastAction.type,'kan','the call scenario reaches an automatic open kan');
assert.equal(called.lastAction.kanType,'minkan','the call scenario uses a minkan response');
assert.equal(called.lastAction.automatic,true,'the automatic call is marked for the practice log');
assert.equal(called.currentSeat,'south','the automatic caller receives the next discard');
assert.ok(called.drawnTileId,'an automatic minkan caller receives a rinshan tile');

const riichiStart=createHandFlowScenario('riichi',{wallOptions});
const riichi=declareRiichi(riichiStart,{seat:'east',tileId:riichiStart.drawnTileId});
assert.deepEqual(riichi.players.east.riichiWaits,['2m','5m'],'the riichi scenario has a deterministic wait including 5m');

function advanceOtherSeat(state){
  let next=state;
  if(next.phase===HAND_PHASES.RESPONSE){
    const pending=next.pendingDiscard;
    const seats=['east','south','west','north'].filter(seat=>seat!==next.userSeat&&seat!==pending?.seat);
    next=advanceAutomaticResponse(next,{seats,passedSeats:pending?.seat===next.userSeat?[]:[next.userSeat]});
  }
  if(next.phase===HAND_PHASES.DRAW)next=drawForTurn(next);
  if(next.phase===HAND_PHASES.DISCARD&&next.currentSeat!==next.userSeat){
    const player=next.players[next.currentSeat];
    const tile=next.drawnTileId?player.hand.find(candidate=>candidate.id===next.drawnTileId):player.hand[0];
    next=discardTile(next,{seat:next.currentSeat,tileId:tile.id});
  }
  return next;
}

let riichiDraw=riichi;
for(let count=0;count<4;count+=1)riichiDraw=advanceOtherSeat(riichiDraw);
assert.equal(riichiDraw.phase,HAND_PHASES.DISCARD,'the riichi scenario returns to the dealer discard phase');
assert.equal(riichiDraw.currentSeat,'east','the dealer receives the scripted post-riichi turn');
assert.equal(riichiDraw.drawnTileId&&riichiDraw.players.east.hand.find(tile=>tile.id===riichiDraw.drawnTileId).code,'5m','the scripted winning draw is 5m');

const drawStart=createHandFlowScenario('draw',{wallOptions});
assert.equal(drawStart.roundWall.live.length,0,'the draw scenario empties only the live wall');
assert.equal(drawStart.phase,HAND_PHASES.DRAW,'the draw scenario waits at the next draw');
assert.equal(isHandFlowScenarioPhase(drawStart,'DRAW'),true,'scenario phase helper exposes the draw phase');
const awaiting=drawForTurn(drawStart);
assert.equal(awaiting.phase,HAND_PHASES.AWAITING_RESULT,'an empty live wall opens the exhaustive-draw result state');
assert.deepEqual(Object.keys(HAND_FLOW_SCENARIOS),['random','call','riichi','draw'],'the practice exposes the planned scenarios');

console.log('✓ deterministic hand-flow practice scenarios validate call, riichi and exhaustive-draw paths.');
