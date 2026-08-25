import assert from 'node:assert/strict';
import {calculateScore} from '../src/lib/score.js';
import {evaluateHand,indicatorNext} from '../src/lib/full-hand-evaluator.js';
import {validateScoringReference} from '../src/lib/scoring-validation.js';

let passed=0;
function test(name,fn){
  try{fn();passed++;console.log(`✓ ${name}`)}
  catch(error){console.error(`✗ ${name}`);throw error}
}
function ids(result){return new Set((result.best.yaku||[]).map(y=>y.id))}
function yakumanIds(result){return new Set((result.best.yakuman||[]).map(y=>y.id))}

const closedTanyao=['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','5m'];

test('既存点数表の代表値がすべて一致する',()=>{
  const result=validateScoringReference();
  assert.equal(result.ok,true,JSON.stringify(result.errors));
});

test('13翻以上の通常役は三倍満が上限',()=>{
  assert.equal(calculateScore({han:13,fu:30,dealer:false,win:'ron'}).total,24000);
  assert.equal(calculateScore({han:20,fu:30,dealer:true,win:'ron'}).total,36000);
});

test('門前リーチ＋タンヤオを2翻40符2600点と判定',()=>{
  const r=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'ron',riichi:true,seatWind:'2z',roundWind:'1z'});
  assert.equal(r.ok,true,r.error);assert.equal(r.best.han,2);assert.equal(r.best.fu,40);assert.equal(r.best.score.total,2600);
  assert.equal(ids(r).has('yaku-riichi'),true);assert.equal(ids(r).has('yaku-tanyao'),true);
});

test('ピンフツモは20符で400/700',()=>{
  const tiles=['1m','2m','3m','4m','5m','6m','2p','3p','4p','6s','7s','8s','5p','5p'];
  const r=evaluateHand({concealedTiles:tiles,winTile:'2p',win:'tsumo',seatWind:'2z',roundWind:'1z'});
  assert.equal(r.ok,true,r.error);assert.equal(r.best.fu,20);assert.equal(r.best.score.payments.child,400);assert.equal(r.best.score.payments.dealer,700);
  assert.equal(ids(r).has('yaku-pinfu'),true);assert.equal(ids(r).has('yaku-menzen-tsumo'),true);
});

test('副露チー後のタンヤオを1翻30符1000点と判定',()=>{
  const r=evaluateHand({
    concealedTiles:['3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','5m'],
    melds:[{type:'chi',tiles:['2m','3m','4m']}],winTile:'5m',win:'ron',seatWind:'2z',roundWind:'1z'
  });
  assert.equal(r.ok,true,r.error);assert.equal(r.closed,false);assert.equal(r.best.han,1);assert.equal(r.best.fu,30);assert.equal(r.best.score.total,1000);
  assert.equal(ids(r).has('yaku-tanyao'),true);
});

test('副露三色同順は1翻へ食い下がる',()=>{
  const r=evaluateHand({
    concealedTiles:['2p','3p','4p','2s','3s','4s','7s','8s','9s','5p','5p'],
    melds:[{type:'chi',tiles:['2m','3m','4m']}],winTile:'5p',win:'ron',seatWind:'2z',roundWind:'1z'
  });
  assert.equal(r.ok,true,r.error);assert.equal(ids(r).has('yaku-sanshoku-doujun'),true);
  assert.equal(r.best.yaku.find(y=>y.id==='yaku-sanshoku-doujun').han,1);
});

test('暗槓は門前を壊さず32符の槓子符を付ける',()=>{
  const r=evaluateHand({
    concealedTiles:['2p','3p','4p','4p','5p','6p','6s','7s','8s','5s','5s'],
    melds:[{type:'ankan',tiles:['1m','1m','1m','1m']}],winTile:'5s',win:'ron',riichi:true,seatWind:'2z',roundWind:'1z'
  });
  assert.equal(r.ok,true,r.error);assert.equal(r.closed,true);assert.equal(r.best.fu,70);assert.equal(r.best.score.total,2300);
  assert.equal(r.best.fuItems.some(([label,fu])=>label.includes('暗槓')&&fu===32),true);
});

test('大三元を役満として判定',()=>{
  const r=evaluateHand({
    concealedTiles:['1m','2m','3m','1p','1p'],
    melds:[{type:'pon',tiles:['5z','5z','5z']},{type:'pon',tiles:['6z','6z','6z']},{type:'pon',tiles:['7z','7z','7z']}],
    winTile:'1p',win:'ron',seatWind:'2z',roundWind:'1z'
  });
  assert.equal(r.ok,true,r.error);assert.equal(r.best.yakumanValue,1);assert.equal(r.best.score.total,32000);assert.equal(yakumanIds(r).has('yaku-daisangen'),true);
});

test('大三元＋字一色を2倍役満として複合',()=>{
  const r=evaluateHand({
    concealedTiles:['1z','1z','1z','2z','2z'],
    melds:[{type:'pon',tiles:['5z','5z','5z']},{type:'pon',tiles:['6z','6z','6z']},{type:'pon',tiles:['7z','7z','7z']}],
    winTile:'2z',win:'ron',seatWind:'3z',roundWind:'1z'
  });
  assert.equal(r.ok,true,r.error);assert.equal(r.best.yakumanValue,2);assert.equal(r.best.score.total,64000);
  assert.equal(yakumanIds(r).has('yaku-daisangen'),true);assert.equal(yakumanIds(r).has('yaku-tsuuiisou'),true);
});

test('国士無双を役満として判定',()=>{
  const tiles=['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z','1m'];
  const r=evaluateHand({concealedTiles:tiles,winTile:'1m',win:'ron',seatWind:'2z',roundWind:'1z'});
  assert.equal(r.ok,true,r.error);assert.equal(r.best.yakumanValue,1);assert.equal(yakumanIds(r).has('yaku-kokushi'),true);
});

test('九蓮宝燈を役満として判定',()=>{
  const tiles=['1m','1m','1m','2m','3m','4m','5m','5m','6m','7m','8m','9m','9m','9m'];
  const r=evaluateHand({concealedTiles:tiles,winTile:'5m',win:'ron',seatWind:'2z',roundWind:'1z'});
  assert.equal(r.ok,true,r.error);assert.equal(yakumanIds(r).has('yaku-chuuren'),true);
});

test('ドラ表示牌4萬で五萬2枚を2翻加算',()=>{
  const r=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'ron',riichi:true,seatWind:'2z',roundWind:'1z',doraIndicators:['4m']});
  assert.equal(r.ok,true,r.error);assert.equal(r.best.dora,2);assert.equal(r.best.han,4);assert.equal(r.best.score.total,8000);
});

test('裏ドラはリーチ時だけ数える',()=>{
  const noRiichi=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'ron',seatWind:'2z',roundWind:'1z',uraIndicators:['4m']});
  assert.equal(noRiichi.ok,true,noRiichi.error);assert.equal(noRiichi.best.dora,0);
  const riichi=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'ron',riichi:true,seatWind:'2z',roundWind:'1z',uraIndicators:['4m']});
  assert.equal(riichi.ok,true,riichi.error);assert.equal(riichi.best.dora,2);
});

test('搶槓時は槓ドラを数えない',()=>{
  const tiles=['1m','2m','3m','4p','5p','6p','7s','8s','9s','1s','2s','3s','5m','5m'];
  const r=evaluateHand({concealedTiles:tiles,winTile:'5m',win:'ron',chankan:true,seatWind:'2z',roundWind:'1z',kanDoraIndicators:['4m']});
  assert.equal(r.ok,true,r.error);assert.equal(r.best.dora,0);assert.equal(ids(r).has('yaku-chankan'),true);
});

test('リーチ済みの副露手を拒否',()=>{
  const r=evaluateHand({concealedTiles:['3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','5m'],melds:[{type:'chi',tiles:['2m','3m','4m']}],winTile:'5m',win:'ron',riichi:true});
  assert.equal(r.ok,false);assert.match(r.error,/副露/);
});

test('赤ドラ数が5牌数を超える入力を拒否',()=>{
  const tiles=['1m','2m','3m','7m','8m','9m','1p','2p','3p','7p','8p','9p','1z','1z'];
  const r=evaluateHand({concealedTiles:tiles,winTile:'1z',win:'ron',riichi:true,redDora:1});
  assert.equal(r.ok,false);assert.match(r.error,/赤ドラ/);
});

test('ドラ表示牌の循環が正しい',()=>{
  assert.equal(indicatorNext('9m'),'1m');assert.equal(indicatorNext('4z'),'1z');assert.equal(indicatorNext('7z'),'5z');
});

console.log(`\n${passed} tests passed.`);
