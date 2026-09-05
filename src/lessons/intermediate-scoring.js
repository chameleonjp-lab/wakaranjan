import {calculateScore,formatPayment} from '../lib/score.js';

function quizBlock(app,questions){
  const host=document.createElement('section');host.className='panel';host.innerHTML='<h2>確認問題</h2><div class="quiz-options"></div><div class="feedback" aria-live="polite"></div>';
  const options=host.querySelector('.quiz-options');const feedback=host.querySelector('.feedback');
  let index=0;const render=()=>{options.innerHTML='';feedback.textContent='';const q=questions[index];if(!q){feedback.className='feedback good';feedback.textContent='この章の確認は完了です。';return;}const p=document.createElement('p');p.innerHTML=`<strong>${index+1}/${questions.length}</strong> ${q.prompt}`;options.append(p);q.choices.forEach((choice,i)=>{const b=document.createElement('button');b.type='button';b.textContent=choice;b.addEventListener('click',()=>{const ok=i===q.answer;feedback.className=`feedback ${ok?'good':'bad'}`;feedback.textContent=(ok?'正解。':'不正解。')+q.explanation;if(ok){[...options.querySelectorAll('button')].forEach(x=>x.disabled=true);setTimeout(()=>{index++;render()},500)}});options.append(b)})};render();app.append(host);
}

function header(app,n,title,lead){app.innerHTML=`<section class="lesson-head"><div class="eyebrow">中級 ${n}</div><h1>${title}</h1><p class="lead">${lead}</p></section>`}
function nav(app,prev,next){const nav=document.createElement('div');nav.className='lesson-nav';nav.innerHTML=`<a class="secondary" href="#${prev}">前へ</a><a class="primary" href="#${next}">次へ</a>`;app.append(nav)}

export function renderIntermediate01(app){header(app,1,'翻を数える','役とドラを足して、まず翻数を決めます。');app.insertAdjacentHTML('beforeend','<section class="panel"><h2>翻とは</h2><p>役の強さを数える単位です。リーチは1翻、七対子は2翻のように役ごとに決まっています。</p><div class="callout">ドラは翻を増やしますが、役ではありません。役なし＋ドラだけではあがれません。</div><p>例：リーチ1翻＋タンヤオ1翻＋ドラ1翻＝3翻。</p></section>');quizBlock(app,[{prompt:'リーチ1翻＋タンヤオ1翻＋ドラ2枚。合計は？',choices:['2翻','3翻','4翻'],answer:2,explanation:'1+1+2で4翻です。'},{prompt:'役なしでドラ3枚。あがれる？',choices:['あがれる','あがれない'],answer:1,explanation:'ドラは役ではありません。'}]);nav(app,'lesson-beginner-07','lesson-intermediate-02')}

export function renderIntermediate02(app,ctx){header(app,2,'符を数える','手の形やあがり方で付く小さな点を合計します。');const rows=ctx.scoringCore.fuItems.map(x=>`<tr><td>${x.label}</td><td>${x.fu}符</td></tr>`).join('');app.insertAdjacentHTML('beforeend',`<section class="panel"><h2>まず20符から</h2><p>基本は20符から始め、門前ロン、ツモ、待ち、刻子などの符を加えます。最後は1の位を切り上げて10符単位にします。</p><table class="score-table"><thead><tr><th>項目</th><th>符</th></tr></thead><tbody>${rows}</tbody></table><div class="callout">例：20符＋門前ロン10符＋嵌張待ち2符＝32符 → 40符。</div><p>七対子は例外で25符固定です。ピンフをツモあがりした場合は20符です。</p></section>`);quizBlock(app,[{prompt:'20符＋門前ロン10符＋単騎待ち2符。最終符は？',choices:['30符','32符','40符'],answer:2,explanation:'32符を10符単位に切り上げて40符です。'},{prompt:'七対子の符は？',choices:['20符','25符','30符'],answer:1,explanation:'七対子は25符固定です。'}]);nav(app,'lesson-intermediate-01','lesson-intermediate-03')}

export function renderIntermediate03(app){header(app,3,'親と子・ロンとツモ','同じ翻・符でも、親か子か、ロンかツモかで支払いが変わります。');app.insertAdjacentHTML('beforeend','<section class="panel"><h2>支払いの違い</h2><p><strong>ロン</strong>は捨てた1人が全額を払います。<strong>ツモ</strong>は3人で分担します。</p><p>親は子より高く、親ツモでは子3人が同じ額を払います。子ツモでは親の支払いが子の2倍です。</p></section>');const ex1=calculateScore({han:3,fu:30,dealer:false,win:'ron'});const ex2=calculateScore({han:3,fu:30,dealer:false,win:'tsumo'});app.insertAdjacentHTML('beforeend',`<section class="panel"><h2>同じ30符3翻でも</h2><p>子ロン：<strong>${formatPayment(ex1)}</strong></p><p>子ツモ：<strong>${formatPayment(ex2)}</strong>（子 / 親）</p></section>`);quizBlock(app,[{prompt:'子のツモあがり。誰が多く払う？',choices:['親','子2人','全員同じ'],answer:0,explanation:'親は子の2倍を払います。'},{prompt:'ロンの点数を払うのは？',choices:['3人で分担','放銃した1人'],answer:1,explanation:'ロンは放銃者が全額を払います。'}]);nav(app,'lesson-intermediate-02','lesson-intermediate-04')}

export function renderIntermediate04(app,ctx){header(app,4,'点数表を読む','満貫以上は符ではなく翻数の区分で点数が決まります。');const rows=ctx.scoringCore.limits.map(x=>`<tr><td>${x.name}</td><td>${x.han}</td><td>${x.childRon.toLocaleString()}点</td><td>${x.dealerRon.toLocaleString()}点</td></tr>`).join('');app.insertAdjacentHTML('beforeend',`<section class="panel"><table class="score-table"><thead><tr><th>区分</th><th>条件</th><th>子ロン</th><th>親ロン</th></tr></thead><tbody>${rows}</tbody></table><div class="callout">ワカランジャン標準では30符4翻と60符3翻も切り上げ満貫です。</div></section>`);quizBlock(app,[{prompt:'6翻はどの区分？',choices:['満貫','跳満','倍満'],answer:1,explanation:'6〜7翻は跳満です。'},{prompt:'子の満貫ロンは？',choices:['8,000点','12,000点','16,000点'],answer:0,explanation:'子の満貫ロンは8,000点です。'}]);nav(app,'lesson-intermediate-03','lesson-intermediate-05')}

const SCORE_HAN_OPTIONS=[1,2,3,4,5,6,8,11,13];
const SCORE_FU_OPTIONS=[20,25,30,40,50,60,70];

function scorePresetFromHash(){
  const hash=location.hash||'';
  if(!hash.includes('?'))return null;
  const params=new URLSearchParams(hash.slice(hash.indexOf('?')+1));
  const win=params.get('win');
  if(!['ron','tsumo'].includes(win))return null;
  const dealer=params.get('dealer')==='1';
  if(params.get('yakuman')==='1')return {han:0,fu:20,dealer,win,yakuman:1};
  const han=Number(params.get('han'));
  const fu=Number(params.get('fu'));
  if(!SCORE_HAN_OPTIONS.includes(han)||!SCORE_FU_OPTIONS.includes(fu))return null;
  return {han,fu,dealer,win,yakuman:0};
}

function scoreOptions(values,selected){return values.map(value=>`<option value="${value}" ${value===selected?'selected':''}>${value}</option>`).join('')}

export function renderIntermediate05(app){
  const preset=scorePresetFromHash();
  const han=preset&&!preset.yakuman?preset.han:3;
  const fu=preset&&!preset.yakuman?preset.fu:30;
  const presetSummary=preset?.yakuman?`役満・${preset.dealer?'親':'子'}・${preset.win==='ron'?'ロン':'ツモ'}`:`${preset?.dealer?'親':'子'}・${preset?.fu||fu}符${preset?.han||han}翻・${preset?.win==='tsumo'?'ツモ':'ロン'}`;
  const presetNote=preset?`<div class="callout score-preset"><strong>問題の条件を入れました</strong><br>${presetSummary}。必要なら選び直せます。</div>`:'';
  header(app,5,'点数計算を練習する','翻・符・親子・ロンツモを順番に入れて点数を確認します。');
  app.insertAdjacentHTML('beforeend',`<section class="panel"><h2>翻と符から点数を出す練習</h2><p>ここでは、すでに分かっている翻と符から点数を求めることに集中します。牌姿から役・符まで自動で調べたい場合は、ホームの「点数計算」を使えます。</p>${presetNote}<div class="score-controls"><label for="han">翻 <select id="han">${scoreOptions(SCORE_HAN_OPTIONS,han)}</select></label><label for="fu">符 <select id="fu">${scoreOptions(SCORE_FU_OPTIONS,fu)}</select></label><label><input type="checkbox" id="dealer" ${preset?.dealer?'checked':''}> 親</label><label for="win">あがり <select id="win"><option value="ron" ${preset?.win!=='tsumo'?'selected':''}>ロン</option><option value="tsumo" ${preset?.win==='tsumo'?'selected':''}>ツモ</option></select></label><label><input type="checkbox" id="yakuman" ${preset?.yakuman?'checked':''}> 役満</label><button class="primary" id="calc" type="button">計算する</button></div><div class="feedback" id="score-result" aria-live="polite"></div><div class="action-row"><a class="secondary" href="#automatic-calculator">牌姿から自動計算を試す</a></div></section>`);
  const calc=()=>{const result=calculateScore({han:Number(app.querySelector('#han').value),fu:Number(app.querySelector('#fu').value),dealer:app.querySelector('#dealer').checked,win:app.querySelector('#win').value,yakuman:app.querySelector('#yakuman').checked?1:0});app.querySelector('#score-result').className='feedback good';app.querySelector('#score-result').innerHTML=`<strong>${result.limit||`${result.fu}符${result.han}翻`}</strong><br>${formatPayment(result)}`};
  app.querySelector('#calc').addEventListener('click',calc);
  calc();
  nav(app,'lesson-intermediate-04','lesson-intermediate-06');
}
