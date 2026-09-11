import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const app=read('src/app.js');
const studyRecord=read('src/tools/study-record.js');
const teacherRecord=read('src/tools/teacher-record.js');
const cloudSync=read('src/lib/cloud-sync.js');
const beginnerCore=read('src/lessons/beginner-core.js');
const problemHub=read('src/questions/problem-hub.js');
const practiceHub=read('src/practice/practice-hub.js');
const fullRound=read('src/practice/full-round.js');
const eastRound=read('src/practice/east-round.js');
const roundFlow=read('src/practice/round-flow.js');
const beginnerOne=read('src/lessons/beginner-01.js');
const beginnerCoreSource=read('src/lessons/beginner-core.js');
const introFour=read('src/lessons/intro-04.js');
const introFive=read('src/lessons/intro-05.js');
const introSix=read('src/lessons/intro-06.js');
const dataLesson=read('src/lessons/data-lesson.js');
const introReview=read('src/questions/intro-review.js');
const beginnerReview=read('src/questions/beginner-review.js');
const intermediateScoring=read('src/lessons/intermediate-scoring.js');
const introTwo=read('src/lessons/intro-02.js');
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

assert.match(beginnerCore,/appendYakuExample\([^,]+,[^,]+,ctx\)/,'初級役カードに牌姿例を追加する');
assert.match(beginnerCore,/yaku-focus-visual[\s\S]*yaku-focus-options/,'初級役は牌姿を見てから役名を選ぶ');
assert.match(beginnerCore,/displayExampleHand[\s\S]*winTile/,'初級役の牌姿は13枚の手牌とあがり牌を分けて表示する');
assert.match(beginnerCore,/yaku-answer-name/,'初級役の答え合わせに役名と理由を表示する');
assert.match(problemHub,/problem-hand-area[\s\S]*problem-choice-area/,'牌姿問題は手牌・場面を選択肢より先に描画する');
for(const source of [practiceHub,fullRound,eastRound])assert.match(source,/selection-area-hand[\s\S]*selection-area-choices/,'選択問題は手牌・場面を選択肢より先に描画する');
assert.match(beginnerOne,/selection-area-hand[\s\S]*selection-area-choices/,'待ちの確認は形を選択肢より先に描画する');
assert.match(beginnerOne,/wait-focus-lesson[\s\S]*この形を見てみよう/,'待ちの教材は1つの形を見てから確認する');
assert.match(beginnerOne,/wait-overview/,'待ちの5種類は必要なときだけ一覧を開ける');
assert.match(beginnerOne,/class="wait-answer-name"/,'待ちの名前は答え合わせ後に表示する');
assert.doesNotMatch(beginnerOne,/先に見る：\$\{current\.nameJa\}/,'待ちの名前を選択前に表示して答えを教えない');
assert.doesNotMatch(problemHub,/Supabaseへ保存/,'問題ハブに保存基盤の説明を表示しない');
for(const source of [app,studyRecord,teacherRecord,cloudSync])assert.doesNotMatch(source,/Supabase/,'学習UIの同期状態に保存基盤名を表示しない');
assert.match(app,/名前と学習状態はオンラインに保存します/,'ホームに学習者向けの保存説明を表示する');
assert.match(problemHub,/data-topic/,'問題ハブから学習者向けの分類で出題できる');
assert.match(problemHub,/待ち牌（形だけ）[\s\S]*ロンできるか/,'待ち牌とロン可否を別の入口にする');
assert.match(problemHub,/文章で待ちを復習[\s\S]*文章でロンを復習/,'待ちの文章問題とロン可否の文章問題を分ける');
assert.match(problemHub,/selectWeakestScope[\s\S]*filterByScope/,'苦手・誤答復習を1つの分類へ絞る');
assert.match(problemHub,/待ち牌とロン可否は混ざりません/,'苦手練習のセッション分類を学習者へ約束する');
assert.match(practiceHub,/practice-group[\s\S]*はじめて[\s\S]*そのあと/,'対局練習を学習順にグループ化する');
assert.match(practiceHub,/renderRoundMenu[\s\S]*操作を覚える[\s\S]*判断して進める[\s\S]*流れを見る/,'一局系の練習を目的別の1入口にまとめる');
assert.match(practiceHub,/if\(mode==='round'\)return renderRoundMenu/,'一局の体験メニューへ遷移できる');
assert.doesNotMatch(practiceHub,/実装済み|状態層|次段階の基盤/,'対局練習ハブに開発者向け状態を表示しない');
assert.doesNotMatch(practiceHub,/5zを捨て|他家が5z/,'対局練習の本文に牌コードを表示しない');
assert.match(roundFlow,/今回わかったこと/,'局進行の完了画面に学習内容を表示する');
assert.doesNotMatch(roundFlow,/次に追加するもの|実際の牌山.*接続/,'局進行の完了画面に開発者向けの実装予定を表示しない');
assert.match(eastRound,/今回わかったこと/,'模擬東風戦の完了画面に学習内容を表示する');
assert.doesNotMatch(eastRound,/この版の範囲|次の段階/,'模擬東風戦の完了画面に開発者向けの実装範囲を表示しない');
for(const q of catalog.questions.filter(q=>q.id.startsWith('q-ron-001'))){assert.equal(q.topic,'text-review','文章で待ちを復習する問題を別トピックにする')}
for(const q of catalog.questions.filter(q=>q.id.match(/^q-ron-00[6-9]$|^q-ron-01[0-2]$/))){assert.equal(q.topic,'text-ron-review','文章でロンを復習する問題を牌姿のロン判断から分ける')}
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
assert.match(introTwo,/lesson-intro-03[\s\S]*次へ：手牌と卓/,'入門1-2から次の章へ連続して進める');
assert.match(intermediateScoring,/NAV_LABELS[\s\S]*前へ：\$\{NAV_LABELS\[prev\]\|\|[\s\S]*次へ：\$\{NAV_LABELS\[next\]\|\|/,'中級教材の前後ナビに章名を表示する');
assert.match(dataLesson,/lesson-check-visual[\s\S]*renderQuiz\(lesson,quality,ctx\)/,'データ教材の確認問題が直上の牌姿を再利用する');
assert.match(dataLesson,/lesson-flow[\s\S]*見る[\s\S]*解く/,'データ教材に見る・考える・解くの進み方を表示する');
assert.match(dataLesson,/quiz-prompt[\s\S]*lesson-check-visual-slot[\s\S]*quiz-options/,'データ教材は設問、視覚資料、選択肢の順に表示する');
assert.match(dataLesson,/panel-role[\s\S]*目標[\s\S]*panel-role[\s\S]*見る[\s\S]*panel-role[\s\S]*考える/,'データ教材の各パネルに役割ラベルを付ける');
assert.match(dataLesson,/interaction==='tile-pick'[\s\S]*tile-answer-submit/,'データ教材に牌をタップして確認する問題がある');
assert.match(dataLesson,/正しい牌を1枚選んでください[\s\S]*正しい牌をすべて選んでください/,'データ教材は選ぶ枚数を明示する');
assert.match(dataLesson,/session-mistakes[\s\S]*この問題をもう一度/,'データ教材の結果画面から誤答問題を個別にやり直せる');
assert.match(dataLesson,/この章をもう1問/,'データ教材の誤答直後に同じ章を再確認できる');
assert.match(introReview,/createTile/,'入門総復習に牌タップの確認問題がある');
assert.match(introReview,/problem-hand-area[\s\S]*problem-choice-area/,'入門総復習は牌を選択肢より先に表示する');
assert.match(introReview,/正しい牌を1枚選んでください[\s\S]*正しい牌をすべて選んでください/,'入門総復習は選ぶ枚数を明示する');
assert.match(beginnerReview,/createTile/,'初級総復習に牌タップの確認問題がある');
assert.match(beginnerReview,/problem-hand-area[\s\S]*problem-choice-area/,'初級総復習は牌を選択肢より先に表示する');
assert.match(beginnerReview,/正しい牌を1枚選んでください[\s\S]*正しい牌をすべて選んでください/,'初級総復習は選ぶ枚数を明示する');
assert.match(problemHub,/score-preset-link[\s\S]*この条件を計算機で確かめる/,'点数問題から条件付き計算機へ移動できる');
assert.doesNotMatch(app,/href="#practice\?mode=(?:round|east-round)"/,'メニューから一局の個別練習へ分岐させない');
assert.match(intermediateScoring,/scorePresetFromHash[\s\S]*URLSearchParams/,'点数計算画面が問題の条件を受け取れる');
assert.match(intermediateScoring,/id="yakuman"/,'点数計算画面が役満条件を扱える');
assert.doesNotMatch(kanPractice,/description:'[^']*(?:[1-9][mps]|[1-7]z)/,'カン練習の説明に牌コードを表示しない');
assert.doesNotMatch(handFlowScenarios,/description:'[^']*(?:[1-9][mps]|[1-7]z)/,'一局練習の説明に牌コードを表示しない');
assert.doesNotMatch(handFlowScenarios,/hint:'[^']*(?:[1-9][mps]|[1-7]z)/,'一局練習の案内に牌コードを表示しない');

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
assert.doesNotMatch(ux,/ruby\.mahjong-ruby rt\{[^}]*position:(?:absolute|relative)/,'ルビをブラウザごとの標準レイアウトで配置する');
assert.doesNotMatch(ux,/ruby\.mahjong-ruby rt\{[^}]*top:/,'ルビを手動オフセットで上下にずらさない');
assert.match(problemHub,/data-focus-label/,'牌姿の焦点に学習者向けラベルを付ける');
assert.match(ux,/visual-focus-note[\s\S]*content:attr\(data-focus-label\)/,'牌姿の焦点を文字ラベルでも識別できる');
assert.match(ux,/practice-discard-row[\s\S]*minmax\(44px/,'捨て牌操作の牌を44px以上に保つ');
assert.match(practiceHub,/state==='drawn'\?'practice-discard-row':'hand-fit-row'/,'捨て牌操作時だけ大きい牌列を使う');
assert.match(read('src/practice/wall-practice.js'),/turn==='discard'\?'practice-discard-row':'hand-fit-row'/,'牌山練習の捨て牌操作を大きくする');
assert.match(read('src/practice/hand-flow.js'),/canDiscard\?'practice-discard-row':'hand-fit-row'/,'一局練習の捨て牌操作を大きくする');
assert.match(ux,/\.hand-fit-row\{[\s\S]*flex-wrap:nowrap/,'手牌は折り返さない');
assert.match(ux,/\.hand-fit-row\{[\s\S]*overflow:visible/, '横一列の手牌を横スクロールにしない');

console.log('✓ 名前例、初心者向け牌姿、選択肢の上下、手牌一列、ルビ固定配置を検査しました。');
