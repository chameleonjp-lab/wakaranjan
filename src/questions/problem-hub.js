import {createTile} from '../components/tile.js';
import {clarifyQuestion} from './question-copy.js';
import {misconceptionOf,misconceptionKeysFor,MISCONCEPTION_LABELS} from './misconceptions.js';
import {getActiveProfile,profileStorageKey} from '../lib/profile.js';
import {scrollAppToTop} from '../lib/navigation.js';
import {LEARNING_STORAGE_KEYS,queueCloudSync} from '../lib/cloud-sync.js';

const WRONG_KEY=LEARNING_STORAGE_KEYS.wrongQuestionIds;
const STATS_KEY=LEARNING_STORAGE_KEYS.questionStats;
const MISCONCEPTION_KEY=LEARNING_STORAGE_KEYS.misconceptions;
const RECORD_VERSION=2;
const TOPIC_NAMES={'wait-shape':'待ち牌（形）','ron-decision':'ロンできるか','text-review':'文章で待ちを復習','call-decision':'鳴き・リーチの判断','rule-decision':'その他のルール判断'};
const TOPIC_ORDER=['wait-shape','ron-decision','text-review','call-decision','rule-decision'];
function shuffled(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function validQuestionIds(data){return new Set((data?.questions||[]).map(q=>q.id).filter(id=>typeof id==='string'))}
function normalizeWrong(value,ids){if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==RECORD_VERSION||!Array.isArray(value.ids))return new Set();return new Set(value.ids.filter(id=>typeof id==='string'&&ids.has(id)))}
function readProfileStorage(baseKey){
  const key=profileStorageKey(baseKey);
  try{return localStorage.getItem(key)}catch{return null}
}
function loadWrong(data){try{return normalizeWrong(JSON.parse(readProfileStorage(WRONG_KEY)||'null'),validQuestionIds(data))}catch{return new Set()}}
function saveWrong(set){try{localStorage.setItem(profileStorageKey(WRONG_KEY),JSON.stringify({version:RECORD_VERSION,ids:[...set]}));queueCloudSync()}catch{}}
function emptyStats(){return {version:RECORD_VERSION,questions:{}}}
function normalizeStats(value,ids){if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==RECORD_VERSION||!value.questions||typeof value.questions!=='object'||Array.isArray(value.questions))return emptyStats();const questions={};for(const [id,item] of Object.entries(value.questions)){if(!ids.has(id)||!item||typeof item!=='object'||Array.isArray(item)||!Number.isInteger(item.correct)||item.correct<0||!Number.isInteger(item.wrong)||item.wrong<0)return emptyStats();questions[id]={correct:item.correct,wrong:item.wrong}}return {version:RECORD_VERSION,questions}}
function loadStats(data){try{return normalizeStats(JSON.parse(readProfileStorage(STATS_KEY)||'null'),validQuestionIds(data))}catch{return emptyStats()}}
function saveStats(stats){try{localStorage.setItem(profileStorageKey(STATS_KEY),JSON.stringify(stats));queueCloudSync()}catch{}}
function normalizeMisconceptions(value){if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==RECORD_VERSION||!value.items||typeof value.items!=='object'||Array.isArray(value.items))return {};const items={};for(const [key,count] of Object.entries(value.items)){if(!Number.isInteger(count)||count<0)return {};items[key]=count}return items}
function loadMisconceptions(){try{return normalizeMisconceptions(JSON.parse(readProfileStorage(MISCONCEPTION_KEY)||'null'))}catch{return {}}}
function saveMisconceptions(items){try{localStorage.setItem(profileStorageKey(MISCONCEPTION_KEY),JSON.stringify({version:RECORD_VERSION,items}));queueCloudSync()}catch{}}
function recordMisconception(items,q,choiceIndex,ok){if(ok)return;const key=misconceptionOf(q,choiceIndex);if(!key)return;items[key]=(items[key]||0)+1;saveMisconceptions(items)}
function misconceptionScore(q,items){return Math.max(0,...misconceptionKeysFor(q).map(key=>Number(items[key]||0)))}
function topMisconceptions(items){return Object.entries(items).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).slice(0,3)}
export function clearProblemWrong(){saveWrong(new Set())}
export function clearProblemStats(){try{localStorage.removeItem(profileStorageKey(STATS_KEY));queueCloudSync()}catch{}}
export function clearProblemMisconceptions(){try{localStorage.removeItem(profileStorageKey(MISCONCEPTION_KEY));queueCloudSync()}catch{}}
export function clearProblemStudyRecord(){clearProblemWrong();clearProblemStats();clearProblemMisconceptions()}
function skillOf(q){return q.skill||q.yakuRef||q.lessonRef||q.category}
function recordStat(stats,q,ok){const s=stats.questions[q.id]||{correct:0,wrong:0};s[ok?'correct':'wrong']++;stats.questions[q.id]=s;saveStats(stats)}
function weaknessScore(q,stats,misconceptions){const s=stats.questions[q.id]||{correct:0,wrong:0};const attempts=s.correct+s.wrong;const rate=attempts?s.wrong/attempts:.5;return rate*5+Math.min(s.wrong,4)+(attempts<3?(3-attempts)*.7:0)+misconceptionScore(q,misconceptions)*1.2+Math.random()*.8}
function adaptiveSample(pool,size,stats,misconceptions){return [...pool].sort((a,b)=>weaknessScore(b,stats,misconceptions)-weaknessScore(a,stats,misconceptions)).slice(0,size)}
function questionLabel(q,ctx){if(q.yakuRef){const y=ctx.yakuById.get(q.yakuRef);if(y)return y.displayNameJa||y.nameJa}return q.category}
function correctIndex(q){if(q.category==='score'&&Number.isFinite(q.expectedTotal)){const matches=q.choices.map((c,i)=>c.includes(String(q.expectedTotal))?i:-1).filter(i=>i>=0);if(matches.length===1)return matches[0]}return q.answerIndex}
function answerFeedback(q,selected,ok){const specific=q.choiceFeedback?.[selected];if(!specific)return q.explanation;return ok?specific:`${specific}<br><small>正解の理由：${q.explanation}</small>`}
function renderTileRow(codes,ctx,label,{focusCodes=[]}={}){if(!codes?.length)return null;const wrap=document.createElement('div');wrap.className='visual-question-block';if(label){const h=document.createElement('strong');h.textContent=label;wrap.append(h)}const row=document.createElement('div');row.className='tile-row visual-question-tiles no-scroll-hand hand-fit-row';for(const code of codes){const tile=ctx.tileByCode.get(code);if(tile){const node=createTile(tile,{interactive:false});node.dataset.tileCode=code;if(focusCodes.includes(code))node.dataset.focus='true';row.append(node)}}wrap.append(row);return wrap}
function displayHandCodes(q){const codes=[...(q.handTiles||[])];if(q.winTile&&codes.length===14){const index=codes.indexOf(q.winTile);if(index>=0)codes.splice(index,1)}return codes}
function renderVisualInto(host,q,ctx){if(!host||q.presentation!=='tiles')return;const focusCodes=q.focusTiles||[];const handCodes=displayHandCodes(q);const hand=renderTileRow(handCodes,ctx,q.winTile&&q.handTiles?.length===14?'手牌（13枚）':'手牌',{focusCodes});if(hand)host.append(hand);const river=renderTileRow(q.riverTiles,ctx,'自分の河');if(river)host.append(river);if(q.doraIndicator){const dora=renderTileRow([q.doraIndicator],ctx,'ドラ表示牌');if(dora)host.append(dora)}if(q.winTile){const tile=ctx.tileByCode.get(q.winTile);if(tile){const win=document.createElement('div');win.className='visual-win-tile';const label=document.createElement('strong');label.textContent='あがり牌（完成する牌）';win.append(label,createTile(tile,{interactive:false}));host.append(win)}}}
function renderVisualQuestion(app,q,ctx){renderVisualInto(app.querySelector('#problem-visual'),q,ctx)}
function statSummary(data,stats){
  const categoryNames=new Map(data.categories.map(c=>[c.id,c.name]));const keys=new Set(data.questions.map(q=>q.topic||q.category));const ordered=[...TOPIC_ORDER.filter(key=>keys.has(key)),...data.categories.map(c=>c.id).filter(key=>keys.has(key)&&!TOPIC_ORDER.includes(key)),...keys].filter((key,index,list)=>list.indexOf(key)===index);
  return ordered.map(key=>{const qs=data.questions.filter(q=>(q.topic||q.category)===key);let correct=0,wrong=0;for(const q of qs){const s=stats.questions[q.id];if(s){correct+=s.correct;wrong+=s.wrong}}const total=correct+wrong;return {name:TOPIC_NAMES[key]||categoryNames.get(key)||key,total,rate:total?Math.round(correct/total*100):null}})
}
export function normalizeProblemStats(value,questionIds){return normalizeStats(value,new Set(questionIds))}
export function summarizeProblemStats(data,stats){return statSummary(data,normalizeStats(stats,validQuestionIds(data)))}
export function getProblemStudyRecord(data){const stats=loadStats(data);const wrongIds=loadWrong(data);let correct=0,wrong=0;for(const item of Object.values(stats.questions)){correct+=item.correct;wrong+=item.wrong}const attempts=correct+wrong;return {correct,wrong,attempts,rate:attempts?Math.round(correct/attempts*100):null,wrongCount:wrongIds.size,categorySummary:statSummary(data,stats),misconceptions:topMisconceptions(loadMisconceptions())}}

function questionCount(data,predicate){return data.questions.filter(predicate).length}

export function renderProblemHub(app,ctx){
  const data=ctx.problemCatalog;const wrong=loadWrong(data);const stats=loadStats(data);const misconceptions=loadMisconceptions();const summary=statSummary(data,stats);const top=topMisconceptions(misconceptions);
  const card=(label,description,count,topic)=>`<button class="feature-card problem-category" type="button" data-topic="${topic}"><strong>${label}</strong><span>${description}</span><small>${count}問からランダム出題</small></button>`;
  const categoryCard=(label,description,count,category)=>`<button class="feature-card problem-category" type="button" data-category="${category}"><strong>${label}</strong><span>${description}</span><small>${count}問からランダム出題</small></button>`;
  const topicCount=topic=>questionCount(data,q=>q.topic===topic);
  const categoryCount=category=>questionCount(data,q=>q.category===category);
  app.innerHTML=`<section class="hero"><div class="eyebrow">問題</div><h1>覚えた内容を、問題で確かめる。</h1><p>まず牌や場面を見てから答えます。迷った問題はあとで復習できます。</p></section>
  <section class="problem-group"><h2>今の教材の確認</h2><div class="feature-grid">
    <a class="feature-card" href="#intro-review"><strong>入門で習ったこと</strong><span>牌の見方、手牌、面子、ツモとロンを確認します。</span><small>入門の総復習</small></a>
    <a class="feature-card" href="#beginner-review"><strong>初級で習ったこと</strong><span>待ち、鳴き、リーチ、フリテン、役とドラを確認します。</span><small>初級の総復習</small></a>
    ${card('待ち牌（形だけ）','手牌の形を見て、完成する牌を選びます。',topicCount('wait-shape'),'wait-shape')}
    ${card('ロンできるか','役・フリテンなどの条件を見て、ロンできるか判断します。',topicCount('ron-decision'),'ron-decision')}
  </div></section>
  <section class="problem-group"><h2>覚える</h2><div class="feature-grid">
    ${categoryCard('役を見分ける','牌姿や条件を見て、成立する役を答えます。',categoryCount('yaku-name'),'yaku-name')}
    ${categoryCard('点数を確認する','翻・符・親子・ロン／ツモから点数を答えます。',categoryCount('score'),'score')}
  </div></section>
  <details class="problem-details"><summary>その他の確認問題</summary><div class="feature-grid">
    ${card('文章で待ちを復習','牌姿を文章で短く確認します。',topicCount('text-review'),'text-review')}
    ${card('鳴き・リーチの判断','相手の位置や門前かどうかを見て判断します。',topicCount('call-decision'),'call-decision')}
    ${card('実戦での判断','本場・供託・牌効率・守備を確認します。',categoryCount('practical'),'practical')}
    ${card('ルールの違い','本サイトの標準ルールと、採用が分かれる項目を確認します。',categoryCount('rule-diff'),'rule-diff')}
    ${card('その他のルール判断','頭ハネなど、対局中のルール判断を確認します。',topicCount('rule-decision'),'rule-decision')}
  </div></details>
  <section class="panel"><h2>苦手を優先して練習</h2><p>間違えた回数と、繰り返している勘違いをもとに出題します。</p><div class="action-row"><button id="adaptive-review" class="primary" type="button">苦手・勘違い優先10問</button></div><div class="skill-summary">${summary.map(s=>`<div><strong>${s.name}</strong><span>${s.total?`${s.rate}%（${s.total}回答）`:'まだ記録なし'}</span></div>`).join('')}</div>${top.length?`<h3>繰り返している勘違い</h3><div class="skill-summary">${top.map(([key,count])=>`<div><strong>${MISCONCEPTION_LABELS[key]||key}</strong><span>${count}回</span></div>`).join('')}</div>`:''}</section>
  <section class="panel"><h2>間違えた問題</h2><p>${wrong.size?`${wrong.size}問が復習待ちです。正解するまで残ります。`:'現在、復習待ちの問題はありません。'}</p><div class="action-row"><button id="wrong-review" class="primary" type="button" ${wrong.size?'':'disabled'}>間違えた問題だけ解く</button>${wrong.size?'<button id="clear-wrong" class="secondary" type="button">復習記録を消す</button>':''}<button id="clear-stats" class="secondary" type="button">正答記録を消す</button>${top.length?'<button id="clear-misconceptions" class="secondary" type="button">勘違い記録を消す</button>':''}</div></section>
  <div class="lesson-nav"><a class="secondary" href="#menu">メニューへ戻る</a></div>`;
  app.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>renderProblemSession(app,ctx,{topic:b.dataset.topic}));
  app.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>renderProblemSession(app,ctx,{category:b.dataset.category}));
  app.querySelector('#adaptive-review')?.addEventListener('click',()=>renderProblemSession(app,ctx,{adaptive:true}));
  app.querySelector('#wrong-review')?.addEventListener('click',()=>renderProblemSession(app,ctx,{wrongOnly:true}));
  app.querySelector('#clear-wrong')?.addEventListener('click',()=>{clearProblemWrong();renderProblemHub(app,ctx)});
  app.querySelector('#clear-stats')?.addEventListener('click',()=>{clearProblemStats();renderProblemHub(app,ctx)});
  app.querySelector('#clear-misconceptions')?.addEventListener('click',()=>{clearProblemMisconceptions();renderProblemHub(app,ctx)});
}

export function renderProblemSession(app,ctx,{category=null,topic=null,wrongOnly=false,adaptive=false}={}){
  const data=ctx.problemCatalog;const wrong=loadWrong(data);const stats=loadStats(data);const misconceptions=loadMisconceptions();
  let pool=data.questions.filter(q=>wrongOnly?wrong.has(q.id):adaptive?true:topic?q.topic===topic:q.category===category);
  if(!pool.length){renderProblemHub(app,ctx);return}
  const size=wrongOnly?Math.min(20,pool.length):Math.min(data.sessionSize||10,pool.length);
  const session=adaptive?adaptiveSample(pool,size,stats,misconceptions):shuffled(pool).slice(0,size);let index=0,correct=0,answered=false,wrongSession=[];
  const cat=data.categories.find(c=>c.id===category);const topicTitles={...TOPIC_NAMES,'wait-shape':'待ち牌（形だけ）'};const title=wrongOnly?'間違えた問題の復習':adaptive?'苦手・勘違い優先練習':topicTitles[topic]||cat?.name||'問題';
  const render=()=>{
    scrollAppToTop();
    const q=clarifyQuestion(session[index]);
    if(!q){const percent=Math.round(correct/session.length*100);app.innerHTML=`<section class="hero"><div class="eyebrow">${title}</div><h1>${correct} / ${session.length} 問正解</h1><p>正答率 ${percent}% 。この結果は次の優先出題に反映されます。</p><div class="action-row"><button id="same-again" class="primary" type="button">もう一度挑戦</button><a class="secondary" href="#problems">問題一覧へ</a></div></section>`;if(wrongSession.length){const section=document.createElement('section');section.className='panel session-mistakes';section.innerHTML='<h2>間違えた問題を見直す</h2><p>最大3問を再掲します。牌姿をもう一度見てから、1問だけやり直せます。</p><div class="session-mistake-list"></div>';const list=section.querySelector('.session-mistake-list');wrongSession.slice(0,3).forEach(mistake=>{const card=document.createElement('article');card.className='session-mistake';const title=document.createElement('h3');title.textContent=mistake.prompt;card.append(title);if(mistake.presentation==='tiles'){const visual=document.createElement('div');visual.className='session-mistake-visual';renderVisualInto(visual,mistake,ctx);card.append(visual)}const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='この問題をもう一度';retry.onclick=()=>{session.splice(0,session.length,mistake);index=0;correct=0;answered=false;wrongSession=[];render()};card.append(retry);list.append(card)});app.append(section)}app.querySelector('#same-again').onclick=()=>renderProblemSession(app,ctx,{category,topic,wrongOnly,adaptive});return}
    const answer=correctIndex(q);
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">${title}　${index+1} / ${session.length}</div><h1>${q.prompt}</h1></section><section class="panel"><div class="review-progress" aria-label="進行状況"><span style="width:${(index+1)/session.length*100}%"></span></div><div class="problem-hand-area" ${q.presentation==='tiles'?'':'hidden'}><h2>手牌・場面</h2><div id="problem-visual"></div></div><div class="problem-choice-area"><h2>選択肢</h2><div class="quiz-options" id="problem-options"></div></div><div class="feedback" id="problem-feedback" aria-live="polite"></div><div class="action-row" id="problem-actions"></div></section>`;
    renderVisualQuestion(app,q,ctx);

    const options=app.querySelector('#problem-options'),feedback=app.querySelector('#problem-feedback'),actions=app.querySelector('#problem-actions');
    const tileButtons=[];
    const sameCodes=(left,right)=>{
      const a=[...(left||[])].sort(),b=[...(right||[])].sort();
      return a.length===b.length&&a.every((code,index)=>code===b[index]);
    };
    const tileNames=codes=>(codes||[]).map(code=>ctx.tileByCode.get(code)?.nameJa||code).join('、');
    const finishAnswer=(selectedIndex,ok,selectedCodes=[])=>{
      if(answered)return;
      answered=true;
      if(ok){correct++;wrong.delete(q.id)}else wrong.add(q.id);
      if(!ok&&!wrongSession.some(item=>item.id===q.id))wrongSession.push(q);
      saveWrong(wrong);
      recordStat(stats,q,ok);
      recordMisconception(misconceptions,q,selectedIndex,ok);
      const misconception=ok||selectedIndex<0?null:misconceptionOf(q,selectedIndex);
      let detail;
      if(q.interaction==='tile-pick'&&selectedIndex<0){
        detail=q.explanation+'<br><small>選んだ牌：'+(selectedCodes.length?tileNames(selectedCodes):'なし')+'<br>正解の牌：'+tileNames(q.answerTileCodes)+'</small>';
      }else{
        detail=answerFeedback(q,selectedIndex,ok);
      }
      feedback.className='feedback '+(ok?'good':'bad');
      feedback.innerHTML='<strong>'+(ok?'正解':'不正解')+'</strong>'
        +(misconception?'<br><small>今回の勘違い：'+(MISCONCEPTION_LABELS[misconception]||misconception)+'</small>':'')
        +'<br>'+detail;
      if(q.interaction==='tile-pick'){
        const picked=new Set(selectedCodes),expectedCodes=new Set(q.answerTileCodes||[]);
        tileButtons.forEach(el=>{
          const code=el.dataset.tileCode;
          el.disabled=true;
          el.classList.remove('selected');
          el.setAttribute('aria-pressed',picked.has(code)?'true':'false');
          if(expectedCodes.has(code))el.dataset.correct='true';
          if(picked.has(code)&&!expectedCodes.has(code))el.dataset.wrong='true';
        });
        app.querySelectorAll('#problem-visual [data-focus="true"]').forEach(el=>el.dataset.review='true');
      }else{
        [...options.children].forEach((el,n)=>{
          el.disabled=true;
          if(n===answer)el.dataset.correct='true';
          if(n===selectedIndex&&!ok)el.dataset.wrong='true';
        });
      }
      if(q.lessonRef&&ctx.lessonById.has(q.lessonRef)){
        const a=document.createElement('a');a.className='secondary';a.href='#'+q.lessonRef;a.textContent='関連する解説を見る';actions.append(a);
      }else if(q.yakuRef&&ctx.yakuById.has(q.yakuRef)){
        const a=document.createElement('a');a.className='secondary';a.href='#yaku-guide?yaku='+encodeURIComponent(q.yakuRef);a.textContent=questionLabel(q,ctx)+'を役図鑑で見る';actions.append(a);
      }
      if(!ok&&q.interaction==='tile-pick'&&q.topic){
        const related=pool.filter(item=>item.id!==q.id&&item.topic===q.topic&&item.interaction==='tile-pick');
        if(related.length){const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='同じ待ちをもう1問';retry.onclick=()=>{session.splice(0,session.length,shuffled(related)[0]);index=0;correct=0;answered=false;wrongSession=[];render()};actions.append(retry)}
      }
      const next=document.createElement('button');
      next.type='button';next.className='primary';
      next.textContent=index===session.length-1?'結果を見る':'次の問題';
      next.onclick=()=>{index++;answered=false;render()};
      actions.append(next);
    };
    if(q.interaction==='tile-pick'){
      options.classList.add('tile-answer-options');
      const panel=document.createElement('div');panel.className='tile-answer-panel';
      const instruction=document.createElement('p');instruction.className='tile-answer-instruction';instruction.textContent=q.answerTileCodes?.length===1?'正しい待ち牌を1枚タップしてから、回答してください。':'正しい待ち牌をすべてタップしてから、回答してください。';
      const status=document.createElement('p');status.className='tile-answer-status';status.textContent='選択中：なし';
      const palette=document.createElement('div');palette.className='tile-answer-palette';
      const selected=new Set();
      q.tileChoices.forEach(code=>{
        const tile=ctx.tileByCode.get(code);
        if(!tile)return;
        const button=createTile(tile,{interactive:true,onSelect:(_tile,_red,element)=>{
          if(answered)return;
          if(selected.has(code)){
            selected.delete(code);
            element.classList.remove('selected');
          }else{
            selected.add(code);
            element.classList.add('selected');
          }
          element.setAttribute('aria-pressed',selected.has(code)?'true':'false');
          status.textContent='選択中：'+(tileNames([...selected])||'なし');
          submit.disabled=selected.size===0;
        }});
        button.classList.add('tile-answer-tile');
        button.dataset.tileCode=code;
        button.setAttribute('aria-pressed','false');
        tileButtons.push(button);
        palette.append(button);
      });
      const submit=document.createElement('button');
      submit.type='button';submit.className='primary tile-answer-submit';submit.textContent='この牌で回答する';
      submit.disabled=true;
      submit.onclick=()=>{
        const selectedCodes=[...selected];
        const selectedIndex=(q.choiceTileCodes||[]).findIndex(codes=>sameCodes(codes,selectedCodes));
        finishAnswer(selectedIndex,sameCodes(selectedCodes,q.answerTileCodes),selectedCodes);
      };
      panel.append(instruction,palette,status,submit);
      options.append(panel);
    }else{
      q.choices.forEach((choice,i)=>{
        const b=document.createElement('button');b.type='button';b.textContent=choice;
        b.onclick=()=>finishAnswer(i,i===answer);
        options.append(b);
      });
    }
  };render();
}
