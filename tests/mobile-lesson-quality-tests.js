import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('mobile-lesson-quality.css','utf8');

assert.ok(html.includes('mobile-lesson-quality.css'),'mobile lesson quality stylesheet must be loaded');
assert.ok(css.includes('@media(max-width:540px)'),'540px mobile breakpoint is required');
assert.ok(css.includes('@media(max-width:360px)'),'small iPhone-width breakpoint is required');
assert.ok(css.includes('.shape-tiles')&&css.includes('flex-wrap:nowrap'),'hand/shape rows must not wrap on mobile');
assert.ok(css.includes('overflow-x:auto'),'wide tile rows must remain horizontally scrollable');
assert.match(css,/\.tile-scroll\{[^}]*width:100%/,'the scroll container must stay within the viewport');
assert.match(css,/\.tile-scroll>\.tile-row/,'the tile row must be the horizontally wide inner element');
assert.ok(css.includes('.lesson-nav{flex-direction:column}'),'lesson navigation must stack on narrow screens');
assert.ok(css.includes('.tile{flex:0 0 auto}'),'tiles must not shrink inside hand rows');
assert.ok(css.includes('.term-links'),'lesson support term links must have mobile layout');
console.log('10 mobile lesson quality tests passed.');
