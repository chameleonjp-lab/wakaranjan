import {renderIntro01} from './lessons/intro-01.js';
import {renderIntro02} from './lessons/intro-02.js';
import {renderIntro03} from './lessons/intro-03.js';
import {renderIntro04} from './lessons/intro-04.js';
import {renderIntro05} from './lessons/intro-05.js';
import {renderIntro06} from './lessons/intro-06.js';
import {renderIntroReview} from './questions/intro-review.js';
import {renderBeginnerReview} from './questions/beginner-review.js';
import {renderBeginner01} from './lessons/beginner-01.js';
import {renderBeginner02} from './lessons/beginner-02.js';
import {renderBeginner03,renderBeginner04,renderBeginner05,renderBeginner06} from './lessons/beginner-core.js';
import {renderIntermediate01,renderIntermediate02,renderIntermediate03,renderIntermediate04,renderIntermediate05} from './lessons/intermediate-scoring.js';
import {renderIntermediateReview} from './questions/intermediate-review.js';
import {renderAutomaticCalculator} from './tools/automatic-calculator.js';

const app=document.querySelector('#app');

async function loadJson(path){
  const res=await fetch(path,{cache:'no-store'});
  if(!res.ok) throw new Error(`${path} の読み込みに失敗しました`);
  return res.json();
}

function renderLessonList(items){return `<div class="lesson-list">${items.map(l=>`<a class="lesson-card" href="#${l.id}"><strong>${l.order}. ${l.title}</strong><small>約${l.estimatedMinutes||7}分</small></a>`).join('')}</div>`}

function renderHome(ctx){
  const intro=ctx.lessons.filter(l=>l.level==='intro').sort((a,b)=>a.order-b.order);
  const beginner=ctx.lessons.filter(l=>l.level==='beginner').sort((a,b)=>a.order-b.order);
  const intermediate=ctx.lessons.filter(l=>l.level==='intermediate').sort((a,b)=>a.order-b.order);
  app.innerHTML=`
    <section class="hero"><div class="eyebrow">麻雀を知らなくても大丈夫</div><h1>牌を触りながら、少しずつ覚える。</h1><p>「1枚取る、1枚捨てる」から始め、役と点数まで順番に進みます。</p></section>
    <h2 class="section-title">入門</h2>${renderLessonList(intro)}
    <h2 class="section-title">入門の総復習</h2><a class="lesson-card" href="#intro-review"><strong>ランダム12問に挑戦</strong><small>15問から出題します</small></a>
    <h2 class="section-title">初級</h2>${renderLessonList(beginner)}
    <h2 class="section-title">初級の総復習</h2><a class="lesson-card" href="#beginner-review"><strong>ランダム12問に挑戦</strong><small>待ち・鳴き・リーチ・フリテン・役・ドラを横断します</small></a>
    <h2 class="section-title">中級：点数計算の基礎</h2>${renderLessonList(intermediate)}
    <h2 class="section-title">中級 点数計算の総復習</h2><a class="lesson-card" href="#intermediate-review"><strong>ランダム12問に挑戦</strong><small>翻・符・親子・ロン/ツモ・満貫以上を確認します</small></a>
    <h2 class="section-title">点数計算</h2><a class="lesson-card" href="#automatic-calculator"><strong>牌を14枚並べて自動計算（試作）</strong><small>門前の通常形・七対子から役、符、点数を自動判定します</small></a>
    <div class="callout" style="margin-top:18px">入門と初級、中級の点数計算基礎に加え、自動計算の試作版を利用できます。</div>`;
}

function renderUnavailable(id,ctx){
  const lesson=ctx.lessonById.get(id);
  app.innerHTML=`<section class="hero"><div class="eyebrow">準備中</div><h1>${lesson?.title||'このページ'}</h1><p>この章はまだ実装前です。</p><div class="action-row"><a class="secondary" href="#home">一覧へ戻る</a></div></section>`;
}

function route(ctx){
  const id=(location.hash||'#home').slice(1);
  const routes={
    'lesson-intro-01':()=>renderIntro01(app,ctx),'lesson-intro-02':()=>renderIntro02(app,ctx),'lesson-intro-03':()=>renderIntro03(app,ctx),'lesson-intro-04':()=>renderIntro04(app,ctx),'lesson-intro-05':()=>renderIntro05(app,ctx),'lesson-intro-06':()=>renderIntro06(app,ctx),
    'intro-review':()=>renderIntroReview(app,ctx),'lesson-beginner-01':()=>renderBeginner01(app,ctx),'lesson-beginner-02':()=>renderBeginner02(app,ctx),'lesson-beginner-03':()=>renderBeginner03(app,ctx),'lesson-beginner-04':()=>renderBeginner04(app,ctx),'lesson-beginner-05':()=>renderBeginner05(app,ctx),'lesson-beginner-06':()=>renderBeginner06(app,ctx),'beginner-review':()=>renderBeginnerReview(app,ctx),
    'lesson-intermediate-01':()=>renderIntermediate01(app,ctx),'lesson-intermediate-02':()=>renderIntermediate02(app,ctx),'lesson-intermediate-03':()=>renderIntermediate03(app,ctx),'lesson-intermediate-04':()=>renderIntermediate04(app,ctx),'lesson-intermediate-05':()=>renderIntermediate05(app,ctx),'intermediate-review':()=>renderIntermediateReview(app,ctx),
    'automatic-calculator':()=>renderAutomaticCalculator(app,ctx)
  };
  if(id==='home')renderHome(ctx);else (routes[id]||(()=>renderUnavailable(id,ctx)))();
  window.scrollTo({top:0,behavior:'auto'});app.focus({preventScroll:true});
}

async function start(){
  try{
    const [tileData,lessonData,introReview,beginnerReview,waitData,callData,beginnerCore,yakuData,scoringCore,intermediateReview]=await Promise.all([
      loadJson('./src/data/tiles.json'),loadJson('./src/data/lessons.json'),loadJson('./src/data/questions/intro/review.json'),loadJson('./src/data/questions/beginner/review.json'),loadJson('./src/data/waits.json'),loadJson('./src/data/calls.json'),loadJson('./src/data/beginner-core.json'),loadJson('./src/data/yaku.json'),loadJson('./src/data/scoring-core.json'),loadJson('./src/data/questions/intermediate/scoring-review.json')
    ]);
    const intermediateLessons=scoringCore.lessons.map(x=>({...x,level:'intermediate',estimatedMinutes:7}));
    const lessons=[...lessonData.lessons,...intermediateLessons];
    const ctx={tiles:tileData.tiles,lessons,introReview,beginnerReview,intermediateReview,waitTypes:waitData.waitTypes,calls:callData.calls,beginnerCore,scoringCore,yaku:yakuData.yaku,tileByCode:new Map(tileData.tiles.map(t=>[t.code,t])),tileById:new Map(tileData.tiles.map(t=>[t.id,t])),lessonById:new Map(lessons.map(l=>[l.id,l]))};
    addEventListener('hashchange',()=>route(ctx));route(ctx);
  }catch(error){console.error(error);app.innerHTML='<section class="hero"><h1>教材を読み込めませんでした</h1><p>ページを再読み込みしてください。改善しない場合は、公開ファイルの配置を確認してください。</p></section>'}
}
start();
