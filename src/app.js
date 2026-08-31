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
import {renderTeacherRecord} from './tools/teacher-record.js';
import {renderPrintMaterials} from './tools/print-materials.js';
import {renderSettings} from './tools/settings.js';
import {renderPracticeHub} from './practice/practice-hub.js';
import {renderFullRoundPractice} from './practice/full-round.js';
import {renderDataLesson} from './lessons/data-lesson.js';
import {attachLessonSupport} from './lessons/lesson-support.js';
import {attachLessonProgress,getLessonProgress,clearLessonProgress} from './lib/progress.js';
import {applySettings,getSettings,setLastRoute,updateSettings} from './lib/settings.js';
import {activateProfile,getActiveProfile,hasActiveProfile} from './lib/profile.js';
import {flushCloudSync,getCloudSyncStatus,retryActiveProfileCloudSync,synchronizeActiveProfileFromCloud} from './lib/cloud-sync.js';
import {decorateMahjongTerms} from './lib/mahjong-ruby.js';
import {scrollAppToTop} from './lib/navigation.js';

const app=document.querySelector('#app');
const DATASET_VERSION='0.1.0';
const ASSET_PATHS={
  manifest:'./src/data/manifest.json',
  tiles:'./src/data/tiles.json',
  lessons:'./src/data/lessons.json',
  introReview:'./src/data/questions/intro/review.json',
  beginnerReview:'./src/data/questions/beginner/review.json',
  waits:'./src/data/waits.json',
  calls:'./src/data/calls.json',
  beginnerCore:'./src/data/beginner-core.json',
  yaku:'./src/data/yaku.json',
  scoringCore:'./src/data/scoring-core.json',
  intermediateReview:'./src/data/questions/intermediate/scoring-review.json',
  terms:'./src/data/terms.json',
  termsExtra:'./src/data/terms-extra.json',
  yakuExamples:'./src/data/yaku-examples.json',
  problemCatalog:'./src/data/questions/catalog.json',
  visualCatalog:'./src/data/questions/visual-catalog.json',
  practicalRules:'./src/data/questions/practical-rules.json',
  advancedSpecial:'./src/data/advanced-special.json',
  curriculumExtra:'./src/data/curriculum-extra.json',
  lessonQuality:'./src/data/lesson-quality.json',
  advancedQuality:'./src/data/lesson-quality-advanced.json',
  coreQuality:'./src/data/lesson-quality-core.json',
  rules:'./src/data/rules.json'
};
const QUALITY_ASSET_BY_SOURCE={lessons:'coreQuality',scoringCore:'coreQuality',advancedSpecial:'advancedQuality',curriculumExtra:'lessonQuality'};
const INITIAL_ASSETS=['manifest','rules'];
const FIXED_ROUTES=new Set(['home','menu','learn','lookup','intro-review','beginner-review','intermediate-review','problems','automatic-calculator','dictionary','yaku-guide','rules','study-record','teacher-record','print-materials','settings','practice','full-round']);
const LEVEL_META={
  intro:{label:'入門',description:'牌を取る・捨てる、牌の種類、あがりの形を順番に覚えます。',review:'intro-review'},
  beginner:{label:'初級',description:'待ち、鳴き、リーチ、フリテン、初級の役とドラを学びます。',review:'beginner-review'},
  intermediate:{label:'中級',description:'翻・符・親子・ロン・ツモを使って点数を計算します。',review:'intermediate-review'},
  advanced:{label:'上級',description:'多面待ち、複合、守備、対局中の判断を深く学びます。'},
  special:{label:'特例・ルール差',description:'頭ハネ、途中流局、ローカル役など、卓ごとに確認が必要な項目です。'}
};
const PAGE_LABELS={
  learn:'学ぶ',lookup:'調べる',problems:'問題集','automatic-calculator':'点数計算',dictionary:'用語集','yaku-guide':'役図鑑',rules:'ルール基準','study-record':'学習記録','teacher-record':'学習状況','print-materials':'印刷用教材',settings:'設定',practice:'対局練習','full-round':'通し型実戦練習','intro-review':'入門の総復習','beginner-review':'初級の総復習','intermediate-review':'中級の総復習'
};
let routeSequence=0;
let lastRouteHash='';
let navigatingBack=false;
let routeHistory=[];
let renderedRouteId='';
let rubyObserver=null;

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}
function routeId(hash){return hash.slice(1).split('?')[0]}
function queryParams(hash=location.hash){return new URLSearchParams(hash.includes('?')?hash.slice(hash.indexOf('?')+1):'')}
function isKnownRoute(id,ctx){return FIXED_ROUTES.has(id)||Boolean(ctx.lessonById?.has(id)||ctx.dataLessonById?.has(id))}

function currentRoute(ctx){
  const hash=location.hash||'#home';
  const id=routeId(hash);
  if(!isKnownRoute(id,ctx)){
    if(location.hash!=='#home')history.replaceState(null,'','#home');
    return {hash:'#home',id:'home'};
  }
  return {hash,id};
}

function installSkipLink(){
  document.querySelector('.skip-link')?.addEventListener('click',event=>{
    event.preventDefault();
    const target=document.querySelector('#app');
    if(!target)return;
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'start',behavior:'auto'});
  });
}

async function loadJson(path,version=DATASET_VERSION,cache='default'){
  const separator=path.includes('?')?'&':'?';
  const res=await fetch(`${path}${separator}v=${encodeURIComponent(version)}`,{cache});
  if(!res.ok)throw new Error(`${path} の読み込みに失敗しました`);
  return res.json();
}

function emptyCatalog(){return {sessionSize:10,categories:[],questions:[]}}
function hydrateContext(ctx){
  const assets=ctx.assets;
  const tileData=assets.tiles||{tiles:[]};
  const lessonData=assets.lessons||{lessons:[]};
  const indexedLessons=Array.isArray(assets.manifest?.lessonIndex)?assets.manifest.lessonIndex:[];
  const intermediateLessons=(assets.scoringCore?.lessons||[]).map(x=>({...x,level:'intermediate',estimatedMinutes:7}));
  const dataLessons=[...(assets.advancedSpecial?.lessons||[]),...(assets.curriculumExtra?.lessons||[])];
  const contentLessons=[...(lessonData.lessons||[]),...intermediateLessons,...dataLessons];
  const contentById=new Map(contentLessons.map(lesson=>[lesson.id,lesson]));
  const lessons=indexedLessons.length?indexedLessons.map(indexEntry=>({...indexEntry,...(contentById.get(indexEntry.id)||{})})):contentLessons;
  const baseCatalog=assets.problemCatalog||emptyCatalog();
  const practical=assets.practicalRules||{};
  const visual=assets.visualCatalog||{};
  const problemCatalog={...baseCatalog,categories:[...(baseCatalog.categories||[]),...(practical.categories||[])],questions:[...(baseCatalog.questions||[]),...(visual.questions||[]),...(practical.questions||[])]};
  const terms=[...(assets.terms?.terms||[]),...(assets.termsExtra?.terms||[])];
  const qualityLessons=[...(assets.lessonQuality?.lessons||[]),...(assets.advancedQuality?.lessons||[]),...(assets.coreQuality?.lessons||[])];
  const tiles=tileData.tiles||[];
  const yaku=assets.yaku?.yaku||[];
  const rulesets=assets.rules?.rulesets||[];
  Object.assign(ctx,{
    tiles,
    lessons,
    introReview:assets.introReview||{questions:[]},
    beginnerReview:assets.beginnerReview||{questions:[]},
    intermediateReview:assets.intermediateReview||{questions:[]},
    problemCatalog,
    waitTypes:assets.waits?.waitTypes||[],
    calls:assets.calls?.calls||[],
    beginnerCore:assets.beginnerCore||{lessons:[]},
    scoringCore:assets.scoringCore||{lessons:[]},
    yaku,
    terms,
    yakuExamples:assets.yakuExamples?.examples||{},
    rulesets,
    standardRules:rulesets.find(r=>r.id==='wakaranjan-standard-v1'),
    lessonById:new Map(lessons.map(l=>[l.id,l])),
    lessonIndexById:new Map(indexedLessons.map(l=>[l.id,l])),
    dataLessonById:new Map(dataLessons.map(l=>[l.id,l])),
    lessonQualityById:new Map(qualityLessons.map(l=>[l.id,l])),
    termById:new Map(terms.map(t=>[t.id,t])),
    yakuById:new Map(yaku.map(y=>[y.id,y])),
    tileByCode:new Map(tiles.map(t=>[t.code,t])),
    tileById:new Map(tiles.map(t=>[t.id,t]))
  });
}

async function ensureAssets(ctx,keys){
  const wanted=[...new Set(keys)].filter(key=>ASSET_PATHS[key]);
  if(wanted.includes('manifest')&&!ctx.assets.manifest){
    ctx.assets.manifest=await loadJson(ASSET_PATHS.manifest,DATASET_VERSION,'no-cache');
    ctx.datasetVersion=ctx.assets.manifest.datasetVersion||DATASET_VERSION;
  }
  ctx.datasetVersion=ctx.assets.manifest?.datasetVersion||ctx.datasetVersion||DATASET_VERSION;
  await Promise.all(wanted.filter(key=>key!=='manifest').map(async key=>{
    if(!ctx.assetPromises[key])ctx.assetPromises[key]=loadJson(ASSET_PATHS[key],ctx.datasetVersion);
    try{ctx.assets[key]=await ctx.assetPromises[key]}
    catch(error){delete ctx.assetPromises[key];throw error}
  }));
  hydrateContext(ctx);
}

function renderLoadError(retry){
  app.removeAttribute('data-route');
  const fallbackLink=hasActiveProfile()?'#menu':'#home';
  app.innerHTML=`<section class="hero" data-load-error><div class="eyebrow">読み込みエラー</div><h1>教材を読み込めませんでした</h1><p>必要なデータの読み込みに失敗しました。通信状態を確認してから、「もう一度読み込む」を押してください。</p><div id="load-status" class="feedback" role="status" aria-live="polite">再試行できます。</div><div class="action-row"><button id="load-retry" class="primary" type="button">もう一度読み込む</button><a class="secondary" href="${fallbackLink}">${hasActiveProfile()?'メニューへ戻る':'最初の画面へ戻る'}</a></div></section>`;
  app.focus({preventScroll:true});
  const button=app.querySelector('#load-retry');
  const status=app.querySelector('#load-status');
  let retrying=false;
  button?.addEventListener('click',async()=>{
    if(retrying)return;
    retrying=true;
    button.disabled=true;
    button.textContent='読み込み中…';
    if(status)status.textContent='読み込みをやり直しています。';
    try{await retry()}
    catch(error){console.error(error);renderLoadError(retry)}
  });
}

function lessonItems(ctx,level){return ctx.lessons.filter(lesson=>lesson.level===level).sort((a,b)=>a.order-b.order)}
function progressSummary(items,progress){const done=items.filter(item=>progress.completed.has(item.id)).length;return `${done} / ${items.length} 完了`}
function renderLessonList(items,progress){
  if(!items.length)return '<p class="muted">この段階の教材はありません。</p>';
  return `<div class="lesson-list">${items.map(lesson=>`<a class="lesson-card" href="#${lesson.id}"><strong>${lesson.order}. ${escapeHtml(lesson.title)}</strong><small>${progress.completed.has(lesson.id)?'✓ 学習済み':`約${lesson.estimatedMinutes||7}分`}</small></a>`).join('')}</div>`;
}

function renderHome(ctx){
  const profile=getActiveProfile();
  const name=profile?.name||'';
  const sync=getCloudSyncStatus();
  app.innerHTML=`<section class="hero profile-hero"><div class="eyebrow">麻雀を知らなくても大丈夫</div><h1>${profile?`${escapeHtml(name)}さん、続きから学びましょう。`:'まず、名前を入力してください。'}</h1><p>名前と学習状態はSupabaseに保存します。同じ名前で開くと、同じ学習記録を使います。ゲームのスコアとは別に管理します。</p><p class="muted">名前だけで共有する方式のため、同じ名前を使う人が記録を変更・解除できます。</p><form id="profile-form" class="profile-form"><label for="profile-name">学ぶ人の名前<input id="profile-name" name="name" type="text" maxlength="40" autocomplete="name" required value="${escapeHtml(name)}" placeholder="例：まさ"></label><p id="profile-status" class="muted">${profile?'名前を変えると、その名前の学習記録へ切り替わります。':'名前を入力するとメニューへ進めます。'}</p><button class="primary" type="submit">${profile?'この名前でメニューへ':'名前を入力して始める'}</button></form><p class="sync-status" data-sync-state="${sync.state}" role="status" aria-live="polite">${escapeHtml(sync.message)}</p></section><section class="panel profile-note"><h2>このサイトでできること</h2><div class="profile-benefits"><span>教材を順番に学ぶ</span><span>問題で確かめる</span><span>対局の流れを練習する</span><span>点数を計算する</span></div></section>`;
  app.querySelector('#profile-form')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const input=app.querySelector('#profile-name');
    const status=app.querySelector('#profile-status');
    const submit=app.querySelector('#profile-form button[type="submit"]');
    if(submit?.disabled)return;
    if(status)status.textContent='現在の記録を保存しています。';
    if(submit){submit.disabled=true;submit.textContent='読み込み中…'}
    await flushCloudSync();
    const next=activateProfile(input?.value||'');
    if(!next){if(status)status.textContent='名前を1文字以上入力してください。';if(submit){submit.disabled=false;submit.textContent=profile?'この名前でメニューへ':'名前を入力して始める'}input?.focus();return}
    const result=await retryActiveProfileCloudSync();
    if(status)status.textContent=result.ok?'学習記録を読み込みました。':'通信できないため、この端末の記録で続けます。';
    updateSettings({lastRoute:'#menu'});
    location.hash='#menu';
  });
}

function renderMenu(ctx){
  const profile=getActiveProfile();
  if(!profile){renderHome(ctx);return}
  const progress=getLessonProgress();
  const ordered=['intro','beginner','intermediate','advanced','special'].flatMap(level=>lessonItems(ctx,level));
  const last=ctx.lessonById.get(progress.lastLesson);
  const next=last&&!progress.completed.has(last.id)?last:ordered.find(lesson=>!progress.completed.has(lesson.id));
  const continueHtml=next?`<a class="continue-card" href="#${next.id}"><span>続きから</span><strong>${escapeHtml(next.title)}</strong><small>前回の教材を開きます</small></a>`:'';
  const levelLinks=Object.entries(LEVEL_META).map(([id,item])=>`<a class="menu-card menu-level-card" href="#learn?level=${id}"><strong>${item.label}</strong><span>${item.description}</span><small>${progressSummary(lessonItems(ctx,id),progress)}</small></a>`).join('');
  const sync=getCloudSyncStatus();
  const retryHtml=sync.state==='error'?'<div class="action-row"><button id="retry-cloud-sync-menu" class="secondary" type="button">Supabase同期を再試行</button></div>':'';
  app.innerHTML=`<section class="hero menu-hero"><div class="eyebrow">メニュー</div><h1>何をしますか？</h1><p><strong>${escapeHtml(profile.name)}さん</strong>の学習記録を使います。迷ったら「入門」から始めてください。</p><p class="sync-status" data-sync-state="${sync.state}" role="status" aria-live="polite">${escapeHtml(sync.message)}</p>${retryHtml}${continueHtml}<a class="profile-switch" href="#home">学ぶ人を切り替える</a></section><section class="menu-section" aria-labelledby="learn-menu-title"><h2 id="learn-menu-title">学ぶ</h2><div class="menu-grid menu-level-grid"><a class="menu-card menu-card-main" href="#learn"><strong>学ぶ全体</strong><span>5つの段階を一覧で見て、順番を決めます。</span><small>教材38章・進捗表示</small></a>${levelLinks}</div></section><section class="menu-section" aria-labelledby="practice-menu-title"><h2 id="practice-menu-title">解く・練習する</h2><div class="menu-grid"><a class="menu-card" href="#problems"><strong>問題集</strong><span>文章問題と牌姿問題で理解を確かめます。</span><small>総復習・苦手復習</small></a><a class="menu-card" href="#practice"><strong>対局練習</strong><span>ツモ、捨て牌、鳴き、リーチを操作します。</span><small>短い練習から一局まで</small></a><a class="menu-card" href="#practice?mode=east-round"><strong>模擬東風戦</strong><span>4局の進み方を案内付きで確認します。</span><small>対局の流れを体験</small></a></div></section><section class="menu-section" aria-labelledby="tools-menu-title"><h2 id="tools-menu-title">調べる・記録する</h2><div class="menu-grid"><a class="menu-card" href="#automatic-calculator"><strong>点数計算</strong><span>牌と局面を入力して、役・符・点数を確認します。</span></a><a class="menu-card" href="#lookup"><strong>用語・役を調べる</strong><span>読み方、意味、役の成立条件を探します。</span></a><a class="menu-card" href="#study-record"><strong>学習記録</strong><span>教材の完了状況と問題の正答状況を見ます。</span></a><a class="menu-card" href="#settings"><strong>設定</strong><span>文字の大きさ、音、動きを変更します。</span></a></div></section>`;
  app.querySelector('#retry-cloud-sync-menu')?.addEventListener('click',async event=>{
    const button=event.currentTarget;
    button.disabled=true;
    button.textContent='同期しています…';
    await retryActiveProfileCloudSync();
    renderMenu(ctx);
  });
}

function renderLearn(ctx){
  const progress=getLessonProgress();
  const level=queryParams().get('level');
  const meta=LEVEL_META[level];
  if(meta){
    const items=lessonItems(ctx,level);
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">学ぶ / ${meta.label}</div><h1>${meta.label}</h1><p class="lead">${meta.description}</p><p class="progress-badge">${progressSummary(items,progress)}</p></section><section class="panel"><h2>${meta.label}の教材</h2>${renderLessonList(items,progress)}${meta.review?`<a class="review-card" href="#${meta.review}"><strong>${meta.label}の総復習</strong><span>学んだ内容を問題で確認します。</span></a>`:''}</section><div class="action-row"><a class="secondary" href="#learn">学ぶへ戻る</a><a class="primary" href="#menu">メニューへ</a></div>`;
    return;
  }
  app.innerHTML=`<section class="lesson-head"><div class="eyebrow">学ぶ</div><h1>学ぶ段階を選んでください。</h1><p class="lead">上から順番に進めると、牌の見方から点数・実戦判断まで無理なくつながります。</p></section><section class="level-grid">${Object.entries(LEVEL_META).map(([id,item])=>{const items=lessonItems(ctx,id);return `<a class="level-card" href="#learn?level=${id}"><span class="level-card-label">${item.label}</span><strong>${progressSummary(items,progress)}</strong><p>${item.description}</p></a>`}).join('')}</section><div class="action-row"><a class="secondary" href="#menu">メニューへ戻る</a></div>`;
}

function renderLookup(){
  app.innerHTML=`<section class="lesson-head"><div class="eyebrow">調べる</div><h1>知りたい内容を選んでください。</h1><p class="lead">用語の読み方、役の成立条件、サイトで採用しているルールを別々に確認できます。</p></section><section class="lookup-grid"><a class="menu-card" href="#dictionary"><strong>用語集</strong><span>麻雀用語を漢字・ひらがな・カタカナ・分類から探します。</span></a><a class="menu-card" href="#yaku-guide"><strong>役図鑑</strong><span>役の読み方、翻数、鳴けるか、成立例を確認します。</span></a><a class="menu-card" href="#rules"><strong>ルール基準</strong><span>教材・問題・点数計算で共通に使う標準ルールを見ます。</span></a></section><div class="action-row"><a class="secondary" href="#menu">メニューへ戻る</a></div>`;
}

function renderUnavailable(id,ctx){
  const lesson=ctx.lessonById.get(id);
  app.innerHTML=`<section class="hero"><div class="eyebrow">準備中</div><h1>${escapeHtml(lesson?.title||'このページ')}</h1><p>この章はまだ実装前です。</p><div class="action-row"><a class="secondary" href="#menu">メニューへ戻る</a></div></section>`;
}

function routeAssetKeys(id,ctx){
  const terms=id==='home'?[]:['terms','termsExtra'];
  if(id==='home'||id==='menu'||id==='learn'||id==='lookup'||id==='rules'||id==='settings'||id==='print-materials')return terms;
  if(id==='intro-review')return [...terms,'introReview'];
  if(id==='beginner-review')return [...terms,'beginnerReview'];
  if(id==='intermediate-review')return [...terms,'intermediateReview'];
  if(id==='problems')return [...terms,'tiles','yaku','problemCatalog','visualCatalog','practicalRules'];
  if(id==='study-record'||id==='teacher-record')return [...terms,'tiles','yaku','problemCatalog','visualCatalog','practicalRules'];
  if(id==='dictionary')return [...terms,'yaku'];
  if(id==='yaku-guide')return [...terms,'tiles','yaku','yakuExamples'];
  if(id==='automatic-calculator')return [...terms,'tiles','yaku'];
  if(id==='practice'||id==='full-round')return [...terms,'tiles'];
  if(id.startsWith('lesson-')){
    const source=ctx?.lessonIndexById?.get(id)?.source;
    const quality=QUALITY_ASSET_BY_SOURCE[source]||'lessonQuality';
    const keys=[quality,...terms,'tiles'];
    if(id==='lesson-beginner-01')keys.push('waits');
    if(id==='lesson-beginner-02')keys.push('calls');
    if(/^lesson-beginner-0[3-6]$/.test(id))keys.push('beginnerCore','yaku');
    if(source&&source!=='lessons'&&!keys.includes(source))keys.push(source);
    return keys;
  }
  return [];
}

function updateHeader(id){
  const profile=getActiveProfile();
  const brand=document.querySelector('.brand');
  const settings=document.querySelector('.header-settings');
  const badge=document.querySelector('.level-badge');
  if(brand){brand.href=profile?'#menu':'#home';brand.setAttribute('aria-label',profile?'ワカランジャン メニュー':'ワカランジャン ホーム')}
  if(settings)settings.href=profile?'#settings':'#home';
  if(badge)badge.textContent=profile?`${profile.name}さん`:'はじめに';
  const headerContext=document.querySelector('#header-context');
  if(headerContext)headerContext.textContent=PAGE_LABELS[id]||(id==='home'?'ホーム':id==='menu'?'メニュー':'');
}

function trackRoute(hash){
  if(hash===lastRouteHash)return;
  if(!navigatingBack&&lastRouteHash)routeHistory.push(lastRouteHash);
  lastRouteHash=hash;
  navigatingBack=false;
  if(routeHistory.length>32)routeHistory=routeHistory.slice(-32);
}

function goBack(){
  const previous=routeHistory.pop();
  if(previous&&!(hasActiveProfile()&&routeId(previous)==='home')){navigatingBack=true;location.hash=previous;return}
  location.hash=hasActiveProfile()?'#menu':'#home';
}

function mountPageToolbar(id){
  if(!id||id==='home'||id==='menu'||!app.firstElementChild)return;
  if(app.firstElementChild.classList.contains('page-toolbar'))return;
  const toolbar=document.createElement('nav');
  toolbar.className='page-toolbar';
  toolbar.setAttribute('aria-label','ページ操作');
  const back=document.createElement('button');
  back.type='button';
  back.className='page-back';
  back.textContent='戻る';
  back.setAttribute('aria-label','前の画面へ戻る');
  back.addEventListener('click',goBack);
  const current=document.createElement('span');
  current.className='page-breadcrumb';
  current.textContent=PAGE_LABELS[id]||'学習';
  const menu=document.createElement('a');
  menu.className='page-menu-link';
  menu.href='#menu';
  menu.textContent='メニュー';
  toolbar.append(back,current,menu);
  app.prepend(toolbar);
}

function installRubyObserver(ctx){
  rubyObserver?.disconnect();
  rubyObserver=new MutationObserver(()=>{
    decorateMahjongTerms(app,ctx);
    if(renderedRouteId)mountPageToolbar(renderedRouteId);
  });
  rubyObserver.observe(app,{childList:true,subtree:true});
}

function afterRender(ctx,id){
  renderedRouteId=id;
  app.dataset.route=id;
  updateHeader(id);
  mountPageToolbar(id);
  applySettings(document.documentElement,getSettings());
  decorateMahjongTerms(app,ctx);
  scrollAppToTop();
  app.focus({preventScroll:true});
}

function route(ctx){
  const sequence=++routeSequence;
  let current=currentRoute(ctx);
  if(!hasActiveProfile()&&current.id!=='home'){
    if(location.hash!=='#home')history.replaceState(null,'','#home');
    current={hash:'#home',id:'home'};
  }
  trackRoute(current.hash);
  setLastRoute(current.hash);
  return ensureAssets(ctx,routeAssetKeys(current.id,ctx)).then(()=>{
    if(sequence!==routeSequence)return;
    const id=current.id;
    const isDataLesson=ctx.dataLessonById.has(id);
    const routes={
      'lesson-intro-01':()=>renderIntro01(app,ctx),
      'lesson-intro-02':()=>renderIntro02(app,ctx),
      'lesson-intro-03':()=>renderIntro03(app,ctx),
      'lesson-intro-04':()=>renderIntro04(app,ctx),
      'lesson-intro-05':()=>renderIntro05(app,ctx),
      'lesson-intro-06':()=>renderIntro06(app,ctx),
      'intro-review':()=>renderIntroReview(app,ctx),
      'lesson-beginner-01':()=>renderBeginner01(app,ctx),
      'lesson-beginner-02':()=>renderBeginner02(app,ctx),
      'lesson-beginner-03':()=>renderBeginner03(app,ctx),
      'lesson-beginner-04':()=>renderBeginner04(app,ctx),
      'lesson-beginner-05':()=>renderBeginner05(app,ctx),
      'lesson-beginner-06':()=>renderBeginner06(app,ctx),
      'beginner-review':()=>renderBeginnerReview(app,ctx),
      'lesson-intermediate-01':()=>renderIntermediate01(app,ctx),
      'lesson-intermediate-02':()=>renderIntermediate02(app,ctx),
      'lesson-intermediate-03':()=>renderIntermediate03(app,ctx),
      'lesson-intermediate-04':()=>renderIntermediate04(app,ctx),
      'lesson-intermediate-05':()=>renderIntermediate05(app,ctx),
      'intermediate-review':()=>renderIntermediateReview(app,ctx),
      'problems':()=>renderProblemHub(app,ctx),
      'automatic-calculator':()=>renderAutomaticCalculator(app,ctx),
      'dictionary':()=>renderDictionary(app,ctx),
      'yaku-guide':()=>renderYakuGuide(app,ctx),
      'rules':()=>renderRules(app,ctx),
      'study-record':()=>renderStudyRecord(app,ctx),
      'teacher-record':()=>renderTeacherRecord(app,ctx),
      'print-materials':()=>renderPrintMaterials(app,ctx),
      'settings':()=>renderSettings(app),
      'practice':()=>renderPracticeHub(app,ctx),
      'full-round':()=>renderFullRoundPractice(app,ctx)
    };
    if(id==='home')renderHome(ctx);
    else if(id==='menu')renderMenu(ctx);
    else if(id==='learn')renderLearn(ctx);
    else if(id==='lookup')renderLookup();
    else if(routes[id])routes[id]();
    else if(isDataLesson)renderDataLesson(app,ctx,ctx.dataLessonById.get(id));
    else renderUnavailable(id,ctx);
    if(id.startsWith('lesson-')&&ctx.lessonById.has(id)){
      if(!isDataLesson)attachLessonSupport(app,ctx,id);
      attachLessonProgress(app,id);
    }
    afterRender(ctx,id);
  }).catch(error=>{
    if(sequence!==routeSequence)return;
    console.error(error);
    renderLoadError(()=>route(ctx));
  });
}

async function start(){
  const settings=applySettings(document.documentElement,getSettings());
  const profile=hasActiveProfile();
  if(!location.hash){
    const restore=profile&&settings.lastRoute&&settings.lastRoute!=='#home'?settings.lastRoute:'#home';
    history.replaceState(null,'',restore);
  }
  const ctx={assets:{},assetPromises:{},datasetVersion:DATASET_VERSION};
  installSkipLink();
  installRubyObserver(ctx);
  addEventListener('hashchange',()=>{void route(ctx)});
  const retryInitial=async()=>{try{await ensureAssets(ctx,INITIAL_ASSETS);await route(ctx)}catch(error){console.error(error);renderLoadError(retryInitial)}};
  try{if(profile)await synchronizeActiveProfileFromCloud();await ensureAssets(ctx,INITIAL_ASSETS);await route(ctx)}
  catch(error){console.error(error);renderLoadError(retryInitial)}
}

start();
