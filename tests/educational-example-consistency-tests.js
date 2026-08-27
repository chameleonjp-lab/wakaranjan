import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decomposeHand,waitCandidates} from '../src/lib/hand.js';
import {evaluateHand} from '../src/lib/full-hand-evaluator.js';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const visual=read('../src/data/questions/visual-catalog.json').questions;
const contracts=read('../src/data/questions/visual-semantic-contracts.json');
const examples=read('../src/data/yaku-examples.json').examples;
const tiles=read('../src/data/tiles.json').tiles.map(t=>t.code);
const byId=new Map(visual.map(q=>[q.id,q]));
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};
const sorted=a=>[...a].sort();

function waitsFor(hand){
  const counts=new Map();for(const c of hand)counts.set(c,(counts.get(c)||0)+1);
  return tiles.filter(code=>(counts.get(code)||0)<4&&decomposeHand([...hand,code]).length>0).sort();
}
function waitTypesFor(hand,winTile){
  return new Set(decomposeHand(hand).flatMap(d=>waitCandidates(d,winTile).map(v=>v.wait)));
}
function yakuIds(result){
  if(!result?.ok||!result.best)return new Set();
  return new Set([...(result.best.yaku||[]).map(x=>x.id),...(result.best.yakuman||[]).map(x=>x.id)]);
}
function removeOne(list,code){const out=[...list];const i=out.lastIndexOf(code);assert.ok(i>=0,`missing win tile ${code}`);out.splice(i,1);return out}
function isChuurenBase13(codes){
  if(codes.length!==13||codes.some(c=>c[1]!=='m'))return false;
  const n=Array(10).fill(0);for(const c of codes)n[Number(c[0])]++;
  return n[1]===3&&n[9]===3&&[2,3,4,5,6,7,8].every(x=>n[x]===1);
}

test('待ち牌問題の牌姿は実計算した待ちと一致する',()=>{
  for(const [id,expected] of Object.entries(contracts.waitQuestions)){
    const q=byId.get(id);assert.ok(q,id);
    assert.deepEqual(waitsFor(q.handTiles),sorted(expected),id);
  }
});

test('ロン可否問題は形・役・河フリテンの条件と一致する',()=>{
  for(const [id,c] of Object.entries(contracts.ronQuestions)){
    const q=byId.get(id);assert.ok(q,id);
    const waits=waitsFor(q.handTiles);assert.ok(waits.includes(c.winTile),`${id}: ${c.winTile} is not a wait`);
    const hand14=[...q.handTiles,c.winTile];
    const r=evaluateHand({concealedTiles:hand14,winTile:c.winTile,win:'ron',riichi:c.riichi,seatWind:'2z',roundWind:'1z'});
    const hasYaku=yakuIds(r).size>0;
    assert.equal(hasYaku,c.hasYaku,`${id}: yaku=${[...yakuIds(r)].join(',')}`);
    const furiten=(q.riverTiles||[]).some(x=>waits.includes(x));
    assert.equal(furiten,c.furiten,`${id}: furiten`);
    assert.equal(hasYaku&&!furiten,c.canRon,`${id}: canRon`);
  }
});

test('役図鑑と共有している役名問題は同じ牌姿を使う',()=>{
  for(const id of contracts.mirroredYakuQuestionIds){
    const q=byId.get(id);assert.ok(q,id);const ex=examples[q.yakuRef];assert.ok(ex,`${id}: ${q.yakuRef}`);
    assert.deepEqual(sorted(q.handTiles),sorted(ex.tiles),`${id}: tiles`);
    assert.equal(q.winTile,ex.winTile,`${id}: winTile`);
  }
});

test('誤解しやすい役図鑑例は教材上の意味まで固定する',()=>{
  for(const [id,rule] of Object.entries(contracts.exampleRules)){
    const ex=examples[id];assert.ok(ex,id);
    const r=evaluateHand({concealedTiles:ex.tiles,winTile:ex.winTile,win:'ron',seatWind:'2z',roundWind:'1z'});
    assert.equal(r.ok,true,`${id}: ${r.error}`);const ids=yakuIds(r);
    for(const y of rule.mustInclude||[])assert.equal(ids.has(y),true,`${id}: missing ${y}; ${[...ids].join(',')}`);
    for(const y of rule.mustNotInclude||[])assert.equal(ids.has(y),false,`${id}: unexpected ${y}`);
    if(rule.wait){const waits=waitTypesFor(ex.tiles,ex.winTile);assert.equal(waits.has(rule.wait),true,`${id}: waits=${[...waits].join(',')}`)}
    if(rule.preWinMustNotBeBasePattern)assert.equal(isChuurenBase13(removeOne(ex.tiles,ex.winTile)),false,`${id}: pure chuuren base was used`);
  }
});

console.log(`\n${passed} educational example consistency tests passed.`);
