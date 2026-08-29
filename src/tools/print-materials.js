export function renderPrintMaterials(app,ctx){
  const rule=ctx.standardRules||{};
  const scope=rule.scope||{};
  const winning=rule.winning||{};
  const scoring=rule.scoring||{};
  const redDoraCount=Object.values(scoring.redDoraByType||{}).reduce((sum,count)=>sum+(Number(count)||0),0)||3;
  app.innerHTML=`<section class="print-material"><div class="print-controls action-row"><button id="print-materials" class="primary" type="button">印刷する</button><a class="secondary" href="#home">ホームへ戻る</a></div><header><div class="eyebrow">ワカランジャン</div><h1>麻雀 学習用まとめ</h1><p>画面を見ながら、または印刷して、確認したいところに印をつけて使います。</p></header>
  <section class="print-sheet"><h2>まず覚える順番</h2><ol><li>自分の番に1枚ツモって、1枚捨てる</li><li>4つの面子と1つの雀頭を作る</li><li>役を1つ以上そろえてあがる</li><li>翻と符、親子、ロン・ツモで点数を確認する</li></ol></section>
  <section class="print-sheet"><h2>牌の分類</h2><div class="print-columns"><div><h3>数牌</h3><p>萬子・筒子・索子の1〜9。1と9は端牌、2〜8は中張牌です。</p></div><div><h3>字牌</h3><p>東・南・西・北の風牌、白・發・中の三元牌です。</p></div></div></section>
  <section class="print-sheet"><h2>あがり前の確認</h2><ul class="check-list"><li>□ 手牌の形が整っている</li><li>□ ドラではない役が1つ以上ある</li><li>□ フリテンではない（ロンの場合）</li><li>□ リーチ・鳴き・待ちを確認した</li></ul></section>
  <section class="print-sheet"><h2>ワカランジャン標準ルール</h2><dl class="rule-grid"><dt>人数</dt><dd>${scope.players||4}人</dd><dt>使用牌</dt><dd>${scope.tileCount||136}枚</dd><dt>最低条件</dt><dd>${winning.minimumHan||1}翻以上の役が必要</dd><dt>通常形</dt><dd>${winning.standardShape||'4面子1雀頭'}</dd><dt>赤牌</dt><dd>赤5萬・赤5筒・赤5索を各1枚（合計${redDoraCount}枚）</dd><dt>点数の流れ</dt><dd>翻と符から基本点を出し、親子・ロン/ツモを区別</dd></dl></section>
  <section class="print-sheet"><h2>今日のメモ</h2><div class="memo-lines"><span></span><span></span><span></span><span></span><span></span></div></section></section>`;
  app.querySelector('#print-materials').addEventListener('click',()=>window.print());
}
