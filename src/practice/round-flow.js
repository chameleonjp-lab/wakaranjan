import {completeHand,createMatchState,roundLabel,SEATS,SEAT_LABEL_MAP} from '../lib/round-state.js';

const FLOW_STEPS=[
  {
    title:'親が交代するあがり',
    description:'東1局で南家がロンしました。親ではない人があがったので、次は東2局です。',
    actionLabel:'南家のロンを確定する',
    outcome:{outcome:'win',winnerSeat:'south',scoreDeltas:{south:1500,east:-1500}}
  },
  {
    title:'親のあがりで連荘',
    description:'東2局で南家（親）がツモあがりしました。親は交代せず、東2局1本場になります。',
    actionLabel:'親のツモあがりを確定する',
    outcome:{outcome:'win',winnerSeat:'south',scoreDeltas:{south:1500,east:-500,west:-500,north:-500}}
  },
  {
    title:'親テンパイの流局',
    description:'東2局1本場が流局し、親がテンパイしていました。同じ局が続き、東2局2本場になります。',
    actionLabel:'親テンパイの流局を確定する',
    outcome:{outcome:'draw',dealerTenpai:true}
  },
  {
    title:'親ではない人のあがり',
    description:'東2局2本場で西家がロンしました。次は東3局0本場になり、本場は0に戻ります。',
    actionLabel:'西家のロンを確定する',
    outcome:{outcome:'win',winnerSeat:'west',scoreDeltas:{west:2600,south:-2600}}
  },
  {
    title:'親ノーテンの流局',
    description:'東3局が流局し、親がノーテンでした。次は東4局へ進みます。本場は1本場として持ち越します。',
    actionLabel:'親ノーテンの流局を確定する',
    outcome:{outcome:'draw',dealerTenpai:false}
  },
  {
    title:'東風戦の最後のあがり',
    description:'東4局1本場で南家がロンしました。東風戦の案内を終えます。',
    actionLabel:'南家のロンを確定して終える',
    outcome:{outcome:'win',winnerSeat:'south',scoreDeltas:{south:1500,north:-1500}}
  }
];

function nav(){
  return '<div class="lesson-nav"><a class="secondary" href="#practice">対局練習へ戻る</a><a class="primary" href="#home">ホームへ</a></div>';
}

function scoreBoard(state){
  return '<div class="east-score-grid">'+SEATS.map(seat=>'<div class="east-score-card'+(seat==='south'?' you':'')+'"><span>'+SEAT_LABEL_MAP[seat]+(seat==='south'?'（あなた）':'')+'</span><strong>'+state.scores[seat].toLocaleString('ja-JP')+'点</strong></div>').join('')+'</div>';
}

function currentLabel(state){
  return state.phase==='finished'?'東風戦終了':roundLabel(state);
}

export function renderRoundFlow(app){
  let state=createMatchState();
  let index=0;
  let lastTransition=null;

  const reset=()=>{
    state=createMatchState();
    index=0;
    lastTransition=null;
    render();
  };

  const render=()=>{
    if(index>=FLOW_STEPS.length){
      app.innerHTML='<section class="hero"><div class="eyebrow">局進行の基礎</div><h1>局の進み方を確認できました。</h1><p>親が続く場面、親が交代する場面、本場の増減、東風戦の終了を順番に体験しました。</p>'+scoreBoard(state)+'</section><section class="callout"><strong>次に追加するもの</strong><br>この練習は局の状態だけを扱います。実際の牌山、鳴き、あがり判定、流局時のテンパイ判定は、それぞれの処理と接続していきます。</section><div class="action-row"><button id="flow-restart" class="secondary" type="button">もう一度練習する</button><a class="primary" href="#practice">対局練習へ戻る</a></div>'+nav();
      app.querySelector('#flow-restart').onclick=reset;
      return;
    }

    const step=FLOW_STEPS[index];
    app.innerHTML='<section class="lesson-head"><div class="eyebrow">対局練習 5</div><h1>局進行の基礎</h1><p class="lead">あがりや流局の結果で、局番号・親・本場がどう変わるかを確認します。</p></section><section class="practice-surface"><div class="flow-current-state"><span>現在の状態</span><strong>'+currentLabel(state)+'</strong></div>'+scoreBoard(state)+'<h2 class="section-title">'+step.title+'</h2><p>'+step.description+'</p><div class="callout"><strong>今回の操作</strong><br>'+step.actionLabel+'</div><div class="flow-transition" aria-live="polite">'+(lastTransition?'<strong>前の結果：</strong>'+lastTransition.from+' → '+lastTransition.to+(lastTransition.continued?'（同じ局を続けます）':''):'最初の局から始めます。')+'</div><div class="action-row" id="flow-actions"></div></section>'+nav();

    const actions=app.querySelector('#flow-actions');
    const button=document.createElement('button');
    button.type='button';
    button.className='primary';
    button.textContent=step.actionLabel;
    button.onclick=()=>{
      const from=currentLabel(state);
      state=completeHand(state,step.outcome);
      lastTransition={from,to:currentLabel(state),continued:state.continued};
      index+=1;
      render();
    };
    actions.append(button);
  };

  render();
}
