import assert from 'node:assert/strict';
import {createRoundWall,createWall,deadWallRemaining,drawLiveTile,drawRinshanTile,drawTile,drawTiles,liveTilesRemaining,remainingTiles,revealDoraIndicator} from '../src/lib/tile-wall.js';

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

const roundWall=createRoundWall({random:()=>0});
assert.equal(liveTilesRemaining(roundWall),122,'a round wall keeps 122 live tiles');
assert.equal(deadWallRemaining(roundWall),14,'a round wall keeps a fourteen-tile dead wall');
const roundTiles=[...roundWall.live,...roundWall.rinshan,...roundWall.doraIndicators,...roundWall.uraIndicators];
assert.equal(roundTiles.length,136,'live and dead wall partitions contain all physical tiles');
assert.equal(new Set(roundTiles.map(tile=>tile.id)).size,136,'wall partitions do not duplicate physical tiles');

const initialRoundHand=drawTiles(roundWall.live,13);
assert.equal(initialRoundHand.length,13,'the round wall can deal an initial hand');
assert.equal(liveTilesRemaining(roundWall),109,'dealing thirteen leaves 109 live tiles');
const nextLive=roundWall.live[0];
assert.equal(drawLiveTile(roundWall)?.id,nextLive.id,'live draw uses the live wall');
assert.equal(liveTilesRemaining(roundWall),108,'live draw reduces only the live wall');

const firstDora=revealDoraIndicator(roundWall);
assert.ok(firstDora,'the first dora indicator can be revealed');
assert.equal(deadWallRemaining(roundWall),14,'revealing a dora indicator does not remove a physical dead-wall tile');
for(let index=0;index<3;index+=1)assert.ok(drawRinshanTile(roundWall),`rinshan draw ${index+1} is available`);
assert.ok(drawRinshanTile(roundWall),'the fourth rinshan draw is available');
assert.equal(drawRinshanTile(roundWall),null,'the fifth rinshan draw is unavailable');
assert.equal(deadWallRemaining(roundWall),10,'rinshan draws are tracked separately from live draws');
for(let index=1;index<5;index+=1)assert.ok(revealDoraIndicator(roundWall),`dora indicator ${index+1} is available`);
assert.equal(revealDoraIndicator(roundWall),null,'only five dora indicators are available');

console.log('✓ tile wall generation and draw contracts validated.');
