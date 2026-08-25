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
import {renderRules} from './tools/rules.js';
import {renderStudyRecord} from './tools/study-record.js';
import {renderPracticeHub} from './practice/practice-hub.js';
import {renderDataLesson} from './lessons/data-lesson.js';
import {attachLessonSupport} from './lessons/lesson-support.js';
import {attachLessonProgress,getLessonProgress,clearLessonProgress} from './lib/progress.js';

const app=document.querySelector('#app');
async function loadJson(path){const res=await fetch(path,{cache:'no-store'});if(!res.ok)throw new Error(`${path} の読み込みに失敗しました`);return res.json()}
function renderLessonList(items,progress){return `<div class="lesson-list">${items.map(l=>`<a class="lesson-card" href="#${l.id}"><strong>${l.order}. ${l.title}</strong><small>${progress.completed.has(l.id)?'✓ 学習済み':`約${l.estimatedMinutes||7}分`}</small></a>`).join('')}</div>`}
function progressSummary(items,progress){const done=items.filter(x=>progress.completed.has(x.id)).length;return `${done} / ${items.length} 完了`}
function renderHome(ctx){
  const p=getLessonProgress();const byLevel=level=>ctx.lessons.filter(l=>l.level===level).sort((a,b)=>a.order-b.order);const intro=byLevel('intro'),beginner=byLevel('beginner'),intermediate=byLevel('intermediate'),advanced=byLevel('advanced'),special=byLevel('special');
  const ordered=[...intro,...beginner,...intermediate,...advanced,...special];const last=ctx.lessonById.get(p.lastLesson);const firstIncomplete=ordered.find(l=>!p.completed.has(l.id));const next=last&&!p.completed.has(last.id)?last:firstIncomplete;
  app.innerHTML=`<section class="hero"><div class="eyebrow">麻雀を知らなくても大丈夫</div><h1>牌を触りながら、少しずつ覚える。</h1><p>「1枚取る、1枚捨てる」から始め、役・点数・実戦判断まで順番に進みます。</p>${next?`<div class="action-row"><a class="primary" href="#${next.id}">続きから：${next.title}</a></div>`:''}</section>
  <section class="panel"><h2>学習の進み具合</h2><div class="progress-summary"><span>入門 ${progressSummary(intro,p)}</span><span>初級 ${progressSummary(beginner,p)}</span><span>中級 ${progressSummary(intermediate,p)}</span><span>上級 ${progressSummary(advanced,p)}</span><span>特例 ${progressSummary(special,p)}</span></div><div class="action-row"><button id="clear-lesson-progress" class="secondary" type="button">教材の進捗を消す</button><a class="secondary" href="#study-record">詳しい学習記録を見る</a></div></section>
  <h2 class="section-title">対局練習</h2><div class="feature-grid"><a class="feature-card" href="#practice"><strong>対局練習を始める</strong><span>ツモと捨て牌、鳴き、リーチ、フリテンを短い練習で確認します。</span></a></div>
  <h2 class="section-title">学ぶ</h2><h3>入門 <small>${progressSummary(intro,p)}</small></h3>${renderLessonList(intro,p)}<a class="lesson-card" href="#intro-review"><strong>入門の総復習</strong><small>15問からランダム12問</small></a>
  <h3>初級 <small>${progressSummary(beginner,p)}</small></h3>${renderLessonList(beginner,p)}<a class="lesson-card" href="#beginner-review"><strong>初級の総復習</strong><small>待ち・鳴き・リーチ・フリテン・役・ドラ</small></a>
  <h3>中級 <small>${progressSummary(intermediate,p)}</small></h3>${renderLessonList(intermediate,p)}<a class="lesson-card" href="#intermediate-review"><strong>中級 点数計算の総復習</strong><small>翻・符・親子・ロン/ツモ・満貫以上</small></a>
  <h3>上級 <small>${progressSummary(advanced,p)}</small></h3>${renderLessonList(advanced,p)}
  <h3>特例・ルール差編 <small>${progressSummary(special,p)}</small></h3>${renderLessonList(special,p)}
  <h2 class="section-title">問題</h2><div class="feature-grid"><a class="feature-card" href="#problems"><strong>問題に挑戦</strong><span>文章＋実際の牌姿問題、合計${ctx.problemCatalog.questions.length}問。苦手分野も優先できます</span></a></div>
  <h2 class="section-title">調べる・計算する</h2><div class="feature-grid"><a class="feature-card" href="#dictionary"><strong>用語集</strong><span>${ctx.terms.length}語を漢字・読み・別名・五十音で検索</span></a><a class="feature-card" href="#yaku-guide"><strong>役図鑑</strong><span>役名、翻数、鳴き、成立例から調べる</span></a><a class="feature-card" href="#rules"><strong>ルール基準</strong><span>${ctx.standardRules?.displayNameJa||"標準ルール"}。教材・問題・点数計算の共通基準</span></a><a class="feature-card" href="#automatic-calculator"><strong>点数計算</strong><span>牌と局面条件から役・符・点数を自動計算</span></a></div>`;
  app.querySelector('#clear-lesson-progress')?.addEventListener('click',()=>{clearLessonProgress();renderHome(ctx)});
}
function renderUnavailable(id,ctx){const lesson=ctx.lessonById.get(id);app.innerHTML=`<section class="hero"><div class="eyebrow">準備中</div><h1>${lesson?.title||'このページ'}</h1><p>この章はまだ実装前です。</p><div class="action-row"><a class="secondary" href="#home">一覧へ戻る</a></div></section>`}
function route(ctx){
  const id=(location.hash||'#home').slice(1).split('?')[0];const isDataLesson=ctx.dataLessonById.has(id);const routes={'lesson-intro-01':()=>renderIntro01(app,ctx),'lesson-intro-02':()=>renderIntro02(app,ctx),'lesson-intro-03':()=>renderIntro03(app,ctx),'lesson-intro-04':()=>renderIntro04(app,ctx),'lesson-intro-05':()=>renderIntro05(app,ctx),'lesson-intro-06':()=>renderIntro06(app,ctx),'intro-review':()=>renderIntroReview(app,ctx),'lesson-beginner-01':()=>renderBeginner01(app,ctx),'lesson-beginner-02':()=>renderBeginner02(app,ctx),'lesson-beginner-03':()=>renderBeginner03(app,ctx),'lesson-beginner-04':()=>renderBeginner04(app,ctx),'lesson-beginner-05':()=>renderBeginner05(app,ctx),'lesson-beginner-06':()=>renderBeginner06(app,ctx),'beginner-review':()=>renderBeginnerReview(app,ctx),'lesson-intermediate-01':()=>renderIntermediate01(app,ctx),'lesson-intermediate-02':()=>renderIntermediate02(app,ctx),'lesson-intermediate-03':()=>renderIntermediate03(app,ctx),'lesson-intermediate-04':()=>renderIntermediate04(app,ctx),'lesson-intermediate-05':()=>renderIntermediate05(app,ctx),'intermediate-review':()=>renderIntermediateReview(app,ctx),'problems':()=>renderProblemHub(app,ctx),'automatic-calculator':()=>renderAutomaticCalculator(app,ctx),'dictionary':()=>renderDictionary(app,ctx),'yaku-guide':()=>renderYakuGuide(app,ctx),'rules':()=>renderRules(app,ctx),'study-record':()=>renderStudyRecord(app,ctx),'practice':()=>renderPracticeHub(app,ctx)};
  if(id==='home')renderHome(ctx);else if(routes[id])routes[id]();else if(isDataLesson)renderDataLesson(app,ctx,ctx.dataLessonById.get(id));else renderUnavailable(id,ctx);
  if(id.startsWith('lesson-')&&ctx.lessonById.has(id)){if(!isDataLesson)attachLessonSupport(app,ctx,id);attachLessonProgress(app,id)}
  window.scrollTo({top:0,behavior:'auto'});app.focus({preventScroll:true});
}
async function start(){
  try{
    const [tileData,lessonData,introReview,beginnerReview,waitData,callData,beginnerCore,yakuData,scoringCore,intermediateReview,termData,termExtra,yakuExamples,problemCatalog,visualCatalog,practicalRules,advancedSpecial,curriculumExtra,lessonQuality,advancedQuality,coreQuality]=await Promise.all([loadJson('./src/data/tiles.json'),loadJson('./src/data/lessons.json'),loadJson('./src/data/questions/intro/review.json'),loadJson('./src/data/questions/beginner/review.json'),loadJson('./src/data/waits.json'),loadJson('./src/data/calls.json'),loadJson('./src/data/beginner-core.json'),loadJson('./src/data/yaku.json'),loadJson('./src/data/scoring-core.json'),loadJson('./src/data/questions/intermediate/scoring-review.json'),loadJson('./src/data/terms.json'),loadJson('./src/data/terms-extra.json'),loadJson('./src/data/yaku-examples.json'),loadJson('./src/data/questions/catalog.json'),loadJson('./src/data/questions/visual-catalog.json'),loadJson('./src/data/questions/practical-rules.json'),loadJson('./src/data/advanced-special.json'),loadJson('./src/data/curriculum-extra.json'),loadJson('./src/data/lesson-quality.json'),loadJson('./src/data/lesson-quality-advanced.json'),loadJson('./src/data/lesson-quality-core.json'),loadJson('./src/data/rules.json')]);
    const intermediateLessons=scoringCore.lessons.map(x=>({...x,level:'intermediate',estimatedMinutes:7}));const dataLessons=[...advancedSpecial.lessons,...curriculumExtra.lessons];const lessons=[...lessonData.lessons,...intermediateLessons,...dataLessons];
    const mergedProblemCatalog={...problemCatalog,categories:[...problemCatalog.categories,...practicalRules.categories],questions:[...problemCatalog.questions,...visualCatalog.questions,...practicalRules.questions]};const terms=[...termData.terms,...termExtra.terms];const qualityLessons=[...lessonQuality.lessons,...advancedQuality.lessons,...coreQuality.lessons];
    const ctx={tiles:tileData.tiles,lessons,introReview,beginnerReview,intermediateReview,problemCatalog:mergedProblemCatalog,waitTypes:waitData.waitTypes,calls:callData.calls,beginnerCore,scoringCore,yaku:yakuData.yaku,terms,yakuExamples:yakuExamples.examples,rulesets:rulesData.rulesets,standardRules:rulesData.rulesets.find(r=>r.id==='wakaranjan-standard-v1'),tileByCode:new Map(tileData.tiles.map(t=>[t.code,t])),tileById:new Map(tileData.tiles.map(t=>[t.id,t])),lessonById:new Map(lessons.map(l=>[l.id,l])),dataLessonById:new Map(dataLessons.map(l=>[l.id,l])),lessonQualityById:new Map(qualityLessons.map(l=>[l.id,l])),termById:new Map(terms.map(t=>[t.id,t])),yakuById:new Map(yakuData.yaku.map(y=>[y.id,y]))};addEventListener('hashchange',()=>route(ctx));route(ctx);
  }catch(error){console.error(error);app.innerHTML='<section class="hero"><h1>教材を読み込めませんでした</h1><p>ページを再読み込みしてください。改善しない場合は、公開ファイルの配置を確認してください。</p></section>'}
}
start();
