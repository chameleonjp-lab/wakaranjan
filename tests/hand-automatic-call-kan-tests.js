import assert from 'node:assert/strict';
import {advanceAutomaticResponse,checkCall,checkKan,createHandFlow,declareKan,declareRiichi,discardTile,drawForTurn,HAND_PHASES,passDiscard} from '../src/lib/hand-flow.js';

const chiWallOptions={random:()=>0.5};
const multipleChiHands={
  east:['1m','1m','1m','2m','3m','4m','6m','7m','8m','1p','2p','3p','4p','5m'],
  south:['3m','4m','6m','7m','2p','3p','4p','5p','6p','2s','3s','4s','6s'],
  west:['1m','7m','8m','9m','1p','2p','5s','6s','7s','1z','2z','3z','4z'],
  north:['2m','3m','4m','9m','7p','1p','9p','1s','2s','3s','5z','6z','7z']
};

const chiStart=createHandFlow({wallOptions:chiWallOptions,initialHands:multipleChiHands});
const chiResponse=discardTile(chiStart,{seat:'east',tileId:chiStart.drawnTileId});
const multipleChiCheck=checkCall(chiResponse,{type:'chi',seat:'south'});
assert.equal(multipleChiCheck.ok,false,'an ambiguous chi requires an explicit sequence');
assert.equal(multipleChiCheck.code,'invalid-chi-shape','the ambiguous chi reports a selectable-shape error');
assert.deepEqual(multipleChiCheck.callOptions,[['3m','4m','5m'],['4m','5m','6m'],['5m','6m','7m']],'every chi sequence is exposed for selection');

const automaticChi=advanceAutomaticResponse(chiResponse,{seats:['south','west','north']});
assert.equal(automaticChi.phase,HAND_PHASES.DISCARD,'an automatic chi returns the caller to discard phase');
assert.equal(automaticChi.currentSeat,'south','the automatic chi caller becomes the current seat');
assert.equal(automaticChi.lastAction.automatic,true,'automatic actions are recorded');
assert.deepEqual(automaticChi.players.south.melds[0].tiles,['3m','4m','5m'],'the automatic chi chooses the first deterministic option');
const afterAutomaticChiDiscard=discardTile(automaticChi,{seat:'south',tileId:automaticChi.players.south.hand[0].id});
assert.equal(afterAutomaticChiDiscard.phase,HAND_PHASES.RESPONSE,'the automatic caller can continue with a discard');

const minkanHands={
  east:['1m','1m','1m','1m','2m','3m','4m','6m','7m','8m','9m','1p','2p','5m'],
  south:['5m','5m','5m','3p','4p','5p','6p','1s','2s','3s','4s','5s','6s'],
  west:['7s','8s','9s','1z','2z','3z','4z','5z','6z','7z','2m','3m','4m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};
const minkanStart=createHandFlow({wallOptions:chiWallOptions,initialHands:minkanHands});
const minkanResponse=discardTile(minkanStart,{seat:'east',tileId:minkanStart.drawnTileId});
const automaticMinkan=advanceAutomaticResponse(minkanResponse,{seats:['south','west','north']});
assert.equal(automaticMinkan.lastAction.kanType,'minkan','a matching open kan is selected before a lower-priority call');
assert.equal(automaticMinkan.lastAction.automatic,true,'automatic kan actions are recorded');
assert.equal(automaticMinkan.currentSeat,'south','the automatic kan caller receives the discard turn');

function moveLiveCode(state,code,toFront){
  const tile=state.roundWall.live.find(candidate=>candidate.code===code);
  assert.ok(tile,'the fixture must retain the requested live tile');
  const rest=state.roundWall.live.filter(candidate=>candidate!==tile);
  return {...state,roundWall:{...state.roundWall,live:toFront?[tile,...rest]:[...rest,tile]}};
}

function reachEastDrawAfterRiichi(state,code){
  let current=passDiscard(state);
  for(const seat of ['south','west','north']){
    current=moveLiveCode(current,code,false);
    current=drawForTurn(current);
    current=discardTile(current,{seat,tileId:current.drawnTileId});
    current=passDiscard(current);
  }
  current=moveLiveCode(current,code,true);
  return drawForTurn(current);
}

const unchangedRiichiHands={
  east:['1m','1m','1m','2m','3m','4m','5m','6m','7m','7m','8m','9m','5p','1z'],
  south:['3p','4p','5p','6p','9p','1s','2s','3s','4s','5s','6s','7s','8s'],
  west:['7s','8s','9s','1z','2z','3z','4z','5z','6z','7z','2m','3m','4m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};
const unchangedStart=createHandFlow({wallOptions:{random:()=>0.5},initialHands:unchangedRiichiHands});
const unchangedRiichi=declareRiichi(unchangedStart,{seat:'east',tileId:unchangedStart.drawnTileId});
const unchangedDraw=reachEastDrawAfterRiichi(unchangedRiichi,'1m');
const unchangedCheck=checkKan(unchangedDraw,{type:'ankan',seat:'east'});
assert.equal(unchangedCheck.ok,true,'riichi permits an ankan when the wait is unchanged');
assert.deepEqual(unchangedCheck.postKanWaits,unchangedRiichi.players.east.riichiWaits,'the ankan check compares the saved riichi waits');
const unchangedKan=declareKan(unchangedDraw,{type:'ankan',seat:'east'});
assert.equal(unchangedKan.players.east.melds[0].type,'ankan','the unchanged-wait ankan is applied');

const changedRiichiHands={
  east:['9p','9p','9p','3p','3p','3p','3z','3z','7p','5m','3m','8p','4m','1z'],
  south:['1s','2s','3s','4s','5s','6s','7s','8s','9s','1z','2z','4z','5z'],
  west:['1m','2m','3m','4m','5m','6m','7m','8m','9m','2z','6z','7z','1p'],
  north:['2p','4p','5p','6p','7p','8p','1p','2s','3s','4s','5s','6s','7s']
};
const changedStart=createHandFlow({wallOptions:{random:()=>0.4},initialHands:changedRiichiHands});
const changedRiichi=declareRiichi(changedStart,{seat:'east',tileId:changedStart.drawnTileId});
const changedDraw=reachEastDrawAfterRiichi(changedRiichi,'9p');
const changedCheck=checkKan(changedDraw,{type:'ankan',seat:'east'});
assert.equal(changedCheck.ok,false,'riichi rejects an ankan that changes the wait');
assert.equal(changedCheck.code,'riichi-kan-changes-wait','the rejection reason identifies the changed wait');
assert.deepEqual(changedCheck.riichiWaits,['6p','9p','3z'],'the original riichi waits remain auditable');
assert.deepEqual(changedCheck.postKanWaits,['6p'],'the changed post-kan waits are returned');
assert.throws(()=>declareKan(changedDraw,{type:'ankan',seat:'east'}),/待ち牌が変わる/,'the rejected ankan cannot mutate the hand');

console.log('✓ automatic call priority, explicit chi selection and riichi ankan wait checks validated.');
