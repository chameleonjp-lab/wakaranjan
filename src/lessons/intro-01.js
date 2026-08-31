import {appendTileRow} from '../components/tile.js';

const START_CODES=['1m','2m','3m','4p','5p','6p','2s','3s','4s','1z','1z','1z','5z'];
const DRAW_CODE='9m';

export function renderIntro01(root,ctx){
  const lesson=ctx.lessonById.get('lesson-intro-01');
  root.innerHTML=`
    <header class="lesson-head"><div class="eyebrow">入門 1-1 ・ 約${lesson.estimatedMinutes}分</div><h1>${lesson.title}</h1><p class="lead">自分の番では、1枚取って1枚捨てます。まずは、この動きを実際に触って覚えます。</p></header>
    <section><h2 class="section-title">完成形を先に見よう</h2><div class="panel"><p>基本は、<strong>3枚の組を4つ＋同じ牌2枚</strong>です。正式な名前は次の章で覚えれば大丈夫です。</p><div id="shape-demo" class="hand-scroll"></div></div></section>
    <section><h2 class="section-title">1枚取って、1枚捨てる</h2><div class="panel"><p id="flow-message" class="status">今は13枚。まず「1枚取る」を押してください。</p><div id="hand" class="hand-scroll" aria-label="あなたの手牌"></div><div class="action-row"><button id="draw" class="primary" type="button">1枚取る</button><button id="reset" class="secondary" type="button">やり直す</button></div><h3 class="section-title">捨てた牌</h3><div id="river" class="river" aria-label="捨てた牌"></div></div></section>
    <section><h2 class="section-title">確認</h2><div class="panel"><p><strong>Q.</strong> 牌を1枚取って14枚になったあと、通常はどうする？</p><div class="quiz-options" id="quiz"><button type="button" data-answer="wrong">もう1枚取る</button><button type="button" data-answer="correct">1枚捨てる</button><button type="button" data-answer="wrong">全部並べ直す</button></div><div id="quiz-feedback" class="feedback" hidden></div></div></section>
    <nav class="lesson-nav"><a class="secondary" href="#learn?level=intro">入門一覧</a><a class="primary" href="#lesson-intro-02">次へ：牌の種類と読み</a></nav>`;

  const get=c=>ctx.tileByCode.get(c);
  const demo=[get('1m'),get('2m'),get('3m'),get('4p'),get('5p'),get('6p'),get('2s'),get('3s'),get('4s'),get('1z'),get('1z'),get('1z'),get('5z'),get('5z')];
  appendTileRow(root.querySelector('#shape-demo'),demo);

  let hand=START_CODES.map(get); let river=[]; let drew=false;
  const handBox=root.querySelector('#hand'); const riverBox=root.querySelector('#river'); const msg=root.querySelector('#flow-message'); const draw=root.querySelector('#draw');
  function paint(){
    handBox.innerHTML=''; riverBox.innerHTML='';
    appendTileRow(handBox,hand,{interactive:drew,onSelect:(tile,_o,_el,index)=>discard(index),drawnIndex:drew?hand.length-1:-1});
    if(river.length) appendTileRow(riverBox,river); else riverBox.innerHTML='<span class="muted">まだありません</span>';
    draw.disabled=drew;
  }
  function discard(index){
    if(!drew){msg.textContent='先に1枚取ります。';return;}
    river.push(hand[index]); hand.splice(index,1); drew=false;
    msg.textContent='1枚捨てて13枚に戻りました。これが自分の番の基本です。'; paint();
  }
  draw.addEventListener('click',()=>{if(drew)return;hand.push(get(DRAW_CODE));drew=true;msg.textContent='14枚になりました。捨てたい牌を1枚タップしてください。';paint();});
  root.querySelector('#reset').addEventListener('click',()=>{hand=START_CODES.map(get);river=[];drew=false;msg.textContent='今は13枚。まず「1枚取る」を押してください。';paint();});
  root.querySelector('#quiz').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const f=root.querySelector('#quiz-feedback');f.hidden=false;if(b.dataset.answer==='correct'){f.className='feedback good';f.textContent='正解。1枚取って14枚になったら、通常は1枚捨てて13枚に戻します。';}else{f.className='feedback bad';f.textContent='もう一度、上の手牌で「取る→捨てる」を動かして確認してみましょう。';}});
  paint();
}
