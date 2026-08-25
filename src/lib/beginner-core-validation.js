export function validateBeginnerCore({data,tiles,yaku}){
  const errors=[];
  const push=(ok,code,message)=>{if(!ok)errors.push({code,message})};
  const tileCodes=new Set(tiles.map(t=>t.code));
  const yakuIds=new Set(yaku.map(y=>y.id));
  push(data?.schemaVersion===1,'schema','schemaVersion は 1 である必要があります。');
  push(Array.isArray(data?.riichi?.requirements)&&data.riichi.requirements.length>=4,'riichi-requirements','リーチ条件が不足しています。');
  push(Array.isArray(data?.furiten)&&data.furiten.length===3,'furiten-types','フリテンは基本3種類を定義してください。');
  if(Array.isArray(data?.furiten)){
    const ids=new Set();
    for(const f of data.furiten){push(!ids.has(f.id),'furiten-duplicate',`フリテンIDが重複しています: ${f.id}`);ids.add(f.id);push(Boolean(f.name&&f.description&&f.clears),'furiten-fields',`フリテン説明が不足しています: ${f.id}`)}
  }
  for(const id of data?.beginnerYakuIds??[]) push(yakuIds.has(id),'yaku-reference',`初級役IDが存在しません: ${id}`);
  const examples=data?.dora?.examples??[];
  push(examples.length>=5,'dora-examples','ドラ例は5件以上必要です。');
  for(const e of examples){push(tileCodes.has(e.indicator),'dora-indicator',`未定義のドラ表示牌です: ${e.indicator}`);push(tileCodes.has(e.dora),'dora-tile',`未定義のドラです: ${e.dora}`)}
  const expected={"9m":"1m","9p":"1p","9s":"1s","4z":"1z","7z":"5z"};
  for(const [indicator,dora] of Object.entries(expected)){
    const found=examples.find(e=>e.indicator===indicator);
    if(found) push(found.dora===dora,'dora-cycle',`${indicator} の次牌が不正です。期待: ${dora}`);
  }
  return {ok:errors.length===0,errors};
}
