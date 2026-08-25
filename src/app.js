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
import {renderProblemHub} from './questions/problem-hub.js';
import {renderAutomaticCalculator} from './tools/automatic-calculator.js';
import {renderDictionary} from './tools/dictionary.js';
import {renderYakuGuide} from './tools/yaku-guide.js';

const app=document.querySelector('#app');
async function loadJson(path){const res=await fetch(path,{cache:'no-store'});if(!res.ok)throw new Error(`${path} の読み込みに失敗しました`);return res.json()}
function renderLessonList(items){return `<div class="lesson-list">${items.map(l=>`<a class="lesson-card" href="#${l.id}"><strong>${l.order}. ${l.title}</strong><small>約${l.estimatedMinutes||7}分</small></a>`).join('')}</div>`}
function renderHome(ctx){
  const intro=ctx.lessons.filter(l=>l.level==='intro').sort((a,b)=>a.order-b.order),beginner=ctx.lessons.filter(l=>l.level==='beginner').sort((a,b)=>a.order-b.order),intermediate=ctx.lessons.filter(l=>l.level==='intermediate').sort((a,b)=>a.order-b.order);
  app.innerHTML=`<section class="hero"><div class="eyebrow">麻雀を知らなくても大丈夫</div><h1>牌を触りながら、少しずつ覚える。</h1><p>「1枚取る、1枚捨てる」から始め、役と点数まで順番に進みます。</p></section>
  <h2 class="section-title">学ぶ</h2><h3>入門</h3>${renderLessonList(intro)}<a class="lesson-card" href="#intro-review"><strong>入門の総復習</strong><small>15問からランダム12問</small></a>
  <h3>初級</h3>${renderLessonList(beginner)}<a class="lesson-card" href="#beginner-review"><strong>初級の総復習</strong><small>待ち・鳴き・リーチ・フリテン・役・ドラ</small></a>
  <h3>中級：点数計算の基礎</h3>${renderLessonList(intermediate)}<a class="lesson-card" href="#intermediate-review"><strong>中級 点数計算の総復習</strong><small>翻・符・親子・ロン/ツモ・満貫以上</small></a>
  <h2 class="section-title">問題</h2><div class="feature-grid"><a class="feature-card" href="#problems"><strong>問題に挑戦</strong><span>文章＋実際の牌姿問題、合計${ctx.problemCatalog.questions.length}問。苦手分野も優先できます</span></a></div>
  <h2 class="section-title">調べる・計算する</h2><div class="feature-grid"><a class="feature-card" href="#dictionary"><strong>用語集</strong><span>漢字・読み・別名・五十音で検索</span></a><a class="feature-card" href="#yaku-guide"><strong>役図鑑</strong><span>役名、翻数、鳴き、成立例から調べる</span></a><a class="feature-card" href="#automatic-calculator"><strong>点数計算</strong><span>牌と局面条件から役・符・点数を自動計算</span></a></div>`;
}
function renderUnavailable(id,ctx){const lesson=ctx.lessonById.get(id);app.innerHTML=`<section class="hero"><div class="eyebrow">準備中</div><h1>${lesson?.title||'このページ'}</h1><p>この章はまだ実装前です。</p><div class="action-row"><a class="secondary" href="#home">一覧へ戻る</a></div></section>`}
function route(ctx){
  const id=(location.hash||'#home').slice(1).split('?')[0];const routes={'lesson-intro-01':()=>renderIntro01(app,ctx),'lesson-intro-02':()=>renderIntro02(app,ctx),'lesson-intro-03':()=>renderIntro03(app,ctx),'lesson-intro-04':()=>renderIntro04(app,ctx),'lesson-intro-05':()=>renderIntro05(app,ctx),'lesson-intro-06':()=>renderIntro06(app,ctx),'intro-review':()=>renderIntroReview(app,ctx),'lesson-beginner-01':()=>renderBeginner01(app,ctx),'lesson-beginner-02':()=>renderBeginner02(app,ctx),'lesson-beginner-03':()=>renderBeginner03(app,ctx),'lesson-beginner-04':()=>renderBeginner04(app,ctx),'lesson-beginner-05':()=>renderBeginner05(app,ctx),'lesson-beginner-06':()=>renderBeginner06(app,ctx),'beginner-review':()=>renderBeginnerReview(app,ctx),'lesson-intermediate-01':()=>renderIntermediate01(app,ctx),'lesson-intermediate-02':()=>renderIntermediate02(app,ctx),'lesson-intermediate-03':()=>renderIntermediate03(app,ctx),'lesson-intermediate-04':()=>renderIntermediate04(app,ctx),'lesson-intermediate-05':()=>renderIntermediate05(app,ctx),'intermediate-review':()=>renderIntermediateReview(app,ctx),'problems':()=>renderProblemHub(app,ctx),'automatic-calculator':()=>renderAutomaticCalculator(app,ctx),'dictionary':()=>renderDictionary(app,ctx),'yaku-guide':()=>renderYakuGuide(app,ctx)};
  if(id==='home')renderHome(ctx);else(routes[id]||(()=>renderUnavailable(id,ctx)))();window.scrollTo({top:0,behavior:'auto'});app.focus({preventScroll:true});
}
async function start(){
  try{
    const [tileData,lessonData,introReview,beginnerReview,waitData,callData,beginnerCore,yakuData,scoringCore,intermediateReview,termData,yakuExamples,problemCatalog,visualCatalog]=await Promise.all([loadJson('./src/data/tiles.json'),loadJson('./src/data/lessons.json'),loadJson('./src/data/questions/intro/review.json'),loadJson('./src/data/questions/beginner/review.json'),loadJson('./src/data/waits.json'),loadJson('./src/data/calls.json'),loadJson('./src/data/beginner-core.json'),loadJson('./src/data/yaku.json'),loadJson('./src/data/scoring-core.json'),loadJson('./src/data/questions/intermediate/scoring-review.json'),loadJson('./src/data/terms.json'),loadJson('./src/data/yaku-examples.json'),loadJson('./src/data/questions/catalog.json'),loadJson('./src/data/questions/visual-catalog.json')]);
    const intermediateLessons=scoringCore.lessons.map(x=>({...x,level:'intermediate',estimatedMinutes:7})),lessons=[...lessonData.lessons,...intermediateLessons];
    const mergedProblemCatalog={...problemCatalog,questions:[...problemCatalog.questions,...visualCatalog.questions]};
    const ctx={tiles:tileData.tiles,lessons,introReview,beginnerReview,intermediateReview,problemCatalog:mergedProblemCatalog,waitTypes:waitData.waitTypes,calls:callData.calls,beginnerCore,scoringCore,yaku:yakuData.yaku,terms:termData.terms,yakuExamples:yakuExamples.examples,tileByCode:new Map(tileData.tiles.map(t=>[t.code,t])),tileById:new Map(tileData.tiles.map(t=>[t.id,t])),lessonById:new Map(lessons.map(l=>[l.id,l])),termById:new Map(termData.terms.map(t=>[t.id,t])),yakuById:new Map(yakuData.yaku.map(y=>[y.id,y]))};addEventListener('hashchange',()=>route(ctx));route(ctx);
  }catch(error){console.error(error);app.innerHTML='<section class="hero"><h1>教材を読み込めませんでした</h1><p>ページを再読み込みしてください。改善しない場合は、公開ファイルの配置を確認してください。</p></section>'}
}
start();
