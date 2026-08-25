const TILE_CODE=/^(?:[1-9][mps]|[1-7]z)$/;
const KAN_LABELS={ankan:'暗槓',minkan:'大明槓',kakan:'加槓'};
const KAN_SOURCES=['kamicha','toimen','shimocha'];

export const KAN_TYPES=Object.freeze(['ankan','minkan','kakan']);
export const KAN_SOURCES_LIST=Object.freeze([...KAN_SOURCES]);
export const MAX_KANS_PER_HAND=4;

function failure(code,message){return {ok:false,code,message};}

function countOf(codes,code){
  return codes.reduce((count,value)=>count+(value===code?1:0),0);
}

function validateCodes(codes,label){
  if(!Array.isArray(codes))return label+' must be an array';
  for(const code of codes){
    if(typeof code!=='string'||!TILE_CODE.test(code))return label+' に不正な牌コードがあります。';
  }
  const counts=new Map();
  for(const code of codes){
    const next=(counts.get(code)||0)+1;
    if(next>4)return code+' は4枚を超えています。';
    counts.set(code,next);
  }
  return null;
}

function validateMelds(melds){
  if(!Array.isArray(melds))return 'openMelds must be an array';
  for(const meld of melds){
    const error=validateCodes(meld?.tiles,'meld.tiles');
    if(error)return error;
  }
  return null;
}

function ponIndex(openMelds,code){
  return openMelds.findIndex(meld=>{
    const type=meld?.type==='pon'||(meld?.type==='triplet'&&meld?.callType==='pon');
    return type&&Array.isArray(meld.tiles)&&meld.tiles.length===3&&meld.tiles.every(tile=>tile===code);
  });
}

function makeMeld(type,code,from){
  const meld={type,tiles:[code,code,code,code],open:type!=='ankan',kan:true,source:type==='minkan'?'discard':type==='kakan'?'upgrade':'declared'};
  if(from)meld.from=from;
  return meld;
}

function accepted(type,code,extra={}){
  return {ok:true,code:'ok',message:KAN_LABELS[type]+'できます。',tileCode:code,meld:makeMeld(type,code,extra.from),...extra};
}

/**
 * Validate a kan declaration without changing the hand or wall.
 *
 * concealedTiles is the hand currently held by the player. For ankan and
 * kakan it includes the tile drawn for the current turn. For minkan, it is
 * the hand before taking the discarded tile.
 */
export function validateKan(input={}){
  if(!input||typeof input!=='object')return failure('invalid-input','カン判定の入力が不正です。');
  const {type,concealedTiles=[],openMelds=[],discardTile=null,from=null,ownTurn=true,kanCount=0,drawnTile=null}=input;
  if(!KAN_TYPES.includes(type))return failure('invalid-type','カンの種類が不正です。');
  if(!Number.isInteger(kanCount)||kanCount<0)return failure('invalid-kan-count','カン数が不正です。');
  if(kanCount>=MAX_KANS_PER_HAND)return failure('max-kans','この局では4回までしかカンできません。');
  if(typeof ownTurn!=='boolean')return failure('invalid-turn','手番情報が不正です。');
  const handError=validateCodes(concealedTiles,'concealedTiles');
  if(handError)return failure('invalid-hand',handError);
  const meldError=validateMelds(openMelds);
  if(meldError)return failure('invalid-melds',meldError);
  if(discardTile!==null){
    if(typeof discardTile!=='string'||!TILE_CODE.test(discardTile))return failure('invalid-discard','捨て牌のコードが不正です。');
  }
  if(drawnTile!==null){
    if(typeof drawnTile!=='string'||!TILE_CODE.test(drawnTile))return failure('invalid-drawn-tile','ツモ牌のコードが不正です。');
    if(!concealedTiles.includes(drawnTile))return failure('drawn-tile-missing','ツモ牌が手牌にありません。');
  }

  if(type==='ankan'){
    if(!ownTurn)return failure('own-turn-required','暗槓は自分のツモ番に宣言します。');
    const code=concealedTiles.find(tile=>countOf(concealedTiles,tile)===4);
    if(!code)return failure('four-of-a-kind-required','暗槓には同じ牌4枚が必要です。');
    return accepted(type,code,{drawnTile});
  }

  if(type==='minkan'){
    if(ownTurn)return failure('response-turn-required','大明槓は他家の捨て牌に対して宣言します。');
    if(!discardTile)return failure('discard-required','大明槓には他家の捨て牌が必要です。');
    if(!KAN_SOURCES.includes(from))return failure('invalid-source','大明槓の捨て牌は他家からのものに限ります。');
    if(countOf(concealedTiles,discardTile)<3)return failure('three-in-hand-required','大明槓には捨て牌と同じ牌3枚が手元に必要です。');
    return accepted(type,discardTile,{from});
  }

  if(!ownTurn)return failure('own-turn-required','加槓は自分のツモ番に宣言します。');
  const code=openMelds.map(meld=>Array.isArray(meld.tiles)?meld.tiles[0]:null).find(candidate=>candidate&&ponIndex(openMelds,candidate)>=0&&countOf(concealedTiles,candidate)>=1);
  if(!code)return failure('pon-upgrade-required','加槓には、手元の牌と同じポンが必要です。');
  const meldIndex=ponIndex(openMelds,code);
  return accepted(type,code,{meldIndex,drawnTile});
}

function removeCopies(codes,code,amount){
  let left=amount;
  const next=[];
  for(const value of codes){
    if(value===code&&left>0){left-=1;continue}
    next.push(value);
  }
  return left===0?next:null;
}

function cloneMeld(meld){
  return {...meld,tiles:Array.isArray(meld.tiles)?[...meld.tiles]:meld.tiles};
}

/**
 * Apply a validated kan to immutable-looking hand/meld values.
 *
 * The returned state signals that the caller must resolve one rinshan draw
 * and one additional dora indicator on the round wall.
 */
export function applyKan(input={}){
  const result=validateKan(input);
  if(!result.ok)return result;
  const concealedTiles=[...(input.concealedTiles||[])];
  const openMelds=(input.openMelds||[]).map(cloneMeld);
  const removed=removeCopies(concealedTiles,result.tileCode,result.meld.type==='minkan'?3:result.meld.type==='kakan'?1:4);
  if(!removed)return failure('apply-failed','カンに必要な牌を手牌から取り除けません。');
  let nextMelds=openMelds;
  if(result.meld.type==='kakan'){
    nextMelds=openMelds.map((meld,index)=>index===result.meldIndex?result.meld:meld);
  }else{
    nextMelds=[...openMelds,result.meld];
  }
  return {
    ...result,
    concealedTiles:removed,
    openMelds:nextMelds,
    kanCount:(input.kanCount??0)+1,
    nextAction:'draw-rinshan',
    pendingRinshan:true,
    pendingDoraIndicator:true
  };
}

export function kanLabel(type){return KAN_LABELS[type]||'カン';}
export function canDeclareKan(input={}){return validateKan(input);}
