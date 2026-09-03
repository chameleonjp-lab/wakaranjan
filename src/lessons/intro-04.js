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
  app.innerHTML=`<section class="hero"><div class="eyebrow">入門 1-4</div><h1>${lesson.title}</h1><p>まず「3枚の組」と「同じ牌2枚」を見分けます。そのあとで正式な名前を覚えます。</p></section><section class="lesson-panel"><h2>組を見比べよう</h2><div id="shapeExamples" class="shape-grid"></div><div id="shapeCheck" class="shape-check" aria-live="polite"></div></section><section class="lesson-panel"><h2>完成形を5つに分ける</h2><p>基本のあがり形は、3枚の組が4つと、同じ牌2枚の組が1つです。</p><div id="completeHand" class="block-hand hand-fit-scroll"></div><div class="callout">3枚の組を<strong>面子（メンツ）</strong>、最後の2枚組を<strong>雀頭（ジャントウ）</strong>と呼びます。</div></section><div class="action-row"><a class="secondary" href="#lesson-intro-03">前へ：手牌と卓</a><a class="primary" href="#lesson-intro-05">次へ：あがり</a></div>`;
  const grid=app.querySelector('#shapeExamples');
  examples.forEach(ex=>{
    const card=document.createElement('article');card.className='shape-card';card.innerHTML=`<h3>${ex.title}</h3><div class="shape-tiles hand-fit-row"></div><p>${ex.desc}</p>`;
    ex.codes.forEach(c=>card.querySelector('.shape-tiles').append(createTile(getTile(ctx,c))));
    grid.append(card);
  });
  const blocks=[['1m','2m','3m'],['4p','5p','6p'],['2s','3s','4s'],['east','east','east'],['white','white']];
  blocks.forEach((codes,i)=>{const b=document.createElement('div');b.className='hand-block';b.setAttribute('aria-label',i<4?'3枚の組':'2枚の組');codes.forEach(c=>b.append(createTile(getTile(ctx,c))));app.querySelector('#completeHand').append(b);});

  const checks=[
    {codes:['2m','3m','4m'],prompt:'この3枚の組は？',choices:['順子（シュンツ）','刻子（コーツ）'],answer:0},
    {codes:['7p','7p','7p'],prompt:'この3枚の組は？',choices:['順子（シュンツ）','刻子（コーツ）'],answer:1},
    {codes:['white','white'],prompt:'この2枚の組は？',choices:['雀頭（ジャントウ）','面子（メンツ）'],answer:0}
  ];
  let checkIndex=0;
  const checkBox=app.querySelector('#shapeCheck');
  const renderCheck=()=>{
    const check=checks[checkIndex];
    checkBox.innerHTML=`<h3>確認 ${checkIndex+1} / ${checks.length}</h3><p>${check.prompt}</p><div class="shape-check-tiles hand-fit-row"></div><div class="quiz-options"></div><div class="feedback" aria-live="polite"></div><div class="action-row"></div>`;
    check.codes.forEach(code=>checkBox.querySelector('.shape-check-tiles').append(createTile(getTile(ctx,code))));
    const options=checkBox.querySelector('.quiz-options');const feedback=checkBox.querySelector('.feedback');const actions=checkBox.querySelector('.action-row');
    check.choices.forEach((choice,index)=>{const button=document.createElement('button');button.type='button';button.textContent=choice;button.addEventListener('click',()=>{[...options.children].forEach(item=>item.disabled=true);const ok=index===check.answer;feedback.className=`feedback ${ok?'good':'bad'}`;feedback.innerHTML=`<strong>${ok?'正解':'不正解'}</strong><br>${ok?'この組の名前を確認できました。':`正解は「${check.choices[check.answer]}」です。牌の数と続き方を見直しましょう。`}`;const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=checkIndex===checks.length-1?'確認を終える':'次の確認';next.addEventListener('click',()=>{if(checkIndex<checks.length-1){checkIndex++;renderCheck()}else{checkBox.innerHTML='<p class="feedback good"><strong>3問の確認が終わりました。</strong><br>順子・刻子・雀頭の違いを、牌の形と名前で確認できました。</p>'}});actions.append(next)});options.append(button)});
  };
  renderCheck();
}
