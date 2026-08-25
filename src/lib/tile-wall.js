const DEFAULT_TILE_CODES = [
  '1m','2m','3m','4m','5m','6m','7m','8m','9m',
  '1p','2p','3p','4p','5p','6p','7p','8p','9p',
  '1s','2s','3s','4s','5s','6s','7s','8s','9s',
  '1z','2z','3z','4z','5z','6z','7z'
];

const DEFAULT_RED_FIVES = {man:1,pin:1,sou:1};

function suitOf(code){
  const suffix=code?.slice(-1);
  return suffix==='m'||suffix==='p'||suffix==='s'?suffix:null;
}

function suitName(suit){
  return suit==='m'?'man':suit==='p'?'pin':suit==='s'?'sou':null;
}

function redCountFor(redFives,suit){
  const value=Number(redFives?.[suit]||0);
  if(!Number.isInteger(value)||value<0||value>4)throw new RangeError(`redFives.${suit} must be an integer from 0 to 4`);
  return value;
}

function shuffled(tiles,random){
  for(let index=tiles.length-1;index>0;index-=1){
    const value=random();
    if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('random must return a number from 0 (inclusive) to 1 (exclusive)');
    const swapIndex=Math.floor(value*(index+1));
    [tiles[index],tiles[swapIndex]]=[tiles[swapIndex],tiles[index]];
  }
  return tiles;
}

function assertWall(wall){
  if(!Array.isArray(wall))throw new TypeError('wall must be an array');
}

/**
 * Create a shuffled four-player riichi mahjong wall.
 *
 * Each logical tile code appears four times. Red fives are represented by
 * the instance flag on the configured number of physical tiles.
 */
export function createWall({tileCodes=DEFAULT_TILE_CODES,redFives=DEFAULT_RED_FIVES,random=Math.random}={}){
  if(!Array.isArray(tileCodes)||tileCodes.length===0)throw new TypeError('tileCodes must be a non-empty array');
  if(typeof random!=='function')throw new TypeError('random must be a function');
  const codes=[...new Set(tileCodes)];
  if(codes.length!==tileCodes.length)throw new Error('tileCodes must not contain duplicates');
  const tiles=[];
  for(const code of codes){
    const suit=suitName(suitOf(code));
    const redCount=code.startsWith('5')&&suit?redCountFor(redFives,suit):0;
    for(let copy=0;copy<4;copy+=1){
      const red=copy<redCount;
      tiles.push({id:`${code}-${copy+1}${red?'r':''}`,code,red});
    }
  }
  return shuffled(tiles,random);
}

export function drawTile(wall){
  assertWall(wall);
  return wall.length?wall.shift():null;
}

export function drawTiles(wall,count){
  assertWall(wall);
  if(!Number.isInteger(count)||count<0)throw new RangeError('count must be a non-negative integer');
  const drawn=[];
  while(drawn.length<count){
    const tile=drawTile(wall);
    if(!tile)break;
    drawn.push(tile);
  }
  return drawn;
}

export function remainingTiles(wall){
  assertWall(wall);
  return wall.length;
}
