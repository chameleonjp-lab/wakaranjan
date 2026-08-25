import assert from 'node:assert/strict';
import {settleHand,furitenStatus,resolveHeadBump} from '../src/lib/round-context.js';

let passed=0;
function test(name,fn){try{fn();passed++;console.log(`✓ ${name}`)}catch(error){console.error(`✗ ${name}`);throw error}}

const closedTanyao=['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','5m'];
const baseRon={concealedTiles:closedTanyao,winTile:'5m',win:'ron',riichi:true,dealer:false,seatWind:'2z',roundWind:'1z',winnerSeat:'south',discarderSeat:'west'};

test('自分の河に待ち牌が1枚でもあればロン不可',()=>{
  const status=furitenStatus({...baseRon,ownRiver:['5m']});
  assert.equal(status.active,true);assert.equal(status.ownDiscard,'5m');
  const r=settleHand({...baseRon,ownRiver:['5m']});
  assert.equal(r.ok,false);assert.match(r.error,/河/);
});

test('同巡内フリテンはロン不可だがツモは可能',()=>{
  const ron=settleHand({...baseRon,temporaryFuriten:true});assert.equal(ron.ok,false);assert.match(ron.error,/同巡内/);
  const tsumo=settleHand({...baseRon,win:'tsumo',discarderSeat:null,temporaryFuriten:true});assert.equal(tsumo.ok,true,tsumo.error);assert.equal(tsumo.furiten.active,true);
});

test('リーチ後見逃しはロン不可',()=>{
  const r=settleHand({...baseRon,riichiMissedRon:true});assert.equal(r.ok,false);assert.match(r.error,/リーチ後/);
});

test('2本場と供託2本を子2600ロンへ加算',()=>{
  const r=settleHand({...baseRon,honba:2,riichiSticks:2});assert.equal(r.ok,true,r.error);
  assert.equal(r.settlement.payers.west,3200);assert.equal(r.settlement.riichiBonus,2000);assert.equal(r.settlement.handGain,5200);
});

test('ツモの本場は各家100点ずつ加算',()=>{
  const tiles=['1m','2m','3m','4m','5m','6m','2p','3p','4p','6s','7s','8s','5p','5p'];
  const r=settleHand({concealedTiles:tiles,winTile:'2p',win:'tsumo',dealer:false,seatWind:'2z',roundWind:'1z',winnerSeat:'south',honba:1});
  assert.equal(r.ok,true,r.error);assert.equal(r.settlement.payers.east,800);assert.equal(r.settlement.payers.west,500);assert.equal(r.settlement.payers.north,500);
});

test('頭ハネは放銃者の下家を最優先する',()=>{
  const r=resolveHeadBump({discarderSeat:'east',claimantSeats:['west','south']});
  assert.equal(r.ok,true);assert.equal(r.winner,'south');assert.deepEqual(r.blocked,['west']);
});

test('頭ハネは対面より下家、上家より対面を優先する',()=>{
  assert.equal(resolveHeadBump({discarderSeat:'south',claimantSeats:['north','west']}).winner,'west');
  assert.equal(resolveHeadBump({discarderSeat:'south',claimantSeats:['east','north']}).winner,'north');
});

test('大三元ツモの責任払いは責任者が全額負担',()=>{
  const r=settleHand({
    concealedTiles:['1m','2m','3m','1p','1p'],melds:[{type:'pon',tiles:['5z','5z','5z']},{type:'pon',tiles:['6z','6z','6z']},{type:'pon',tiles:['7z','7z','7z']}],
    winTile:'1p',win:'tsumo',dealer:false,seatWind:'2z',roundWind:'1z',winnerSeat:'south',honba:1,
    pao:{yakumanId:'yaku-daisangen',responsibleSeat:'west'}
  });
  assert.equal(r.ok,true,r.error);assert.equal(r.settlement.paoApplied,true);assert.deepEqual(r.settlement.payers,{west:32300});
});

test('大三元＋字一色ツモは責任役満だけ責任払いにする',()=>{
  const r=settleHand({
    concealedTiles:['1z','1z','1z','2z','2z'],melds:[{type:'pon',tiles:['5z','5z','5z']},{type:'pon',tiles:['6z','6z','6z']},{type:'pon',tiles:['7z','7z','7z']}],
    winTile:'2z',win:'tsumo',dealer:false,seatWind:'2z',roundWind:'1z',winnerSeat:'south',honba:1,
    pao:{yakumanId:'yaku-daisangen',responsibleSeat:'west'}
  });
  assert.equal(r.ok,true,r.error);assert.equal(r.best.yakumanValue,2);
  assert.equal(r.settlement.payers.east,16000);assert.equal(r.settlement.payers.west,40300);assert.equal(r.settlement.payers.north,8000);
});

test('責任払い対象でない役満を指定すると拒否',()=>{
  const tiles=['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z','1m'];
  const r=settleHand({concealedTiles:tiles,winTile:'1m',win:'ron',dealer:false,seatWind:'2z',roundWind:'1z',winnerSeat:'south',discarderSeat:'west',pao:{yakumanId:'yaku-kokushi',responsibleSeat:'north'}});
  assert.equal(r.ok,false);assert.match(r.error,/大三元/);
});

console.log(`\n${passed} round-context tests passed.`);
