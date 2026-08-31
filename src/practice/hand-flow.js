import {appendTileRow,createTile} from '../components/tile.js';
import {advanceAutomaticResponse,checkCall,checkKan,checkRonClaims,checkTsumo,claimRonClaims,completeExhaustiveDraw,completeTsumo,declareCall,declareKan,declareRiichi,discardTile,drawForTurn,HAND_PHASES,startNextHand} from '../lib/hand-flow.js';
import {createHandFlowScenario,HAND_FLOW_SCENARIOS} from './hand-flow-scenarios.js';
import {roundLabel,SEATS,SEAT_LABEL_MAP} from '../lib/round-state.js';
import {deadWallRemaining,liveTilesRemaining} from '../lib/tile-wall.js';

function nav(){
  return '<div class="lesson-nav"><a class="secondary" href="#practice">対局練習へ戻る</a><a class="primary" href="#menu">メニューへ</a></div>';
}

function physicalItem(ctx,tile){
  return {tile:ctx.tileByCode.get(tile.code),red:tile.red};
}

function seatLabel(seat){
  return SEAT_LABEL_MAP[seat]||seat;
}

function phaseLabel(phase){
  return {draw:'ツモ待ち',discard:'捨て牌待ち',response:'捨て牌への応答待ち','awaiting-result':'流局確認待ち',completed:'局完了'}[phase]||phase;
}

function playerFlags(player){
  const flags=[];
  if(player.riichi)flags.push('リーチ');
  if(player.temporaryFuriten)flags.push('一時フリテン');
  if(player.riichiMissedRon)flags.push('リーチ後フリテン');
  return flags.length?flags.join('・'):'通常';
}

function actionLabel(action){
  if(!action)return 'まだ操作はありません。';
  const seat=action.seat?seatLabel(action.seat):'';
  if(action.type==='deal')return '配牌を完了しました。';
  if(action.type==='draw')return `${seat}が牌を1枚取りました。`;
  if(action.type==='discard'||action.type==='riichi-discard')return `${seat}が${action.code||'牌'}を捨てました。`+(action.type==='riichi-discard'?' リーチを宣言しました。':'');
  if(action.type==='pass-discard')return `${seat}の捨て牌を全員が見送りました。`;
  if(action.type==='call')return `${seat}が${action.callType==='chi'?'チー':'ポン'}しました。`+(action.automatic?'（自動応答）':'');
  if(action.type==='kan')return `${seat}が${action.kanType==='ankan'?'暗槓':action.kanType==='minkan'?'大明槓':'加槓'}しました。`+(action.automatic?'（自動応答）':'');
  if(action.type==='win')return `${seat}が${action.win==='tsumo'?'ツモ':'ロン'}しました。`;
  if(action.type==='live-wall-exhausted')return '通常の牌山がなくなりました。';
  if(action.type==='draw-complete')return '流局として局を完了しました。';
  return action.type||'操作を記録しました。';
}

function appendMeldSummary(container,ctx,melds){
  if(!melds.length){container.textContent='鳴き面子なし';return}
  melds.forEach(meld=>{
    const group=document.createElement('span');
    group.className='flow-meld';
    group.textContent=`${meld.type==='chi'?'チー':meld.type==='pon'?'ポン':meld.type==='ankan'?'暗槓':meld.type==='minkan'?'大明槓':'加槓'}：${(meld.tiles||[]).map(tile=>typeof tile==='string'?tile:tile.code).join(' ')}`;
    container.append(group);
  });
}

function formatPoints(value){
  const amount=Number(value);
  return Number.isFinite(amount)?`${amount.toLocaleString('ja-JP')}点`:'—';
}

function appendResultSection(container,title,rows){
  if(!rows.length)return;
  const section=document.createElement('section');
  section.className='flow-result-section';
  const heading=document.createElement('h3');
  heading.textContent=title;
  section.append(heading);
  const list=document.createElement('ul');
  list.className='flow-result-list';
  rows.forEach(row=>{
    const item=document.createElement('li');
    const label=document.createElement('span');
    label.textContent=row.label;
    const value=document.createElement('strong');
    value.textContent=row.value;
    item.append(label,value);
    list.append(item);
  });
  section.append(list);
  container.append(section);
}

function renderCompletedResult(container,state){
  const result=state.result;
  const panel=document.createElement('section');
  panel.className='flow-result-panel';
  panel.setAttribute('aria-label','この局の結果');
  const heading=document.createElement('h2');
  heading.textContent='この局の結果';
  panel.append(heading);

  if(result?.type==='win'){
    const outcome=document.createElement('p');
    outcome.className='flow-result-outcome';
    outcome.textContent=`${seatLabel(result.winnerSeat)}が${result.win==='tsumo'?'ツモ':'ロン'}しました。`;
    panel.append(outcome);

    const score=result.score||{};
    const scoreBox=document.createElement('div');
    scoreBox.className='flow-result-score';
    const scoreLabel=document.createElement('span');
    scoreLabel.textContent='あがり点';
    const scoreValue=document.createElement('strong');
    scoreValue.textContent=formatPoints(score.total);
    const scoreDetail=document.createElement('small');
    scoreDetail.textContent=result.yakumanValue?`${score.limit||'役満'}（${result.yakumanValue}個）`:`${result.han}翻 ${result.fu}符${score.limit?`・${score.limit}`:''}`;
    scoreBox.append(scoreLabel,scoreValue,scoreDetail);
    panel.append(scoreBox);

    const yakuRows=result.yakuman?.length
      ?result.yakuman.map(yaku=>({label:yaku.name,value:`${yaku.yakuman}役満`}))
      :(result.yaku||[]).map(yaku=>({label:yaku.name,value:`${yaku.han}翻`}));
    appendResultSection(panel,'役',yakuRows);

    const doraRows=[{label:'ドラ合計',value:`${result.dora||0}枚`}].concat((result.doraDetail||[]).map(detail=>({label:detail.name,value:`${detail.count}枚`})));
    appendResultSection(panel,'ドラ',doraRows);

    const fuRows=(result.fuItems||[]).map(item=>({label:item[0],value:`${item[1]}符`}));
    appendResultSection(panel,'符の内訳',fuRows);

    const settlement=result.settlement||{};
    const paymentRows=Object.entries(settlement.payers||{}).map(([seat,amount])=>({label:`${seatLabel(seat)}から`,value:formatPoints(amount)}));
    if(settlement.riichiBonus)paymentRows.push({label:'リーチ棒の回収',value:`+${formatPoints(settlement.riichiBonus)}`});
    if(settlement.handGain!==undefined)paymentRows.push({label:'受け取った合計',value:formatPoints(settlement.handGain)});
    appendResultSection(panel,'支払い',paymentRows);

    if(result.blockedRonClaimants?.length){
      const note=document.createElement('p');
      note.className='flow-result-note';
      note.textContent=`${result.blockedRonClaimants.map(seatLabel).join('・')}のロンは、頭ハネで採用されませんでした。`;
      panel.append(note);
    }
  }else if(result?.type==='draw'){
    const outcome=document.createElement('p');
    outcome.className='flow-result-outcome';
    outcome.textContent='流局しました。';
    panel.append(outcome);
    appendResultSection(panel,'流局時の状態',[
      {label:'テンパイ者',value:result.tenpaiSeats?.length?result.tenpaiSeats.map(seatLabel).join('・'):'なし'},
      {label:'親',value:result.dealerTenpai?'テンパイ（本場継続）':'ノーテン（次局へ）'}
    ]);
  }
  container.append(panel);
}

export function renderHandFlow(app,ctx){
  const tileCodes=ctx.tiles.map(tile=>tile.code);
  const redFives=ctx.standardRules?.scope?.redFives||{man:1,pin:1,sou:1};
  const scenarioId=new URLSearchParams((location.hash.split('?')[1]||'')).get('scenario')||'random';
  let activeScenarioId=HAND_FLOW_SCENARIOS[scenarioId]?scenarioId:'random';
  let scenario=HAND_FLOW_SCENARIOS[activeScenarioId];
  const newState=()=>createHandFlowScenario(activeScenarioId,{wallOptions:{tileCodes,redFives}});
  let state=newState();
  const reset=()=>{state=newState();render()};
  const runAction=action=>{
    try{
      action();
      render();
    }catch(error){
      render();
      const feedback=app.querySelector('#hand-flow-feedback');
      feedback.className='feedback bad';
      feedback.textContent=error instanceof Error?error.message:String(error);
    }
  };
  const automaticSeatsForResponse=()=>{
    const pending=state.pendingDiscard;
    return SEATS.filter(seat=>seat!==state.userSeat&&seat!==pending?.seat);
  };
  const discardAutomatically=()=>{
    const player=state.players[state.currentSeat];
    const tile=state.drawnTileId?player.hand.find(candidate=>candidate.id===state.drawnTileId):player.hand[0];
    if(!tile)throw new Error('自動捨て牌に使える牌がありません。');
    state=discardTile(state,{seat:state.currentSeat,tileId:tile.id});
  };
  const advanceOtherSeat=()=>runAction(()=>{
    if(state.phase===HAND_PHASES.RESPONSE){
      const pending=state.pendingDiscard;
      state=advanceAutomaticResponse(state,{seats:automaticSeatsForResponse(),passedSeats:pending?.seat===state.userSeat?[]:[state.userSeat]});
    }
    if(state.phase===HAND_PHASES.DRAW)state=drawForTurn(state);
    if(state.phase===HAND_PHASES.DISCARD&&state.currentSeat!==state.userSeat)discardAutomatically();
  });
  const render=()=>{
    const player=state.players[state.userSeat];
    const userTurn=state.currentSeat===state.userSeat;
    const canDraw=userTurn&&state.phase===HAND_PHASES.DRAW;
    const canDiscard=userTurn&&state.phase===HAND_PHASES.DISCARD;
    const canRespond=state.phase===HAND_PHASES.RESPONSE;
    const canUserRespond=canRespond&&state.pendingDiscard?.seat!==state.userSeat;
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習 6</div><h1>一局の実牌進行（基礎）</h1><p class="lead">実際の牌山から配牌し、親の第1打、ツモ、捨て牌、ロン応答、流局完了までの状態を確認します。</p></section><section class="callout"><strong>この練習の範囲</strong><br>4人分の配牌と牌山を作り、あなたの手番では捨てる牌を選びます。捨て牌のあとに応答待ちを置き、ロン・チー・ポン・カンの優先順と鳴き後の捨て牌を共通状態へ接続しています。複数人がロンできる場合は、放銃者の次に近い席を選ぶ頭ハネとして記録します。</section><section class="practice-surface"><div class="flow-current-state"><span>'+roundLabel(state.roundState)+'</span><strong>現在の手番：'+seatLabel(state.currentSeat)+(userTurn?'（あなた）':'')+'</strong></div><div class="wall-status-grid"><div class="wall-status-card"><span>通常の牌山</span><strong>'+liveTilesRemaining(state.roundWall)+'枚</strong></div><div class="wall-status-card"><span>王牌</span><strong>'+deadWallRemaining(state.roundWall)+'枚</strong></div><div class="wall-status-card"><span>あなたの手牌</span><strong>'+player.hand.length+'枚</strong></div></div><div class="east-score-grid">'+SEATS.map(seat=>'<div class="east-score-card'+(seat===state.userSeat?' you':'')+'"><span>'+seatLabel(seat)+(seat===state.userSeat?'（あなた）':'')+'</span><strong>手牌 '+state.players[seat].hand.length+'枚</strong><small>河 '+state.players[seat].river.length+'枚</small></div>').join('')+'</div><p class="status" aria-live="polite">'+(canDiscard?'捨てたい牌を1枚タップしてください。':canDraw?'「1枚ツモする」を押してください。':canRespond?'捨て牌への応答を確認します。':userTurn?'この局面は結果待ちです。':'他家は自動応答してツモ・捨て牌を進めます。')+'</p><h2 class="section-title">あなたの手牌</h2><div class="practice-hand" id="hand-flow-hand"></div><h2 class="section-title">ドラ表示牌</h2><div class="practice-tile-block wall-dora" id="hand-flow-dora"></div><h2 class="section-title">あなたの河</h2><div class="river" id="hand-flow-river"></div><div class="action-row" id="hand-flow-actions"></div><div class="feedback" id="hand-flow-feedback" aria-live="polite"></div></section>'+nav();
    const scenarioPanel=document.createElement('section');
    scenarioPanel.className='flow-scenario-panel';
    scenarioPanel.setAttribute('aria-label','一局の確認シナリオ');
    const scenarioHeading=document.createElement('div');
    scenarioHeading.className='flow-scenario-heading';
    const scenarioLabel=document.createElement('span');
    scenarioLabel.textContent='操作確認シナリオ';
    const scenarioTitle=document.createElement('strong');
    scenarioTitle.textContent=scenario.label;
    scenarioHeading.append(scenarioLabel,scenarioTitle);
    scenarioPanel.append(scenarioHeading);
    const scenarioDescription=document.createElement('p');
    scenarioDescription.textContent=scenario.description;
    scenarioPanel.append(scenarioDescription);
    const scenarioHint=document.createElement('p');
    scenarioHint.className='flow-scenario-hint';
    scenarioHint.textContent=scenario.hint;
    scenarioPanel.append(scenarioHint);
    const scenarioLinks=document.createElement('div');
    scenarioLinks.className='flow-scenario-links';
    Object.entries(HAND_FLOW_SCENARIOS).forEach(([id,entry])=>{
      const link=document.createElement('a');
      link.className='secondary'+(id===activeScenarioId?' current':'');
      link.href='#practice?mode=hand-flow&scenario='+id;
      link.textContent=entry.label;
      if(id===activeScenarioId)link.setAttribute('aria-current','page');
      scenarioLinks.append(link);
    });
    scenarioPanel.append(scenarioLinks);
    app.querySelector('.lesson-head').insertAdjacentElement('afterend',scenarioPanel);
    const status=app.querySelector('.status');
    const stateSummary=document.createElement('div');
    stateSummary.className='flow-state-summary';
    stateSummary.innerHTML='<div><span>現在の局面</span><strong>'+phaseLabel(state.phase)+'</strong></div><div><span>直前の操作</span><strong>'+actionLabel(state.lastAction)+'</strong></div>'+(state.pendingDiscard?'<div><span>応答待ちの捨て牌</span><strong>'+seatLabel(state.pendingDiscard.seat)+'・'+state.pendingDiscard.code+'</strong></div>':'');
    status.insertAdjacentElement('afterend',stateSummary);
    const playerStateBox=document.createElement('div');
    playerStateBox.className='flow-player-grid';
    playerStateBox.setAttribute('aria-label','各家の状態');
    SEATS.forEach(seat=>{
      const target=state.players[seat];
      const card=document.createElement('article');
      card.className='flow-player-card'+(seat===state.userSeat?' you':'')+(seat===state.currentSeat?' current':'');
      card.innerHTML='<div class="flow-player-heading"><strong>'+seatLabel(seat)+(seat===state.userSeat?'（あなた）':'')+'</strong><span>'+playerFlags(target)+'</span></div><div class="flow-player-counts">手牌 '+target.hand.length+'枚　河 '+target.river.length+'枚　得点 '+state.roundState.scores[seat]+'</div><div class="flow-meld-list"></div>';
      appendMeldSummary(card.querySelector('.flow-meld-list'),ctx,target.melds);
      playerStateBox.append(card);
    });
    const playerStateHeading=document.createElement('h2');
    playerStateHeading.className='section-title';
    playerStateHeading.textContent='各家の状態';
    stateSummary.insertAdjacentElement('afterend',playerStateHeading);
    playerStateHeading.insertAdjacentElement('afterend',playerStateBox);
    if(state.phase===HAND_PHASES.COMPLETED)renderCompletedResult(playerStateBox,state);
    const handBox=app.querySelector('#hand-flow-hand');
    const doraBox=app.querySelector('#hand-flow-dora');
    const riverBox=app.querySelector('#hand-flow-river');
    riverBox.previousElementSibling.textContent='各家の河';
    const actions=app.querySelector('#hand-flow-actions');
    const feedback=app.querySelector('#hand-flow-feedback');
    state.doraIndicators.forEach(tile=>doraBox.append(createTile(ctx.tileByCode.get(tile.code),{red:tile.red})));
    SEATS.forEach(seat=>{
      const block=document.createElement('section');
      block.className='flow-river-card';
      block.innerHTML='<strong>'+seatLabel(seat)+(seat===state.userSeat?'（あなた）':'')+'</strong><div class="flow-river-tiles"></div>';
      const row=block.querySelector('.flow-river-tiles');
      state.players[seat].river.forEach(tile=>row.append(createTile(ctx.tileByCode.get(tile.code),{red:tile.red})));
      riverBox.append(block);
    });
    appendTileRow(handBox,player.hand.map(tile=>physicalItem(ctx,tile)),{
      interactive:canDiscard,
      drawnIndex:canDiscard?player.hand.findIndex(tile=>tile.id===state.drawnTileId):-1,
      onSelect:(_tile,_options,_element,index)=>{
        if(!canDiscard)return;
        runAction(()=>{state=discardTile(state,{seat:state.userSeat,tileId:player.hand[index].id})});
      }
    });
    if(canDraw){
      const button=document.createElement('button');
      button.type='button';
      button.className='primary';
      button.textContent='1枚ツモする';
      button.onclick=()=>runAction(()=>{state=drawForTurn(state)});
      actions.append(button);
    }else if(canDiscard){
      if(state.drawnTileId){
        const button=document.createElement('button');
        button.type='button';
        button.className='secondary';
        button.textContent='ツモあがりを確認';
        button.onclick=()=>runAction(()=>{
          const result=checkTsumo(state);
          if(!result.ok)throw new Error(result.error);
          state=completeTsumo(state);
        });
        actions.append(button);
      }
      let ankanCheck;
      try{ankanCheck=checkKan(state,{type:'ankan',seat:state.userSeat})}catch(error){ankanCheck={ok:false,error:error.message}}
      if(ankanCheck.ok){
        const kanButton=document.createElement('button');
        kanButton.type='button';
        kanButton.className='secondary';
        kanButton.textContent='暗槓を確認';
        kanButton.onclick=()=>runAction(()=>{state=declareKan(state,{type:'ankan',seat:state.userSeat})});
        actions.append(kanButton);
      }
      if(!player.riichi&&player.melds.every(meld=>!meld.open)){
        const riichiButton=document.createElement('button');
        riichiButton.type='button';
        riichiButton.className='secondary';
        riichiButton.textContent='リーチを確認';
        riichiButton.onclick=()=>runAction(()=>{state=declareRiichi(state,{seat:state.userSeat,tileId:state.drawnTileId})});
        actions.append(riichiButton);
      }
    }else if(state.phase===HAND_PHASES.RESPONSE){
      if(canUserRespond){
        const ronButton=document.createElement('button');
        ronButton.type='button';
        ronButton.className='primary';
        ronButton.textContent='ロンを確認';
        ronButton.onclick=()=>runAction(()=>{
          const result=checkRonClaims(state,{seats:[state.userSeat]});
          if(!result.ok)throw new Error(result.error);
          state=claimRonClaims(state,{seats:[state.userSeat]});
        });
        actions.append(ronButton);
        if(!player.riichi){
          let minkanCheck;
          try{minkanCheck=checkKan(state,{type:'minkan',seat:state.userSeat})}catch(error){minkanCheck={ok:false,error:error.message}}
          if(minkanCheck.ok){
            const minkanButton=document.createElement('button');
            minkanButton.type='button';
            minkanButton.className='secondary';
            minkanButton.textContent='大明槓を確認';
            minkanButton.onclick=()=>runAction(()=>{state=declareKan(state,{type:'minkan',seat:state.userSeat})});
            actions.append(minkanButton);
          }
          let ponCheck;
          let chiCheck;
          try{ponCheck=checkCall(state,{type:'pon',seat:state.userSeat})}catch(error){ponCheck={ok:false,error:error.message}}
          try{chiCheck=checkCall(state,{type:'chi',seat:state.userSeat})}catch(error){chiCheck={ok:false,error:error.message}}
          if(ponCheck.ok){
            const ponButton=document.createElement('button');
            ponButton.type='button';
            ponButton.className='secondary';
            ponButton.textContent='ポンを確認';
            ponButton.onclick=()=>runAction(()=>{state=declareCall(state,{type:'pon',seat:state.userSeat})});
            actions.append(ponButton);
          }
          const chiOptions=chiCheck.ok?[chiCheck.callTiles]:(chiCheck.callOptions||[]);
          chiOptions.forEach((callTiles,index)=>{
            const chiButton=document.createElement('button');
            chiButton.type='button';
            chiButton.className='secondary';
            chiButton.textContent=chiOptions.length===1?'チーを確認':'チー '+callTiles.join('・');
            chiButton.onclick=()=>runAction(()=>{state=declareCall(state,{type:'chi',seat:state.userSeat,callTiles})});
            actions.append(chiButton);
          });
        }
        const passButton=document.createElement('button');
        passButton.type='button';
        passButton.className='secondary';
        passButton.textContent='見送ってツモ番へ';
        passButton.onclick=()=>runAction(()=>{const pending=state.pendingDiscard;state=advanceAutomaticResponse(state,{seats:automaticSeatsForResponse(),passedSeats:[state.userSeat]});if(pending?.seat===state.userSeat&&state.phase===HAND_PHASES.DRAW)state=drawForTurn(state)});
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
      button.onclick=()=>runAction(()=>{state=completeExhaustiveDraw(state)});
      actions.append(button);
    }else if(state.phase===HAND_PHASES.COMPLETED){
      feedback.className='feedback good';
      if(state.roundState.phase==='playing'){
        const nextButton=document.createElement('button');
        nextButton.type='button';
        nextButton.className='primary';
        nextButton.textContent='次の局へ進む';
        nextButton.onclick=()=>runAction(()=>{
          state=startNextHand(state,{wallOptions:{tileCodes,redFives}});
          activeScenarioId='random';
          scenario=HAND_FLOW_SCENARIOS.random;
        });
        actions.append(nextButton);
      }
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
