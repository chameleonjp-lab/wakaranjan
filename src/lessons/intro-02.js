import {createTile} from '../components/tile.js';

const GROUPS=[
  ['man','萬子（マンズ）','一萬から九萬まで。数字の牌です。'],
  ['pin','筒子（ピンズ）','一筒から九筒まで。丸い模様を使う数字の牌です。'],
  ['sou','索子（ソーズ）','一索から九索まで。竹のような模様を使う数字の牌です。'],
  ['honor','字牌（ジハイ）','東・南・西・北・白・發・中の7種類です。']
];

export function renderIntro02(root,ctx){
  const lesson=ctx.lessonById.get('lesson-intro-02');
  root.innerHTML=`
    <header class="lesson-head"><div class="eyebrow">入門 1-2 ・ 約${lesson.estimatedMinutes}分</div><h1>${lesson.title}</h1><p class="lead">麻雀牌は大きく4種類に分けられます。全部を一度に暗記せず、種類ごとに見ていきます。</p></header>
    <section><h2 class="section-title">種類を選ぶ</h2><div class="category-tabs" id="tabs"></div><div class="panel"><h3 id="group-name"></h3><p id="group-help"></p><div id="tile-grid" class="tile-grid"></div></div></section>
    <section><h2 class="section-title">牌をタップして読みを確認</h2><div class="panel detail-card" id="detail"><div class="muted">上の牌を1枚タップしてください。</div></div></section>
    <section><h2 class="section-title">赤い5について</h2><div class="callout"><strong>赤5は別の種類ではありません。</strong><br>五萬・五筒・五索の特別な見た目です。通常の5と同じ数字の牌として数えます。</div><div id="red-demo" class="panel tile-row"></div></section>
    <section><h2 class="section-title">確認</h2><div class="panel"><p><strong>Q.</strong> 「字牌」だけに入っているものはどれ？</p><div id="quiz" class="quiz-options"><button type="button" data-code="3m">三萬</button><button type="button" data-code="1z">東</button><button type="button" data-code="7p">七筒</button></div><div id="feedback" class="feedback" hidden></div></div></section>
    <nav class="lesson-nav"><a class="secondary" href="#lesson-intro-01">前へ</a><a class="primary" href="#learn?level=intro">入門一覧へ</a></nav>`;

  const tabs=root.querySelector('#tabs'); const grid=root.querySelector('#tile-grid');
  GROUPS.forEach(([key,name])=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.group=key;b.setAttribute('aria-pressed',key==='man'?'true':'false');b.addEventListener('click',()=>showGroup(key));tabs.append(b);});

  function showDetail(tile,red=false){
    const detail=root.querySelector('#detail'); detail.innerHTML='';
    detail.append(createTile(tile,{red}));
    const copy=document.createElement('div');
    const type=tile.suit==='man'?'萬子':tile.suit==='pin'?'筒子':tile.suit==='sou'?'索子':'字牌';
    copy.innerHTML=`<h3>${red?'赤':''}${tile.nameJa}</h3><p><strong>${tile.readingJa}</strong></p><p>${type}${tile.number?`の${tile.number}`:''}</p><p class="muted">牌コード：${tile.code}</p>`;
    detail.append(copy);
  }
  function showGroup(key){
    tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===key)));
    const meta=GROUPS.find(g=>g[0]===key); root.querySelector('#group-name').textContent=meta[1]; root.querySelector('#group-help').textContent=meta[2]; grid.innerHTML='';
    ctx.tiles.filter(t=>t.suit===key).forEach(tile=>grid.append(createTile(tile,{interactive:true,onSelect:t=>showDetail(t)})));
  }
  const redDemo=root.querySelector('#red-demo'); ['5m','5p','5s'].forEach(code=>redDemo.append(createTile(ctx.tileByCode.get(code),{red:true,interactive:true,onSelect:t=>showDetail(t,true)})));
  root.querySelector('#quiz').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const f=root.querySelector('#feedback');f.hidden=false;if(b.dataset.code==='1z'){f.className='feedback good';f.textContent='正解。東は、数字を持たない「字牌」です。';}else{f.className='feedback bad';f.textContent='萬子・筒子・索子は数字の牌です。東・南・西・北・白・發・中が字牌です。';}});
  showGroup('man');
}
