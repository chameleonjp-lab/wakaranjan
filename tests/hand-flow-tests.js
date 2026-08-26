import assert from 'node:assert/strict';
import {completeHand,createHandFlow,declareKan,discardTile,drawForTurn,HAND_PHASES,startNextHand} from '../src/lib/hand-flow.js';

const wallOptions={random:()=>0.5};
const initial=createHandFlow({wallOptions});
assert.equal(initial.phase,HAND_PHASES.DISCARD,'the dealer starts in the discard phase');
assert.equal(initial.currentSeat,'east','the dealer starts the hand');
assert.equal(initial.players.east.hand.length,14,'the dealer receives fourteen tiles');
assert.equal(initial.players.south.hand.length,13,'a child receives thirteen tiles');
assert.equal(initial.players.west.hand.length,13,'the third player receives thirteen tiles');
assert.equal(initial.players.north.hand.length,13,'the fourth player receives thirteen tiles');
assert.equal(initial.roundWall.live.length,69,'dealing removes fifty-three tiles from the live wall');
assert.equal(initial.roundWall.doraIndex,1,'one initial dora indicator is revealed');
assert.equal(initial.doraIndicators.length,1,'the exposed dora is kept in hand state');
assert.equal(initial.drawnTileId,initial.players.east.hand.at(-1).id,'the dealer draw is tracked for the first discard');

const dealerDiscard=discardTile(initial,{seat:'east',tileId:initial.drawnTileId});
assert.equal(dealerDiscard.phase,HAND_PHASES.DRAW,'discarding moves to the next draw phase');
assert.equal(dealerDiscard.currentSeat,'south','the turn moves clockwise');
assert.equal(dealerDiscard.players.east.hand.length,13,'the dealer returns to thirteen tiles after discarding');
assert.equal(dealerDiscard.players.east.river.length,1,'the discard enters the dealer river');
assert.equal(initial.players.east.hand.length,14,'the previous state remains unchanged');

const southDraw=drawForTurn(dealerDiscard);
assert.equal(southDraw.phase,HAND_PHASES.DISCARD,'a live draw opens the discard phase');
assert.equal(southDraw.currentSeat,'south','the same player discards after drawing');
assert.equal(southDraw.players.south.hand.length,14,'the drawing player receives one tile');
assert.equal(southDraw.drawnTileId,southDraw.lastAction.tileId,'the drawn tile is tracked');

const southDiscard=discardTile(southDraw,{seat:'south',tileId:southDraw.drawnTileId});
assert.equal(southDiscard.currentSeat,'west','the next player follows the discard');
assert.equal(southDiscard.turnNumber,2,'a completed turn increments the turn number');

assert.throws(()=>drawForTurn(initial),/not waiting for a draw/,'a draw cannot happen during the discard phase');
assert.throws(()=>discardTile(southDraw,{seat:'east',tileId:southDraw.players.east.hand[0].id}),/not the current seat/,'a non-current player cannot discard');

const fixtureHands={
  east:['1m','1m','1m','1m','2m','3m','4m','5m','6m','7m','8m','9m','1p','2p'],
  south:['3p','4p','5p','6p','9p','1s','2s','3s','4s','5s','6s','7s','8s'],
  west:['7s','8s','9s','1z','2z','3z','4z','5z','6z','7z','2m','3m','4m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};
const kanStart=createHandFlow({wallOptions,initialHands:fixtureHands});
const kanState=declareKan(kanStart,{type:'ankan',seat:'east'});
assert.equal(kanState.roundState.kanCount,1,'an integrated kan increments the round kan count');
assert.equal(kanState.roundState.pendingKan,null,'an atomic kan flow does not leave a pending resolution');
assert.equal(kanState.roundState.lastKan.type,'ankan','the resolved kan type is recorded');
assert.equal(kanState.roundWall.rinshanIndex,1,'a kan consumes one rinshan tile');
assert.equal(kanState.roundWall.doraIndex,2,'a kan reveals one additional dora indicator');
assert.equal(kanState.doraIndicators.length,2,'the additional dora is retained in hand state');
assert.equal(kanState.players.east.hand.length,11,'the rinshan tile returns to the concealed hand');
assert.equal(kanState.players.east.melds.length,1,'the kan becomes a meld');
assert.equal(kanState.lastAction.type,'kan','the hand action records the kan');
assert.equal(kanStart.roundWall.rinshanIndex,0,'the previous wall remains unchanged');
assert.throws(()=>declareKan(kanState,{type:'minkan',seat:'east'}),/response window/,'an open kan waits for a discard-response state');

const completed=completeHand(kanState,{outcome:'win',winnerSeat:'south'});
assert.equal(completed.phase,HAND_PHASES.COMPLETED,'the hand can be completed after the kan resolves');
assert.equal(completed.roundState.completedRound.kanCount,1,'the completed round keeps its kan count');
const nextHand=startNextHand(completed,{wallOptions});
assert.equal(nextHand.currentSeat,'south','the next hand uses the rotated dealer');
assert.equal(nextHand.players.south.hand.length,14,'the next dealer receives fourteen tiles');
assert.equal(nextHand.players.east.hand.length,13,'the next non-dealer receives thirteen tiles');

console.log('✓ integrated hand, wall, turn and kan flow contracts validated.');
