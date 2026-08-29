import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
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
const widthRoutes=['#home','#lesson-intro-04','#lesson-intro-05','#automatic-calculator','#practice?mode=draw-discard','#practice?mode=east-round','#settings','#teacher-record','#print-materials'];
const widths=[320,375,390,402,430];

const mimeTypes={
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8'
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

async function visit(browser,base,route,viewport,onReady){
  const page=await browser.newPage({viewport});
  const errors=[];
  const onPageError=error=>errors.push(`pageerror: ${error.message}`);
  const onConsole=message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)};
  page.on('pageerror',onPageError);
  page.on('console',onConsole);
  try{
    const response=await page.goto(`${base}/index.html${route}`,{waitUntil:'networkidle',timeout:20000});
    assert.ok(response?.ok(),`${route} returned HTTP ${response?.status()}`);
    await page.locator('#app > *').first().waitFor({state:'attached',timeout:10000});
    assert.doesNotMatch(await page.locator('#app').innerText(),/教材を読み込めませんでした/);
    if(onReady)await onReady(page);
    await page.waitForTimeout(40);
    assert.deepEqual(errors,[],`${route} generated browser errors:\n${errors.join('\n')}`);
    return page;
  }finally{
    page.off('pageerror',onPageError);
    page.off('console',onConsole);
    await page.close();
  }
}

async function discoverRoutes(browser,base){
  const routes=new Set(['#home']);
  const addLinks=async page=>{
    const links=await page.locator('a[href^="#"]').evaluateAll(anchors=>anchors.map(anchor=>anchor.getAttribute('href')).filter(Boolean));
    for(const link of links)routes.add(link);
  };
  await visit(browser,base,'#home',{width:402,height:874},addLinks);
  await visit(browser,base,'#practice',{width:402,height:874},addLinks);
  for(const route of practiceRoutes)routes.add(route);
  return [...routes];
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

async function run(){
  const {server,base}=await startStaticServer();
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    const routes=await discoverRoutes(browser,base);
    assert.ok(routes.length>=64,`expected at least 64 reachable hash routes, found ${routes.length}`);
    for(const route of routes)await visit(browser,base,route,{width:402,height:874});

    await visit(browser,base,'#practice?mode=draw-discard',{width:402,height:874},async page=>{
      await page.locator('#draw-actions button').click();
      await page.locator('#draw-hand button.tile').first().click();
      assert.match(await page.locator('#draw-message').innerText(),/確認できました/);
    });
    await visit(browser,base,'#practice?mode=east-round',{width:402,height:874},async page=>{
      await page.locator('#east-options .practice-choice').first().click();
      await page.locator('#east-actions button').click();
      assert.match(await page.locator('.east-round-head').innerText(),/東風戦 2/);
    });
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
      assert.match(await page.locator('#app').innerText(),/この端末のブラウザ/);
    });
    await visit(browser,base,'#print-materials',{width:402,height:874},async page=>{
      assert.match(await page.locator('h1').innerText(),/麻雀 学習用まとめ/);
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
      await page.evaluate(()=>localStorage.setItem('wakaranjan-question-stats-v2','null'));
      await page.reload({waitUntil:'networkidle'});
      await page.locator('h1').waitFor({state:'attached',timeout:10000});
      assert.match(await page.locator('#app').innerText(),/学習記録/);
      assert.match(await page.locator('#app').innerText(),/0回答/);
    });
    await visit(browser,base,'#lesson-intro-05',{width:402,height:874},async page=>{
      await page.locator('[data-answer="no"]').click();
      assert.match(await page.locator('#winFeedback').innerText(),/正解です/);
    });
    await visit(browser,base,'#automatic-calculator',{width:402,height:874},async page=>{
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
    console.log(`browser smoke tests passed: ${routes.length} routes, widths ${widths.join(', ')}`);
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
}

run().catch(error=>{console.error(error);process.exitCode=1});
