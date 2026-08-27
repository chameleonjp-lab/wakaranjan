import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const yaku=read('../src/data/yaku.json').yaku;
const baseLessons=read('../src/data/lessons.json').lessons;
const scoring=read('../src/data/scoring-core.json').lessons.map(x=>({...x,level:'intermediate'}));
const advanced=read('../src/data/advanced-special.json').lessons;
const extraLessons=read('../src/data/curriculum-extra.json').lessons;
const lessons=[...baseLessons,...scoring,...advanced,...extraLessons];
const terms=[...read('../src/data/terms.json').terms,...read('../src/data/terms-extra.json').terms];
const questionSets=[
  read('../src/data/questions/catalog.json').questions,
  read('../src/data/questions/visual-catalog.json').questions,
  read('../src/data/questions/practical-rules.json').questions,
  read('../src/data/questions/intro/review.json').questions,
  read('../src/data/questions/beginner/review.json').questions,
  read('../src/data/questions/intermediate/scoring-review.json').questions
];
const questions=questionSets.flat();
const rules=read('../src/data/rules.json').rulesets;
const lessonIds=new Set(lessons.map(x=>x.id));
const yakuIds=new Set(yaku.map(x=>x.id));
const termIds=new Set(terms.map(x=>x.id));
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};

test('標準役は役一覧の必須情報をすべて持つ',()=>{
  const standard=yaku.filter(x=>x.standard);assert.ok(standard.length>=40,`standard yaku=${standard.length}`);
  for(const item of standard){assert.ok(item.id&&item.nameJa&&item.displayNameJa&&item.readingJa,item.id);assert.ok(item.summary?.length>=8,item.id);assert.ok(['normal','yakuman'].includes(item.category),item.id);assert.ok(item.lessonLevel,item.id);if(item.category==='yakuman')assert.ok(item.yakumanValue>=1,item.id);else assert.ok(Number.isInteger(item.closedHan),item.id)}
});

test('教材ID・役ID・用語IDは重複しない',()=>{
  assert.equal(lessonIds.size,lessons.length,'lesson ids');assert.equal(yakuIds.size,yaku.length,'yaku ids');assert.equal(termIds.size,terms.length,'term ids');
});

test('5段階カリキュラムに必要な教材数がある',()=>{
  const counts=Object.fromEntries(['intro','beginner','intermediate','advanced','special'].map(level=>[level,lessons.filter(x=>x.level===level).length]));
  assert.ok(counts.intro>=6,JSON.stringify(counts));assert.ok(counts.beginner>=7,JSON.stringify(counts));assert.ok(counts.intermediate>=10,JSON.stringify(counts));assert.ok(counts.advanced>=7,JSON.stringify(counts));assert.ok(counts.special>=5,JSON.stringify(counts));
});

test('用語の関連参照は孤立していない',()=>{
  for(const term of terms){for(const id of term.relatedTerms||[])assert.ok(termIds.has(id),`${term.id} -> term ${id}`);for(const id of term.lessonRefs||[])assert.ok(lessonIds.has(id),`${term.id} -> lesson ${id}`)}
});

test('問題の役・教材参照はすべて実在する',()=>{
  for(const q of questions){if(q.yakuRef)assert.ok(yakuIds.has(q.yakuRef),`${q.id} -> yaku ${q.yakuRef}`);if(q.lessonRef)assert.ok(lessonIds.has(q.lessonRef),`${q.id} -> lesson ${q.lessonRef}`)}
});

test('主要問題カテゴリがすべて出題されている',()=>{
  const categories=new Set(questions.map(q=>q.category));for(const required of ['ron-wait','yaku-name','score','practical','rule-diff'])assert.ok(categories.has(required),required);
});

test('標準ルールセットが存在し、教材の共通基準になれる',()=>{
  const standard=rules.find(x=>x.id==='wakaranjan-standard-v1');assert.ok(standard,'wakaranjan-standard-v1');assert.ok(standard.displayNameJa);assert.ok(Object.keys(standard).length>=5,'standard rules too thin');
});

test('用語集実装は標準役を検索対象へ統合する',()=>{
  const source=readFileSync(new URL('../src/tools/dictionary.js',import.meta.url),'utf8');assert.match(source,/ctx\.yaku\.filter\(y=>y\.standard\)/);assert.match(source,/category:'yaku'/);assert.match(source,/#yaku-guide\?yaku=/);
});

test('要件・カリキュラム・役・ルール基準文書が固定されている',()=>{
  for(const path of ['../docs/REQUIREMENTS.md','../docs/CURRICULUM.md','../docs/YAKU_CATALOG.md','../docs/STANDARD_RULES.md','../docs/QUESTION_TAXONOMY.md','../docs/SCORING_TEST_MATRIX.md']){const text=readFileSync(new URL(path,import.meta.url),'utf8');assert.ok(text.length>=1000,path)}
});

console.log(`\n${passed} coverage audit tests passed: ${lessons.length} lessons, ${yaku.filter(x=>x.standard).length} standard yaku, ${terms.length} terms, ${questions.length} questions.`);
