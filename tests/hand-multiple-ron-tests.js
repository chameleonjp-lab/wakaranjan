import assert from 'node:assert/strict';
import {checkRonClaims,claimRonClaims,createHandFlow,discardTile,HAND_PHASES} from '../src/lib/hand-flow.js';

const wallOptions={random:()=>0.5};
const multipleRonHands={
  east:['1m','1m','1m','1m','2m','3m','4m','6m','7m','8m','9m','1p','5m','5m'],
  south:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m'],
  west:['2m','3m','4m','2p','3p','4p','4s','5s','6s','1z','1z','4m','6m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};

const start=createHandFlow({wallOptions,initialHands:multipleRonHands});
const response=discardTile(start,{seat:'east',tileId:start.drawnTileId});
assert.equal(response.phase,HAND_PHASES.RESPONSE,'the discard opens a response window');
assert.equal(response.pendingDiscard.code,'5m','the fixture exposes the shared winning discard');

const claimOptions={optionsBySeat:{south:{riichi:true},west:{riichi:true}}};
const checked=checkRonClaims(response,claimOptions);
assert.equal(checked.ok,true,'at least one valid ron claim exists');
assert.deepEqual(checked.claimantSeats,['south','west'],'both eligible claimants are accepted');
assert.equal(checked.winnerSeat,'south','head-bump selects the first seat after the discarder');
assert.deepEqual(checked.blockedSeats,['west'],'the later claimant is blocked');
assert.deepEqual(checked.priority,['south','west','north'],'head-bump priority starts after the discarder');
assert.equal(checked.claims.find(claim=>claim.seat==='south').ok,true,'south has a valid ron');
assert.equal(checked.claims.find(claim=>claim.seat==='west').ok,true,'west has a valid ron');
assert.equal(response.phase,HAND_PHASES.RESPONSE,'checking claims does not mutate the physical state');

const completed=claimRonClaims(response,claimOptions);
assert.equal(completed.phase,HAND_PHASES.COMPLETED,'the selected ron completes the physical hand');
assert.equal(completed.result.winnerSeat,'south','the selected head-bump winner is settled');
assert.equal(completed.result.discarderSeat,'east','the discarder is retained');
assert.deepEqual(completed.result.ronClaimants,['south','west'],'all valid ron claimants are retained');
assert.deepEqual(completed.result.blockedRonClaimants,['west'],'the blocked claimant is retained');
assert.deepEqual(completed.result.headBump,{winner:'south',priority:['south','west','north'],blocked:['west']},'the head-bump decision is retained');
assert.equal(completed.result.ronClaims.find(claim=>claim.seat==='west').ok,true,'the blocked claim remains auditable');
assert.equal(completed.roundState.lastWinnerSeat,'south','only the head-bump winner is sent to round settlement');
assert.equal(completed.roundState.scores.south>25000,true,'the selected winner receives the payment');
assert.equal(completed.roundState.scores.west,25000,'the blocked claimant does not receive a second settlement');
assert.equal(response.players.east.river.at(-1).claimed,undefined,'ron does not mark the discard as a called meld');
assert.equal(response.roundState.lastOutcome,null,'the response state remains unchanged');

assert.throws(
  ()=>checkRonClaims(response,{seats:['east']}),
  /discarder cannot declare ron/,
  'the discarder cannot be included as a ron claimant'
);

console.log('✓ multiple ron evaluation, head-bump settlement and immutable response contracts validated.');
