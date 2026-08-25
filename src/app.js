import {renderIntro01} from './lessons/intro-01.js';
import {renderIntro02} from './lessons/intro-02.js';

const app=document.querySelector('#app');

async function loadJson(path){
  const res=await fetch(path,{cache:'no-store'});
  if(!res.ok) throw new Error(`${path} の読み込みに失敗しました`);
  return res.json();
}

function renderHome(ctx){
  const intro=ctx.lessons.filter(l=>l.level==='intro').sort((a,b)=>a.order-b.order);
  app.innerHTML=`
    <section class="hero"><div class="eyebrow">麻雀を知らなくても大丈夫</div><h1>牌を触りながら、少しずつ覚える。</h1><p>最初は専門用語を覚えなくて構いません。「1枚取る、1枚捨てる」から始めます。</p></section>
    <h2 class="section-title">入門</h2>
    <div class="lesson-list">${intro.map(l=>`<a class="lesson-card" href="#${l.id}"><strong>${l.order}. ${l.title}</strong><small>約${l.estimatedMinutes}分${l.order>2?' ・ 準備中':''}</small></a>`).join('')}</div>
    <div class="callout" style="margin-top:18px">現在は入門1-1と1-2を実装しています。後続章は、同じ牌データと表示部品を使って順番に追加します。</div>`;
}

function renderUnavailable(id,ctx){
  const lesson=ctx.lessonById.get(id);
  app.innerHTML=`<section class="hero"><div class="eyebrow">準備中</div><h1>${lesson?.title||'このページ'}</h1><p>この章はまだ実装前です。前の章の内容は利用できます。</p><div class="action-row"><a class="secondary" href="#home">入門一覧へ戻る</a></div></section>`;
}

function route(ctx){
  const id=(location.hash||'#home').slice(1);
  if(id==='home') renderHome(ctx);
  else if(id==='lesson-intro-01') renderIntro01(app,ctx);
  else if(id==='lesson-intro-02') renderIntro02(app,ctx);
  else renderUnavailable(id,ctx);
  window.scrollTo({top:0,behavior:'auto'});
  app.focus({preventScroll:true});
}

async function start(){
  try{
    const [tileData,lessonData]=await Promise.all([
      loadJson('./src/data/tiles.json'),
      loadJson('./src/data/lessons.json')
    ]);
    const ctx={
      tiles:tileData.tiles,
      lessons:lessonData.lessons,
      tileByCode:new Map(tileData.tiles.map(t=>[t.code,t])),
      lessonById:new Map(lessonData.lessons.map(l=>[l.id,l]))
    };
    addEventListener('hashchange',()=>route(ctx));
    route(ctx);
  }catch(error){
    console.error(error);
    app.innerHTML='<section class="hero"><h1>教材を読み込めませんでした</h1><p>ページを再読み込みしてください。改善しない場合は、公開ファイルの配置を確認してください。</p></section>';
  }
}

start();
