import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../src/data/lessons.json').lessons;
const scoring=read('../src/data/scoring-core.json').lessons.map(x=>({...x,level:'intermediate'}));
const advanced=read('../src/data/advanced-special.json').lessons;
const extra=read('../src/data/curriculum-extra.json').lessons;
const baseTerms=read('../src/data/terms.json').terms;
const extraTerms=read('../src/data/terms-extra.json').terms;
const tiles=read('../src/data/tiles.json').tiles;
const baseQuestions=read('../src/data/questions/catalog.json');
const visualQuestions=read('../src/data/questions/visual-catalog.json').questions;
const practical=read('../src/data/questions/practical-rules.json');
const lessons=[...base,...scoring,...advanced,...extra],terms=[...baseTerms,...extraTerms];
const questions=[...baseQuestions.questions,...visualQuestions,...practical.questions];
const lessonIds=new Set(lessons.map(x=>x.id)),termIds=new Set(terms.map(x=>x.id)),tileCodes=new Set(tiles.map(x=>x.code));
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};
function orders(level){return lessons.filter(x=>x.level===level).map(x=>x.order).sort((a,b)=>a-b)}

test('全教材IDが重複しない',()=>assert.equal(lessonIds.size,lessons.length));
test('要件の章数を満たす',()=>{
  assert.deepEqual(orders('intro'),[1,2,3,4,5,6]);
  assert.deepEqual(orders('beginner'),[1,2,3,4,5,6,7]);
  assert.deepEqual(orders('intermediate'),[1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(orders('advanced'),[1,2,3,4,5,6,7]);
  assert.deepEqual(orders('special'),[1,2,3,4,5,6,7,8]);
});
test('不足していた実戦章が存在する',()=>{
  for(const id of ['lesson-beginner-07','lesson-intermediate-06','lesson-intermediate-07','lesson-intermediate-08','lesson-intermediate-09','lesson-intermediate-10','lesson-advanced-06','lesson-advanced-07','lesson-special-06','lesson-special-07','lesson-special-08'])assert.equal(lessonIds.has(id),true,id);
});
test('追加教材の確認問題が成立する',()=>{for(const l of extra){assert.ok(l.points.length>=3,l.id);assert.ok(l.check?.choices?.length>=4,l.id);assert.ok(l.check.answerIndex>=0&&l.check.answerIndex<l.check.choices.length,l.id)}});
test('追加教材の牌図は定義済み牌だけを使う',()=>{for(const l of extra){for(const key of ['hand','river']){const codes=l[key]||[];const c=new Map();for(const code of codes){assert.equal(tileCodes.has(code),true,`${l.id}:${code}`);c.set(code,(c.get(code)||0)+1);assert.ok(c.get(code)<=4,`${l.id}:${code}>4`)}}}});
test('用語集を65語以上へ拡張しID重複がない',()=>{assert.ok(terms.length>=65,`terms=${terms.length}`);assert.equal(termIds.size,terms.length)});
test('用語の関連語と教材参照がすべて存在する',()=>{for(const t of terms){for(const id of t.relatedTerms||[])assert.equal(termIds.has(id),true,`${t.id}->${id}`);for(const id of t.lessonRefs||[])assert.equal(lessonIds.has(id),true,`${t.id}->${id}`)}});
test('実戦判断とルール差を各12問追加する',()=>{assert.equal(practical.categories.length,2);assert.equal(practical.questions.filter(q=>q.category==='practical').length,12);assert.equal(practical.questions.filter(q=>q.category==='rule-diff').length,12);assert.ok(questions.length>=96,`questions=${questions.length}`)});
test('全問題IDが重複せず追加問題の参照が成立する',()=>{const ids=new Set(questions.map(q=>q.id));assert.equal(ids.size,questions.length);for(const q of practical.questions){assert.ok(q.choices.length>=4,q.id);assert.ok(q.answerIndex>=0&&q.answerIndex<q.choices.length,q.id);assert.ok(q.skill,q.id);assert.ok(q.explanation,q.id);if(q.lessonRef)assert.equal(lessonIds.has(q.lessonRef),true,`${q.id}->${q.lessonRef}`)}});
console.log(`\n${passed} curriculum gap tests passed.`);
