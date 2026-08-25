import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const quality=[...read('../src/data/lesson-quality.json').lessons,...read('../src/data/lesson-quality-advanced.json').lessons];
const dataLessons=[...read('../src/data/curriculum-extra.json').lessons,...read('../src/data/advanced-special.json').lessons];
const terms=[...read('../src/data/terms.json').terms,...read('../src/data/terms-extra.json').terms];
const lessonById=new Map(dataLessons.map(x=>[x.id,x])),termIds=new Set(terms.map(x=>x.id));
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};

test('データ駆動21章すべてに品質データがある',()=>{
  assert.equal(dataLessons.length,21);assert.equal(quality.length,21);const ids=new Set(quality.map(x=>x.id));
  for(const lesson of dataLessons)assert.equal(ids.has(lesson.id),true,lesson.id);
});
test('品質データIDが重複しない',()=>assert.equal(new Set(quality.map(x=>x.id)).size,quality.length));
test('到達目標・手順・誤解例が最低基準を満たす',()=>{
  for(const q of quality){assert.ok(q.objective?.length>=20,q.id);assert.ok(q.steps?.length>=3,q.id);assert.ok(q.mistakes?.length>=2,q.id);}
});
test('各章は既存1問と追加2問で3問以上確認できる',()=>{
  for(const q of quality){const lesson=lessonById.get(q.id);assert.ok(lesson?.check,q.id);assert.ok(q.checks?.length>=2,q.id);for(const c of [lesson.check,...q.checks]){assert.ok(c.choices?.length>=4,`${q.id}: choices`);assert.ok(c.answerIndex>=0&&c.answerIndex<c.choices.length,`${q.id}: answer`);assert.ok(c.explanation?.length>=10,`${q.id}: explanation`);}}
});
test('関連用語の参照切れがない',()=>{for(const q of quality){assert.ok(q.termRefs?.length>=2,q.id);for(const id of q.termRefs)assert.equal(termIds.has(id),true,`${q.id}->${id}`)}});
test('教材品質データは実在するデータ教材だけを参照する',()=>{for(const q of quality)assert.equal(lessonById.has(q.id),true,q.id)});
console.log(`\n${passed} lesson quality tests passed.`);
