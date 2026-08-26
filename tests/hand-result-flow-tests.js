import assert from 'node:assert/strict';
import {claimRon,completeExhaustiveDraw,completeTsumo,checkRon,checkTsumo,createHandFlow,discardTile,drawForTurn,HAND_PHASES,passDiscard} from '../src/lib/hand-flow.js';

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
assert.equal(tsumo.roundState.lastOutcome,'win','the round state receives the win outcome');
assert.ok(tsumo.roundState.scores.east>winningEast.scores?.east||tsumo.roundState.scores.east>25000,'the winner receives the integrated payment');

const winningSouth={
  east:['1m','1m','1m','1m','2m','3m','4m','5m','6m','7m','8m','9m','1p','5m'],
  south:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m'],
  west:otherHands.west,
  north:otherHands.north
};
const ronStart=createHandFlow({wallOptions,initialHands:winningSouth});
const pending=discardTile(ronStart,{seat:'east',tileId:ronStart.drawnTileId});
assert.equal(pending.phase,HAND_PHASES.RESPONSE,'a discard is held for response evaluation');
const ronCheck=checkRon(pending,{seat:'south',options:{riichi:true}});
assert.equal(ronCheck.ok,true,ronCheck.error);
assert.equal(ronCheck.best.score.win,'ron','the integrated evaluator sees a discard win');
const ron=claimRon(pending,{seat:'south',options:{riichi:true}});
assert.equal(ron.phase,HAND_PHASES.COMPLETED,'a valid ron completes the physical hand');
assert.equal(ron.result.winnerSeat,'south','the ron winner is retained');
assert.equal(ron.result.discarderSeat,'east','the discarder is retained');
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
