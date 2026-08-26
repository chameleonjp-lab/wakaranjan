import assert from 'node:assert/strict';
import {chiOptions} from '../src/lib/call.js';
import {checkCall,checkRon,createHandFlow,declareChi,declarePon,declareRiichi,discardTile,drawForTurn,HAND_PHASES,passDiscard} from '../src/lib/hand-flow.js';

const wallOptions={random:()=>0.5};

const chiHands={
  east:['1m','1m','1m','2m','3m','4m','6m','7m','8m','1p','2p','3p','4p','5m'],
  south:['4m','6m','2p','3p','4p','5p','6p','2s','3s','4s','6s','7s','8s'],
  west:['1m','7m','8m','9m','1p','2p','5s','6s','7s','1z','2z','3z','4z'],
  north:['2m','3m','4m','9m','7p','1p','9p','1s','2s','3s','5z','6z','7z']
};
const chiStart=createHandFlow({wallOptions,initialHands:chiHands});
const chiResponse=discardTile(chiStart,{seat:'east',tileId:chiStart.drawnTileId});
assert.deepEqual(chiOptions('5m',chiResponse.players.south.hand.map(tile=>tile.code)),[['4m','5m','6m']],'the available chi sequence is exposed');
const forbiddenChi=checkCall(chiResponse,{type:'chi',seat:'north',callTiles:['4m','5m','6m']});
assert.equal(forbiddenChi.ok,false,'chi is limited to the discarder source position');
assert.equal(forbiddenChi.code,'chi-source-required','the chi source rule is explicit');
const chi=declareChi(chiResponse,{seat:'south'});
assert.equal(chi.phase,HAND_PHASES.DISCARD,'chi returns the caller to discard phase');
assert.equal(chi.currentSeat,'south','the chi caller becomes the current seat');
assert.equal(chi.drawnTileId,null,'chi does not draw from the wall');
assert.equal(chi.players.south.hand.length,11,'two concealed tiles leave for the chi');
assert.equal(chi.players.south.melds[0].type,'chi','the called sequence becomes a meld');
assert.deepEqual(chi.players.south.melds[0].tiles,['4m','5m','6m'],'the called tile is retained in the meld');
assert.equal(chi.players.south.melds[0].from,'kamicha','the source position is retained');
assert.equal(chi.players.east.river.at(-1).claimed,true,'the called discard is marked in the river');
assert.equal(chiResponse.players.east.river.at(-1).claimed,undefined,'the response state remains unchanged');

const ponHands={
  east:['1m','1m','1m','2m','3m','4m','6m','7m','8m','1s','2s','3s','4p','5p'],
  south:['5p','5p','2m','3m','4m','2p','3p','4p','6s','7s','8s','1z','2z'],
  west:['1m','9m','5m','6m','7m','5s','6s','7s','6p','7p','9p','3z','4z'],
  north:['2m','3m','4m','8m','9m','1p','2p','7s','8s','9s','4s','5s','6s']
};
const ponStart=createHandFlow({wallOptions,initialHands:ponHands});
const ponResponse=discardTile(ponStart,{seat:'east',tileId:ponStart.drawnTileId});
const pon=declarePon(ponResponse,{seat:'south'});
assert.equal(pon.phase,HAND_PHASES.DISCARD,'pon returns the caller to discard phase');
assert.equal(pon.currentSeat,'south','the pon caller becomes the current seat');
assert.equal(pon.players.south.hand.length,11,'two concealed tiles leave for the pon');
assert.equal(pon.players.south.melds[0].type,'pon','the called triplet becomes a meld');
assert.deepEqual(pon.players.south.melds[0].tiles,['5p','5p','5p'],'the pon contains two hand tiles and the discard code');
assert.equal(pon.players.east.river.at(-1).claimed,true,'the pon discard is marked in the river');

const riichiHands={
  east:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','1z'],
  south:['3p','4p','5p','6p','9p','1s','2s','3s','4s','5s','6s','7s','8s'],
  west:['7s','8s','9s','1z','2z','3z','4z','5z','6z','7z','2m','3m','4m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};
const riichiStart=createHandFlow({wallOptions,initialHands:riichiHands});
const riichi=declareRiichi(riichiStart,{seat:'east',tileId:riichiStart.drawnTileId});
assert.equal(riichi.phase,HAND_PHASES.RESPONSE,'riichi declaration includes the declaration discard');
assert.equal(riichi.players.east.riichi,true,'the player remains marked as riichi');
assert.ok(riichi.players.east.riichiWaits.includes('5m'),'the riichi wait is retained');
assert.equal(riichi.roundState.scores.east,24000,'the riichi stick is paid immediately');
assert.equal(riichi.roundState.riichiSticks,1,'the round retains the riichi stick');
assert.throws(()=>discardTile({...riichi,phase:HAND_PHASES.DISCARD,currentSeat:'east',drawnTileId:riichi.players.east.hand[0].id},{seat:'east',tileId:riichi.players.east.hand[1].id}),/リーチ後はツモ切りのみ可能/,'a riichi player cannot choose a later discard');

const furitenHands={
  east:['1m','1m','1m','1m','2m','3m','4m','6m','7m','8m','9m','1p','5m','5m'],
  south:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m'],
  west:['2m','3m','4m','2p','3p','4p','4s','5s','6s','2s','2s','4m','6m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};
const furitenStart=createHandFlow({wallOptions,initialHands:furitenHands});
const furitenResponse=discardTile(furitenStart,{seat:'east',tileId:furitenStart.drawnTileId});
const passed=passDiscard(furitenResponse);
assert.equal(passed.players.south.temporaryFuriten,true,'a passed winning discard gives temporary furiten');
assert.equal(passed.players.west.temporaryFuriten,true,'every passed valid ron is tracked');
const southDraw=drawForTurn(passed);
assert.equal(southDraw.players.south.temporaryFuriten,false,'temporary furiten clears on the player\'s next draw');
assert.equal(southDraw.players.west.temporaryFuriten,true,'another player\'s temporary furiten remains active');
const fiveM=southDraw.players.south.hand.find(tile=>tile.code==='5m');
const nextResponse=discardTile(southDraw,{seat:'south',tileId:fiveM.id});
const blocked=checkRon(nextResponse,{seat:'west'});
assert.equal(blocked.ok,false,'temporary furiten blocks the next ron opportunity');
assert.equal(blocked.furiten.temporary,true,'the temporary furiten reason is returned');
const westDraw=drawForTurn(passDiscard(nextResponse));
assert.equal(westDraw.players.west.temporaryFuriten,false,'temporary furiten clears on the affected player\'s draw');

const riichiMissResponse={
  ...furitenResponse,
  players:{...furitenResponse.players,west:{...furitenResponse.players.west,riichi:true}}
};
const riichiMiss=passDiscard(riichiMissResponse);
assert.equal(riichiMiss.players.west.temporaryFuriten,false,'riichi miss is not temporary furiten');
assert.equal(riichiMiss.players.west.riichiMissedRon,true,'a riichi player who passes ron becomes permanently furiten');
const afterMiss=drawForTurn(riichiMiss);
assert.equal(afterMiss.players.west.riichiMissedRon,true,'permanent furiten survives a later draw');

console.log('✓ chi, pon, riichi and temporary/permanent furiten state contracts validated.');
