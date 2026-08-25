const KANJI_NUMBERS=['','一','二','三','四','五','六','七','八','九'];

export function tileFace(tile,{red=false}={}){
  if(tile.isHonor) return tile.nameJa;
  const n=KANJI_NUMBERS[tile.number]||String(tile.number);
  const suffix=tile.suit==='man'?'萬':tile.suit==='pin'?'筒':'索';
  return `${n}${suffix}`;
}

export function tileLabel(tile,{red=false}={}){
  return `${red?'赤':''}${tile.nameJa}、${tile.readingJa}`;
}

export function createTile(tile,{red=false,interactive=false,selected=false,drawn=false,onSelect}={}){
  const el=document.createElement(interactive?'button':'div');
  if(interactive) el.type='button';
  el.className=['tile',red?'red':'',selected?'selected':'',drawn?'drawn':''].filter(Boolean).join(' ');
  el.setAttribute('aria-label',tileLabel(tile,{red}));
  if(!interactive) el.setAttribute('role','img');
  el.dataset.tileId=tile.id;
  el.innerHTML=`<span class="tile-face">${tileFace(tile,{red})}</span><span class="tile-code" aria-hidden="true">${red?'赤 ':''}${tile.code}</span>`;
  if(interactive&&onSelect) el.addEventListener('click',()=>onSelect(tile,{red},el));
  return el;
}

export function appendTileRow(container,items,options={}){
  const row=document.createElement('div');
  row.className='tile-row';
  items.forEach((item,index)=>{
    const tile=item.tile||item;
    const red=Boolean(item.red);
    row.append(createTile(tile,{...options,red,drawn:options.drawnIndex===index,onSelect:options.onSelect?((t,o,el)=>options.onSelect(t,o,el,index)):undefined}));
  });
  container.append(row);
  return row;
}
