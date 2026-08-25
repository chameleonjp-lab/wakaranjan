const SUITS=['m','p','s'];
const TERMINAL_HONOR=/^[19][mps]$|^[1-7]z$/;
const HONOR=/^[1-7]z$/;

export function tileIndex(code){
  const m=code.match(/^([1-9])([mps])$/);
  if(m){const suit=SUITS.indexOf(m[2]);return suit*9+(Number(m[1])-1)}
  const z=code.match(/^([1-7])z$/);
  if(z)return 27+(Number(z[1])-1);
  return -1;
}
export function indexCode(i){
  if(i<27)return `${i%9+1}${SUITS[Math.floor(i/9)]}`;
  return `${i-26}z`;
}
export function countTiles(codes){
  const counts=Array(34).fill(0);
  for(const code of codes){const i=tileIndex(code);if(i<0)throw new Error(`unknown tile: ${code}`);counts[i]++;if(counts[i]>4)throw new Error(`${code} は4枚を超えています`)}
  return counts;
}
export function isTerminalOrHonor(code){return TERMINAL_HONOR.test(code)}
export function isHonor(code){return HONOR.test(code)}

function removeSet(counts,start,type){
  const next=[...counts];
  if(type==='triplet'){if(next[start]<3)return null;next[start]-=3;return next}
  if(start>=27||start%9>6)return null;
  if(next[start]&&next[start+1]&&next[start+2]){next[start]--;next[start+1]--;next[start+2]--;return next}
  return null;
}
function meldSearch(counts,melds,out){
  const first=counts.findIndex(n=>n>0);
  if(first<0){out.push(melds);return}
  const trip=removeSet(counts,first,'triplet');
  if(trip)meldSearch(trip,[...melds,{type:'triplet',tiles:[indexCode(first),indexCode(first),indexCode(first)]}],out);
  const seq=removeSet(counts,first,'sequence');
  if(seq)meldSearch(seq,[...melds,{type:'sequence',tiles:[indexCode(first),indexCode(first+1),indexCode(first+2)]}],out);
}
export function decomposeStandard(codes){
  if(codes.length!==14)return [];
  const counts=countTiles(codes);const out=[];
  for(let i=0;i<34;i++){
    if(counts[i]<2)continue;
    const rest=[...counts];rest[i]-=2;const melds=[];meldSearch(rest,[],melds);
    for(const m of melds)if(m.length===4)out.push({type:'standard',pair:indexCode(i),melds:m});
  }
  return out;
}
export function decomposeChiitoitsu(codes){
  if(codes.length!==14)return [];
  const counts=countTiles(codes);
  const pairs=counts.map((n,i)=>n===2?indexCode(i):null).filter(Boolean);
  return pairs.length===7&&counts.every(n=>n===0||n===2)?[{type:'chiitoitsu',pairs}]:[];
}
export function decomposeHand(codes){return [...decomposeStandard(codes),...decomposeChiitoitsu(codes)]}

export function waitCandidates(decomp,winTile){
  if(decomp.type==='chiitoitsu')return [{...decomp,wait:'tanki',winGroup:'pair'}];
  const variants=[];
  if(decomp.pair===winTile)variants.push({...decomp,wait:'tanki',winGroup:'pair'});
  decomp.melds.forEach((m,idx)=>{
    if(!m.tiles.includes(winTile))return;
    if(m.type==='triplet')variants.push({...decomp,wait:'shanpon',winGroup:idx});
    else{
      const nums=m.tiles.map(x=>Number(x[0])).sort((a,b)=>a-b);const n=Number(winTile[0]);
      let wait='ryanmen';
      if(n===nums[1])wait='kanchan';
      else if((nums[0]===1&&n===3)||(nums[2]===9&&n===7))wait='penchan';
      variants.push({...decomp,wait,winGroup:idx});
    }
  });
  return variants;
}
