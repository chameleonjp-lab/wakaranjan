import assert from 'node:assert/strict';
import {EAST_ROUNDS} from '../src/practice/east-round.js';
import {settleHand} from '../src/lib/round-context.js';

assert.equal(EAST_ROUNDS.length,4);
for(const round of EAST_ROUNDS){
  if(!round.evaluation)continue;
  assert.deepEqual(round.hand,round.evaluation.concealedTiles,`${round.label}: 表示手牌と計算手牌が一致していません`);
  const result=settleHand({...round.evaluation,winnerSeat:'south',dealerSeat:round.dealerSeat});
  assert.equal(result.ok,true,`${round.label}: 表示中の牌姿を共通計算できません: ${result.error||''}`);
}
assert.equal(EAST_ROUNDS[1].dealerSeat,'south');
assert.match(EAST_ROUNDS[1].yourRole,/東家/);
console.log('east round tests passed: displayed hands, seats and score calculations are linked.');
