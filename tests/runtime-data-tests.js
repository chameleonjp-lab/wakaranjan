import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const readText=path=>readFileSync(join(root,path),'utf8');
const readJson=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const manifest=readJson('src/data/manifest.json');
const appSource=readFileSync(join(root,'src/app.js'),'utf8');

function uniqueIds(items,label){
  const ids=items.map(item=>item.id);
  assert.equal(new Set(ids).size,ids.length,`${label} に重複IDがあります`);
  assert.ok(ids.every(id=>typeof id==='string'&&id.length>0),`${label} に空のIDがあります`);
  return new Set(ids);
}

const assetRefs=[...appSource.matchAll(/^\s+\w+:'(\.\/src\/data\/[^']+\.json)'[,]?$/gm)].map(match=>match[1]);
assert.equal(new Set(assetRefs).size,assetRefs.length,'app.js のデータ資産定義に重複があります');
assert.ok(assetRefs.length>=20,'app.js に必要なデータ資産の定義が不足しています');
for(const ref of assetRefs){
  const path=ref.replace(/^\.\//,'');
  assert.equal(existsSync(join(root,path)),true,`app.js の読込先がありません: ${path}`);
  assert.doesNotThrow(()=>readJson(path),`JSONを読めません: ${path}`);
}

const tiles=readJson('src/data/tiles.json').tiles;
const tileIds=uniqueIds(tiles,'牌');
const tileCodes=new Set(tiles.map(tile=>tile.code));

const rulesData=readJson('src/data/rules.json');
const standardRulesDoc=readText('docs/STANDARD_RULES.md');
assert.equal(rulesData.schemaVersion,1,'標準ルールのスキーマバージョンが不正です');
assert.ok(Array.isArray(rulesData.rulesets)&&rulesData.rulesets.length>=1,'標準ルールセットがありません');
const standardRules=rulesData.rulesets.find(rule=>rule.id==='wakaranjan-standard-v1');
assert.ok(standardRules,'ワカランジャン標準ルール v1 がありません');
assert.match(standardRulesDoc,new RegExp(standardRules.displayNameJa.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'標準ルール文書と実行データの版が一致していません');
assert.equal(standardRules.scope.players,4,'標準ルールは4人麻雀である必要があります');
assert.equal(standardRules.scope.tileCount,136,'標準ルールの使用牌は136枚である必要があります');
assert.equal(Object.values(standardRules.scope.redFives).reduce((sum,value)=>sum+value,0),3,'赤牌は3枚である必要があります');
assert.deepEqual(standardRules.scoring.redDoraByType,{ '5m':1,'5p':1,'5s':1},'赤牌は牌の種類ごとに管理する必要があります');
assert.equal(standardRules.scoring.renpuuPairFu,2,'連風牌の雀頭は2符である必要があります');
assert.equal(standardRules.winning.furitenRon,false,'フリテン時のロンは不可である必要があります');
assert.equal(standardRules.scoring.kazoeYakuman,false,'数え役満は標準ルールで不採用です');
assert.equal(standardRules.multipleRon,'head-bump','同時ロンは頭ハネである必要があります');
assert.ok(standardRules.notes.length>=3,'標準ルールの補足が不足しています');
assert.equal(tiles.length,34,'通常牌は34種類必要です');
assert.equal(tileCodes.size,34,'牌コードが重複しています');

const lessonData=readJson('src/data/lessons.json').lessons;
const scoringData=readJson('src/data/scoring-core.json').lessons.map(lesson=>({...lesson,level:'intermediate',estimatedMinutes:7}));
const dataLessons=[...readJson('src/data/advanced-special.json').lessons,...readJson('src/data/curriculum-extra.json').lessons];
const lessons=[...lessonData,...scoringData,...dataLessons];
const lessonIds=uniqueIds(lessons,'学習ページ');
const lessonIndex=manifest.lessonIndex;
const lessonIndexIds=uniqueIds(lessonIndex,'ホーム用教材索引');
assert.equal(manifest.expected.lessonCount,38,'manifestの教材数が38章ではありません');
assert.equal(lessonIndex.length,38,'ホーム用教材索引の章数が38章ではありません');
assert.deepEqual([...lessonIndexIds].sort(),[...lessonIds].sort(),'ホーム用教材索引と実行時教材のIDが一致しません');
for(const item of lessonIndex){
  assert.ok(['lessons','scoringCore','advancedSpecial','curriculumExtra'].includes(item.source),item.id+' の教材本文元が不正です');
  assert.ok(item.level&&Number.isInteger(item.order)&&item.title&&Number.isInteger(item.estimatedMinutes),item.id+' のホーム用メタデータが不足しています');
}
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
  if(question.interaction==='tile-pick'){
    assert.equal(question.answerType,'tile_select',`${question.id} の牌選択形式が不正です`);
    assert.ok(Array.isArray(question.tileChoices)&&question.tileChoices.length>=2,`${question.id} の牌選択肢が不足しています`);
    assert.ok(Array.isArray(question.answerTileCodes)&&question.answerTileCodes.length>=1,`${question.id} の正解牌がありません`);
    assert.ok(question.answerTileCodes.every(code=>question.tileChoices.includes(code)),`${question.id} の正解牌が選択肢にありません`);
    assert.equal(question.choiceTileCodes.length,question.choices.length,`${question.id} の文章選択肢との対応がありません`);
  }
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

assert.match(appSource,/ASSET_PATHS[\s\S]+rules:'\.\/src\/data\/rules\.json'/,'標準ルールJSONをapp.jsが読み込める資産として定義していません');
assert.match(appSource,/const INITIAL_ASSETS=\['manifest','rules'\]/,'ホームで教材本文を初回取得しています');
assert.match(appSource,/lessonIndexById/,'教材索引から本文データを選ぶ処理がありません');
assert.match(appSource,/QUALITY_ASSET_BY_SOURCE/,'章ごとの品質データ対応表がありません');
for(const mapping of ["lessons:'coreQuality'","scoringCore:'coreQuality'","advancedSpecial:'advancedQuality'","curriculumExtra:'lessonQuality'"])assert.match(appSource,new RegExp(mapping),mapping+' の品質データ対応がありません');
assert.match(appSource,/routeAssetKeys\(id,ctx\)/,'章ごとの本文遅延読み込み元がありません');
assert.match(appSource,/ensureAssets\(ctx,keys\)/,'画面ごとの遅延読み込み処理がありません');
assert.match(appSource,/routeAssetKeys/,'ルートごとのデータ資産指定がありません');
assert.doesNotMatch(appSource,/cache:'no-store'/,'データ資産を毎回キャッシュ無効で読み込んでいます');
assert.match(appSource,/version=DATASET_VERSION,cache='default'/,'データ資産の通常キャッシュ指定がありません');
assert.match(appSource,/\{cache\}/,'指定したキャッシュ方式をfetchへ渡していません');
assert.match(appSource,/ASSET_PATHS\.manifest,DATASET_VERSION,'no-cache'/,'manifestを再検証していません');
assert.match(appSource,/import \{renderStudyRecord\} from '\.\/tools\/study-record\.js'/,'学習記録ページをapp.jsが読み込んでいません');
assert.match(appSource,/import \{renderPracticeHub\} from '\.\/practice\/practice-hub\.js'/,'対局練習ページをapp.jsが読み込んでいません');
assert.match(appSource,/['\"]practice['\"]:\(\)=>renderPracticeHub/,'対局練習ページのルートがありません');
assert.match(appSource,/href="#practice"/,'ホームから対局練習への導線がありません');
assert.equal(existsSync(join(root,'src/practice/practice-hub.js')),true,'対局練習モジュールがありません');
const practiceSource=readFileSync(join(root,'src/practice/practice-hub.js'),'utf8');
for(const mode of ['draw-discard','calls','riichi','furiten','east-round','hand-flow'])assert.match(practiceSource,new RegExp(mode),`${mode}の練習がありません`);
assert.match(practiceSource,/renderEastRound/,'模擬東風戦の描画関数が接続されていません');
assert.match(practiceSource,/renderHandFlow/,'一局の実牌進行の描画関数が接続されていません');
assert.equal(existsSync(join(root,'src/practice/hand-flow.js')),true,'一局の実牌進行モジュールがありません');
assert.equal(existsSync(join(root,'src/practice/east-round.js')),true,'模擬東風戦モジュールがありません');
const eastRoundSource=readFileSync(join(root,'src/practice/east-round.js'),'utf8');
assert.match(eastRoundSource,/calculateScore/,'模擬東風戦が共通点数計算を使っていません');
assert.match(eastRoundSource,/EAST_ROUNDS/,'模擬東風戦の局データがありません');
assert.match(appSource,/['\"]study-record['\"]:\(\)=>renderStudyRecord/,'学習記録ページのルートがありません');
assert.match(appSource,/href="#study-record"/,'ホームから学習記録への導線がありません');
assert.equal(existsSync(join(root,'src/tools/study-record.js')),true,'学習記録ページのモジュールがありません');
assert.match(appSource,/import \{renderSettings\} from '\.\/tools\/settings\.js'/,'設定ページをapp.jsが読み込んでいません');
assert.match(appSource,/['"]settings['"]:\(\)=>renderSettings/,'設定ページのルートがありません');
assert.equal(existsSync(join(root,'src/tools/settings.js')),true,'設定ページのモジュールがありません');
assert.match(appSource,/import \{renderTeacherRecord\} from '\.\/tools\/teacher-record\.js'/,'家庭・先生向けページをapp.jsが読み込んでいません');
assert.match(appSource,/['"]teacher-record['"]:\(\)=>renderTeacherRecord/,'家庭・先生向けページのルートがありません');
assert.equal(existsSync(join(root,'src/tools/teacher-record.js')),true,'家庭・先生向けページのモジュールがありません');
assert.match(appSource,/import \{renderPrintMaterials\} from '\.\/tools\/print-materials\.js'/,'印刷用教材をapp.jsが読み込んでいません');
assert.match(appSource,/['"]print-materials['"]:\(\)=>renderPrintMaterials/,'印刷用教材のルートがありません');
assert.equal(existsSync(join(root,'src/tools/print-materials.js')),true,'印刷用教材のモジュールがありません');
const problemHubSource=readFileSync(join(root,'src/questions/problem-hub.js'),'utf8');
assert.match(problemHubSource,/export function getProblemStudyRecord/,'問題の学習記録取得関数がありません');
assert.match(problemHubSource,/export function clearProblemStudyRecord/,'問題の学習記録削除関数がありません');
assert.match(appSource,/['\"]rules['\"]:\(\)=>renderRules/,'標準ルールページのルートがありません');
assert.match(appSource,/rulesets,/,'標準ルールセットが実行時コンテキストにありません');
assert.match(appSource,/standardRules:rulesets\.find/,'標準ルールの選択が実行時コンテキストにありません');
assert.equal(existsSync(join(root,'src/tools/rules.js')),true,'標準ルールページのモジュールがありません');
assert.match(appSource,/const isDataLesson=ctx\.dataLessonById\.has\(id\)/,'データ駆動章の判定がありません');
assert.match(appSource,/else if\(isDataLesson\)renderDataLesson/,'データ駆動章のルートがありません');
assert.match(appSource,/if\(!isDataLesson\)attachLessonSupport\(app,ctx,id\);attachLessonProgress\(app,id\)/,'データ駆動章では補助教材だけを除外し、進捗表示を残す条件がありません');
for(const lesson of dataLessons)assert.ok(lessonIds.has(lesson.id),`${lesson.id} が統合教材に含まれていません`);

console.log(`✓ 実行時データ統合、参照、全38章の品質項目、96問、重複補助表示防止を検査しました。`);
