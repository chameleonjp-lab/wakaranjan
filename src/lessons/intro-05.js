import {createTile} from '../components/tile.js';

function getTile(ctx,code){return ctx.tileByCode.get(code)||ctx.tileById.get(`tile-${code}`);}

function handRow(ctx,codes,winCode,source='あがり牌'){
  const scroll=document.createElement('div');scroll.className='tile-scroll hand-fit-scroll';
  const row=document.createElement('div');row.className='hand-row hand-fit-row';
  codes.forEach(c=>row.append(createTile(getTile(ctx,c))));
  const gap=document.createElement('span');gap.className='win-gap';gap.textContent='＋';row.append(gap);
  if(source==='ロン'){
    gap.remove();
    scroll.append(row);
    const sourceBox=document.createElement('div');sourceBox.className='ron-source';
    const label=document.createElement('strong');label.textContent='相手の捨て牌（ロン牌）';sourceBox.append(label,createTile(getTile(ctx,winCode),{drawn:true}));
    scroll.append(sourceBox);
    return scroll;
  }
  gap.textContent=source==='ツモ'?'＋ ツモ牌':'＋ あがり牌';
  row.append(createTile(getTile(ctx,winCode),{drawn:true}));
  scroll.append(row);
  return scroll;
}

export function renderIntro05(app,ctx){
  const lesson=ctx.lessonById.get('lesson-intro-05');
  const base=['1m','2m','3m','4p','5p','6p','2s','3s','4s','east','east','east','white'];
  app.innerHTML=`<section class="hero"><div class="eyebrow">入門 1-5</div><h1>${lesson.title}</h1><p>自分で最後の牌を引く「ツモ」と、他の人の捨て牌で完成する「ロン」を見分けます。</p></section><section class="lesson-panel"><h2>あと1枚で完成する手</h2><div id="waitingHand"></div><p>この手は白が来ると、3枚の組4つ＋同じ牌2枚になります。</p></section><section class="lesson-panel"><div class="compare-grid"><article><h3>ツモ</h3><p>山から自分で白を引きました。</p><div id="tsumoHand"></div></article><article><h3>ロン</h3><p>ほかの人が白を捨てました。</p><div id="ronHand"></div></article></div><p class="compare-note">完成する形は同じですが、ツモは自分で引き、ロンは相手の捨て牌で受け取ります。</p></section><section class="lesson-panel"><h2>大事なこと</h2><div class="callout">形が完成する牌と、実際にロンできる牌は同じとは限りません。麻雀では原則として<strong>役</strong>が必要です。フリテンなどの詳しい条件は初級で学びます。</div><div class="quiz-box"><p><strong>確認：</strong>「形が完成すれば、いつでもロンできる」は正しい？</p><div class="action-row"><button class="primary" data-answer="no">正しくない</button><button class="primary" data-answer="yes">正しい</button></div><p id="winFeedback" aria-live="polite"></p></div></section><div class="action-row"><a class="secondary" href="#lesson-intro-04">前へ</a><a href="#lesson-intro-06">案内付き一局へ</a></div>`;
  app.querySelector('#waitingHand').append(handRow(ctx,base,'white'));
  app.querySelector('#tsumoHand').append(handRow(ctx,base,'white','ツモ'));
  app.querySelector('#ronHand').append(handRow(ctx,base,'white','ロン'));
  app.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>{
    app.querySelector('#winFeedback').textContent=btn.dataset.answer==='no'?'正解です。形の完成とは別に、役やロンできる条件を確認します。':'不正解です。形が完成しても、役がない場合などはロンできません。';
  }));
}
