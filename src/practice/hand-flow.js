import {appendTileRow,createTile} from '../components/tile.js';
import {checkCall,checkRonClaims,checkTsumo,claimRonClaims,completeExhaustiveDraw,completeTsumo,createHandFlow,declareCall,declareRiichi,discardTile,drawForTurn,HAND_PHASES,passDiscard} from '../lib/hand-flow.js';
import {roundLabel,SEATS,SEAT_LABEL_MAP} from '../lib/round-state.js';
import {deadWallRemaining,liveTilesRemaining} from '../lib/tile-wall.js';

function nav(){
  return '<div class="lesson-nav"><a class="secondary" href="#practice">対局練習へ戻る</a><a class="primary" href="#home">ホームへ</a></div>';
}

function physicalItem(ctx,tile){
  return {tile:ctx.tileByCode.get(tile.code),red:tile.red};
}

function seatLabel(seat){
  return SEAT_LABEL_MAP[seat]||seat;
}

export function renderHandFlow(app,ctx){
  const tileCodes=ctx.tiles.map(tile=>tile.code);
  const redFives=ctx.standardRules?.scope?.redFives||{man:1,pin:1,sou:1};
  let state=createHandFlow({wallOptions:{tileCodes,redFives}});
  const reset=()=>{state=createHandFlow({wallOptions:{tileCodes,redFives}});render()};
  const advanceOtherSeat=()=>{
    if(state.phase===HAND_PHASES.RESPONSE)state=passDiscard(state);
    if(state.phase===HAND_PHASES.DRAW)state=drawForTurn(state);
    if(state.phase===HAND_PHASES.DISCARD&&state.currentSeat!==state.userSeat)state=discardTile(state,{seat:state.currentSeat,tileId:state.drawnTileId});
    render();
  };
  const render=()=>{
    const player=state.players[state.userSeat];
    const current=state.players[state.currentSeat];
    const userTurn=state.currentSeat===state.userSeat;
    const canDraw=userTurn&&state.phase===HAND_PHASES.DRAW;
    const canDiscard=userTurn&&state.phase===HAND_PHASES.DISCARD;
    const canRespond=state.phase===HAND_PHASES.RESPONSE;
    const canUserRespond=canRespond&&state.pendingDiscard?.seat!==state.userSeat;
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習 6</div><h1>一局の実牌進行（基礎）</h1><p class="lead">実際の牌山から配牌し、親の第1打、ツモ、捨て牌、ロン応答、流局完了までの状態を確認します。</p></section><section class="callout"><strong>この練習の範囲</strong><br>4人分の配牌と牌山を作り、あなたの手番では捨てる牌を選びます。捨て牌のあとに応答待ちを置き、ツモ・ロンの判定と牌山切れ後の流局完了を共通状態へ接続しています。複数人がロンできる場合は、放銃者の次に近い席を選ぶ頭ハネとして記録します。鳴きの詳しい判断は専用練習で確認します。</section><section class="practice-surface"><div class="flow-current-state"><span>'+roundLabel(state.roundState)+'</span><strong>現在の手番：'+seatLabel(state.currentSeat)+(userTurn?'（あなた）':'')+'</strong></div><div class="wall-status-grid"><div class="wall-status-card"><span>通常の牌山</span><strong>'+liveTilesRemaining(state.roundWall)+'枚</strong></div><div class="wall-status-card"><span>王牌</span><strong>'+deadWallRemaining(state.roundWall)+'枚</strong></div><div class="wall-status-card"><span>あなたの手牌</span><strong>'+player.hand.length+'枚</strong></div></div><div class="east-score-grid">'+SEATS.map(seat=>'<div class="east-score-card'+(seat===state.userSeat?' you':'')+'"><span>'+seatLabel(seat)+(seat===state.userSeat?'（あなた）':'')+'</span><strong>手牌 '+state.players[seat].hand.length+'枚</strong><small>河 '+state.players[seat].river.length+'枚</small></div>').join('')+'</div><p class="status" aria-live="polite">'+(canDiscard?'捨てたい牌を1枚タップしてください。':canDraw?'「1枚ツモする」を押してください。':canRespond?'捨て牌への応答を確認します。':userTurn?'この局面は結果待ちです。':'他家は学習用にツモ切りで進めます。')+'</p><h2 class="section-title">あなたの手牌</h2><div class="practice-hand" id="hand-flow-hand"></div><h2 class="section-title">ドラ表示牌</h2><div class="practice-tile-block wall-dora" id="hand-flow-dora"></div><h2 class="section-title">あなたの河</h2><div class="river" id="hand-flow-river"></div><div class="action-row" id="hand-flow-actions"></div><div class="feedback" id="hand-flow-feedback" aria-live="polite"></div></section>'+nav();
    const handBox=app.querySelector('#hand-flow-hand');
    const doraBox=app.querySelector('#hand-flow-dora');
    const riverBox=app.querySelector('#hand-flow-river');
    const actions=app.querySelector('#hand-flow-actions');
    const feedback=app.querySelector('#hand-flow-feedback');
    state.doraIndicators.forEach(tile=>doraBox.append(createTile(ctx.tileByCode.get(tile.code),{red:tile.red})));
    player.river.forEach(tile=>riverBox.append(createTile(ctx.tileByCode.get(tile.code),{red:tile.red})));
    appendTileRow(handBox,player.hand.map(tile=>physicalItem(ctx,tile)),{
      interactive:canDiscard,
      drawnIndex:canDiscard?player.hand.findIndex(tile=>tile.id===state.drawnTileId):-1,
      onSelect:(_tile,_options,_element,index)=>{
        if(!canDiscard)return;
        state=discardTile(state,{seat:state.userSeat,tileId:player.hand[index].id});
        render();
      }
    });
    if(canDraw){
      const button=document.createElement('button');
      button.type='button';
      button.className='primary';
      button.textContent='1枚ツモする';
      button.onclick=()=>{state=drawForTurn(state);render()};
      actions.append(button);
    }else if(canDiscard){
      const button=document.createElement('button');
      button.type='button';
      button.className='secondary';
      button.textContent='ツモあがりを確認';
      button.onclick=()=>{
        const result=checkTsumo(state);
        if(!result.ok){feedback.className='feedback bad';feedback.textContent=result.error;return}
        state=completeTsumo(state);
        render();
      };
      actions.append(button);
      if(!player.riichi&&player.melds.every(meld=>!meld.open)){
        const riichiButton=document.createElement('button');
        riichiButton.type='button';
        riichiButton.className='secondary';
        riichiButton.textContent='リーチを確認';
        riichiButton.onclick=()=>{
          try{state=declareRiichi(state,{seat:state.userSeat,tileId:state.drawnTileId});render()}
          catch(error){feedback.className='feedback bad';feedback.textContent=error.message}
        };
        actions.append(riichiButton);
      }
    }else if(state.phase===HAND_PHASES.RESPONSE){
      if(canUserRespond){
        const ronButton=document.createElement('button');
        ronButton.type='button';
        ronButton.className='primary';
        ronButton.textContent='ロンを確認';
        ronButton.onclick=()=>{
          const result=checkRonClaims(state,{seats:[state.userSeat]});
          if(!result.ok){feedback.className='feedback bad';feedback.textContent=result.error;return}
          state=claimRonClaims(state,{seats:[state.userSeat]});
          render();
        };
        actions.append(ronButton);
        if(!player.riichi){
          let ponCheck;
          let chiCheck;
          try{ponCheck=checkCall(state,{type:'pon',seat:state.userSeat})}catch(error){ponCheck={ok:false,error:error.message}}
          try{chiCheck=checkCall(state,{type:'chi',seat:state.userSeat})}catch(error){chiCheck={ok:false,error:error.message}}
          if(ponCheck.ok){
            const ponButton=document.createElement('button');
            ponButton.type='button';
            ponButton.className='secondary';
            ponButton.textContent='ポンを確認';
            ponButton.onclick=()=>{state=declareCall(state,{type:'pon',seat:state.userSeat});render()};
            actions.append(ponButton);
          }
          if(chiCheck.ok){
            const chiButton=document.createElement('button');
            chiButton.type='button';
            chiButton.className='secondary';
            chiButton.textContent='チーを確認';
            chiButton.onclick=()=>{state=declareCall(state,{type:'chi',seat:state.userSeat,callTiles:chiCheck.callTiles});render()};
            actions.append(chiButton);
          }
        }
        const passButton=document.createElement('button');
        passButton.type='button';
        passButton.className='secondary';
        passButton.textContent='見送ってツモ番へ';
        passButton.onclick=()=>{state=passDiscard(state);render()};
        actions.append(passButton);
      }else if(state.pendingDiscard?.seat===state.userSeat){
        const button=document.createElement('button');
        button.type='button';
        button.className='primary';
        button.textContent='他家の応答を進める';
        button.onclick=advanceOtherSeat;
        actions.append(button);
        feedback.textContent='あなたが捨てた牌です。他家のロン・鳴きの応答を確認します。';
      }else{
        const button=document.createElement('button');
        button.type='button';
        button.className='primary';
        button.textContent='他家の応答を進める';
        button.onclick=advanceOtherSeat;
        actions.append(button);
        feedback.textContent='他家は学習用にロンを見送ります。';
      }
    }else if(state.phase===HAND_PHASES.AWAITING_RESULT){
      feedback.textContent='通常の牌山がなくなりました。流局としてこの局を完了できます。';
      const button=document.createElement('button');
      button.type='button';
      button.className='primary';
      button.textContent='流局として完了';
      button.onclick=()=>{state=completeExhaustiveDraw(state);render()};
      actions.append(button);
    }else if(state.phase===HAND_PHASES.COMPLETED){
      feedback.className='feedback good';
      if(state.result?.type==='win'&&state.result.blockedRonClaimants?.length){
        feedback.textContent=seatLabel(state.result.winnerSeat)+'が頭ハネでロンし、この一局は完了しています。';
      }else{
        feedback.textContent=state.result?.type==='win'?'あがりでこの一局は完了しています。':'流局でこの一局は完了しています。';
      }
    }else if(!userTurn){
      const button=document.createElement('button');
      button.type='button';
      button.className='primary';
      button.textContent='他家のツモ・捨て牌を進める';
      button.onclick=advanceOtherSeat;
      actions.append(button);
      feedback.textContent='他家は説明用に、引いた牌をそのまま捨てます。';
    }else{
      feedback.textContent='自分の手番で捨てる牌を選びます。';
    }
    const resetButton=document.createElement('button');
    resetButton.type='button';
    resetButton.className='secondary';
    resetButton.textContent='最初からやり直す';
    resetButton.onclick=reset;
    actions.append(resetButton);
  };
  render();
}
