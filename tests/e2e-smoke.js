import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,webkit} from 'playwright';

const root=path.resolve(process.cwd(),process.env.E2E_ROOT||fileURLToPath(new URL('..',import.meta.url)));
const practiceRoutes=[
  '#practice?mode=draw-discard',
  '#practice?mode=wall',
  '#practice?mode=kan',
  '#practice?mode=hand-flow',
  '#practice?mode=hand-flow&scenario=call',
  '#practice?mode=hand-flow&scenario=riichi',
  '#practice?mode=hand-flow&scenario=draw',
  '#practice?mode=round-flow',
  '#practice?mode=calls',
  '#practice?mode=riichi',
  '#practice?mode=furiten',
  '#practice?mode=east-round',
  '#dictionary?term=term-riichi',
  '#yaku-guide?yaku=yaku-riichi'
];
const widthRoutes=['#home','#menu','#learn','#learn?level=intro','#lookup','#problems','#intro-review','#study-record','#lesson-intro-04','#lesson-intro-05','#lesson-intermediate-05?han=2&fu=40&dealer=1&win=tsumo','#automatic-calculator','#practice?mode=draw-discard','#practice?mode=wall','#practice?mode=kan','#practice?mode=hand-flow&scenario=draw','#practice?mode=round-flow','#practice?mode=east-round','#full-round','#settings','#teacher-record','#print-materials'];
const widths=[320,375,390,402,430];
const qualityJsonPaths=new Set(['/src/data/lesson-quality.json','/src/data/lesson-quality-advanced.json','/src/data/lesson-quality-core.json']);

const mimeTypes={
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml'
};

function startStaticServer(){
  const server=createServer(async(req,res)=>{
    try{
      const requestUrl=new URL(req.url||'/', 'http://127.0.0.1');
      const relative=requestUrl.pathname==='/'?'index.html':requestUrl.pathname.replace(/^\/+/, '');
      const filePath=path.resolve(root,relative);
      if(filePath!==root&&!filePath.startsWith(`${root}${path.sep}`)){res.writeHead(403);res.end('Forbidden');return}
      const fileStat=await stat(filePath);
      if(!fileStat.isFile()){res.writeHead(404);res.end('Not found');return}
      const body=await readFile(filePath);
      res.writeHead(200,{'cache-control':'no-store','content-type':mimeTypes[path.extname(filePath)]||'application/octet-stream'});
      res.end(body);
    }catch(error){
      res.writeHead(error?.code==='ENOENT'?404:500,{'content-type':'text/plain; charset=utf-8'});
      res.end(error?.code==='ENOENT'?'Not found':'Internal server error');
    }
  });
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>resolve({server,base:`http://127.0.0.1:${server.address().port}`}));
  });
}

async function seedProfile(page,base,name='E2E学習者'){
  await page.goto(`${base}/index.html#home`,{waitUntil:'networkidle',timeout:20000});
  await page.evaluate(profileName=>{
    localStorage.setItem('wakaranjan-profiles-v1',JSON.stringify({version:1,activeId:'profile-1',profiles:[{id:'profile-1',name:profileName,nameKey:profileName.toLocaleLowerCase('ja-JP'),progress:{completed:[],lastLesson:null}}]}));
  },name);
}

async function visit(browser,base,route,viewport,onReady,beforeGoto){
  const page=await browser.newPage({viewport});
  await page.addInitScript(()=>{window.__WAKARANJAN_DISABLE_CLOUD__=true});
  const errors=[];
  const onPageError=error=>errors.push(`pageerror: ${error.message}`);
  const onConsole=message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)};
  page.on('pageerror',onPageError);
  page.on('console',onConsole);
  try{
    if(route!=='#home'&&route!=='#not-a-real-screen')await seedProfile(page,base);
    if(beforeGoto)await beforeGoto(page);
    const response=await page.goto(`${base}/index.html${route}`,{waitUntil:'networkidle',timeout:20000});
    if(response)assert.ok(response.ok(),`${route} returned HTTP ${response.status()}`);
    const expectedRoute=route==='#not-a-real-screen'?'home':route.slice(1).split('?')[0]||'home';
    await page.locator('#app').waitFor({state:'attached',timeout:10000});
    await page.waitForFunction(expected=>document.querySelector('#app')?.dataset.route===expected,expectedRoute,{timeout:10000});
    assert.doesNotMatch(await page.locator('#app').innerText(),/教材を読み込めませんでした/);
    await assertNamedFormControls(page,route);
    await assertHeaderTapTargets(page,route);
    if(onReady)await onReady(page);
    await page.waitForTimeout(40);
    await assertRubyAnnotationLayout(page,route);
    assert.deepEqual(errors,[],`${route} generated browser errors:\n${errors.join('\n')}`);
    return page;
  }finally{
    page.off('pageerror',onPageError);
    page.off('console',onConsole);
    await page.close();
  }
}

async function discoverRoutes(browser,base){
  const routes=new Set(['#home','#menu','#learn','#lookup']);
  const addLinks=async page=>{
    const links=await page.locator('a[href^="#"]').evaluateAll(anchors=>anchors.map(anchor=>anchor.getAttribute('href')).filter(Boolean));
    for(const link of links)if(link!=='#app')routes.add(link);
  };
  await visit(browser,base,'#home',{width:402,height:874},addLinks);
  await visit(browser,base,'#menu',{width:402,height:874},addLinks);
  await visit(browser,base,'#learn',{width:402,height:874},addLinks);
  for(const level of ['intro','beginner','intermediate','advanced','special'])await visit(browser,base,`#learn?level=${level}`,{width:402,height:874},addLinks);
  await visit(browser,base,'#lookup',{width:402,height:874},addLinks);
  await visit(browser,base,'#practice',{width:402,height:874},addLinks);
  for(const route of practiceRoutes)routes.add(route);
  return [...routes];
}

async function assertLessonAssetSelection(browser,base,route,{quality,content}){
  const jsonPaths=[];
  await visit(browser,base,route,{width:402,height:874},async()=>{
    const unique=[...new Set(jsonPaths)].sort();
    const qualityPath=`/src/data/${quality}.json`;
    assert.ok(unique.includes(qualityPath),`${route} が ${qualityPath} を取得していません: ${unique.join(', ')}`);
    assert.equal(unique.filter(path=>qualityJsonPaths.has(path)).length,1,`${route} が品質JSONを複数取得しています: ${unique.join(', ')}`);
    if(content){
      const contentPath=`/src/data/${content}.json`;
      assert.ok(unique.includes(contentPath),`${route} が ${contentPath} を取得していません: ${unique.join(', ')}`);
    }
  },async page=>{
    page.on('request',request=>{
      const url=new URL(request.url());
      if(url.pathname.startsWith('/src/data/')&&url.pathname.endsWith('.json'))jsonPaths.push(url.pathname);
    });
  });
}

async function assertNoPageOverflow(page,route,width){
  const metrics=await page.evaluate(()=>{
    const app=document.querySelector('#app');
    return {
      innerWidth:window.innerWidth,
      documentWidth:document.documentElement.scrollWidth,
      bodyWidth:document.body.scrollWidth,
      appWidth:app?.scrollWidth||0,
      appClientWidth:app?.clientWidth||0
    };
  });
  const widest=Math.max(metrics.documentWidth,metrics.bodyWidth,metrics.appWidth);
  assert.ok(widest<=width+1,`${route} at ${width}px overflows: ${JSON.stringify(metrics)}`);
}

async function assertNamedFormControls(page,route){
  const missing=await page.locator('input:not([type="hidden"]),select,textarea').evaluateAll(elements=>elements.filter(element=>{
    const labelledBy=(element.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();
    const label=element.getAttribute('aria-label')?.trim()||labelledBy||[...(element.labels||[])].map(labelElement=>labelElement.textContent||'').join(' ').trim();
    return !label;
  }).map(element=>({tag:element.tagName.toLowerCase(),id:element.id,type:element.getAttribute('type')||''})));
  assert.deepEqual(missing,[],`${route} の入力欄に読み上げ可能な名前がありません: ${JSON.stringify(missing)}`);
}

async function assertHeaderTapTargets(page,route){
  const sizes=await page.evaluate(()=>Object.fromEntries(['.brand','.header-settings'].map(selector=>[selector,document.querySelector(selector)?.getBoundingClientRect().height||0])));
  for(const [selector,height] of Object.entries(sizes))assert.ok(height>=44,`${route} の ${selector} の操作領域が44px未満です: ${height}`);
}

async function assertRubyAnnotationLayout(page,route){
  const issues=await page.evaluate(()=>[...document.querySelectorAll('ruby.mahjong-ruby')].flatMap((ruby,index)=>{
    const base=ruby.querySelector('rb');
    const reading=ruby.querySelector('rt');
    if(!base||!reading)return [];
    const baseRect=base.getBoundingClientRect();
    const readingRect=reading.getBoundingClientRect();
    if(!baseRect.width||!readingRect.width)return [];
    const epsilon=1;
    const problems=[];
    if(readingRect.top>=baseRect.top-epsilon)problems.push('reading is not above base text');
    return problems.length?[{index,problems,base:[baseRect.top,baseRect.bottom],reading:[readingRect.top,readingRect.bottom]}]:[];
  }));
  assert.deepEqual(issues,[],`${route} のルビが行や漢字に重なっています: ${JSON.stringify(issues)}`);
}

async function assertFavicon(page){
  const favicon=await page.evaluate(async()=>{
    const link=document.querySelector('link[rel~="icon"]');
    if(!link)return {href:'',status:0,type:''};
    const response=await fetch(link.href,{cache:'no-store'});
    return {href:link.getAttribute('href'),status:response.status,type:response.headers.get('content-type')||''};
  });
  assert.equal(favicon.status,200,`faviconが取得できません: ${JSON.stringify(favicon)}`);
  assert.match(favicon.type,/image\/svg\+xml/i,`faviconのContent-Typeが不正です: ${JSON.stringify(favicon)}`);
}

async function assertSkipLinkPreservesRoute(browser,base,route){
  await visit(browser,base,route,{width:402,height:874},async page=>{
    const beforeHash=new URL(page.url()).hash||'#home';
    const beforeHeading=await page.locator('#app h1').innerText();
    await page.locator('.skip-link').focus();
    await page.locator('.skip-link').click();
    const state=await page.evaluate(()=>({hash:location.hash,activeId:document.activeElement?.id,appTop:document.querySelector('#app')?.getBoundingClientRect().top??Infinity,headerBottom:document.querySelector('.site-header')?.getBoundingClientRect().bottom??0}));
    assert.equal(state.hash,beforeHash,`${route} の「本文へ移動」でURLの画面IDが変わりました`);
    assert.equal(state.activeId,'app','「本文へ移動」で本文へキーボード操作位置が移りません');
    assert.ok(state.appTop<=Math.max(5,state.headerBottom)+2,`「本文へ移動」で本文位置へスクロールされません: ${JSON.stringify(state)}`);
    assert.equal(await page.locator('#app h1').innerText(),beforeHeading,'「本文へ移動」で表示内容が変わりました');
    await page.reload({waitUntil:'networkidle',timeout:20000});
    await page.locator('#app > *').first().waitFor({state:'attached',timeout:10000});
    assert.equal(new URL(page.url()).hash,beforeHash,'再読み込み後に画面IDが変わりました');
    assert.equal(await page.locator('#app h1').innerText(),beforeHeading,'再読み込み後に元の画面へ戻れません');
  });
}

async function assertRetryAfterAssetFailure(browser,base,{route,asset,expectedText}){
  const page=await browser.newPage({viewport:{width:402,height:874}});
  const pageErrors=[];let requests=0;
  page.on('pageerror',error=>pageErrors.push(error.message));
  if(route!=='#home')await seedProfile(page,base);
  await page.route(`**${asset}*`,async request=>{
    requests+=1;
    if(requests===1)await request.abort();else await request.continue();
  });
  try{
    const response=await page.goto(`${base}/index.html${route}`,{waitUntil:'networkidle',timeout:20000});
    if(response)assert.ok(response.ok(),`${route} returned HTTP ${response.status()}`);
    await page.locator('#load-retry').waitFor({state:'visible',timeout:10000});
    assert.match(await page.locator('#app').innerText(),/通信状態/);
    assert.equal(await page.locator('#load-retry').isEnabled(),true);
    await page.locator('#load-retry').evaluate(button=>{button.click();button.click();button.click()});
    await page.locator('#load-retry').waitFor({state:'detached',timeout:10000});
    await page.locator('#app h1').waitFor({state:'attached',timeout:10000});
    assert.match(await page.locator('#app').innerText(),expectedText);
    assert.doesNotMatch(await page.locator('#app').innerText(),/教材を読み込めませんでした/);
    assert.equal(requests,2,`${asset} が再試行の連打で多重取得されました`);
    assert.deepEqual(pageErrors,[],`${route} の再試行でJavaScript例外が発生しました`);
  }finally{
    await page.unroute(`**${asset}*`);
    await page.close();
  }
}

async function assertCloudSyncFailureRetry(browser,base){
  const page=await browser.newPage({viewport:{width:402,height:874}});
  const pageErrors=[];let requests=0;
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(`${base}/index.html#home`,{waitUntil:'networkidle',timeout:20000});
  await page.evaluate(()=>{
    localStorage.setItem('wakaranjan-profiles-v1',JSON.stringify({version:1,activeId:'profile-1',profiles:[{id:'profile-1',name:'Cloud E2E',nameKey:'cloud e2e',progress:{completed:[],lastLesson:null}}]}));
  });
  await page.route('**/rest/v1/wakaranjan_learning_profiles**',async request=>{
    requests+=1;
    if(requests===1){await request.abort();return}
    await request.fulfill({status:200,headers:{'content-type':'application/json'},body:JSON.stringify([{display_name:'Cloud E2E',learning_state:{lessonProgress:{completed:['lesson-intro-01'],lastLesson:'lesson-intro-01'}}}])});
  });
  try{
    // A direct hash change does not rerun the boot-time profile hydration.
    // Reload after seeding so this follows the same path as a returning user.
    await page.reload({waitUntil:'networkidle',timeout:20000});
    await page.locator('.sync-status[data-sync-state="error"]').waitFor({state:'visible',timeout:10000});
    await page.goto(`${base}/index.html#menu`,{waitUntil:'networkidle',timeout:20000});
    await page.locator('#retry-cloud-sync-menu').click();
    await page.locator('.sync-status[data-sync-state="synced"]').waitFor({state:'visible',timeout:10000});
    assert.match(await page.locator('#app').innerText(),/1 \/ 6 完了/,'再試行後にクラウドの教材進捗を反映できません');
    assert.equal(requests,2,'Supabase同期の再試行でリクエストが重複しました');
    assert.deepEqual(pageErrors,[],'Supabase同期の失敗・再試行でJavaScript例外が発生しました');
  }finally{
    await page.unroute('**/rest/v1/wakaranjan_learning_profiles**');
    await page.close();
  }
}

async function run(){
  for(const asset of ['index.html','favicon.svg','styles.css','accessibility.css','ux-reorganization.css','src/app.js','src/lib/profile.js','src/data/manifest.json']){
    const assetStat=await stat(path.join(root,asset));
    assert.ok(assetStat.isFile(),`公開用ファイルがありません: ${asset}`);
  }
  const {server,base}=await startStaticServer();
  let browser;
  try{
    const browserType=process.env.PLAYWRIGHT_BROWSER==='webkit'?webkit:chromium;
    browser=await browserType.launch({headless:true});
    const routes=await discoverRoutes(browser,base);
    assert.ok(routes.length>=64,`expected at least 64 reachable hash routes, found ${routes.length}`);
    await visit(browser,base,'#home',{width:402,height:874},async page=>{
      assert.match(await page.locator('#app').innerText(),/まず、名前を入力してください/);
      assert.ok(await page.locator('ruby.mahjong-ruby').count(),'ホームの麻雀用語にルビがありません');
      await page.locator('#profile-name').fill('Alice');
      await page.getByRole('button',{name:'名前を入力して始める',exact:true}).click();
      await page.locator('.menu-hero h1').waitFor({state:'attached',timeout:10000});
      assert.match(await page.locator('#app').innerText(),/Aliceさん/);
      assert.match(new URL(page.url()).hash,/#menu$/);
    });
    await visit(browser,base,'#home',{width:402,height:874},async page=>{
      await page.locator('#profile-name').fill('Alice');
      await page.getByRole('button',{name:'名前を入力して始める',exact:true}).click();
      await page.goto(`${base}/index.html#lesson-intro-01`,{waitUntil:'networkidle',timeout:20000});
      await page.locator('#lesson-complete').click();
      await page.goto(`${base}/index.html#menu`,{waitUntil:'networkidle',timeout:20000});
      await page.locator('.profile-switch').click();
      await page.locator('#profile-name').fill('Bob');
      await page.getByRole('button',{name:'この名前でメニューへ',exact:true}).click();
      await page.goto(`${base}/index.html#learn?level=intro`,{waitUntil:'networkidle',timeout:20000});
      assert.match(await page.locator('.progress-badge').innerText(),/^0 \/ 6 完了$/,'BobにAliceの教材進捗が混ざっています');
      await page.goto(`${base}/index.html#home`,{waitUntil:'networkidle',timeout:20000});
      await page.locator('#profile-name').fill('Alice');
      await page.getByRole('button',{name:'この名前でメニューへ',exact:true}).click();
      await page.goto(`${base}/index.html#learn?level=intro`,{waitUntil:'networkidle',timeout:20000});
      assert.match(await page.locator('.progress-badge').innerText(),/^1 \/ 6 完了$/,'Aliceの教材進捗を復元できません');
    });
    for(const route of ['#home','#menu','#learn?level=intro','#lesson-intro-04','#problems','#automatic-calculator'])await assertSkipLinkPreservesRoute(browser,base,route);
    await assertRetryAfterAssetFailure(browser,base,{route:'#home',asset:'/src/data/manifest.json',expectedText:/名前を入力して始める/});
    await assertRetryAfterAssetFailure(browser,base,{route:'#lesson-intro-04',asset:'/src/data/lesson-quality-core.json',expectedText:/入門 1-4/});
    await assertCloudSyncFailureRetry(browser,base);
    await visit(browser,base,'#not-a-real-screen',{width:402,height:874},async page=>{
      assert.equal(new URL(page.url()).hash,'#home','不正な画面IDからホームへ復旧できません');
      assert.match(await page.locator('#app').innerText(),/まず、名前を入力してください/);
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wakaranjan-settings-v1')||'{}').lastRoute);
      assert.equal(saved,'#home','不正な画面IDを最後に開いたページとして保存しています');
    });
    await visit(browser,base,'#home',{width:402,height:874},async page=>{
      await page.evaluate(()=>{
        localStorage.setItem('wakaranjan-settings-v1','{"lastRoute":"#app","displayScale":"invalid"}');
        localStorage.setItem('wakaranjan-lesson-progress-v1','{"completed":"broken","lastLesson":42}');
        localStorage.setItem('wakaranjan-profiles-v1','{"profiles":"broken","activeId":42}');
        history.replaceState(null,'',location.pathname+location.search);
      });
      await page.reload({waitUntil:'networkidle',timeout:20000});
      await page.locator('#app > *').first().waitFor({state:'attached',timeout:10000});
      assert.equal(new URL(page.url()).hash||'#home','#home','壊れた保存データからホームへ復旧できません');
      assert.match(await page.locator('#app').innerText(),/まず、名前を入力してください/);
      assert.doesNotMatch(await page.locator('#app').innerText(),/教材を読み込めませんでした/);
    });
    await visit(browser,base,'#home',{width:402,height:874},assertFavicon);
    const homeJsonRequests=[];
    await visit(browser,base,'#home',{width:402,height:874},async page=>{
      const jsonPaths=[...new Set(homeJsonRequests)].sort();
      assert.deepEqual(jsonPaths,['/src/data/manifest.json','/src/data/rules.json'],'ホーム初回表示で教材本文を取得しています');
    },async page=>{
      page.on('request',request=>{
        const url=new URL(request.url());
        if(url.pathname.startsWith('/src/data/')&&url.pathname.endsWith('.json'))homeJsonRequests.push(url.pathname);
      });
    });
    await visit(browser,base,'#dictionary',{width:402,height:874},async page=>{
      const readings=await page.locator('ruby.mahjong-ruby rt').evaluateAll(elements=>elements.map(element=>element.textContent));
      assert.ok(readings.length>0,'麻雀用語のルビが表示されていません');
      assert.ok(readings.every(reading=>/^[ァ-ヶー\s]+$/.test(reading)),`カタカナ以外のルビがあります: ${readings.join(', ')}`);
    });
    await visit(browser,base,'#learn?level=intro',{width:402,height:874},async page=>{
      assert.equal(await page.locator('.page-toolbar').count(),1,'ページ上部の共通ナビゲーションがありません');
      await page.locator('.page-back').click();
      assert.match(new URL(page.url()).hash,/#menu$/,'戻る操作でメニューへ戻れません');
    });
    await visit(browser,base,'#problems',{width:402,height:874},async page=>{
      await page.locator('[data-topic="ron-decision"]').click();
      let foundFixedVisual=false;
      for(let index=0;index<10;index++){
        if(await page.locator('.no-scroll-hand').count()){
          foundFixedVisual=true;
          const metrics=await page.locator('.no-scroll-hand').first().evaluate(element=>({scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,overflow:getComputedStyle(element).overflowX}));
          assert.ok(metrics.scrollWidth<=metrics.clientWidth+1,`牌姿が横スクロール可能です: ${JSON.stringify(metrics)}`);
          assert.equal(metrics.overflow,'visible');
        }
        if(index===0)await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
        const textChoice=page.locator('#problem-options > button');
        if(await textChoice.count())await textChoice.first().click();
        else{
          await page.locator('#problem-options .tile-answer-tile').first().click();
          await page.locator('.tile-answer-submit').click();
        }
        const next=page.locator('#problem-actions button');
        if(!await next.count())break;
        await next.first().click();
        await page.locator('#problem-options, .hero').first().waitFor({state:'attached',timeout:10000});
        if(index===0)assert.ok(await page.evaluate(()=>window.scrollY<=1),'問題を次へ進んだとき最上部へ戻りません');
      }
      assert.equal(foundFixedVisual,true,'牌姿問題を検査できませんでした');
    },async page=>{
      await page.addInitScript(()=>{Math.random=()=>0.5});
    });
    await visit(browser,base,'#intro-review',{width:402,height:874},async page=>{
      let foundVisual=false;
      for(let index=0;index<12;index++){
        const visual=page.locator('#review-visual');
        if(await visual.count()){
          foundVisual=true;
          const order=await page.evaluate(()=>({hand:document.querySelector('.problem-hand-area')?.getBoundingClientRect().top??Infinity,choices:document.querySelector('.problem-choice-area')?.getBoundingClientRect().top??-Infinity}));
          assert.ok(order.hand<order.choices,`入門総復習で牌が選択肢より上にありません: ${JSON.stringify(order)}`);
          assert.equal(await page.locator('.tile-answer-submit').isDisabled(),true,'牌未選択でも回答ボタンを押せます');
          await page.locator('.tile-answer-tile').first().click();
          await page.locator('.tile-answer-submit').click();
        }else{
          await page.locator('#review-options > button').first().click();
        }
        await page.locator('#review-actions button').click();
      }
      assert.equal(foundVisual,true,'入門総復習の牌タップ問題を検査できませんでした');
      assert.match(await page.locator('#app').innerText(),/問正解/,'入門総復習の結果画面が表示されません');
    });
    await visit(browser,base,'#lesson-intermediate-05?han=2&fu=40&dealer=1&win=tsumo',{width:402,height:874},async page=>{
      assert.equal(await page.locator('#han').inputValue(),'2','問題の翻数を計算機へ引き継げません');
      assert.equal(await page.locator('#fu').inputValue(),'40','問題の符を計算機へ引き継げません');
      assert.equal(await page.locator('#dealer').isChecked(),true,'問題の親子条件を計算機へ引き継げません');
      assert.equal(await page.locator('#win').inputValue(),'tsumo','問題のロン／ツモ条件を計算機へ引き継げません');
      assert.equal(await page.locator('#yakuman').isChecked(),false,'通常役の問題で役満条件が有効になっています');
      assert.match(await page.locator('#score-result').innerText(),/1300点オール/,'引き継いだ条件の計算結果が表示されません');
    });
    await visit(browser,base,'#problems',{width:402,height:874},async page=>{
      await page.locator('[data-category="score"]').click();
      await page.locator('#problem-options > button').first().click();
      const preset=page.locator('#problem-actions a.score-preset-link');
      assert.equal(await preset.count(),1,'点数問題に計算機プリセットへの導線がありません');
      assert.match(await preset.getAttribute('href'),/^#lesson-intermediate-05\?han=/,'点数問題の計算機リンクに条件がありません');
    });
    for(const [route,assets] of [
      ['#lesson-intro-04',{quality:'lesson-quality-core'}],
      ['#lesson-intermediate-01',{quality:'lesson-quality-core'}],
      ['#lesson-beginner-07',{quality:'lesson-quality',content:'curriculum-extra'}],
      ['#lesson-advanced-01',{quality:'lesson-quality-advanced',content:'advanced-special'}]
    ])await assertLessonAssetSelection(browser,base,route,assets);
    for(const route of routes)await visit(browser,base,route,{width:402,height:874},page=>assertNoPageOverflow(page,route,402));

    await visit(browser,base,'#practice?mode=draw-discard',{width:402,height:874},async page=>{
      await page.locator('#draw-actions button').click();
      await page.locator('#draw-hand button.tile').first().click();
      assert.match(await page.locator('#draw-message').innerText(),/確認できました/);
    });
    await visit(browser,base,'#practice?mode=east-round',{width:402,height:874},async page=>{
      for(let round=0;round<4;round++){
        await page.locator('#east-options .practice-choice').first().click();
        await page.locator('#east-actions button').click();
      }
      assert.match(await page.locator('h1').innerText(),/4局.*を終えました/);
      assert.match(await page.locator('#app').innerText(),/模擬東風戦（案内版）/);
    });
    await visit(browser,base,'#practice?mode=round-flow',{width:402,height:874},async page=>{
      for(let step=0;step<6;step++)await page.locator('#flow-actions button').click();
      assert.match(await page.locator('h1').innerText(),/局.*の進み方を確認できました/);
    });
    await visit(browser,base,'#practice?mode=kan',{width:402,height:874},async page=>{
      for(let scene=0;scene<3;scene++){
        await page.locator('#kan-actions button.primary').click();
        if(scene<2)await page.locator('#kan-actions button.primary').click();
      }
      const feedback=(await page.locator('#kan-feedback').innerText()).replace(/\s+/g,'');
      assert.match(feedback,/加槓.*の処理を確認しました/);
    });
    await visit(browser,base,'#full-round',{width:402,height:874},async page=>{
      for(let scenario=0;scenario<3;scenario++){
        let steps=0;
        while(await page.locator('#round-options .practice-choice').count()){
          assert.ok(steps<6,'通し型実戦練習が完了しません（シナリオ'+(scenario+1)+'）');
          await page.locator('#round-options .practice-choice').first().click();
          await page.locator('#round-actions button.primary').click();
          steps+=1;
        }
        assert.equal(steps,5,'通し型実戦練習の判断数が想定外です（シナリオ'+(scenario+1)+'）');
        assert.match(await page.locator('h1').innerText(),/完了/);
        if(scenario<2)await page.locator('#next-scenario').click();
      }
    });
    await visit(browser,base,'#practice?mode=hand-flow&scenario=draw',{width:402,height:874},async page=>{
      await page.locator('#hand-flow-actions button').first().click();
      await page.locator('#hand-flow-actions button').first().click();
      const feedback=(await page.locator('#hand-flow-feedback').innerText()).replace(/\s+/g,'');
      assert.match(feedback,/流局.*一局.*完了しています/);
    });
    for(const route of ['#problems','#dictionary?term=term-riichi','#automatic-calculator','#practice?mode=east-round']){
      await visit(browser,base,route,{width:402,height:874},async page=>{
        await page.reload({waitUntil:'networkidle',timeout:20000});
        await page.locator('#app > *').first().waitFor({state:'attached',timeout:10000});
        assert.doesNotMatch(await page.locator('#app').innerText(),/教材を読み込めませんでした/);
      });
    }
    await visit(browser,base,'#settings',{width:402,height:874},async page=>{
      await page.locator('#settings-display').selectOption('large');
      await page.locator('#settings-sound').uncheck();
      await page.locator('#settings-motion').selectOption('on');
      assert.equal(await page.locator('html').getAttribute('data-display-scale'),'large');
      assert.equal(await page.locator('html').getAttribute('data-sound'),'off');
      assert.equal(await page.locator('html').getAttribute('data-reduced-motion'),'on');
      await page.goto(`${base}/index.html`,{waitUntil:'networkidle'});
      await page.locator('#settings-display').waitFor({state:'attached',timeout:10000});
      assert.match(page.url(),/#settings$/);
      await page.locator('#settings-display').selectOption('system');
      await page.locator('#settings-sound').check();
      await page.locator('#settings-motion').selectOption('system');
    });
    await visit(browser,base,'#teacher-record',{width:402,height:874},async page=>{
      assert.match(await page.locator('h1').innerText(),/学習状況の確認/);
      assert.match(await page.locator('#app').innerText(),/Supabase/);
    });
    await visit(browser,base,'#print-materials',{width:402,height:874},async page=>{
      const title=(await page.locator('h1').innerText()).replace(/\s+/g,'');
      assert.match(title,/麻雀(?:マージャン)?学習用まとめ/);
      await page.locator('#print-materials').click();
    });
    await visit(browser,base,'#problems',{width:402,height:874},async page=>{
      await page.locator('[data-category]').first().click();
      const textChoice=page.locator('#problem-options > button');
      if(await textChoice.count()){
        await textChoice.first().click();
      }else{
        await page.locator('#problem-options .tile-answer-tile').first().click();
        await page.locator('.tile-answer-submit').click();
      }
      await page.locator('#problem-actions button').first().waitFor({state:'attached',timeout:10000});
      assert.match(await page.locator('#problem-feedback').innerText(),/正解|不正解/);
      await page.goto(`${base}/index.html#study-record`,{waitUntil:'networkidle'});
      await page.locator('h1').waitFor({state:'attached',timeout:10000});
      assert.match(await page.locator('#app').innerText(),/1回答/);
      await page.evaluate(()=>localStorage.setItem('wakaranjan-question-stats-v2:profile-1','null'));
      await page.reload({waitUntil:'networkidle'});
      await page.locator('h1').waitFor({state:'attached',timeout:10000});
      assert.match(await page.locator('#app').innerText(),/学習記録/);
      assert.match(await page.locator('#app').innerText(),/0回答/);
    });
    await visit(browser,base,'#study-record',{width:402,height:874},async page=>{
      let accepted=false;
      page.once('dialog',async dialog=>{accepted=dialog.message().includes('Supabase');await dialog.accept()});
      await page.locator('#clear-all-study-record').click();
      await page.locator('text=学習状況を解除しました。').waitFor({state:'visible',timeout:10000});
      assert.equal(accepted,true,'学習状況解除の確認ダイアログが表示されません');
      assert.match(await page.locator('#app').innerText(),/0 \/ 38章/);
      const remaining=await page.evaluate(()=>Object.keys(localStorage).filter(key=>/wakaranjan-(lesson-progress|wrong-question|question-stats|misconceptions)/.test(key)));
      assert.deepEqual(remaining,[],'解除後に学習状態のlocalStorageを残しています');
    });
    await visit(browser,base,'#lesson-intro-05',{width:402,height:874},async page=>{
      await page.locator('[data-answer="no"]').click();
      assert.match(await page.locator('#winFeedback').innerText(),/正解です/);
    });
    await visit(browser,base,'#automatic-calculator',{width:402,height:874},async page=>{
      for(const [id,label] of [['doraIndicators-select','表ドラ表示牌'],['uraIndicators-select','裏ドラ表示牌'],['kanDoraIndicators-select','槓ドラ表示牌'],['kanUraIndicators-select','槓裏ドラ表示牌'],['river-tile','自分の河へ追加する牌']]){
        const labels=await page.locator(`#${id}`).evaluate(element=>[...(element.labels||[])].map(labelElement=>{const copy=labelElement.cloneNode(true);copy.querySelectorAll('rt').forEach(rt=>rt.remove());return copy.textContent.trim()}));
        assert.deepEqual(labels,[label],`${label}の入力欄に読み上げ可能なラベルがありません`);
        const escaped=[...label].map(character=>character.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');
        assert.match(await page.locator(`#${id}`).ariaSnapshot(),new RegExp(escaped),`${label}を読み上げ名で特定できません`);
      }
      await page.locator('#example').click();
      await page.locator('#dealer').check();
      await page.locator('#win-kind').selectOption('tsumo');
      await page.locator('#riichi').check();
      await page.locator('#double-riichi').check();
      await page.locator('[data-special="tenhou"]').check();
      await page.locator('#honba').fill('2');
      await page.locator('#honba').blur();
      await page.locator('#calculate').click();
      assert.match(await page.locator('#calc-result').innerText(),/同時に指定できません/);
      await page.locator('#clear').click();
      assert.equal(await page.locator('#dealer').isChecked(),false);
      assert.equal(await page.locator('#riichi').isChecked(),false);
      assert.equal(await page.locator('#double-riichi').isChecked(),false);
      assert.equal(await page.locator('#honba').inputValue(),'0');
      assert.equal(await page.locator('[data-add-indicator="kanDoraIndicators"]').isDisabled(),true);
      await page.locator('#calc-palette [aria-label^="赤五萬"]').click();
      assert.equal(await page.locator('#calc-hand .tile.red').count(),1);
      assert.equal(await page.locator('#calc-palette [aria-label^="赤五萬"]').isDisabled(),true);
      await page.locator('#clear').click();
      await page.locator('#example').click();
      let dialogMessage='';
      page.once('dialog',dialog=>{dialogMessage=dialog.message();void dialog.dismiss()});
      await page.locator('#add-meld').click();
      assert.match(dialogMessage,/自動で削除しません/);
      assert.equal(await page.locator('.meld-card').count(),0);
      assert.equal(await page.locator('#calc-hand .tile').count(),14);
      await page.locator('#clear').click();
      await page.locator('#calculate').click();
      assert.notEqual(await page.locator('#calc-result').innerText(),'');
    });

    for(const width of widths){
      for(const route of widthRoutes){
        await visit(browser,base,route,{width,height:874},page=>assertNoPageOverflow(page,route,width));
      }
    }
    console.log(`browser smoke tests passed [${process.env.PLAYWRIGHT_BROWSER||'chromium'}]: ${routes.length} routes, widths ${widths.join(', ')}`);
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
}

run().catch(error=>{console.error(error);process.exitCode=1});
