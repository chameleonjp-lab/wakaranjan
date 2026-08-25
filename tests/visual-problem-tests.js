import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateHand} from '../src/lib/full-hand-evaluator.js';

const base=JSON.parse(readFileSync(new URL('../src/data/questions/catalog.json',import.meta.url),'utf8'));
const visual=JSON.parse(readFileSync(new URL('../src/data/questions/visual-catalog.json',import.meta.url),'utf8')).questions;
const tiles=JSON.parse(readFileSync(new URL('../src/data/tiles.json',import.meta.url),'utf8')).tiles;
const yaku=JSON.parse(readFileSync(new URL('../src/data/yaku.json',import.meta.url),'utf8')).yaku;
const lessons=JSON.parse(readFileSync(new URL('../src/data/lessons.json',import.meta.url),'utf8')).lessons;
const tileCodes=new Set(tiles.map(t=>t.code)),yakuIds=new Set(yaku.map(y=>y.id)),lessonIds=new Set(lessons.map(l=>l.id));
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};

test('牌姿問題は24問以上ありIDが全問題で重複しない',()=>{assert.ok(visual.length>=24);const ids=[...base.questions,...visual].map(q=>q.id);assert.equal(new Set(ids).size,ids.length)});
test('牌姿問題は選択肢と正解を持つ',()=>{for(const q of visual){assert.equal(q.presentation,'tiles',q.id);assert.ok(q.choices.length>=2,q.id);assert.ok(Number.isInteger(q.answerIndex)&&q.answerIndex>=0&&q.answerIndex<q.choices.length,q.id);assert.ok(q.explanation?.length>=10,q.id);assert.ok(q.skill,q.id)}});
test('牌姿と河は定義済み牌のみで同一牌4枚以下',()=>{for(const q of visual){assert.ok([13,14].includes(q.handTiles.length),`${q.id}: hand ${q.handTiles.length}`);const counts=new Map();for(const code of [...q.handTiles,...(q.riverTiles||[])]){assert.equal(tileCodes.has(code),true,`${q.id}: ${code}`);counts.set(code,(counts.get(code)||0)+1);assert.ok(counts.get(code)<=4,`${q.id}: ${code} > 4`)}if(q.winTile)assert.equal(tileCodes.has(q.winTile),true,`${q.id}: winTile`)}});
test('役・教材参照が存在する',()=>{for(const q of visual){if(q.yakuRef)assert.equal(yakuIds.has(q.yakuRef),true,`${q.id}: ${q.yakuRef}`);if(q.lessonRef)assert.equal(lessonIds.has(q.lessonRef),true,`${q.id}: ${q.lessonRef}`)}});
test('役名の牌姿問題は共通役判定でも対象役が成立する',()=>{for(const q of visual.filter(q=>q.category==='yaku-name'&&q.yakuRef)){const r=evaluateHand({concealedTiles:q.handTiles,winTile:q.winTile,win:'ron',seatWind:'2z',roundWind:'1z'});assert.equal(r.ok,true,`${q.id}: ${r.error}`);const ids=new Set([...(r.best.yaku||[]).map(x=>x.id),...(r.best.yakuman||[]).map(x=>x.id)]);assert.equal(ids.has(q.yakuRef),true,`${q.id}: ${[...ids].join(',')}`)}});
test('待ち・ロン可否の牌姿問題を16問以上含む',()=>{assert.ok(visual.filter(q=>q.category==='ron-wait').length>=16)});
console.log(`\n${passed} visual problem tests passed.`);
