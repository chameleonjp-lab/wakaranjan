import assert from 'node:assert/strict';
import {createRoundWall} from '../src/lib/tile-wall.js';
import {claimRon,completeExhaustiveDraw,completeTsumo,checkRon,checkTsumo,createHandFlow,discardTile,drawForTurn,HAND_PHASES,passDiscard,startNextHand} from '../src/lib/hand-flow.js';

const wallOptions={random:()=>0.5};
const otherHands={
  south:['3p','4p','5p','6p','9p','1s','2s','3s','4s','5s','6s','7s','8s'],
  west:['7s','8s','9s','1z','2z','3z','4z','5z','6z','7z','2m','3m','4m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};

const winningEast={
  east:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','5m'],
  ...otherHands
};
const tsumoStart=createHandFlow({wallOptions,initialHands:winningEast});
const tsumoCheck=checkTsumo(tsumoStart,{options:{riichi:true}});
assert.equal(tsumoCheck.ok,true,tsumoCheck.error);
assert.equal(tsumoCheck.best.score.win,'tsumo','the integrated evaluator sees a self draw');
assert.equal(tsumoCheck.settlement.winnerSeat,'east','the dealer seat is passed to settlement');
const tsumo=completeTsumo(tsumoStart,{options:{riichi:true}});
assert.equal(tsumo.phase,HAND_PHASES.COMPLETED,'a valid tsumo completes the physical hand');
assert.equal(tsumo.result.type,'win','the completed state keeps a win result');
assert.equal(tsumo.result.win,'tsumo','the result records the win kind');
assert.equal(tsumo.result.score.total,tsumoCheck.best.score.total,'the completed state keeps the calculated score');
assert.deepEqual(tsumo.result.yaku,tsumoCheck.best.yaku,'the completed state keeps the yaku list');
assert.equal(tsumo.result.yakuHan,tsumoCheck.best.yakuHan,'the completed state keeps yaku han');
assert.equal(tsumo.result.dora,tsumoCheck.best.dora,'the completed state keeps the dora total');
assert.deepEqual(tsumo.result.doraDetail,tsumoCheck.best.doraDetail,'the completed state keeps dora details');
assert.equal(tsumo.result.fu,tsumoCheck.best.fu,'the completed state keeps fu');
assert.deepEqual(tsumo.result.fuItems,tsumoCheck.best.fuItems,'the completed state keeps fu details');
assert.equal(tsumo.result.settlement.handGain,tsumo.result.score.total,'the settlement keeps the received total');
assert.equal(tsumo.roundState.lastOutcome,'win','the round state receives the win outcome');
assert.ok(tsumo.roundState.scores.east>winningEast.scores?.east||tsumo.roundState.scores.east>25000,'the winner receives the integrated payment');
const tsumoNext=startNextHand(tsumo,{wallOptions});
assert.equal(tsumoNext.phase,HAND_PHASES.DISCARD,'the next hand can start from a completed win');
assert.equal(tsumoNext.currentSeat,'east','a dealer win keeps the same dealer for the next hand');
assert.equal(tsumoNext.roundState.honba,1,'a dealer win carries one honba into the next hand');
assert.deepEqual(tsumoNext.roundState.scores,tsumo.roundState.scores,'the next hand keeps the completed scores');
assert.equal(tsumoCheck.best.dora,2,'red fives in the physical hand are counted as red dora');
assert.equal(tsumoCheck.best.doraDetail[0].count,2,'the red dora count is retained in the result');

const uraWall=createRoundWall({random:()=>0.5,redFives:{man:0,pin:0,sou:0}});
uraWall.doraIndicators[0]={...uraWall.doraIndicators[0],code:'4z'};
uraWall.uraIndicators[0]={...uraWall.uraIndicators[0],code:'3m'};
const uraStart=createHandFlow({roundWall:uraWall,initialHands:winningEast});
const uraCheck=checkTsumo(uraStart,{options:{riichi:true}});
assert.equal(uraCheck.ok,true,uraCheck.error);
assert.equal(uraCheck.best.dora,1,'a riichi hand counts the initial ura dora');
assert.equal(uraCheck.best.doraDetail[0].name,'裏ドラ','the ura dora source is retained in the result');

const winningSouth={
  east:['1m','1m','1m','1m','2m','3m','4m','5m','6m','7m','8m','9m','1p','5m'],
  south:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m'],
  west:otherHands.west,
  north:otherHands.north
};
const ronStart=createHandFlow({wallOptions,initialHands:winningSouth});
const redDiscardTile=ronStart.players.east.hand.find(tile=>tile.code==='5m'&&tile.red);
assert.ok(redDiscardTile,'the ron fixture contains a physical red discard');
const pending=discardTile(ronStart,{seat:'east',tileId:redDiscardTile.id});
assert.equal(pending.phase,HAND_PHASES.RESPONSE,'a discard is held for response evaluation');
const ronCheck=checkRon(pending,{seat:'south',options:{riichi:true}});
assert.equal(ronCheck.ok,true,ronCheck.error);
assert.equal(ronCheck.best.score.win,'ron','the integrated evaluator sees a discard win');
assert.equal(ronCheck.best.dora,2,'red hand tiles and a red winning discard are counted as red dora');
assert.equal(ronCheck.best.doraDetail[0].name,'赤ドラ','the red ron dora source is retained in the result');
const ron=claimRon(pending,{seat:'south',options:{riichi:true}});
assert.equal(ron.phase,HAND_PHASES.COMPLETED,'a valid ron completes the physical hand');
assert.equal(ron.result.winnerSeat,'south','the ron winner is retained');
assert.equal(ron.result.discarderSeat,'east','the discarder is retained');
assert.deepEqual(ron.result.doraDetail,ronCheck.best.doraDetail,'the completed ron keeps dora details');
assert.equal(ron.result.score.total,ronCheck.best.score.total,'the completed ron keeps the calculated score');
assert.equal(ron.roundState.lastWinnerSeat,'south','the round state receives the ron winner');
assert.ok(ron.roundState.scores.south>25000,'the ron winner receives the integrated payment');

const furitenState={
  ...pending,
  players:{
    ...pending.players,
    south:{
      ...pending.players.south,
      river:[{id:'fixture-furiten-5m',code:'5m'}]
    }
  }
};
const furiten=checkRon(furitenState,{seat:'south',options:{riichi:true}});
assert.equal(furiten.ok,false,'a permanent furiten blocks the integrated ron');
assert.match(furiten.error,/ロンできません/,'the furiten reason is exposed');

const drawStart=createHandFlow({wallOptions});
const drawState=passDiscard(discardTile(drawStart,{seat:'east',tileId:drawStart.drawnTileId}));
const emptyLiveWall={
  ...drawState,
  roundWall:{...drawState.roundWall,live:[]}
};
const awaiting=drawForTurn(emptyLiveWall);
assert.equal(awaiting.phase,HAND_PHASES.AWAITING_RESULT,'an empty live wall moves to result waiting');
const drawn=completeExhaustiveDraw(awaiting,{dealerTenpai:true});
assert.equal(drawn.phase,HAND_PHASES.COMPLETED,'an exhaustive draw can complete the physical hand');
assert.equal(drawn.result.type,'draw','the completed state keeps a draw result');
assert.equal(drawn.roundState.lastOutcome,'draw','the round state receives the draw outcome');
assert.equal(drawn.roundState.continued,true,'dealer tenpai continues the hand');

console.log('✓ integrated tsumo, ron, furiten guard and exhaustive draw contracts validated.');
