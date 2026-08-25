export function validateCalls(data,tiles,terms){
  const errors=[];
  const calls=data?.calls;
  if(!Array.isArray(calls)) return {ok:false,errors:[{code:'calls-array',message:'calls が配列ではありません。'}]};
  const ids=new Set();
  const tileCodes=new Set(tiles.map(t=>t.code));
  const termIds=new Set(terms.map(t=>t.id));
  for(const call of calls){
    if(ids.has(call.id)) errors.push({code:'duplicate-call-id',message:`鳴きIDが重複しています: ${call.id}`});
    ids.add(call.id);
    if(!termIds.has(call.termId)) errors.push({code:'unknown-call-term',message:`用語参照が存在しません: ${call.termId}`});
    if(!Array.isArray(call.from)||call.from.length===0) errors.push({code:'call-from',message:`鳴ける相手が未定義です: ${call.id}`});
    const used=[...(call.example?.hand??[]),call.example?.discard,...(call.example?.meld??[])].filter(Boolean);
    for(const code of used) if(!tileCodes.has(code)) errors.push({code:'unknown-call-tile',message:`未定義牌を参照しています: ${call.id} ${code}`});
  }
  const chi=calls.find(c=>c.id==='call-chi');
  if(chi&&!(chi.from.length===1&&chi.from[0]==='kamicha')) errors.push({code:'chi-source',message:'チーは上家のみである必要があります。'});
  return {ok:errors.length===0,errors};
}
