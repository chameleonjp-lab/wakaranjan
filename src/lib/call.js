const TILE_CODE=/^(?:[1-9][mps]|[1-7]z)$/;
const CALL_SOURCES=['kamicha','toimen','shimocha'];

export const CALL_TYPES=Object.freeze(['chi','pon']);
export const CALL_SOURCES_LIST=Object.freeze([...CALL_SOURCES]);

function failure(code,message){return {ok:false,code,message};}

function countOf(codes,code){
  return codes.reduce((count,value)=>count+(value===code?1:0),0);
}

function validateCodes(codes,label){
  if(!Array.isArray(codes))return label+' must be an array';
  const counts=new Map();
  for(const code of codes){
    if(typeof code!=='string'||!TILE_CODE.test(code))return label+' に不正な牌コードがあります。';
    const next=(counts.get(code)||0)+1;
    if(next>4)return code+' は4枚を超えています。';
    counts.set(code,next);
  }
  return null;
}

function tileCodesFromMeld(meld){
  return Array.isArray(meld?.tiles)?meld.tiles.map(tile=>typeof tile==='string'?tile:tile?.code):null;
}

function validateMelds(melds){
  if(!Array.isArray(melds))return 'openMelds must be an array';
  for(const meld of melds){
    const error=validateCodes(tileCodesFromMeld(meld),'meld.tiles');
    if(error)return error;
  }
  return null;
}

function codeParts(code){
  const match=/^([1-9])([mps])$/.exec(code);
  return match?{number:Number(match[1]),suit:match[2]}:null;
}

function sortedSequence(codes){
  return [...codes].sort((a,b)=>Number(a[0])-Number(b[0]));
}

function normalizeChiTiles(discardTile,concealedTiles,callTiles){
  const options=chiOptions(discardTile,concealedTiles);
  if(callTiles===undefined||callTiles===null){
    if(options.length!==1)return null;
    return options[0];
  }
  if(!Array.isArray(callTiles)||callTiles.length!==3)return null;
  const normalized=sortedSequence(callTiles);
  return options.some(option=>option.join(',')===normalized.join(','))?normalized:null;
}

/**
 * Return every sequence that can be called from the discarded tile.
 * The discarded tile itself is included in each returned three-tile sequence.
 */
export function chiOptions(discardTile,concealedTiles=[]){
  if(typeof discardTile!=='string'||!TILE_CODE.test(discardTile))return [];
  if(!Array.isArray(concealedTiles))return [];
  const parts=codeParts(discardTile);
  if(!parts)return [];
  const options=[];
  for(let start=Math.max(1,parts.number-2);start<=Math.min(parts.number,7);start+=1){
    const sequence=[`${start}${parts.suit}`,`${start+1}${parts.suit}`,`${start+2}${parts.suit}`];
    if(sequence.includes(discardTile)&&sequence.filter(code=>code!==discardTile).every(code=>countOf(concealedTiles,code)>=1))options.push(sequence);
  }
  return options;
}

function makeMeld(type,callTiles,from){
  return {type,tiles:[...callTiles],open:true,kan:false,source:'discard',from};
}

/**
 * Validate a chi or pon without changing the hand or the wall.
 * For chi, callTiles selects the exact sequence when more than one sequence
 * can be made. The discarded tile must be included in that sequence.
 */
export function validateCall(input={}){
  if(!input||typeof input!=='object')return failure('invalid-input','鳴き判定の入力が不正です。');
  const {type,concealedTiles=[],openMelds=[],discardTile=null,from=null,ownTurn=false,callTiles}=input;
  if(!CALL_TYPES.includes(type))return failure('invalid-type','鳴きの種類が不正です。');
  if(ownTurn)return failure('response-turn-required','チー・ポンは他家の捨て牌に対して宣言します。');
  if(typeof discardTile!=='string'||!TILE_CODE.test(discardTile))return failure('invalid-discard','鳴きには他家の捨て牌が必要です。');
  if(!CALL_SOURCES.includes(from))return failure('invalid-source','鳴き元の位置が不正です。');
  const handError=validateCodes(concealedTiles,'concealedTiles');
  if(handError)return failure('invalid-hand',handError);
  const meldError=validateMelds(openMelds);
  if(meldError)return failure('invalid-melds',meldError);

  if(type==='pon'){
    if(countOf(concealedTiles,discardTile)<2)return failure('two-in-hand-required','ポンには捨て牌と同じ牌2枚が手元に必要です。');
    if(callTiles!==undefined&&(!Array.isArray(callTiles)||callTiles.length!==3||callTiles.some(code=>code!==discardTile)))return failure('invalid-call-tiles','ポンの牌指定が不正です。');
    const normalized=[discardTile,discardTile,discardTile];
    return {ok:true,code:'ok',message:'ポンできます。',tileCode:discardTile,callTiles:normalized,meld:makeMeld(type,normalized,from),from};
  }

  if(from!=='kamicha')return failure('chi-source-required','チーは上家の捨て牌からだけできます。');
  const normalized=normalizeChiTiles(discardTile,concealedTiles,callTiles);
  if(!normalized)return failure('invalid-chi-shape','チーに使う順子を指定してください。');
  return {ok:true,code:'ok',message:'チーできます。',tileCode:discardTile,callTiles:normalized,meld:makeMeld(type,normalized,from),from};
}

function removeCopies(codes,removeCodes){
  const remaining=[...removeCodes];
  const next=[];
  for(const code of codes){
    const index=remaining.indexOf(code);
    if(index>=0){remaining.splice(index,1);continue}
    next.push(code);
  }
  return remaining.length?null:next;
}

function cloneMeld(meld){
  return {...meld,tiles:Array.isArray(meld?.tiles)?[...meld.tiles]:meld?.tiles};
}

/**
 * Apply a validated chi or pon to immutable-looking hand/meld values.
 * The caller must then move the caller to the discard phase; no wall tile is
 * drawn for chi or pon.
 */
export function applyCall(input={}){
  const result=validateCall(input);
  if(!result.ok)return result;
  const concealedTiles=[...(input.concealedTiles||[])];
  const removeCodes=[...result.callTiles];
  removeCodes.splice(removeCodes.indexOf(result.tileCode),1);
  const removed=removeCopies(concealedTiles,removeCodes);
  if(!removed)return failure('apply-failed','鳴きに必要な牌を手牌から取り除けません。');
  const openMelds=(input.openMelds||[]).map(cloneMeld);
  const meld={...result.meld,tiles:[...result.callTiles]};
  return {
    ...result,
    concealedTiles:removed,
    openMelds:[...openMelds,meld],
    nextAction:'discard'
  };
}

export function callLabel(type){return type==='chi'?'チー':type==='pon'?'ポン':'鳴き';}
export function canDeclareCall(input={}){return validateCall(input);}
