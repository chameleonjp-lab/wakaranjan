import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const app=read('src/app.js');
const beginnerCore=read('src/lessons/beginner-core.js');
const problemHub=read('src/questions/problem-hub.js');
const practiceHub=read('src/practice/practice-hub.js');
const fullRound=read('src/practice/full-round.js');
const eastRound=read('src/practice/east-round.js');
const tile=read('src/components/tile.js');
const ux=read('ux-reorganization.css');
const examples=JSON.parse(read('src/data/yaku-examples.json')).examples;
const beginnerYakuIds=JSON.parse(read('src/data/beginner-core.json')).beginnerYakuIds;

assert.match(app,/placeholder="名前を入力してください"/,'名前入力欄は固有名の例を表示しない');
assert.doesNotMatch(app,/placeholder="例：まさ"/,'古い名前の例が残っています');
assert.match(app,/if\(id==='lesson-beginner-05'\)keys\.push\('yakuExamples'/,'初級役に牌姿データを読み込む');
for(const id of beginnerYakuIds)assert.ok(examples[id],`${id} の初級役牌姿例がありません`);

assert.match(beginnerCore,/appendYakuExample\(a,y,ctx\)/,'初級役カードに牌姿例を追加する');
assert.match(problemHub,/problem-choice-area[\s\S]*problem-hand-area/,'牌姿問題は選択肢を手牌より先に描画する');
for(const source of [practiceHub,fullRound,eastRound])assert.match(source,/selection-area-choices[\s\S]*selection-area-hand/,'選択問題は選択肢を手牌より先に描画する');

assert.match(tile,/options\.rowClass/,'牌列の用途ごとのレイアウト指定を受け取る');
for(const source of [
  'src/lessons/beginner-01.js','src/lessons/beginner-02.js','src/lessons/intro-01.js',
  'src/lessons/intro-04.js','src/lessons/intro-05.js','src/lessons/intro-06.js',
  'src/practice/practice-hub.js','src/practice/wall-practice.js','src/practice/hand-flow.js',
  'src/practice/east-round.js','src/practice/full-round.js','src/practice/kan-practice.js',
  'src/tools/automatic-calculator.js','src/tools/yaku-guide.js'
])assert.match(read(source),/hand-fit-row|hand-fit-scroll/,`${source} に横一列の手牌指定がありません`);

assert.match(ux,/ruby\.mahjong-ruby\{[\s\S]*display:inline-block/,'ルビを独自のインライン要素として扱う');
assert.match(ux,/ruby\.mahjong-ruby rt\{[\s\S]*position:absolute/,'ルビを絶対配置して漢字の行送りを変えない');
assert.match(ux,/\.hand-fit-row\{[\s\S]*flex-wrap:nowrap/,'手牌は折り返さない');
assert.match(ux,/\.hand-fit-row\{[\s\S]*overflow:visible/, '横一列の手牌を横スクロールにしない');

console.log('✓ 名前例、初心者向け牌姿、選択肢の上下、手牌一列、ルビ固定配置を検査しました。');
