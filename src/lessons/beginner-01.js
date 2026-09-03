import {createTile} from '../components/tile.js';

function tile(ctx,code,interactive=false){return createTile(ctx.tileByCode.get(code),{interactive})}

function nearbyCandidates(ctx,current){
  const candidates=[];
  const add=(code)=>{if(code&&!current.waits.includes(code)&&!candidates.includes(code)&&ctx.tileByCode.has(code))candidates.push(code)};
  for(const code of current.waits){
    const tile=ctx.tileByCode.get(code);
    if(!tile)continue;
    if(tile.suit==='honor'){
      const honorCodes=ctx.tiles.filter(item=>item.suit==='honor').map(item=>item.code);
      honorCodes.forEach(add);
    }else{
      for(const delta of [-2,-1,1,2]){
        const number=tile.number+delta;
        if(number>=1&&number<=9)add(`${number}${tile.suit==='man'?'m':tile.suit==='pin'?'p':'s'}`);
      }
    }
  }
  if(candidates.length<3)ctx.tiles.forEach(item=>add(item.code));
  return candidates.slice(0,3);
}

export function renderBeginner01(app,ctx){
  const waits=ctx.waitTypes;
  let quizIndex=0;
  let score=0;
  let answered=false;

  const render=()=>{
    app.innerHTML='';
    const head=document.createElement('section');
    head.className='lesson-head';
    head.innerHTML='<div class="eyebrow">初級 1</div><h1>待ちの基本</h1><p class="lead">あと1枚で完成する牌を「待ち牌」と呼びます。まずは代表的な5種類を見分けます。</p>';
    app.append(head);

    const intro=document.createElement('section');
    intro.className='panel';
    intro.innerHTML='<p>最初に形を見ます。そのあとで名前を覚えます。待ちの名前は、手牌全体ではなく「どの部分が、どの牌を待っているか」を表します。</p>';
    app.append(intro);

    const grid=document.createElement('div');
    grid.className='wait-grid';
    waits.forEach(w=>{
      const card=document.createElement('article');
      card.className='wait-card';
      card.innerHTML=`<h2>${w.nameJa}<small>${w.readingJa}</small></h2><p>${w.description}</p><div class="wait-shape"><div><strong>待ち部分</strong><div class="shape hand-fit-row"></div></div><span class="wait-arrow" aria-hidden="true">→</span><div><strong>来れば完成</strong><div class="answers hand-fit-row"></div></div></div><p class="muted">${w.point}</p>`;
      w.shape.forEach(c=>card.querySelector('.shape').append(tile(ctx,c)));
      w.waits.forEach(c=>card.querySelector('.answers').append(tile(ctx,c)));
      grid.append(card);
    });
    app.append(grid);

    const quiz=document.createElement('section');
    quiz.className='panel wait-quiz';
    const current=waits[quizIndex];
    const distractors=nearbyCandidates(ctx,current);
    const candidates=[...new Set([...current.waits,...distractors])].slice(0,4);
    candidates.sort(()=>Math.random()-.5);
    quiz.innerHTML=`<div class="eyebrow">確認 ${quizIndex+1} / ${waits.length}</div><h2>この形の待ち牌を選んでください</h2><div class="selection-area selection-area-hand"><h3>先に見る：${current.nameJa}</h3><div class="shape quiz-shape hand-fit-row"></div></div><div class="selection-area selection-area-choices"><h3>選択肢</h3><div class="tile-grid quiz-candidates"></div><p class="tile-answer-status">選択中：なし</p></div><div class="feedback" aria-live="polite"></div><div class="action-row"></div>`;
    current.shape.forEach(c=>quiz.querySelector('.quiz-shape').append(tile(ctx,c)));
    const selected=new Set();
    const selectedStatus=quiz.querySelector('.tile-answer-status');
    candidates.forEach(code=>{
      const node=tile(ctx,code,true);
      node.addEventListener('click',()=>{
        if(answered)return;
        if(selected.has(code)){selected.delete(code);node.classList.remove('selected')}else{selected.add(code);node.classList.add('selected')}
        selectedStatus.textContent='選択中：'+(Array.from(selected).map(code=>ctx.tileByCode.get(code)?.nameJa||code).join('、')||'なし');
        check.disabled=selected.size===0;
      });
      quiz.querySelector('.quiz-candidates').append(node);
    });
    const check=document.createElement('button');
    check.className='primary';check.type='button';check.textContent='答え合わせ';
    check.disabled=true;
    check.addEventListener('click',()=>{
      if(answered)return;
      const correct=current.waits.length===selected.size&&current.waits.every(c=>selected.has(c));
      answered=true;if(correct)score++;
      const fb=quiz.querySelector('.feedback');fb.className=`feedback ${correct?'good':'bad'}`;
      const selectedNames=Array.from(selected).map(code=>ctx.tileByCode.get(code)?.nameJa||code).join('、')||'なし';
      const answerNames=current.waits.map(code=>ctx.tileByCode.get(code)?.nameJa||code).join('、');
      fb.innerHTML=`<strong>${correct?'正解':'不正解'}</strong><br>${current.point}<br><small>選んだ牌：${selectedNames}<br>正解の牌：${answerNames}</small>`;
      const next=document.createElement('button');next.className='primary';next.type='button';next.textContent=quizIndex===waits.length-1?'結果を見る':'次の問題';
      next.addEventListener('click',()=>{if(quizIndex<waits.length-1){quizIndex++;answered=false;render()}else showResult()});
      quiz.querySelector('.action-row').replaceChildren(next);
    });
    quiz.querySelector('.action-row').append(check);
    app.append(quiz);

    const nav=document.createElement('div');nav.className='lesson-nav';nav.innerHTML='<a class="secondary" href="#lesson-intro-06">前へ：案内付き一局</a><a class="primary" href="#lesson-beginner-02">次へ：鳴き</a><a class="secondary" href="#learn?level=beginner">初級一覧</a>';app.append(nav);
  };

  const showResult=()=>{
    app.innerHTML=`<section class="hero"><div class="eyebrow">初級1 完了</div><h1>5種類の待ちを確認しました</h1><p><strong>${score} / ${waits.length}問 正解</strong></p><p>両面は2種類、嵌張と辺張は1種類、双碰は2種類、単騎は1種類の牌を待つ基本形です。</p><div class="action-row"><button class="primary" id="retry-waits">もう一度</button><a class="secondary" href="#lesson-beginner-02">次：鳴き</a></div></section>`;
    app.querySelector('#retry-waits').addEventListener('click',()=>{quizIndex=0;score=0;answered=false;render()});
  };

  render();
}
