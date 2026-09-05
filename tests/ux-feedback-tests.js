import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const app=read('src/app.js');
const beginnerCore=read('src/lessons/beginner-core.js');
const problemHub=read('src/questions/problem-hub.js');
const practiceHub=read('src/practice/practice-hub.js');
const fullRound=read('src/practice/full-round.js');
const eastRound=read('src/practice/east-round.js');
const beginnerOne=read('src/lessons/beginner-01.js');
const beginnerCoreSource=read('src/lessons/beginner-core.js');
const introFour=read('src/lessons/intro-04.js');
const introFive=read('src/lessons/intro-05.js');
const introSix=read('src/lessons/intro-06.js');
const dataLesson=read('src/lessons/data-lesson.js');
const introReview=read('src/questions/intro-review.js');
const intermediateScoring=read('src/lessons/intermediate-scoring.js');
const kanPractice=read('src/practice/kan-practice.js');
const handFlowScenarios=read('src/practice/hand-flow-scenarios.js');
const tile=read('src/components/tile.js');
const ux=read('ux-reorganization.css');
const catalog=JSON.parse(read('src/data/questions/catalog.json'));
const visualCatalog=JSON.parse(read('src/data/questions/visual-catalog.json'));
const examples=JSON.parse(read('src/data/yaku-examples.json')).examples;
const beginnerYakuIds=JSON.parse(read('src/data/beginner-core.json')).beginnerYakuIds;

assert.match(app,/placeholder="名前を入力してください"/,'名前入力欄は固有名の例を表示しない');
assert.doesNotMatch(app,/placeholder="例：まさ"/,'古い名前の例が残っています');
assert.match(app,/if\(id==='lesson-beginner-05'\)keys\.push\('yakuExamples'/,'初級役に牌姿データを読み込む');
for(const id of beginnerYakuIds)assert.ok(examples[id],`${id} の初級役牌姿例がありません`);

assert.match(beginnerCore,/appendYakuExample\(a,y,ctx\)/,'初級役カードに牌姿例を追加する');
assert.match(problemHub,/problem-hand-area[\s\S]*problem-choice-area/,'牌姿問題は手牌・場面を選択肢より先に描画する');
for(const source of [practiceHub,fullRound,eastRound])assert.match(source,/selection-area-hand[\s\S]*selection-area-choices/,'選択問題は手牌・場面を選択肢より先に描画する');
assert.match(beginnerOne,/selection-area-hand[\s\S]*selection-area-choices/,'待ちの確認は形を選択肢より先に描画する');
assert.doesNotMatch(problemHub,/Supabaseへ保存/,'問題ハブに保存基盤の説明を表示しない');
assert.match(problemHub,/data-topic/,'問題ハブから学習者向けの分類で出題できる');
assert.match(problemHub,/待ち牌（形だけ）[\s\S]*ロンできるか/,'待ち牌とロン可否を別の入口にする');
assert.match(practiceHub,/practice-group[\s\S]*はじめて[\s\S]*そのあと/,'対局練習を学習順にグループ化する');
assert.match(practiceHub,/renderRoundMenu[\s\S]*操作を覚える[\s\S]*判断して進める[\s\S]*流れを見る/,'一局系の練習を目的別の1入口にまとめる');
assert.match(practiceHub,/if\(mode==='round'\)return renderRoundMenu/,'一局の体験メニューへ遷移できる');
assert.doesNotMatch(practiceHub,/実装済み|状態層|次段階の基盤/,'対局練習ハブに開発者向け状態を表示しない');
assert.doesNotMatch(practiceHub,/5zを捨て|他家が5z/,'対局練習の本文に牌コードを表示しない');
for(const q of catalog.questions.filter(q=>q.id.startsWith('q-ron-001'))){assert.equal(q.topic,'text-review','文章で待ちを復習する問題を別トピックにする')}
for(const q of catalog.questions.filter(q=>q.id.match(/^q-ron-00[6-9]$|^q-ron-01[0-2]$/))){assert.equal(q.topic,'ron-decision','ロン可否の問題を待ちの形から分ける')}
for(const q of catalog.questions.filter(q=>q.id.match(/^q-ron-01[3-5]$/))){assert.equal(q.topic,'call-decision','鳴きの問題をロン可否から分ける')}
assert.equal(catalog.questions.find(q=>q.id==='q-ron-016')?.topic,'rule-decision','その他のルール判断を独立させる');
const visualWait=visualCatalog.questions.filter(q=>q.id.startsWith('q-visual-wait-'));
assert.ok(visualWait.filter(q=>q.topic==='wait-shape').length>=6,'牌タップの待ち問題を専用入口にそろえる');
assert.ok(visualWait.filter(q=>q.topic==='ron-decision').length>=2,'牌姿のロン可否問題を専用入口にそろえる');
for(const q of visualWait.filter(q=>q.topic==='wait-shape'))assert.ok(Array.isArray(q.focusTiles)&&q.focusTiles.length>=1,`${q.id} に待ちの形の焦点がありません`);
assert.equal(visualCatalog.questions.find(q=>q.id==='q-visual-ron-004')?.doraIndicator,'4m','ドラだけの問題にドラ表示牌を出す');
assert.match(problemHub,/session-mistakes[\s\S]*この問題をもう一度/,'結果画面から誤答問題を個別にやり直せる');
assert.match(problemHub,/同じ待ちをもう1問/,'待ちの誤答直後に同じ技能を再確認できる');
assert.match(introFour,/shapeCheck[\s\S]*確認/,'入門1-4に組の確認問題がある');
assert.match(introFive,/相手の捨て牌（ロン牌）/,'入門1-5でロン牌を手牌の外に表示する');
assert.match(introSix,/aria-current="step"[\s\S]*dataset\.wrong/,'入門1-6の進行表示と誤タップ表示を状態に連動させる');
assert.match(beginnerCoreSource,/visualDecision[\s\S]*1000点棒/,'リーチ教材に牌姿と供託の表示がある');
assert.match(beginnerCoreSource,/visualDecision[\s\S]*自分の河/,'フリテン教材に自分の河の牌姿がある');
assert.match(dataLesson,/lesson-check-visual[\s\S]*renderQuiz\(lesson,quality,ctx\)/,'データ教材の確認問題が直上の牌姿を再利用する');
assert.match(introReview,/createTile/,'入門総復習に牌タップの確認問題がある');
assert.match(introReview,/problem-hand-area[\s\S]*problem-choice-area/,'入門総復習は牌を選択肢より先に表示する');
assert.match(introReview,/正しい牌を1枚選んでください[\s\S]*正しい牌をすべて選んでください/,'入門総復習は選ぶ枚数を明示する');
assert.match(problemHub,/score-preset-link[\s\S]*この条件を計算機で確かめる/,'点数問題から条件付き計算機へ移動できる');
assert.doesNotMatch(app,/href="#practice\?mode=(?:round|east-round)"/,'メニューから一局の個別練習へ分岐させない');
assert.match(intermediateScoring,/scorePresetFromHash[\s\S]*URLSearchParams/,'点数計算画面が問題の条件を受け取れる');
assert.match(intermediateScoring,/id="yakuman"/,'点数計算画面が役満条件を扱える');
assert.doesNotMatch(kanPractice,/description:'[^']*(?:[1-9][mps]|[1-7]z)/,'カン練習の説明に牌コードを表示しない');
assert.doesNotMatch(handFlowScenarios,/description:'[^']*(?:[1-9][mps]|[1-7]z)/,'一局練習の説明に牌コードを表示しない');

assert.match(tile,/options\.rowClass/,'牌列の用途ごとのレイアウト指定を受け取る');
for(const source of [
  'src/lessons/beginner-01.js','src/lessons/beginner-02.js','src/lessons/intro-01.js',
  'src/lessons/intro-04.js','src/lessons/intro-05.js','src/lessons/intro-06.js',
  'src/practice/practice-hub.js','src/practice/wall-practice.js','src/practice/hand-flow.js',
  'src/practice/east-round.js','src/practice/full-round.js','src/practice/kan-practice.js',
  'src/tools/automatic-calculator.js','src/tools/yaku-guide.js'
])assert.match(read(source),/hand-fit-row|hand-fit-scroll/,`${source} に横一列の手牌指定がありません`);

assert.match(ux,/ruby\.mahjong-ruby\{[\s\S]*ruby-position:over/,'ルビを漢字の上へ表示する');
assert.match(ux,/ruby\.mahjong-ruby\{[\s\S]*ruby-align:center/,'ルビを漢字の中央へそろえる');
assert.doesNotMatch(ux,/ruby\.mahjong-ruby rt\{[^}]*position:absolute/,'ルビをブラウザごとの標準レイアウトで配置する');
assert.match(ux,/\.hand-fit-row\{[\s\S]*flex-wrap:nowrap/,'手牌は折り返さない');
assert.match(ux,/\.hand-fit-row\{[\s\S]*overflow:visible/, '横一列の手牌を横スクロールにしない');

console.log('✓ 名前例、初心者向け牌姿、選択肢の上下、手牌一列、ルビ固定配置を検査しました。');
