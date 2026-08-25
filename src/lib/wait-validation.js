export function validateWaitData(waitData,tileData){
  const errors=[];
  const waits=waitData?.waitTypes;
  if(waitData?.schemaVersion!==1) errors.push({code:'wait-schema',message:'waits.schemaVersion は1である必要があります。'});
  if(!Array.isArray(waits)) return {ok:false,errors:[...errors,{code:'wait-array',message:'waitTypes が配列ではありません。'}]};
  const validCodes=new Set((tileData?.tiles??[]).map(t=>t.code));
  const ids=new Set();
  for(const item of waits){
    if(ids.has(item.id)) errors.push({code:'duplicate-wait-id',message:`待ちIDが重複しています: ${item.id}`});
    ids.add(item.id);
    if(!item.nameJa||!item.readingJa||!item.description||!item.point) errors.push({code:'wait-required',message:`説明項目が不足しています: ${item.id}`});
    if(!Array.isArray(item.shape)||item.shape.length===0) errors.push({code:'wait-shape-empty',message:`待ち部分がありません: ${item.id}`});
    if(!Array.isArray(item.waits)||item.waits.length===0) errors.push({code:'wait-answer-empty',message:`待ち牌がありません: ${item.id}`});
    for(const code of [...(item.shape??[]),...(item.waits??[])]) if(!validCodes.has(code)) errors.push({code:'wait-unknown-tile',message:`未定義の牌を参照しています: ${item.id} / ${code}`});
    if(new Set(item.waits??[]).size!==(item.waits??[]).length) errors.push({code:'wait-answer-duplicate',message:`待ち牌が重複しています: ${item.id}`});
  }
  const required=['wait-ryanmen','wait-kanchan','wait-penchan','wait-shanpon','wait-tanki'];
  for(const id of required) if(!ids.has(id)) errors.push({code:'wait-type-missing',message:`基本の待ちが不足しています: ${id}`});
  return {ok:errors.length===0,errors};
}
