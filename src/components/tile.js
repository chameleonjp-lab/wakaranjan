const KANJI_NUMBERS=['','一','二','三','四','五','六','七','八','九'];
const PIN_POSITIONS={
  1:[[50,50]],2:[[34,32],[66,68]],3:[[32,28],[50,50],[68,72]],
  4:[[33,30],[67,30],[33,70],[67,70]],5:[[32,28],[68,28],[50,50],[32,72],[68,72]],
  6:[[32,24],[68,24],[32,50],[68,50],[32,76],[68,76]],
  7:[[50,18],[30,39],[70,39],[30,61],[70,61],[30,82],[70,82]],
  8:[[30,18],[70,18],[30,39],[70,39],[30,61],[70,61],[30,82],[70,82]],
  9:[[28,20],[50,20],[72,20],[28,50],[50,50],[72,50],[28,80],[50,80],[72,80]]
};
const SOU_POSITIONS={
  2:[[38,30],[62,70]],3:[[50,20],[34,68],[66,68]],4:[[36,30],[64,30],[36,70],[64,70]],
  5:[[34,25],[66,25],[50,50],[34,75],[66,75]],6:[[34,22],[66,22],[34,50],[66,50],[34,78],[66,78]],
  7:[[50,16],[32,39],[68,39],[32,62],[68,62],[32,84],[68,84]],
  8:[[32,18],[68,18],[32,40],[68,40],[32,62],[68,62],[32,84],[68,84]],
  9:[[28,20],[50,20],[72,20],[28,50],[50,50],[72,50],[28,80],[50,80],[72,80]]
};
const VALID_NUMBER_SUITS=new Set(['man','pin','sou']);
const VALID_HONORS=new Set(['east','south','west','north','white','green','red']);
function assertTileData(tile){
  if(!tile||typeof tile!=='object'||Array.isArray(tile)){
    const received=typeof tile==='string'?`文字列コード「${tile}」`:String(tile);
    throw new TypeError(`牌表示には牌データを渡してください。${received}を表示する場合は、先にctx.tileByCode.get(code)で変換します。`);
  }
  if(typeof tile.id!=='string'||typeof tile.code!=='string'||typeof tile.nameJa!=='string'||typeof tile.readingJa!=='string'){
    throw new TypeError('牌表示に必要なid、code、nameJa、readingJaが不足しています。');
  }
  if(tile.isHonor===true){
    if(tile.suit!=='honor'||!VALID_HONORS.has(tile.honor))throw new TypeError(`字牌データが不正です（${tile.code}）。`);
  }else if(!VALID_NUMBER_SUITS.has(tile.suit)||!Number.isInteger(tile.number)||tile.number<1||tile.number>9){
    throw new TypeError(`数牌データが不正です（${tile.code}）。`);
  }
  return tile;
}
function svgWrap(body){return `<svg class="tile-art" viewBox="0 0 100 120" aria-hidden="true" focusable="false">${body}</svg>`}
function manFace(n,red){const color=red?'#c72e2e':'#171b18';return svgWrap(`<text x="50" y="48" text-anchor="middle" class="man-number" fill="${color}">${KANJI_NUMBERS[n]}</text><text x="50" y="94" text-anchor="middle" class="man-suit" fill="#c72e2e">萬</text>`)}
function pinFace(n,red){const dots=PIN_POSITIONS[n].map(([x,y],i)=>{const palette=red?['#c72e2e','#c72e2e']:['#17624b','#c72e2e','#245f9e'];const c=palette[i%palette.length];return `<circle cx="${x}" cy="${y}" r="8.5" fill="none" stroke="${c}" stroke-width="4"/><circle cx="${x}" cy="${y}" r="2.7" fill="${c}"/>`}).join('');return svgWrap(dots)}
function bamboo(x,y,color='#176b45'){return `<g transform="translate(${x} ${y})"><path d="M0-11 C5-8 5-3 1 0 C6 4 5 9 0 12 C-5 9-6 4-1 0 C-5-3-5-8 0-11Z" fill="${color}"/><path d="M-4 0H4" stroke="#f8f2df" stroke-width="1.5"/></g>`}
function souFace(n,red){if(n===1)return svgWrap(`<g transform="translate(50 58)"><path d="M0-37 C14-27 20-12 14 1 C25 5 29 18 22 29 C13 22 7 14 4 5 C1 17-5 27-16 34 C-20 20-17 8-7 1 C-15-10-11-26 0-37Z" fill="#176b45"/><path d="M-5-18 C4-24 12-17 9-8 C3-4-3-7-5-18Z" fill="#c72e2e"/><circle cx="8" cy="-13" r="2.5" fill="#f8f2df"/></g>`);const marks=SOU_POSITIONS[n].map(([x,y],i)=>bamboo(x,y,red?'#c72e2e':(i%3===1?'#245f9e':'#176b45'))).join('');return svgWrap(marks)}
function honorFace(tile){if(tile.honor==='white')return svgWrap(`<rect x="24" y="20" width="52" height="76" rx="3" fill="none" stroke="#245f9e" stroke-width="4"/>`);const color=tile.honor==='red'?'#c72e2e':tile.honor==='green'?'#167044':'#171b18';return svgWrap(`<text x="50" y="80" text-anchor="middle" class="honor-glyph" fill="${color}">${tile.nameJa}</text>`)}
export function tileFace(tile,{red=false}={}){tile=assertTileData(tile);if(tile.isHonor)return honorFace(tile);if(tile.suit==='man')return manFace(tile.number,red);if(tile.suit==='pin')return pinFace(tile.number,red);return souFace(tile.number,red)}
export function tileLabel(tile,{red=false}={}){tile=assertTileData(tile);return `${red?'赤':''}${tile.nameJa}、${tile.readingJa}`}
export function createTile(tile,{red=false,interactive=false,selected=false,drawn=false,onSelect}={}){tile=assertTileData(tile);const el=document.createElement(interactive?'button':'div');if(interactive){el.type='button';el.setAttribute('aria-pressed',selected?'true':'false')}el.className=['tile',`tile-${tile.suit}`,red?'red':'',selected?'selected':'',drawn?'drawn':''].filter(Boolean).join(' ');el.setAttribute('aria-label',tileLabel(tile,{red}));if(!interactive)el.setAttribute('role','img');el.dataset.tileId=tile.id;el.innerHTML=`<span class="tile-face">${tileFace(tile,{red})}</span>`;if(interactive&&onSelect)el.addEventListener('click',()=>onSelect(tile,{red},el));return el}
export function appendTileRow(container,items,options={}){const row=document.createElement('div');row.className='tile-row';items.forEach((item,index)=>{const isPhysical=item&&typeof item==='object'&&Object.prototype.hasOwnProperty.call(item,'tile');const tile=isPhysical?item.tile:item;const red=isPhysical&&Boolean(item.red);row.append(createTile(tile,{...options,red,drawn:options.drawnIndex===index,onSelect:options.onSelect?((t,o,el)=>options.onSelect(t,o,el,index)):undefined}))});container.append(row);return row}
