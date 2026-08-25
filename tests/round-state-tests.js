import assert from 'node:assert/strict';
import {completeHand,createMatchState,declareRiichi,roundLabel,SEATS,SEAT_LABEL_MAP} from '../src/lib/round-state.js';

const initial=createMatchState();
assert.equal(roundLabel(initial),'東1局','a new match starts at East 1');
assert.deepEqual(SEATS,['east','south','west','north'],'seat order is clockwise');
assert.equal(SEAT_LABEL_MAP.south,'南家','seat labels are available to the UI');

const riichi=declareRiichi(initial,'east');
assert.equal(riichi.scores.east,24000,'riichi declaration pays 1000 points');
assert.equal(riichi.riichiSticks,1,'riichi declaration adds one stick');
assert.equal(initial.scores.east,25000,'state transitions do not mutate the previous state');

const eastTwo=completeHand(initial,{
  outcome:'win',
  winnerSeat:'south',
  scoreDeltas:{south:1500,east:-1500}
});
assert.equal(roundLabel(eastTwo),'東2局','a non-dealer win advances the hand');
assert.equal(eastTwo.dealerSeat,'south','the next dealer moves clockwise');
assert.equal(eastTwo.honba,0,'a non-dealer win resets honba');

const dealerWin=completeHand(eastTwo,{
  outcome:'win',
  winnerSeat:'south',
  scoreDeltas:{south:1500,east:-500,west:-500,north:-500}
});
assert.equal(roundLabel(dealerWin),'東2局1本場','a dealer win keeps the same hand and adds honba');
assert.equal(dealerWin.dealerSeat,'south','the dealer remains after a dealer win');
assert.equal(dealerWin.continued,true,'dealer win is marked as continuation');

const dealerTenpaiDraw=completeHand(dealerWin,{
  outcome:'draw',
  dealerTenpai:true
});
assert.equal(roundLabel(dealerTenpaiDraw),'東2局2本場','dealer tenpai on draw adds another honba');
assert.equal(dealerTenpaiDraw.dealerSeat,'south','dealer tenpai keeps the dealer');

const westWin=completeHand(dealerTenpaiDraw,{
  outcome:'win',
  winnerSeat:'west'
});
assert.equal(roundLabel(westWin),'東3局','non-dealer win resets honba before advancing');
assert.equal(westWin.dealerSeat,'west','dealer rotates after the win');

const nonTenpaiDraw=completeHand(westWin,{
  outcome:'draw',
  dealerTenpai:false
});
assert.equal(roundLabel(nonTenpaiDraw),'東4局1本場','a draw carries its honba into the next hand');
assert.equal(nonTenpaiDraw.dealerSeat,'north','dealer rotates after a non-tenpai draw');

const finished=completeHand(nonTenpaiDraw,{
  outcome:'win',
  winnerSeat:'south'
});
assert.equal(finished.phase,'finished','East-only match ends after the last non-dealer win');
assert.equal(finished.completedRound.handNumber,4,'the completed final hand is retained');
assert.equal(finished.honba,0,'honba resets after the final win');

const hanchanEast4=createMatchState({matchType:'hanchan',roundWind:'east',handNumber:4,dealerSeat:'north'});
const southOne=completeHand(hanchanEast4,{outcome:'win',winnerSeat:'east'});
assert.equal(southOne.phase,'playing','a hanchan continues into the South round');
assert.equal(roundLabel(southOne),'南1局','East 4 advances to South 1');
assert.equal(southOne.dealerSeat,'east','dealer rotation continues into South');

const stickWinner=completeHand(riichi,{outcome:'win',winnerSeat:'south'});
assert.equal(stickWinner.riichiSticks,0,'winner collects riichi sticks');
assert.equal(stickWinner.scores.south,26000,'collected riichi stick is added to the winner');

assert.throws(()=>declareRiichi(createMatchState({scores:{east:500}}),'east'),/at least 1000/,'short scores cannot declare riichi');
assert.throws(()=>completeHand(initial,{outcome:'draw',winnerSeat:'east'}),/cannot have a winner/,'draw cannot have a winner');
assert.throws(()=>completeHand(initial,{outcome:'win',winnerSeat:'east',scoreDeltas:{unknown:1000}}),/unknown seat/,'unknown score seats are rejected');

console.log('✓ round progression, renchan, honba and riichi-sticks contracts validated.');
