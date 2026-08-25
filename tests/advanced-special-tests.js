import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../src/data/advanced-special.json',import.meta.url),'utf8')).lessons;
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};
test('上級5章と特例5章が存在する',()=>{assert.equal(data.filter(x=>x.level==='advanced').length,5);assert.equal(data.filter(x=>x.level==='special').length,5)});
test('章IDが重複しない',()=>assert.equal(new Set(data.map(x=>x.id)).size,data.length));
test('各章の順番が1から連続する',()=>{for(const level of ['advanced','special'])assert.deepEqual(data.filter(x=>x.level===level).map(x=>x.order).sort((a,b)=>a-b),[1,2,3,4,5])});
test('各章に本文と確認問題がある',()=>{for(const l of data){assert.ok(l.title&&l.lead);assert.ok(Array.isArray(l.points)&&l.points.length>=3,l.id);assert.ok(l.check?.prompt,l.id);assert.ok(Array.isArray(l.check?.choices)&&l.check.choices.length>=4,l.id);assert.ok(Number.isInteger(l.check.answerIndex)&&l.check.answerIndex>=0&&l.check.answerIndex<l.check.choices.length,l.id);assert.ok(l.check.explanation,l.id)}});
console.log(`\n${passed} advanced/special tests passed.`);
