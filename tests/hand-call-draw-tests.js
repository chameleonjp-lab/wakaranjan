import assert from 'node:assert/strict';
import {checkExhaustiveDraw,completeExhaustiveDraw,createHandFlow,declareKan,discardTile,drawForTurn,HAND_PHASES,passDiscard} from '../src/lib/hand-flow.js';

const wallOptions={random:()=>0.5};
const commonHands={
  west:['7s','8s','9s','1z','2z','3z','4z','5z','6z','7z','2m','3m','4m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};

const minkanHands={
  east:['1m','1m','1m','1m','2m','3m','4m','6m','7m','8m','9m','1p','2p','5m'],
  south:['5m','5m','5m','3p','4p','5p','6p','1s','2s','3s','4s','5s','6s'],
  ...commonHands
};
const minkanStart=createHandFlow({wallOptions,initialHands:minkanHands});
const discardResponse=discardTile(minkanStart,{seat:'east',tileId:minkanStart.drawnTileId});
const minkan=declareKan(discardResponse,{type:'minkan',seat:'south'});
assert.equal(minkan.phase,HAND_PHASES.DISCARD,'a minkan returns the caller to discard phase');
assert.equal(minkan.currentSeat,'south','the caller receives the rinshan turn');
assert.equal(minkan.pendingDiscard,null,'the claimed discard is removed from response state');
assert.equal(minkan.roundState.kanCount,1,'minkan increments the round kan count');
assert.equal(minkan.roundState.lastKan.type,'minkan','the minkan type is retained');
assert.equal(minkan.players.south.melds[0].type,'minkan','the open kan becomes a meld');
assert.equal(minkan.players.south.melds[0].redDora,1,'a red discarded tile remains a red dora in the called kan');
assert.equal(minkan.players.south.hand.length,11,'three concealed copies leave and one rinshan tile enters');
assert.equal(minkan.roundWall.rinshanIndex,1,'minkan consumes one rinshan tile');
assert.equal(minkan.roundWall.doraIndex,2,'minkan reveals one additional dora');
assert.equal(minkan.players.east.river.at(-1).claimed,true,'the called discard is marked in the river');
assert.equal(discardResponse.roundWall.rinshanIndex,0,'the previous response state remains unchanged');

const tenpaiHands={
  east:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','1z'],
  south:['3p','4p','5p','6p','9p','1s','2s','3s','4s','5s','6s','7s','8s'],
  ...commonHands
};
const tenpaiStart=createHandFlow({wallOptions,initialHands:tenpaiHands});
const tenpaiDrawState=passDiscard(discardTile(tenpaiStart,{seat:'east',tileId:tenpaiStart.drawnTileId}));
const awaiting=drawForTurn({...tenpaiDrawState,roundWall:{...tenpaiDrawState.roundWall,live:[]}});
assert.equal(awaiting.phase,HAND_PHASES.AWAITING_RESULT,'an empty live wall opens the draw result state');
const status=checkExhaustiveDraw(awaiting);
assert.equal(status.ok,true,'exhaustive draw status can be checked');
assert.equal(status.tenpaiBySeat.east.tenpai,true,'the dealer tenpai is detected');
assert.ok(status.tenpaiBySeat.east.waits.includes('5m'),'the dealer wait is retained');
assert.ok(status.tenpaiSeats.includes('east'),'the dealer appears in tenpai seats');

const completed=completeExhaustiveDraw(awaiting);
assert.equal(completed.result.type,'draw','the draw result is retained');
assert.equal(completed.result.dealerTenpai,true,'dealer continuation is derived from the hand');
assert.equal(completed.result.tenpaiBySeat.east.tenpai,true,'per-seat tenpai is retained');
assert.equal(completed.roundState.continued,true,'dealer tenpai continues the round');

console.log('✓ minkan response, rinshan/dora resolution and automatic exhaustive-draw tenpai contracts validated.');
