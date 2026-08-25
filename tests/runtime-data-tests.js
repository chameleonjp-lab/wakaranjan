import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const readJson=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const appSource=readFileSync(join(root,'src/app.js'),'utf8');

function uniqueIds(items,label){
  const ids=items.map(item=>item.id);
  assert.equal(new Set(ids).size,ids.length,`${label} に重複IDがあります`);
  assert.ok(ids.every(id=>typeof id==='string'&&id.length>0),`${label} に空のIDがあります`);
  return new Set(ids);
}

const assetRefs=[...appSource.matchAll(/loadJson\(['\"](\.\/[^'\"]+)['\"]\)/g)].map(match=>match[1]);
assert.equal(new Set(assetRefs).size,assetRefs.length,'app.js が同じJSONを重複読込しています');
for(const ref of assetRefs){
  const path=ref.replace(/^\.\//,'');
  assert.equal(existsSync(join(root,path)),true,`app.js の読込先がありません: ${path}`);
  assert.doesNotThrow(()=>readJson(path),`JSONを読めません: ${path}`);
}

const tiles=readJson('src/data/tiles.json').tiles;
const tileIds=uniqueIds(tiles,'牌');
const tileCodes=new Set(tiles.map(tile=>tile.code));
assert.equal(tiles.length,34,'通常牌は34種類必要です');
assert.equal(tileCodes.size,34,'牌コードが重複しています');

const lessonData=readJson('src/data/lessons.json').lessons;
const scoringData=readJson('src/data/scoring-core.json').lessons.map(lesson=>({...lesson,level:'intermediate',estimatedMinutes:7}));
const dataLessons=[...readJson('src/data/advanced-special.json').lessons,...readJson('src/data/curriculum-extra.json').lessons];
const lessons=[...lessonData,...scoringData,...dataLessons];
const lessonIds=uniqueIds(lessons,'学習ページ');
assert.equal(lessons.length,38,'実行時に統合される章数が38章ではありません');
for(const lesson of lessons){
  for(const prerequisite of lesson.prerequisites||[])assert.equal(lessonIds.has(prerequisite),true,`${lesson.id} の前提ページがありません: ${prerequisite}`);
  for(const code of [...(lesson.hand||[]),...(lesson.river||[])])assert.equal(tileCodes.has(code),true,`${lesson.id} の牌コードがありません: ${code}`);
}

const terms=[...readJson('src/data/terms.json').terms,...readJson('src/data/terms-extra.json').terms];
const termIds=uniqueIds(terms,'用語');
assert.equal(terms.length,68,'実行時に統合される用語数が68語ではありません');
for(const term of terms){
  for(const related of term.relatedTerms||[])assert.equal(termIds.has(related),true,`${term.id} の関連用語がありません: ${related}`);
  for(const lessonRef of term.lessonRefs||[])assert.equal(lessonIds.has(lessonRef),true,`${term.id} の学習ページ参照がありません: ${lessonRef}`);
}

const quality=[...readJson('src/data/lesson-quality.json').lessons,...readJson('src/data/lesson-quality-advanced.json').lessons,...readJson('src/data/lesson-quality-core.json').lessons];
const dataLessonIds=new Set(dataLessons.map(lesson=>lesson.id));
const qualityIds=uniqueIds(quality,'教材品質');
assert.equal(quality.length,38,'全38章の教材品質データがそろっていません');
assert.deepEqual([...qualityIds].sort(),[...lessonIds].sort(),'教材品質データと学習ページの対象が一致しません');
for(const item of quality){
  assert.ok(item.objective?.trim(),`${item.id} の到達目標がありません`);
  assert.ok(Array.isArray(item.steps)&&item.steps.length>=3,`${item.id} の考える順番が3件未満です`);
  assert.ok(Array.isArray(item.mistakes)&&item.mistakes.length>=2,`${item.id} のよくある間違いが2件未満です`);
  assert.ok(Array.isArray(item.termRefs)&&item.termRefs.length>=2,`${item.id} の関連用語が2件未満です`);
  if(dataLessonIds.has(item.id))assert.ok(Array.isArray(item.checks)&&item.checks.length>=2,`${item.id} の確認問題が2件未満です`);
  for(const termRef of item.termRefs)assert.equal(termIds.has(termRef),true,`${item.id} の用語参照がありません: ${termRef}`);
}

const catalog=readJson('src/data/questions/catalog.json');
const visual=readJson('src/data/questions/visual-catalog.json');
const practical=readJson('src/data/questions/practical-rules.json');
const categories=[...catalog.categories,...practical.categories];
const categoryIds=uniqueIds(categories,'問題カテゴリ');
const questions=[...catalog.questions,...visual.questions,...practical.questions];
const questionIds=uniqueIds(questions,'問題');
assert.equal(questions.length,96,'実行時に統合される問題数が96問ではありません');
for(const question of questions){
  assert.equal(categoryIds.has(question.category),true,`${question.id} の問題分類がありません: ${question.category}`);
  assert.ok(Array.isArray(question.choices)&&question.choices.length>=2,`${question.id} の選択肢が不足しています`);
  assert.ok(Number.isInteger(question.answerIndex)&&question.answerIndex>=0&&question.answerIndex<question.choices.length,`${question.id} の正解番号が不正です`);
  assert.ok(question.explanation?.trim(),`${question.id} の解説がありません`);
  if(question.lessonRef)assert.equal(lessonIds.has(question.lessonRef),true,`${question.id} の解説参照がありません: ${question.lessonRef}`);
  if(question.handTiles)for(const code of question.handTiles)assert.equal(tileCodes.has(code),true,`${question.id} の手牌コードがありません: ${code}`);
  if(question.riverTiles)for(const code of question.riverTiles)assert.equal(tileCodes.has(code),true,`${question.id} の河コードがありません: ${code}`);
  if(question.winTile)assert.equal(tileCodes.has(question.winTile),true,`${question.id} のあがり牌コードがありません: ${question.winTile}`);
}

const yaku=readJson('src/data/yaku.json').yaku;
const yakuIds=uniqueIds(yaku,'役');
const examples=readJson('src/data/yaku-examples.json').examples;
for(const [yakuId,example] of Object.entries(examples)){
  assert.equal(yakuIds.has(yakuId),true,`役図鑑の例が未定義の役を参照しています: ${yakuId}`);
  for(const code of [...(example.tiles||[]),example.winTile])if(code)assert.equal(tileCodes.has(code),true,`${yakuId} の成立例に未定義牌があります: ${code}`);
}

assert.match(appSource,/const isDataLesson=ctx\.dataLessonById\.has\(id\)/,'データ駆動章の判定がありません');
assert.match(appSource,/else if\(isDataLesson\)renderDataLesson/,'データ駆動章のルートがありません');
assert.match(appSource,/if\(!isDataLesson\)attachLessonSupport\(app,ctx,id\);attachLessonProgress\(app,id\)/,'データ駆動章では補助教材だけを除外し、進捗表示を残す条件がありません');
for(const lesson of dataLessons)assert.ok(lessonIds.has(lesson.id),`${lesson.id} が統合教材に含まれていません`);

console.log(`✓ 実行時データ統合、参照、全38章の品質項目、96問、重複補助表示防止を検査しました。`);