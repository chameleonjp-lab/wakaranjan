import assert from 'node:assert/strict';
import {createWall,drawTile,drawTiles,remainingTiles} from '../src/lib/tile-wall.js';

const CODES=[
  '1m','2m','3m','4m','5m','6m','7m','8m','9m',
  '1p','2p','3p','4p','5p','6p','7p','8p','9p',
  '1s','2s','3s','4s','5s','6s','7s','8s','9s',
  '1z','2z','3z','4z','5z','6z','7z'
];

const wall=createWall({random:()=>0});
assert.equal(wall.length,136,'standard wall has 136 physical tiles');
assert.equal(new Set(wall.map(tile=>tile.id)).size,136,'physical tiles have unique ids');

const counts=new Map();
for(const tile of wall)counts.set(tile.code,(counts.get(tile.code)||0)+1);
assert.deepEqual([...counts.keys()].sort(),[...CODES].sort(),'standard wall contains every tile code');
for(const code of CODES)assert.equal(counts.get(code),4,`${code} has four copies`);

const redTiles=wall.filter(tile=>tile.red);
assert.equal(redTiles.length,3,'standard wall contains three red fives');
assert.deepEqual(redTiles.map(tile=>tile.code).sort(),['5m','5p','5s'],'one red five per suit');

const hand=drawTiles(wall,13);
assert.equal(hand.length,13,'drawTiles draws the requested number while available');
assert.equal(remainingTiles(wall),123,'drawing thirteen tiles leaves 123 tiles');
const nextTile=wall[0];
assert.equal(drawTile(wall)?.id,nextTile.id,'drawTile removes the next tile');
assert.equal(remainingTiles(wall),122,'drawTile reduces the wall by one');

const shortWall=createWall({tileCodes:['1m','5m'],redFives:{man:1},random:()=>0});
assert.equal(shortWall.length,8,'custom tile sets still receive four copies');
assert.equal(shortWall.filter(tile=>tile.red).length,1,'custom red-five policy is respected');

const empty=[];
assert.equal(drawTile(empty),null,'drawing from an empty wall returns null');
assert.deepEqual(drawTiles(empty,3),[],'drawing from an empty wall returns no tiles');
assert.throws(()=>drawTiles([], -1),/non-negative integer/,'negative draw counts are rejected');
assert.throws(()=>createWall({random:()=>1}),/from 0/,'invalid random values are rejected');

console.log('✓ tile wall generation and draw contracts validated.');
