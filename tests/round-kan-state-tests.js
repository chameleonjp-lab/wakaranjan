import assert from 'node:assert/strict';
import {completeHand,createMatchState,declareKan,resolveKan,roundLabel} from '../src/lib/round-state.js';

const initial=createMatchState();
const meld={type:'ankan',tiles:['7p','7p','7p','7p'],open:false};
const declared=declareKan(initial,{type:'ankan',seat:'east',meld});
assert.equal(initial.kanCount,0,'declaring a kan does not mutate the previous state');
assert.equal(declared.kanCount,1,'declared kan count is recorded');
assert.equal(declared.pendingKan.type,'ankan','the state waits for the matching rinshan resolution');
assert.equal(declared.pendingKan.seat,'east','the declaring seat is recorded');
assert.deepEqual(declared.pendingKan.meld,meld,'the declared meld is retained');

assert.throws(()=>declareKan(declared,{type:'minkan',seat:'south'}),/pending kan/,'a second kan cannot start before the rinshan resolution');
assert.throws(()=>completeHand(declared,{outcome:'win',winnerSeat:'south'}),/pending kan/,'a hand cannot end while a kan is unresolved');

const resolved=resolveKan(declared,{
  rinshanTile:{id:'4s-1',code:'4s',red:false},
  doraIndicator:{id:'5m-1',code:'5m',red:false}
});
assert.equal(resolved.pendingKan,null,'rinshan resolution clears the pending state');
assert.equal(resolved.kanDoraIndicators.length,1,'the additional dora is stored for the hand');
assert.equal(resolved.lastKan.rinshanTile.code,'4s','the rinshan tile is recorded');
assert.equal(resolved.lastKan.doraIndicator.code,'5m','the added dora indicator is recorded');
assert.throws(()=>resolveKan(resolved,{rinshanTile:{code:'4s'},doraIndicator:{code:'5m'}}),/no pending kan/,'a resolved kan cannot resolve twice');

const nextHand=completeHand(resolved,{outcome:'win',winnerSeat:'south'});
assert.equal(roundLabel(nextHand),'東2局','a non-dealer win advances after a kan');
assert.equal(nextHand.kanCount,0,'kan count resets for the next hand');
assert.deepEqual(nextHand.kanDoraIndicators,[],'kan dora resets for the next hand');
assert.equal(nextHand.pendingKan,null,'pending kan resets for the next hand');
assert.equal(nextHand.completedRound.kanCount,1,'the completed hand keeps its kan count');
assert.equal(nextHand.completedRound.kanDoraIndicators[0].code,'5m','the completed hand keeps its added dora');

let fourKanState=createMatchState();
for(let index=0;index<4;index+=1){
  fourKanState=declareKan(fourKanState,{type:'ankan',seat:'east'});
  fourKanState=resolveKan(fourKanState,{
    rinshanTile:{id:'rinshan-'+index,code:'4s',red:false},
    doraIndicator:{id:'dora-'+index,code:'5m',red:false}
  });
}
assert.equal(fourKanState.kanCount,4,'four kans are allowed');
assert.throws(()=>declareKan(fourKanState,{type:'ankan',seat:'east'}),/more than four/,'a fifth kan is rejected');

assert.throws(()=>declareKan(initial,{type:'unknown',seat:'east'}),/unknown kan type/,'unknown kan types are rejected');
assert.throws(()=>resolveKan(declared,{rinshanTile:null,doraIndicator:{code:'5m'}}),/rinshanTile/,'a rinshan tile is required');

console.log('✓ round kan state transitions validated.');
