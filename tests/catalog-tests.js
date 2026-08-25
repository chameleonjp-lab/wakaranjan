import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateHand} from '../src/lib/full-hand-evaluator.js';

const terms=JSON.parse(readFileSync(new URL('../src/data/terms.json',import.meta.url),'utf8')).terms;
const yaku=JSON.parse(readFileSync(new URL('../src/data/yaku.json',import.meta.url),'utf8')).yaku;
const examples=JSON.parse(readFileSync(new URL('../src/data/yaku-examples.json',import.meta.url),'utf8')).examples;
const tiles=JSON.parse(readFileSync(new URL('../src/data/tiles.json',import.meta.url),'utf8')).tiles;
const tileCodes=new Set(tiles.map(t=>t.code)),termIds=new Set(terms.map(t=>t.id)),yakuIds=new Set(yaku.map(y=>y.id));
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};

test('用語IDと役IDが重複しない',()=>{assert.equal(termIds.size,terms.length);assert.equal(yakuIds.size,yaku.length)});
test('用語の関連参照が存在する',()=>{for(const t of terms)for(const id of t.relatedTerms||[])assert.equal(termIds.has(id),true,`${t.id} -> ${id}`)});
test('役図鑑の例は存在する標準役だけを参照する',()=>{for(const id of Object.keys(examples)){assert.equal(yakuIds.has(id),true,id);assert.equal(yaku.find(y=>y.id===id)?.standard,true,id)}});
test('役図鑑の牌姿例は14枚・定義済み牌・4枚以下',()=>{for(const [id,ex] of Object.entries(examples)){assert.equal(ex.tiles.length,14,id);assert.equal(ex.tiles.includes(ex.winTile),true,`${id}: winTile`);const c=new Map();for(const code of ex.tiles){assert.equal(tileCodes.has(code),true,`${id}: ${code}`);c.set(code,(c.get(code)||0)+1);assert.ok(c.get(code)<=4,`${id}: ${code} > 4`)}}});
test('牌姿例は共通判定でも対象役が成立する',()=>{for(const [id,ex] of Object.entries(examples)){const r=evaluateHand({concealedTiles:ex.tiles,winTile:ex.winTile,win:'ron',seatWind:'2z',roundWind:'1z'});assert.equal(r.ok,true,`${id}: ${r.error}`);const ids=new Set([...(r.best.yaku||[]).map(x=>x.id),...(r.best.yakuman||[]).map(x=>x.id)]);assert.equal(ids.has(id),true,`${id}: ${[...ids].join(',')}`)}});
console.log(`\n${passed} catalog tests passed.`);
