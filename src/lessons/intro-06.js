import {createTile} from '../components/tile.js';
import {markLessonComplete} from '../lib/progress.js';

const INITIAL_HAND=['1m','2m','3m','4p','5p','6p','2s','3s','4s','7s','8s','5z','5z'];
const DRAW='1z';
const DISCARD='1z';
const WIN='9s';

function tileNode(ctx,code,opts={}){return createTile(ctx.tileByCode.get(code),opts)}

export function renderIntro06(app,ctx){
  let state='ready';
  let hand=[...INITIAL_HAND];
  let river=[];
  let message='まずは一局を短く体験します。案内に沿って進めてください。';

  const rerender=()=>{
    app.innerHTML='';
    const head=document.createElement('section');
    head.className='lesson-head';
    head.innerHTML='<div class="eyebrow">入門 1-6</div><h1>最初の案内付き一局</h1><p class="lead">ツモ、捨て牌、テンパイ、リーチ、ロンまでを一度通して体験します。</p>';
    app.append(head);

    const panel=document.createElement('section');
    panel.className='panel';
    panel.innerHTML=`<div class="status" aria-live="polite">${message}</div><div class="guided-progress"><span>ツモ</span><span>捨てる</span><span>テンパイ</span><span>リーチ</span><span>ロン</span></div><div class="hand-scroll"><div class="tile-row" id="guided-hand"></div></div><div class="river" id="guided-river" aria-label="自分の河"></div><div class="action-row" id="guided-actions"></div><div class="feedback" id="guided-feedback"></div>`;
    app.append(panel);

    const handEl=panel.querySelector('#guided-hand');
    hand.forEach((code,i)=>{
      const interactive=state==='drawn';
      const node=tileNode(ctx,code,{interactive,drawn:state==='drawn'&&i===hand.length-1});
      if(interactive) node.addEventListener('click',()=>discard(code,i));
      handEl.append(node);
    });
    const riverEl=panel.querySelector('#guided-river');
    river.forEach(code=>riverEl.append(tileNode(ctx,code)));
    const actions=panel.querySelector('#guided-actions');
    const feedback=panel.querySelector('#guided-feedback');

    const addButton=(label,fn,kind='primary')=>{const b=document.createElement('button');b.className=kind;b.type='button';b.textContent=label;b.addEventListener('click',fn);actions.append(b)};

    if(state==='ready') addButton('山から1枚ツモする',draw);
    if(state==='waiting-riichi') addButton('リーチする',riichi);
    if(state==='waiting-ron') addButton('ロンする',ron);
    if(state==='complete'){
      feedback.className='feedback good';
      feedback.innerHTML='<strong>入門クリア。</strong><br>「1枚取る→1枚捨てる→テンパイ→リーチ→ロン」を一度通せました。学習済みとして記録しました。';
      addButton('もう一度やる',reset,'secondary');
      const a=document.createElement('a');a.className='secondary';a.href='#lesson-beginner-01';a.textContent='初級へ進む';actions.append(a);
    }
    if(state==='drawn') feedback.textContent='14枚になりました。今回は今ツモした東を捨てて進めます。別の牌を押すと理由を表示します。';
    if(state==='tenpai') feedback.textContent='これでテンパイです。索子の6か9が来れば形が完成します。';
    if(state==='waiting-riichi') feedback.textContent='門前でテンパイしています。ここではリーチを宣言できます。';
    if(state==='waiting-ron') feedback.innerHTML='他家が待ち牌の<strong>九索</strong>を捨てました。今回はリーチという役があるのでロンできます。';
  };

  const draw=()=>{if(state!=='ready')return;hand.push(DRAW);state='drawn';message='1枚ツモして14枚になりました。次は1枚捨てます。';rerender()};
  const discard=(code,index)=>{
    if(state!=='drawn')return;
    if(code!==DISCARD){message='今回は今ツモした東を捨てると、あと1枚で完成する形になります。東を選んでください。';rerender();return;}
    hand.splice(index,1);river.push(code);state='tenpai';message='東を捨てました。手牌は13枚に戻り、テンパイしました。';rerender();
    setTimeout(()=>{if(state==='tenpai'){state='waiting-riichi';message='門前のテンパイなので、次はリーチを宣言します。';rerender()}},350);
  };
  const riichi=()=>{if(state!=='waiting-riichi')return;state='waiting-ron';message='リーチしました。他家の捨て牌を待ちます。';rerender()};
  const ron=()=>{if(state!=='waiting-ron')return;hand.push(WIN);state='complete';message='ロン。あがりです。';markLessonComplete('lesson-intro-06');rerender()};
  const reset=()=>{state='ready';hand=[...INITIAL_HAND];river=[];message='もう一度、最初から進めます。';rerender()};

  rerender();
}
