import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateScore,limitName} from '../src/lib/score.js';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const core=read('../src/data/scoring-core.json');
const review=read('../src/data/questions/intermediate/scoring-review.json');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};

const byId=new Map(review.questions.map(q=>[q.id,q]));
const number=s=>Number(String(s).replace(/[^0-9]/g,''));
function assertChoicePoints(id,input,expected){
  const q=byId.get(id);assert.ok(q,id);
  const result=calculateScore(input);assert.equal(result.total,expected,`${id}: engine`);
  assert.equal(number(q.choices[q.answerIndex]),expected,`${id}: review answer`);
  assert.ok(q.explanation.includes(expected.toLocaleString('ja-JP'))||q.explanation.includes(String(expected)),`${id}: explanation`);
}

test('中級教材と問題は同じ標準ルールを参照する',()=>{
  assert.equal(core.ruleset,'wakaranjan-standard-v1');assert.equal(review.ruleset,core.ruleset);
});

test('代表ロン点数を共通計算関数と問題で照合する',()=>{
  assertChoicePoints('question-intermediate-scoring-012',{han:3,fu:30,dealer:false,win:'ron'},3900);
  assertChoicePoints('question-intermediate-scoring-013',{han:3,fu:30,dealer:true,win:'ron'},5800);
  assertChoicePoints('question-intermediate-scoring-014',{han:3,fu:40,dealer:false,win:'ron'},5200);
});

test('切り上げ満貫の教材問題を共通計算関数と照合する',()=>{
  for(const [id,input] of [
    ['question-intermediate-scoring-015',{han:4,fu:30,dealer:false,win:'ron'}],
    ['question-intermediate-scoring-016',{han:3,fu:60,dealer:false,win:'ron'}]
  ]){
    const q=byId.get(id);const result=calculateScore(input);assert.equal(result.limit,'満貫',id);assert.equal(result.total,8000,id);assert.equal(q.choices[q.answerIndex],'満貫',id);assert.match(q.explanation,/切り上げ満貫/,id);
  }
});

test('満貫以上の区分表と計算関数が一致する',()=>{
  const cases=[
    ['満貫',5,30],['跳満',6,30],['跳満',7,30],['倍満',8,30],['倍満',10,30],['三倍満',11,30],['三倍満',13,30],['三倍満',20,30]
  ];
  for(const [name,han,fu] of cases)assert.equal(limitName(han,fu),name,`${han}翻`);
  const labels=new Set(core.limits.map(x=>x.name));for(const name of ['満貫','跳満','倍満','三倍満','役満'])assert.ok(labels.has(name),name);
});

test('教材の三倍満説明は数え役満なしの標準と矛盾しない',()=>{
  const lesson=core.lessons.find(x=>x.id==='lesson-intermediate-04');assert.ok(lesson);
  const text=[lesson.summary,...lesson.points].join('');assert.match(text,/11翻以上.*三倍満/);
  assert.equal(calculateScore({han:13,fu:30,dealer:false,win:'ron'}).limit,'三倍満');
  assert.equal(calculateScore({han:20,fu:30,dealer:true,win:'ron'}).total,36000);
});

test('七対子・待ち符の教材問題が教材データと一致する',()=>{
  assert.equal(byId.get('question-intermediate-scoring-004').choices[byId.get('question-intermediate-scoring-004').answerIndex],'25符');
  for(const id of ['wait-edge','wait-closed','wait-pair'])assert.equal(core.fuItems.find(x=>x.id===id)?.fu,2,id);
  assert.equal(byId.get('question-intermediate-scoring-005').choices[byId.get('question-intermediate-scoring-005').answerIndex],'2符');
});

console.log(`\n${passed} scoring content consistency tests passed.`);
