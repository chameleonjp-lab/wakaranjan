const yesNo=value=>value?'あり':'なし';
const statusClass=value=>value?'yes':'no';
const ruleItem=(label,value)=>'<div class="rule-item"><dt>'+label+'</dt><dd>'+value+'</dd></div>';
const ruleRow=(label,value,className='')=>'<li><span>'+label+'</span><strong class="rule-value '+className+'">'+value+'</strong></li>';
const boolRow=(label,value,positive='あり',negative='なし')=>ruleRow(label,value?positive:negative,statusClass(value));
const multipleRonLabel=value=>value==='head-bump'?'頭ハネ':value||'ルールによる';

export function renderRules(app,ctx){
  const rule=ctx.standardRules||ctx.rulesets?.[0];
  if(!rule){app.innerHTML='<section class="hero"><div class="eyebrow">ルール基準</div><h1>標準ルールを読み込めませんでした</h1><p>教材データを再読み込みしてください。</p></section>';return}
  const scope=rule.scope||{};
  const winning=rule.winning||{};
  const calls=rule.calls||{};
  const riichi=rule.riichi||{};
  const flow=rule.flow||{};
  const scoring=rule.scoring||{};
  const redFives=scope.redFives||rule.redFives||{};
  const redNames=[['man','5萬'],['pin','5筒'],['sou','5索']].filter(([key])=>Number(redFives[key]||0)>0).map(([key,label])=>label+'×'+redFives[key]);
  const redTotal=Object.values(redFives).reduce((sum,value)=>sum+Number(value||0),0);
  const specialShapes=(winning.specialShapes||[]).join('・')||'なし';
  const kanTypes=(calls.kan||[]).join('・')||'区別して扱う';
  const multipleRon=multipleRonLabel(rule.multipleRon);
  const kazoe=scoring.kazoeYakuman?'あり':'なし（'+(scoring.kazoeYakumanMax||'三倍満')+'まで）';
  const riichiLabel=riichi.enabled?'門前かつテンパイ時に宣言':'採用しない';

  app.innerHTML=[
    '<section class="lesson-head"><div class="eyebrow">共通データ</div><h1>ルール基準</h1><p class="lead">教材・問題・点数計算で迷ったときに戻る、'+rule.displayNameJa+'の基準です。</p></section>',
    '<section class="callout"><strong>ここに書かれた内容を標準の答えにします。</strong><br>教材内で「ルールによる」と書かれたものは、この基準と区別して学びます。</section>',
    '<section class="panel"><h2>基本設定</h2><dl class="rule-grid">',
    ruleItem('ゲーム形式',scope.game||'日本式四人リーチ麻雀'),
    ruleItem('人数',(scope.players||4)+'人（親'+(scope.dealerCount||1)+'名・子'+(scope.childCount||3)+'名）'),
    ruleItem('使用牌',(scope.tileCount||136)+'枚'),
    ruleItem('赤牌',redNames.join('、')+'（合計'+redTotal+'枚）'),
    '</dl></section>',
    '<section class="panel"><h2>あがりの基準</h2><dl class="rule-grid">',
    ruleItem('最低条件',(winning.minimumHan||1)+'翻以上の役が必要'+(winning.requiresNonDoraYaku?'（ドラだけでは不可）':'')),
    ruleItem('通常形',winning.standardShape||'4面子1雀頭'),
    ruleItem('例外形',specialShapes),
    ruleItem('フリテン時のロン',winning.furitenRon?'許可':'禁止'),
    '</dl></section>',
    '<section class="panel"><h2>採用ルール</h2><ul class="rule-list">',
    boolRow('喰いタン',rule.openTanyao),
    boolRow('後付け',rule.atozuke),
    boolRow('赤ドラ',scoring.redDora),
    boolRow('裏ドラ',scoring.uraDora),
    boolRow('槓ドラ',scoring.kanDora),
    boolRow('槓裏ドラ',scoring.kanUraDora),
    boolRow('切り上げ満貫',scoring.kiriageMangan),
    boolRow('役満複合',rule.yakumanStacking),
    ruleRow('数え役満',kazoe,scoring.kazoeYakuman?'yes':'no'),
    ruleRow('同時ロン',multipleRon),
    ruleRow('ダブル役満の特殊形',rule.doubleYakumanVariants?'採用':'特例・ルール差で扱う',rule.doubleYakumanVariants?'yes':'no'),
    ruleRow('ローカル役',rule.localYaku?'採用':'標準問題では不採用',rule.localYaku?'yes':'no'),
    ruleRow('三人麻雀',rule.sanma?'対象':'初期対象外',rule.sanma?'yes':'no'),
    '</ul></section>',
    '<section class="panel"><h2>鳴き・リーチ・局の進行</h2><ul class="rule-list">',
    ruleRow('チー',calls.chi||'上家からのみ'),
    ruleRow('ポン',calls.pon||'他の3人の誰からでも'),
    ruleRow('カン',kanTypes),
    boolRow('鳴いた手の門前限定役',calls.closedOnlyYakuNotAvailableAfterCall,'成立しない','成立する'),
    ruleRow('リーチ',riichiLabel),
    ruleRow('リーチの前提',riichi.requiresClosedHand&&riichi.requiresTenpai?'門前・テンパイ':'ルールによる'),
    ruleRow('局の進行',flow.drawHandling||'流局・テンパイ/ノーテン'),
    boolRow('親の連荘',flow.renchan),
    boolRow('本場',flow.honba),
    '</ul></section>',
    '<section class="panel"><h2>点数計算の基準</h2><dl class="rule-grid">',
    ruleItem('計算の流れ','翻と符から基本点を求め、親子・ロン/ツモを区別'),
    ruleItem('端数処理',scoring.rounding||'100点単位に切り上げ'),
    ruleItem('満貫以上',(scoring.limits||[]).join('・')),
    ruleItem('七対子の符',(scoring.chiitoitsuFu||25)+'符固定'),
    ruleItem('ピンフツモの符',(scoring.pinfuTsumoFu||20)+'符'),
    ruleItem('供託・本場',scoring.riichiSticks&&scoring.honba?'点数に反映':'ルールによる'),
    '</dl></section>',
    '<section class="panel"><h2>補足</h2><ul class="rule-note">'+(rule.notes||[]).map(note=>'<li>'+note+'</li>').join('')+'</ul></section>',
    '<div class="lesson-nav"><a class="secondary" href="#menu">メニューへ戻る</a><a class="primary" href="#automatic-calculator">点数計算を試す</a></div>'
  ].join('');
}
