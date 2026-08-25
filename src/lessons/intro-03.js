import {renderSimpleTable} from '../components/table.js';

export function renderIntro03(app,ctx){
  const lesson=ctx.lessonById.get('lesson-intro-03');
  app.innerHTML=`<section class="hero"><div class="eyebrow">入門 1-3</div><h1>${lesson.title}</h1><p>手牌・山・河・親子を、卓のどこにあるか見つけます。</p></section><section class="lesson-panel"><h2>卓を見てみよう</h2><p>最初は点棒やドラを出しません。まず場所だけ覚えます。</p><div id="tableMount"></div><div id="tableFeedback" class="callout">「河」「山」「あなたの手牌」を順番に探してみましょう。</div></section><section class="lesson-panel"><h2>確認</h2><div class="action-row"><button id="askRiver">河を探す</button><button id="askWall">山を探す</button><button id="askHand">手牌を探す</button></div></section><div class="action-row"><a class="secondary" href="#lesson-intro-02">前へ</a><a href="#lesson-intro-04">次へ</a></div>`;
  const feedback=app.querySelector('#tableFeedback');
  let target='river';
  const table=renderSimpleTable(ctx,{interactive:true,onRegionSelect(region){
    feedback.textContent=region===target?'正解です。場所と名前を一緒に覚えましょう。':'そこではありません。表示名も見ながらもう一度探してください。';
  }});
  app.querySelector('#tableMount').append(table);
  [['#askRiver','river','河'],['#askWall','wall','山'],['#askHand','hand','あなたの手牌']].forEach(([sel,key,label])=>app.querySelector(sel).addEventListener('click',()=>{target=key;feedback.textContent=`「${label}」を卓からタップしてください。`;}));
}
