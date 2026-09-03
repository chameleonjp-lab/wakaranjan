import {createTile} from '../components/tile.js';

function tile(ctx,code){return createTile(ctx.tileByCode.get(code))}
function row(ctx,codes){const el=document.createElement('div');el.className='tile-row hand-fit-row';codes.forEach(c=>el.append(tile(ctx,c)));return el}

export function renderBeginner02(app,ctx){
  app.innerHTML='<section class="lesson-head"><div class="eyebrow">初級 2</div><h1>鳴き</h1><p class="lead">他の人の捨て牌を使って組を完成させる方法を学びます。</p></section>';

  const intro=document.createElement('section');
  intro.className='panel';
  intro.innerHTML='<p>他の人が捨てた牌を使って組を作り、その組を公開することを<strong>鳴き</strong>と呼びます。正式には<strong>副露（フーロ）</strong>です。</p><div class="callout">チーだけは「誰からでも」できません。自分の左側の人、上家の捨て牌だけを使えます。</div>';
  app.append(intro);

  const cards=document.createElement('div');cards.className='call-grid';
  ctx.calls.forEach(c=>{
    const card=document.createElement('article');card.className='panel call-card';
    card.innerHTML=`<h2>${c.nameJa}</h2><p>${c.description}</p><div class="call-example"><div><small>手元</small><div class="hand-slot"></div></div><strong>＋</strong><div><small>捨て牌</small><div class="discard-slot"></div></div><strong>→</strong><div><small>公開する組</small><div class="meld-slot"></div></div></div>`;
    card.querySelector('.hand-slot').append(row(ctx,c.example.hand));
    card.querySelector('.discard-slot').append(row(ctx,[c.example.discard]));
    card.querySelector('.meld-slot').append(row(ctx,c.example.meld));
    cards.append(card);
  });
  app.append(cards);

  const quiz=document.createElement('section');quiz.className='panel';
  quiz.innerHTML='<h2>練習</h2><p id="call-q"></p><div class="selection-area selection-area-hand"><h3>先に見る：手牌と捨て牌</h3><div id="call-tiles" class="call-question"></div></div><div class="selection-area selection-area-choices"><h3>選択肢</h3><div id="call-options" class="quiz-options"></div></div><div id="call-feedback" class="feedback" aria-live="polite"></div><div class="action-row"><button id="call-next" class="primary" type="button" hidden>次の問題</button></div>';
  app.append(quiz);

  const questions=[
    {text:'上家が五萬を捨てました。手元に三萬・四萬があります。できる鳴きは？',hand:['3m','4m'],discard:'5m',answer:'チー',options:['チー','ポン','鳴けない'],why:'上家の五萬を使って三萬・四萬・五萬の順子を作れるのでチーできます。'},
    {text:'対面が五萬を捨てました。手元に三萬・四萬があります。できる鳴きは？',hand:['3m','4m'],discard:'5m',answer:'鳴けない',options:['チー','ポン','鳴けない'],why:'形は順子になりますが、チーできるのは上家の捨て牌だけです。'},
    {text:'下家が白を捨てました。手元に白が2枚あります。できる鳴きは？',hand:['5z','5z'],discard:'5z',answer:'ポン',options:['チー','ポン','鳴けない'],why:'ポンは他の3人の誰の捨て牌でも使えます。同じ牌3枚の組になります。'},
    {text:'上家が七筒を捨てました。手元に七筒が3枚あります。できる鳴きは？',hand:['7p','7p','7p'],discard:'7p',answer:'カン',options:['ポン','カン','鳴けない'],why:'同じ牌4枚の組を作れるため、大明槓としてカンできます。'}
  ];
  let index=0;
  const renderQ=()=>{
    const q=questions[index];
    quiz.querySelector('#call-q').textContent=`${index+1}/${questions.length} ${q.text}`;
    const t=quiz.querySelector('#call-tiles');t.innerHTML='';
    const a=document.createElement('div');a.innerHTML='<small>手元</small>';a.append(row(ctx,q.hand));
    const b=document.createElement('div');b.innerHTML='<small>相手の捨て牌</small>';b.append(row(ctx,[q.discard]));
    t.append(a,b);
    const opts=quiz.querySelector('#call-options');opts.innerHTML='';
    const fb=quiz.querySelector('#call-feedback');fb.textContent='';fb.className='feedback';
    quiz.querySelector('#call-next').hidden=true;
    q.options.forEach(o=>{const btn=document.createElement('button');btn.type='button';btn.textContent=o;btn.onclick=()=>{
      [...opts.children].forEach(x=>x.disabled=true);
      const ok=o===q.answer;fb.className=`feedback ${ok?'good':'bad'}`;fb.innerHTML=`<strong>${ok?'正解':'不正解'}。</strong> ${q.why}`;quiz.querySelector('#call-next').hidden=false;
    };opts.append(btn)});
  };
  quiz.querySelector('#call-next').onclick=()=>{if(index<questions.length-1){index++;renderQ()}else{quiz.querySelector('#call-next').hidden=true;quiz.querySelector('#call-feedback').className='feedback good';quiz.querySelector('#call-feedback').innerHTML='<strong>練習完了。</strong> チーは上家だけ、ポンと大明槓は誰の捨て牌でも使える、という違いを確認できました。'} };
  renderQ();

  const note=document.createElement('section');note.className='panel';
  note.innerHTML='<h2>鳴くと何が変わる？</h2><p>鳴いて作った組は手牌の外に公開して置きます。手の一部が他の人から見える状態になります。</p><p>また、鳴くと使えなくなる役があります。たとえばリーチは、チーやポンなどで手を開いた後には宣言できません。この違いは次の「リーチ」で詳しく学びます。</p><div class="lesson-nav"><a class="secondary" href="#lesson-beginner-01">← 待ちの基本</a><a class="primary" href="#lesson-beginner-03">次：リーチ →</a></div>';
  app.append(note);
}
