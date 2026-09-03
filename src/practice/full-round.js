import {createTile} from '../components/tile.js';

export const FULL_ROUND_SCENARIOS=[
  {id:'speed-riichi',title:'東1局：門前で速度を作る',description:'配牌からリーチ、終盤のロン判断までを連続して考えます。',steps:[
    {title:'配牌を見る',hand:['2m','3m','4m','4p','5p','7p','2s','3s','4s','6s','7s','2z','2z'],prompt:'最初に何を優先して見ますか？',choices:['完成している面子と、あと少しで完成する形を見る','ドラだけを探して他は見ない','字牌をすべて残す'],answer:0,feedback:['まず完成部分と未完成部分を分けると、どの牌を残すか考えやすくなります。','ドラは大切ですが、手全体の形も同時に見ます。','字牌を無条件に全部残すと、手が進みにくくなることがあります。']},
    {title:'ツモ後の打牌',hand:['2m','3m','4m','4p','5p','7p','8p','2s','3s','4s','6s','7s','2z','2z'],draw:'8p',prompt:'7筒・8筒ができました。孤立している牌を整理するなら？',choices:['6索を切る','2筒を切る','対子の北を1枚切る'],answer:0,feedback:['6索は7索との形もありますが、この固定例では他の形を優先して6索を整理します。','2筒は手牌にありません。実際の牌姿を確認して選びます。','北の対子は雀頭候補なので、ここでは残します。']},
    {title:'テンパイ',hand:['2m','3m','4m','4p','5p','6p','7p','8p','2s','3s','4s','2z','2z'],prompt:'門前でテンパイしました。1000点以上あり、フリテンでもありません。どうしますか？',choices:['リーチする','鳴く','必ずダマにする'],answer:0,setFlag:'riichi',feedback:['この練習ではリーチを選びます。門前テンパイならリーチは1翻の役になります。','自分の番に鳴く操作はできません。','ダマが有利な局面もありますが、この固定例ではリーチを学びます。']},
    {title:'危険牌を引く',requiresFlag:'riichi',fallback:{title:'リーチを見送った後',prompt:'前の場面でリーチを選ばなかったため、まだリーチは成立していません。どう進めますか？',choices:['手牌を整えながら次のあがりを待つ','成立していないリーチを取り消す','必ず鳴く'],answer:0,feedback:['リーチを選ばなかった場合は、成立していない状態を保ったまま手牌を進めます。','成立していないリーチは取り消す対象になりません。','リーチを見送ったことから、鳴きが必須になるわけではありません。']},hand:['2m','3m','4m','4p','5p','6p','7p','8p','2s','3s','4s','2z','2z'],draw:'9m',prompt:'リーチ後に9萬をツモしました。あがり牌ではありません。どうしますか？',choices:['9萬をそのまま切る','手牌を自由に組み替える','リーチを取り消す'],answer:0,feedback:['リーチ後は原則として手牌を自由に変えず、あがり牌でなければツモ牌を切ります。','リーチ後は自由な手替わりができません。','成立したリーチを途中で取り消すことはできません。']},
    {title:'ロン判断',requiresFlag:'riichi',fallback:{title:'リーチを見送った後のあがり判断',prompt:'リーチを見送った状態で他家が牌を捨てました。まず何を確認しますか？',choices:['役とフリテンを確認してからロンできるか判断する','リーチ後なので必ずロンする','リーチを後から宣言してロンする'],answer:0,feedback:['リーチをしていない場合は、役とフリテンを確認してからロンを判断します。','リーチ後とは限らないため、必ずロンできるわけではありません。','ロンの直前にリーチを追加することはできません。']},hand:['2m','3m','4m','4p','5p','6p','7p','8p','2s','3s','4s','2z','2z'],opponentDiscard:'9p',prompt:'他家が待ち牌の9筒を捨てました。自分の河に待ち牌はありません。どうしますか？',choices:['ロンする','フリテンなので見送る','ポンする'],answer:0,feedback:['役のあるリーチ手で、フリテンでもないためロンできます。','自分の河に待ち牌がないので、この条件ではフリテンではありません。','あがれる牌ならロンを優先して局を終えます。']}
  ]},
  {id:'call-or-close',title:'東2局：鳴くか門前を保つか',description:'鳴きの条件と、鳴いた後に失う役を続けて確認します。',steps:[
    {title:'上家の捨て牌',hand:['3m','4m','6m','7m','8m','2p','3p','4p','5s','5s','6s','7s','8s'],opponentDiscard:'5m',prompt:'上家が5萬を捨てました。3萬・4萬でチーできますか？',choices:['できる','できない','対面ならできる'],answer:0,setFlag:'called',feedback:['上家の捨て牌なので、3萬・4萬に5萬を加えてチーできます。','形も相手の位置も条件を満たしています。','対面の捨て牌はチーできません。']},
    {title:'鳴いた後',requiresFlag:'called',fallback:{title:'鳴かなかった後',prompt:'前の場面でチーを選ばなかったため、手はまだ門前です。この状態で何を確認しますか？',choices:['門前のまま手を進める','すでに鳴いた手として扱う','必ずリーチを取り消す'],answer:0,feedback:['鳴かなかった場合は、手を門前のまま進めます。','鳴いていないので、公開した組はありません。','成立していないリーチを取り消す必要はありません。']},hand:['6m','7m','8m','2p','3p','4p','5s','5s','6s','7s','8s'],meld:['3m','4m','5m'],prompt:'チーした後、この手は門前ですか？',choices:['門前ではない','まだ門前','暗槓と同じ扱い'],answer:0,feedback:['チーは副露なので門前ではなくなります。','チーすると手の一部を公開するため門前ではありません。','暗槓は門前を保ちますが、チーは違います。']},
    {title:'リーチ可否',requiresFlag:'called',hand:['6m','7m','8m','2p','3p','4p','5s','5s','6s','7s','8s'],meld:['3m','4m','5m'],prompt:'その後テンパイしました。リーチできますか？',choices:['できない','できる','1000点棒を2本出せばできる'],answer:0,feedback:['チーで門前ではなくなったためリーチできません。','リーチは門前が条件です。','供託する点数を増やしても門前条件は変わりません。']},
    {title:'あがり役を確認',requiresFlag:'called',hand:['6m','7m','8m','2p','3p','4p','5s','5s','6s','7s','8s'],meld:['3m','4m','5m'],prompt:'鳴いた手であがるには何を確認しますか？',choices:['鳴いても成立する役があるか','ドラが1枚あれば必ずあがれる','門前役が残っているかだけ'],answer:0,feedback:['鳴いた後は、鳴いても成立する役があるかを確認します。','ドラは役ではないので、ドラだけではあがれません。','門前限定役は使えません。鳴いて成立する役を探します。']},
    {title:'局の振り返り',requiresFlag:'called',prompt:'この一局で最も重要な因果関係は？',choices:['チーした→門前でなくなった→リーチ不可','チーした→必ず点数が上がる','チーした→フリテンが必ず解除される'],answer:0,feedback:['前の判断が後の選択肢を変える例です。鳴くと速度は上がることがありますが、門前限定役を失います。','鳴くと役や翻数が下がる場合もあります。','鳴いたこと自体でフリテンが必ず解除されるわけではありません。']}
  ]},
  {id:'late-defense',title:'東4局：終盤の押し引き',description:'順位・手の価値・危険度を一つずつ確認して終盤判断をします。',steps:[
    {title:'状況確認',prompt:'終盤で相手からリーチが入りました。最初に確認する情報として最も広いのは？',choices:['自分の打点・手の進み・安全牌・点数状況','自分の打点だけ','相手の河だけ'],answer:0,feedback:['押す価値と放銃リスクを両方見るため、複数の情報を合わせます。','打点だけでは危険度が分かりません。','河だけでは自分が押す価値を判断できません。']},
    {title:'現物を確認',river:['6m','2p','9s'],prompt:'相手の河に6萬があります。6萬はその相手へのロンに対してどう扱いますか？',choices:['現物なので安全','筋なので必ず安全','壁なので安全'],answer:0,setFlag:'safe',feedback:['その相手がすでに捨てた6萬は現物です。','筋ではなく現物です。','壁とは見えている同一牌の枚数を使う考え方です。']},
    {title:'自分の手',requiresFlag:'safe',fallback:{title:'安全牌を確認していない状態',prompt:'前の場面で現物を確認していないため、安全度が不明です。どうしますか？',choices:['安全牌を確認してから切る牌を決める','安全度を確認せず危険牌を切る','相手のリーチを無視する'],answer:0,feedback:['前の確認がない場合は、安全牌を確認してから押し引きを決めます。','確認なしに危険牌を選ぶ根拠はありません。','相手のリーチを無視すると放銃の危険を見落とします。']},hand:['2m','3m','4m','4p','5p','6p','3s','4s','5s','7s','8s','2z','2z'],prompt:'まだ1シャンテンで、あがりまで距離があります。安全な6萬を持っているなら？',choices:['いったん6萬を切って守備寄りに進める','危険牌から先に切る','必ずカンする'],answer:0,feedback:['固定例では、手が遠いため現物を使って放銃を避けます。','危険牌を先に切る根拠はありません。','カンできる牌姿でもなく、守備目的の選択にもなりません。']},
    {title:'次巡',prompt:'次巡も相手のリーチが続いています。判断は固定ですか？',choices:['新しく見えた牌と自分の手の進みで再評価する','一度降りたら何があっても同じ牌だけ切る','必ず押し返す'],answer:0,feedback:['巡目が進むたび情報は増えます。安全度と手の価値を再評価します。','持っている牌は有限なので同じ牌だけ切り続けられません。','状況が悪いままなら無理に押し返す必要はありません。']},
    {title:'振り返り',prompt:'この局で学ぶ「押し引き」の考え方は？',choices:['価値と危険を比べ、情報が増えるたび判断を更新する','リーチには必ず降りる','高い手なら必ず押す'],answer:0,feedback:['押し引きは固定ルールではなく、手の価値・進み具合・安全度・点数状況を比べて更新します。','十分な価値と安全に押せる牌があれば押す場面もあります。','高打点でも手が遠く危険なら降りる場面があります。']}
  ]}
];

function tile(ctx,code){const t=ctx.tileByCode.get(code);return t?createTile(t,{interactive:false}):null}
function tileRow(ctx,codes,label){if(!codes?.length)return null;const box=document.createElement('div');box.className='practice-tile-block';const strong=document.createElement('strong');strong.textContent=label;const row=document.createElement('div');row.className='tile-row hand-fit-row';for(const code of codes){const el=tile(ctx,code);if(el)row.append(el)}box.append(strong,row);return box}

export function resolveFullRoundStep(scenario,index,state={}){
  const base=scenario.steps[index];
  if(!base)return null;
  if(base.requiresFlag&&!state[base.requiresFlag]&&base.fallback)return {...base,...base.fallback};
  return base;
}

export function renderFullRoundPractice(app,ctx){
  let scenarioIndex=0,stepIndex=0,score=0,answered=false;let sessionState={riichi:false,called:false,safe:false};const history=[];
  const render=()=>{
    const scenario=FULL_ROUND_SCENARIOS[scenarioIndex];const step=resolveFullRoundStep(scenario,stepIndex,sessionState);
    if(!step){
      const total=scenario.steps.length;app.innerHTML=`<section class="hero"><div class="eyebrow">通し型実戦練習</div><h1>${scenario.title} 完了</h1><p>${score} / ${total} 判断で教材上の推奨選択ができました。</p><section class="panel"><h2>判断の履歴</h2>${history.map((x,i)=>`<p><strong>${i+1}. ${x.title}</strong><br>${x.choice} — ${x.ok?'推奨判断':'要復習'}</p>`).join('')}<div class="action-row"><button id="next-scenario" class="primary" type="button">${scenarioIndex===FULL_ROUND_SCENARIOS.length-1?'最初のシナリオへ':'次のシナリオへ'}</button><a class="secondary" href="#practice">対局練習へ戻る</a></div></section>`;
      app.querySelector('#next-scenario').onclick=()=>{scenarioIndex=(scenarioIndex+1)%FULL_ROUND_SCENARIOS.length;stepIndex=0;score=0;history.length=0;sessionState={riichi:false,called:false,safe:false};answered=false;render()};return;
    }
    const stateLabels=Object.entries({riichi:'リーチ成立',called:'鳴き成立',safe:'安全牌確認'}).filter(([key])=>sessionState[key]).map(([,label])=>label);
    const hasVisual=Boolean(step.hand?.length||step.meld?.length||step.river?.length||step.draw||step.opponentDiscard);
    app.innerHTML=`<section class="lesson-head"><div class="eyebrow">通し型実戦練習 ${scenarioIndex+1} / ${FULL_ROUND_SCENARIOS.length}</div><h1>${scenario.title}</h1><p class="lead">${scenario.description}</p></section><section class="practice-surface"><div class="review-progress"><span style="width:${(stepIndex+1)/scenario.steps.length*100}%"></span></div><p class="status">${stepIndex+1} / ${scenario.steps.length}　${step.title}</p><p class="status">前の判断：${stateLabels.length?stateLabels.join('・'):'まだ成立していません'}</p><p>${step.prompt}</p><div class="selection-area selection-area-hand" ${hasVisual?'':'hidden'}><h2>先に見る：手牌・場面</h2><div id="round-state"></div></div><div class="selection-area selection-area-choices"><h2>選択肢</h2><div class="practice-options" id="round-options"></div></div><div class="feedback" id="round-feedback" aria-live="polite"></div><div class="action-row" id="round-actions"></div></section><div class="lesson-nav"><a class="secondary" href="#practice">対局練習へ戻る</a><a class="secondary" href="#menu">メニューへ</a></div>`;
    const stateBox=app.querySelector('#round-state');for(const [codes,label] of [[step.hand,'あなたの手牌'],[step.meld,'公開した組'],[step.river,'相手の河']]){const block=tileRow(ctx,codes,label);if(block)stateBox.append(block)}if(step.draw){const block=tileRow(ctx,[step.draw],'ツモ牌');if(block)stateBox.append(block)}if(step.opponentDiscard){const block=tileRow(ctx,[step.opponentDiscard],'他家の捨て牌');if(block)stateBox.append(block)}
    const options=app.querySelector('#round-options'),feedback=app.querySelector('#round-feedback'),actions=app.querySelector('#round-actions');
    step.choices.forEach((choice,i)=>{const b=document.createElement('button');b.type='button';b.className='practice-choice';b.textContent=choice;b.onclick=()=>{if(answered)return;answered=true;const ok=i===step.answer;if(ok){score++;if(step.setFlag)sessionState[step.setFlag]=true}history.push({title:step.title,choice,ok,state:{...sessionState}});feedback.className=`feedback ${ok?'good':'bad'}`;feedback.innerHTML=`<strong>${ok?'推奨判断':'ここを確認'}</strong><br>${step.feedback[i]}`;[...options.children].forEach((el,n)=>{el.disabled=true;if(n===step.answer)el.dataset.correct='true';if(n===i&&!ok)el.dataset.wrong='true'});const next=document.createElement('button');next.className='primary';next.type='button';next.textContent=stepIndex===scenario.steps.length-1?'局を振り返る':'次の場面へ';next.onclick=()=>{stepIndex++;answered=false;render()};actions.append(next)};options.append(b)});
  };render();
}
