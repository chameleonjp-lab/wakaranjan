import {appendTileRow,createTile} from '../components/tile.js';
import {applyKan,kanLabel} from '../lib/kan.js';
import {createRoundWall,deadWallRemaining,liveTilesRemaining,revealDoraIndicator,resolveKan} from '../lib/tile-wall.js';

const SCENES=[
  {
    type:'ankan',
    title:'暗槓',
    turnLabel:'自分のツモ番',
    description:'自分の手元に同じ牌が4枚あります。4枚すべてを使って暗槓します。',
    hand:['7p','7p','7p','7p','2m','3m','4m','4s','5s','6s','1z','1z','2z','3z'],
    openMelds:[],
    ownTurn:true
  },
  {
    type:'minkan',
    title:'大明槓',
    turnLabel:'他家の捨て牌への応答',
    description:'下家が7筒を捨てました。手元の7筒3枚と合わせて大明槓します。',
    hand:['7p','7p','7p','2m','3m','4m','4s','5s','6s','1z','1z','2z','3z'],
    openMelds:[],
    discardTile:'7p',
    from:'shimocha',
    fromLabel:'下家',
    ownTurn:false
  },
  {
    type:'kakan',
    title:'加槓',
    turnLabel:'自分のツモ番',
    description:'すでに公開している2zのポンに、手元の2zを1枚加えます。',
    hand:['2z','2m','3m','4m','5p','6p','7p','3s','4s','5s','1z','1z','6z','7z'],
    openMelds:[{type:'pon',tiles:['2z','2z','2z'],open:true}],
    ownTurn:true
  }
];

function nav(){return '<div class="lesson-nav"><a class="secondary" href="#practice">対局練習へ戻る</a><a class="primary" href="#menu">メニューへ</a></div>';}
function tileFor(ctx,code,options={}){return createTile(ctx.tileByCode.get(code),options);}
function appendBlock(container,ctx,label,codes,className='practice-tile-block'){
  const box=document.createElement('div');box.className=className;
  const title=document.createElement('strong');title.textContent=label;box.append(title);
  appendTileRow(box,codes.map(code=>ctx.tileByCode.get(code)));
  container.append(box);
}
function appendMeldBlock(container,ctx,label,melds){
  const box=document.createElement('div');box.className='practice-tile-block';
  const title=document.createElement('strong');title.textContent=label;box.append(title);
  const rows=document.createElement('div');rows.className='tile-row';
  melds.forEach(meld=>{
    const group=document.createElement('div');group.className='hand-block';
    meld.tiles.forEach(code=>group.append(tileFor(ctx,code)));
    rows.append(group);
  });
  box.append(rows);container.append(box);
}

export function renderKanPractice(app,ctx){
  const tileCodes=ctx.tiles.map(tile=>tile.code);
  const redFives=ctx.standardRules?.scope?.redFives||{man:1,pin:1,sou:1};
  let sceneIndex=0;
  let roundWall=null;
  let initialDora=null;
  let result=null;

  const resetScene=()=>{
    roundWall=createRoundWall({tileCodes,redFives});
    initialDora=revealDoraIndicator(roundWall);
    result=null;
  };

  const render=()=>{
    const scene=SCENES[sceneIndex];
    const successful=result?.applied?.ok&&result?.wall?.ok;
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習 2.5</div><h1>カン・嶺上ツモ・追加ドラ</h1><p class="lead">暗槓・大明槓・加槓を順番に確認し、カン後に王牌から何が起きるかを見ます。</p></section><section class="callout"><strong>この練習の範囲</strong><br>カンの種類を判定し、嶺上牌を1枚引いて、追加のドラ表示牌を1枚めくるところまでを扱います。点数計算や他家のロン判断は次の段階です。</section><section class="practice-surface"><p class="status">'+scene.title+'の練習 '+(sceneIndex+1)+' / '+SCENES.length+'　<span class="muted">'+scene.turnLabel+'</span></p><div class="practice-step-list"><span class="active">1 場面を見る</span><span class="'+(successful?'active':'')+'">2 '+scene.title+'する</span><span class="'+(successful?'active':'')+'">3 嶺上牌・追加ドラ</span></div><p id="kan-message" class="status" aria-live="polite"></p><div class="practice-call-layout"><div id="kan-hand"></div><div id="kan-discard"></div></div><div id="kan-open-melds"></div><div class="wall-status-grid"><div class="wall-status-card"><span>通常の牌山</span><strong id="kan-live-count"></strong></div><div class="wall-status-card"><span>王牌の残り</span><strong id="kan-dead-count"></strong></div></div><div class="practice-call-layout"><div id="kan-dora"></div><div id="kan-result"></div></div><div class="action-row" id="kan-actions"></div><div class="feedback" id="kan-feedback" aria-live="polite"></div></section>'+nav();
    const message=app.querySelector('#kan-message');
    const handBox=app.querySelector('#kan-hand');
    const discardBox=app.querySelector('#kan-discard');
    const openMeldBox=app.querySelector('#kan-open-melds');
    const doraBox=app.querySelector('#kan-dora');
    const resultBox=app.querySelector('#kan-result');
    const actions=app.querySelector('#kan-actions');
    const feedback=app.querySelector('#kan-feedback');
    message.textContent=successful?'カンが成立し、王牌の処理まで完了しました。':scene.description;
    appendBlock(handBox,ctx,'あなたの手牌',result?.applied?.concealedTiles||scene.hand);
    if(scene.openMelds.length)appendMeldBlock(openMeldBox,ctx,'公開している面子',result?.applied?.openMelds||scene.openMelds);
    if(scene.discardTile){
      appendBlock(discardBox,ctx,(scene.fromLabel||'他家')+'の捨て牌',[scene.discardTile],'practice-discard');
    }else{
      discardBox.className='practice-discard';
      discardBox.innerHTML='<strong>今回の捨て牌</strong><p class="muted">自分のツモ番で宣言</p>';
    }
    doraBox.className='practice-tile-block';
    const doraTitle=document.createElement('strong');doraTitle.textContent='現在のドラ表示牌';doraBox.append(doraTitle,tileFor(ctx,initialDora.code,{red:initialDora.red}));
    resultBox.className='practice-tile-block';
    if(successful){
      const resultTitle=document.createElement('strong');resultTitle.textContent='追加のドラ表示牌';resultBox.append(resultTitle,tileFor(ctx,result.wall.doraIndicator.code,{red:result.wall.doraIndicator.red}));
      feedback.className='feedback good';
      feedback.innerHTML='<strong>'+kanLabel(scene.type)+'の処理を確認しました。</strong><br>嶺上牌を1枚引き、追加のドラ表示牌を1枚めくりました。';
      const rinshan=document.createElement('div');rinshan.className='practice-tile-block';rinshan.innerHTML='<strong>今回の嶺上ツモ</strong>';
      rinshan.append(tileFor(ctx,result.wall.rinshan.code,{red:result.wall.rinshan.red}));
      resultBox.after(rinshan);
    }else if(result){
      resultBox.innerHTML='<strong>処理を続けられません</strong><p>'+result.applied.message+'</p>';
      feedback.className='feedback bad';feedback.textContent=result.wall?.message||result.applied.message;
    }else{
      resultBox.innerHTML='<strong>カン後にめくる牌</strong><p class="muted">ボタンを押すと表示します。</p>';
      feedback.textContent='カンの成立条件と、カン後に動く王牌をセットで確認します。';
    }
    app.querySelector('#kan-live-count').textContent=liveTilesRemaining(roundWall)+'枚';
    app.querySelector('#kan-dead-count').textContent=deadWallRemaining(roundWall)+'枚';
    if(!result){
      const button=document.createElement('button');button.type='button';button.className='primary';button.textContent=scene.title+'する';button.onclick=()=>{
        const applied=applyKan({type:scene.type,concealedTiles:scene.hand,openMelds:scene.openMelds,discardTile:scene.discardTile||null,from:scene.from||null,ownTurn:scene.ownTurn,kanCount:0});
        if(!applied.ok){result={applied};render();return}
        result={applied,wall:resolveKan(roundWall)};render();
      };actions.append(button);
    }else if(successful){
      const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=sceneIndex===SCENES.length-1?'対局練習へ戻る':'次のカンを見る';next.onclick=()=>{
        if(sceneIndex===SCENES.length-1){location.hash='#practice';return}
        sceneIndex+=1;resetScene();render();
      };actions.append(next);
    }
    const reset=document.createElement('button');reset.type='button';reset.className='secondary';reset.textContent='この場面をやり直す';reset.onclick=()=>{resetScene();render()};actions.append(reset);
  };

  resetScene();
  render();
}
