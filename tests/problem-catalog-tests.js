import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculateScore} from '../src/lib/score.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../src/data/questions/catalog.json',import.meta.url),'utf8'));
const yaku=JSON.parse(fs.readFileSync(new URL('../src/data/yaku.json',import.meta.url),'utf8')).yaku;
const lessons=JSON.parse(fs.readFileSync(new URL('../src/data/lessons.json',import.meta.url),'utf8')).lessons;
const yakuIds=new Set(yaku.map(x=>x.id));const lessonIds=new Set(lessons.map(x=>x.id));
let passed=0;function test(name,fn){fn();passed++;console.log(`✓ ${name}`)}

test('問題IDが重複せず48問以上ある',()=>{assert.ok(catalog.questions.length>=48);assert.equal(new Set(catalog.questions.map(q=>q.id)).size,catalog.questions.length)});
test('3カテゴリがあり各16問以上ある',()=>{assert.equal(catalog.categories.length,3);for(const c of catalog.categories)assert.ok(catalog.questions.filter(q=>q.category===c.id).length>=16,c.id)});
test('選択肢と正解番号が有効',()=>{for(const q of catalog.questions){assert.ok(Array.isArray(q.choices)&&q.choices.length>=2,q.id);assert.ok(Number.isInteger(q.answerIndex)&&q.answerIndex>=0&&q.answerIndex<q.choices.length,q.id);assert.ok(q.explanation?.length>=8,q.id)}});
test('参照する役と入門・初級教材が存在する',()=>{for(const q of catalog.questions){if(q.yakuRef)assert.ok(yakuIds.has(q.yakuRef),`${q.id}:${q.yakuRef}`);if(q.lessonRef&&q.lessonRef.startsWith('lesson-')&&!q.lessonRef.startsWith('lesson-intermediate-'))assert.ok(lessonIds.has(q.lessonRef),`${q.id}:${q.lessonRef}`)}});
test('点数問題のexpectedTotalが共通計算と一致する',()=>{for(const q of catalog.questions.filter(q=>q.category==='score')){const actual=calculateScore(q.scoreInput).total;assert.equal(actual,q.expectedTotal,`${q.id}: ${actual} !== ${q.expectedTotal}`);assert.ok(q.choices.some(c=>c.includes(String(q.expectedTotal))),`${q.id}: 正解点が選択肢にない`)}});
console.log(`\n${passed} problem-catalog tests passed.`);
