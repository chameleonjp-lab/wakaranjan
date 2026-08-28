import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateHand} from '../src/lib/full-hand-evaluator.js';

const readJson=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const closedTanyao=['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','5m'];
let passed=0;
function test(name,fn){fn();passed++;console.log(`✓ ${name}`)}

test('赤牌は種類ごとの指定を点数へ反映する',()=>{
  const result=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'ron',riichi:true,seatWind:'2z',roundWind:'1z',redDoraCodes:['5m','5p']});
  assert.equal(result.ok,true,result.error);assert.equal(result.best.dora,2);assert.deepEqual(result.best.doraDetail.at(-1).codes,['5m','5p']);
});

test('同じ種類の赤牌を2枚以上指定できない',()=>{
  const result=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'ron',riichi:true,seatWind:'2z',roundWind:'1z',redDoraCodes:['5m','5m']});
  assert.equal(result.ok,false);assert.match(result.error,/種類ごとに1枚まで/);
});

test('赤ドラの合計数だけを指定しても種類数を超えれば拒否する',()=>{
  const tiles=['2m','3m','4m','5m','5m','5m','6m','7m','8m','2p','3p','4p','1z','1z'];
  const result=evaluateHand({concealedTiles:tiles,winTile:'5m',win:'ron',redDora:2});
  assert.equal(result.ok,false);assert.match(result.error,/種類ごとに1枚まで/);
});

test('カンなしで槓ドラ表示牌を指定できない',()=>{
  const result=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'ron',riichi:true,seatWind:'2z',roundWind:'1z',kanDoraIndicators:['4m']});
  assert.equal(result.ok,false);assert.match(result.error,/成立したカン0回/);
});

test('成立したカン1回と槓ドラ1枚を受け入れる',()=>{
  const result=evaluateHand({concealedTiles:['2p','3p','4p','4p','5p','6p','6s','7s','8s','5s','5s'],melds:[{type:'ankan',tiles:['1m','1m','1m','1m']}],winTile:'5s',win:'ron',riichi:true,seatWind:'2z',roundWind:'1z',kanDoraIndicators:['4m']});
  assert.equal(result.ok,true,result.error);assert.equal(result.best.fu,70);
});

test('リーチとダブルリーチを同時に指定できない',()=>{
  const result=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'ron',riichi:true,doubleRiichi:true,seatWind:'2z',roundWind:'1z'});
  assert.equal(result.ok,false);assert.match(result.error,/同時に指定できません/);
});

test('天和・地和とリーチ系条件を同時に指定できない',()=>{
  const tenhou=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'tsumo',dealer:true,tenhou:true,riichi:true,seatWind:'1z',roundWind:'1z'});
  const chiihou=evaluateHand({concealedTiles:closedTanyao,winTile:'5m',win:'tsumo',dealer:false,chiihou:true,doubleRiichi:true,seatWind:'2z',roundWind:'1z'});
  assert.equal(tenhou.ok,false);assert.match(tenhou.error,/リーチ系/);assert.equal(chiihou.ok,false);assert.match(chiihou.error,/リーチ系/);
});

test('連風牌の雀頭は標準で2符に固定する',()=>{
  const result=evaluateHand({concealedTiles:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','1z','1z'],winTile:'1z',win:'ron',dealer:true,riichi:true,seatWind:'1z',roundWind:'1z'});
  assert.equal(result.ok,true,result.error);assert.deepEqual(result.best.fuItems.find(([label])=>label==='連風牌の雀頭'),['連風牌の雀頭',2]);
});

test('標準ルールデータにも赤牌種類と連風牌の符を記録する',()=>{
  const rules=readJson('../src/data/rules.json').rulesets.find(rule=>rule.id==='wakaranjan-standard-v1');
  assert.deepEqual(rules.scoring.redDoraByType,{ '5m':1,'5p':1,'5s':1 });assert.equal(rules.scoring.renpuuPairFu,2);
});

console.log(`\n${passed} scoring input validation tests passed.`);
