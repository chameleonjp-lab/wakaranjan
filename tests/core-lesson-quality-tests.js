import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const quality=read('../src/data/lesson-quality-core.json').lessons;
const lessons=read('../src/data/lessons.json').lessons;
const scoring=read('../src/data/scoring-core.json').lessons.map(x=>({...x,level:'intermediate'}));
const terms=[...read('../src/data/terms.json').terms,...read('../src/data/terms-extra.json').terms];
const lessonIds=new Set([...lessons,...scoring].map(x=>x.id));const termIds=new Set(terms.map(x=>x.id));
assert.equal(quality.length,17,'入門6＋初級6＋中級5の17章を対象にする');
assert.equal(new Set(quality.map(x=>x.id)).size,17,'品質データIDは重複しない');
for(const q of quality){
  assert.equal(lessonIds.has(q.id),true,`${q.id}: 教材が存在する`);
  assert.ok(q.objective?.length>=20,`${q.id}: 到達目標`);
  assert.ok(q.steps?.length>=3,`${q.id}: 手順3件以上`);
  assert.ok(q.mistakes?.length>=2,`${q.id}: よくある間違い2件以上`);
  assert.ok(q.termRefs?.length>=2,`${q.id}: 関連用語2件以上`);
  for(const id of q.termRefs)assert.equal(termIds.has(id),true,`${q.id}->${id}`);
}
console.log('✓ 17 handwritten lesson quality records validated.');
