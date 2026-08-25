import {appendTileRow,createTile} from '../components/tile.js';
import {createRoundWall,deadWallRemaining,drawLiveTile,drawTiles,liveTilesRemaining,revealDoraIndicator} from '../lib/tile-wall.js';

const INITIAL_HAND_SIZE=13;
const FALLBACK_RED_FIVES={man:1,pin:1,sou:1};

function nav(){
  return '<div class="lesson-nav"><a class="secondary" href="#practice">対局練習へ戻る</a><a class="primary" href="#home">ホームへ</a></div>';
}

function physicalItem(ctx,physical){
  return {tile:ctx.tileByCode.get(physical.code),red:physical.red};
}

export function renderWallPractice(app,ctx){
  const tileCodes=ctx.tiles.map(tile=>tile.code);
  const redFives=ctx.standardRules?.scope?.redFives||FALLBACK_RED_FIVES;
  let roundWall=null;
  let doraIndicator=null;
  let hand=[];
  let river=[];
  let turn='draw';
  let draws=0;

  const reset=()=>{
    roundWall=createRoundWall({tileCodes,redFives});
    hand=drawTiles(roundWall.live,INITIAL_HAND_SIZE);
    doraIndicator=revealDoraIndicator(roundWall);
    river=[];
    turn='draw';
    draws=0;
  };

  const render=()=>{
    const finished=turn==='draw'&&!roundWall.live.length;
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習 1.5</div><h1>牌山と手番（基礎）</h1><p class="lead">実際の136枚を、通常の牌山と王牌に分けてから13枚を配ります。</p></section><section class="callout"><strong>この練習の範囲</strong><br>通常の牌山122枚と王牌14枚を分け、ドラ表示牌を確認します。カン・嶺上牌・他家の判断・局の終了条件は次の実装段階です。</section><section class="practice-surface"><div class="wall-status-grid"><div class="wall-status-card"><span>通常の牌山</span><strong>'+liveTilesRemaining(roundWall)+'枚</strong></div><div class="wall-status-card"><span>王牌</span><strong>'+deadWallRemaining(roundWall)+'枚</strong></div><div class="wall-status-card"><span>今回のツモ</span><strong>'+draws+'回</strong></div></div><div class="practice-step-list wall-practice-steps"><span class="'+(turn==='draw'&&!finished?'active':'')+'">1 ツモ</span><span class="'+(turn==='discard'?'active':'')+'">2 捨てる</span></div><p id="wall-message" class="status" aria-live="polite"></p><h2 class="section-title">あなたの手牌</h2><div class="practice-hand" id="wall-hand"></div><h2 class="section-title">ドラ表示牌（説明用）</h2><div class="practice-tile-block wall-dora" id="wall-dora"></div><h2 class="section-title">あなたの河</h2><div class="river" id="wall-river"></div><div class="action-row" id="wall-actions"></div><div class="feedback" id="wall-feedback"></div></section>'+nav();

    const message=app.querySelector('#wall-message');
    const handBox=app.querySelector('#wall-hand');
    const doraBox=app.querySelector('#wall-dora');
    const riverBox=app.querySelector('#wall-river');
    const actions=app.querySelector('#wall-actions');
    const feedback=app.querySelector('#wall-feedback');
    doraBox.append(createTile(ctx.tileByCode.get(doraIndicator.code),{red:doraIndicator.red}));

    if(finished){
      message.textContent='牌山がなくなりました。今回のツモ・捨て牌練習は完了です。';
      feedback.className='feedback good';
      feedback.textContent='実戦では、ここに流局やあがりの判定が加わります。';
    }else if(turn==='draw'){
      message.textContent='自分の番です。「1枚ツモする」を押してください。';
      feedback.textContent='手牌は13枚です。ツモると14枚になります。王牌は別に残ります。';
    }else{
      message.textContent='14枚になりました。捨てたい牌を1枚タップしてください。';
      feedback.textContent='最後にツモった牌は少し浮いて表示されます。';
    }

    appendTileRow(handBox,hand.map(tile=>physicalItem(ctx,tile)),{
      interactive:turn==='discard',
      drawnIndex:turn==='discard'?hand.length-1:-1,
      onSelect:(_tile,_options,_element,index)=>{
        if(turn!=='discard')return;
        river.push(hand[index]);
        hand.splice(index,1);
        turn='draw';
        render();
      }
    });
    river.forEach(physical=>riverBox.append(createTile(ctx.tileByCode.get(physical.code),{red:physical.red})));

    if(turn==='draw'&&!finished){
      const drawButton=document.createElement('button');
      drawButton.type='button';
      drawButton.className='primary';
      drawButton.textContent='1枚ツモする';
      drawButton.onclick=()=>{
        const tile=drawLiveTile(roundWall);
        if(!tile)return;
        hand.push(tile);
        draws+=1;
        turn='discard';
        render();
      };
      actions.append(drawButton);
    }

    const resetButton=document.createElement('button');
    resetButton.type='button';
    resetButton.className='secondary';
    resetButton.textContent='最初からやり直す';
    resetButton.onclick=()=>{
      reset();
      render();
    };
    actions.append(resetButton);
  };

  reset();
  render();
}
