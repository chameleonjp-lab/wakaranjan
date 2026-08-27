import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('../index.html');
const css=read('../accessibility.css');
const tile=read('../src/components/tile.js');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};

test('アクセシビリティCSSを最後に読み込む',()=>{
  assert.match(html,/interactive-problems\.css[\s\S]*accessibility\.css/);
});

test('ページ全体をlive regionにせず個別フィードバックだけ読み上げる',()=>{
  assert.match(html,/<main id="app" tabindex="-1"><\/main>/);
  assert.doesNotMatch(html,/<main[^>]*aria-live/);
});

test('主要操作には44px以上のタップ領域とfocus-visibleがある',()=>{
  assert.match(css,/min-height:44px/);assert.match(css,/:focus-visible/);assert.match(css,/outline:3px/);
});

test('小画面では主要操作を48px以上に広げる',()=>{
  assert.match(css,/@media\(max-width:540px\)/);assert.match(css,/min-height:48px/);
});

test('iOS操作と長い牌列の横スクロールを補助する',()=>{
  assert.match(css,/touch-action:manipulation/);assert.match(css,/-webkit-overflow-scrolling:touch/);assert.match(css,/overscroll-behavior-inline:contain/);
});

test('動きを減らす端末設定を尊重する',()=>{
  assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/animation-duration:\.001ms/);
});

test('入力欄はiPhoneで自動拡大しにくい16px以上を維持する',()=>{
  assert.match(css,/input\[type=search\],select\{min-height:44px;font-size:16px\}/);
});

test('操作可能な牌は選択状態をaria-pressedで公開する',()=>{
  assert.match(tile,/setAttribute\('aria-pressed',selected\?'true':'false'\)/);
});

console.log(`\n${passed} accessibility finishing tests passed.`);
