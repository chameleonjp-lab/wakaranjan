import {createTile} from '../components/tile.js';

const examples=[
  {title:'順子（シュンツ）',codes:['2m','3m','4m'],ok:true,desc:'同じ種類で数字が3つ続く組です。'},
  {title:'刻子（コーツ）',codes:['7p','7p','7p'],ok:true,desc:'同じ牌3枚の組です。'},
  {title:'対子（トイツ）',codes:['white','white'],ok:true,desc:'同じ牌2枚の組です。'},
  {title:'順子ではない',codes:['2s','3s','5s'],ok:false,desc:'数字が続いていないので順子ではありません。'}
];

function getTile(ctx,code){return ctx.tileByCode.get(code)||ctx.tileById.get(`tile-${code}`);}

export function renderIntro04(app,ctx){
  const lesson=ctx.lessonById.get('lesson-intro-04');
  app.innerHTML=`<section class="hero"><div class="eyebrow">入門 1-4</div><h1>${lesson.title}</h1><p>まず「3枚の組」と「同じ牌2枚」を見分けます。そのあとで正式な名前を覚えます。</p></section><section class="lesson-panel"><h2>組を見比べよう</h2><div id="shapeExamples" class="shape-grid"></div></section><section class="lesson-panel"><h2>完成形を5つに分ける</h2><p>基本のあがり形は、3枚の組が4つと、同じ牌2枚の組が1つです。</p><div id="completeHand" class="block-hand"></div><div class="callout">3枚の組を<strong>面子（メンツ）</strong>、最後の2枚組を<strong>雀頭（ジャントウ）</strong>と呼びます。</div></section><div class="action-row"><a class="secondary" href="#lesson-intro-03">前へ</a><a href="#lesson-intro-05">次へ</a></div>`;
  const grid=app.querySelector('#shapeExamples');
  examples.forEach(ex=>{
    const card=document.createElement('article');card.className='shape-card';card.innerHTML=`<h3>${ex.title}</h3><div class="shape-tiles"></div><p>${ex.desc}</p>`;
    ex.codes.forEach(c=>card.querySelector('.shape-tiles').append(createTile(getTile(ctx,c))));
    grid.append(card);
  });
  const blocks=[['1m','2m','3m'],['4p','5p','6p'],['2s','3s','4s'],['east','east','east'],['white','white']];
  blocks.forEach((codes,i)=>{const b=document.createElement('div');b.className='hand-block';b.setAttribute('aria-label',i<4?'3枚の組':'2枚の組');codes.forEach(c=>b.append(createTile(getTile(ctx,c))));app.querySelector('#completeHand').append(b);});
}
