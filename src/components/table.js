import {tileElement} from './tile.js';

const seats=['south','west','north','east'];
const labels={south:'あなた（南）',west:'右の人（西）',north:'向かい（北）',east:'左の人（東）'};

export function renderSimpleTable(ctx,{interactive=false,onRegionSelect=null}={}){
  const wrap=document.createElement('section');
  wrap.className='mahjong-table';
  wrap.setAttribute('aria-label','簡略化した麻雀卓');

  const center=document.createElement('div');
  center.className='table-center';
  center.innerHTML='<strong>東1局</strong><span>場風：東</span>';
  wrap.append(center);

  for(const seat of seats){
    const region=document.createElement(interactive?'button':'div');
    if(interactive) region.type='button';
    region.className=`table-seat table-seat-${seat}`;
    region.dataset.region=seat==='south'?'hand':`seat-${seat}`;
    region.innerHTML=`<strong>${labels[seat]}</strong><small>${seat==='south'?'自風：南':'席'}</small>`;
    if(interactive) region.addEventListener('click',()=>onRegionSelect?.(region.dataset.region));
    wrap.append(region);
  }

  const river=document.createElement(interactive?'button':'div');
  if(interactive) river.type='button';
  river.className='table-river';
  river.dataset.region='river';
  river.innerHTML='<strong>河</strong><span class="river-tiles"></span>';
  ['9m','1p','east','7s'].forEach(code=>{
    const tile=ctx.tileByCode.get(code)||ctx.tileById?.get(`tile-${code}`);
    if(tile) river.querySelector('.river-tiles').append(tileElement(tile,{compact:true}));
  });
  if(interactive) river.addEventListener('click',()=>onRegionSelect?.('river'));
  wrap.append(river);

  const wall=document.createElement(interactive?'button':'div');
  if(interactive) wall.type='button';
  wall.className='table-wall';
  wall.dataset.region='wall';
  wall.innerHTML='<strong>山</strong><span>まだ取られていない牌</span>';
  if(interactive) wall.addEventListener('click',()=>onRegionSelect?.('wall'));
  wrap.append(wall);

  return wrap;
}
