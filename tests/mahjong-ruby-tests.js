import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMahjongRubyMap,toKatakana} from '../src/lib/mahjong-ruby.js';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const terms=[...read('../src/data/terms.json').terms,...read('../src/data/terms-extra.json').terms];
const tiles=read('../src/data/tiles.json').tiles;
const waitTypes=read('../src/data/waits.json').waitTypes;
const yaku=read('../src/data/yaku.json').yaku;
const map=buildMahjongRubyMap({terms,tiles,waitTypes,yaku});
const hasKanji=value=>/[\u3400-\u9fff々]/u.test(value);
const validReading=/^[ァ-ヶー\s]+$/u;

assert.equal(toKatakana('りゃんめん まち'),'リャンメン マチ','ひらがなの読みをカタカナへそろえる');
for(const [base,reading] of map){
  assert.equal(hasKanji(base),true,`かなだけの不要なルビがあります: ${base}`);
  assert.match(reading,validReading,`ルビにカタカナ以外の読みがあります: ${base} -> ${reading}`);
  assert.notEqual(reading,'',`読みが空です: ${base}`);
}

for(const term of terms){
  if(hasKanji(term.nameJa))assert.equal(map.get(term.nameJa),toKatakana(term.readingJa),`${term.id} の正式名称のルビがありません`);
  for(const alias of term.aliases||[]){
    if(hasKanji(alias)){
      assert.ok(term.aliasReadings?.[alias],`${term.id} の漢字別名に専用の読みを登録してください: ${alias}`);
      assert.equal(map.get(alias),toKatakana(term.aliasReadings[alias]),`${term.id} の別名の読みが不一致です: ${alias}`);
    }
  }
}
for(const tile of tiles){
  assert.equal(map.get(tile.nameJa),toKatakana(tile.readingJa),`${tile.id} の牌名のルビがありません`);
  for(const alias of tile.aliases||[])if(hasKanji(alias))assert.equal(map.get(alias),toKatakana(tile.readingJa),`${tile.id} の別表記の読みが不一致です: ${alias}`);
}
for(const wait of waitTypes)if(hasKanji(wait.nameJa))assert.equal(map.get(wait.nameJa),toKatakana(wait.readingJa),`${wait.id} の待ち名のルビがありません`);
for(const item of yaku){
  if(hasKanji(item.nameJa))assert.equal(map.get(item.nameJa),toKatakana(item.readingJa),`${item.id} の正式名称のルビがありません`);
  if(item.displayNameJa!==item.nameJa&&hasKanji(item.displayNameJa)){
    assert.ok(item.displayReadingJa,`${item.id} の表示名に専用の読みがありません`);
    assert.equal(map.get(item.displayNameJa),toKatakana(item.displayReadingJa),`${item.id} の表示名の読みが不一致です`);
  }
  for(const alias of item.aliases||[])if(hasKanji(alias)){
    assert.ok(item.aliasReadings?.[alias],`${item.id} の漢字別名に専用の読みを登録してください: ${alias}`);
    assert.equal(map.get(alias),toKatakana(item.aliasReadings[alias]),`${item.id} の別名の読みが不一致です: ${alias}`);
  }
}

for(const [base,reading] of [['リーチ','リーチ'],['ツモ','ツモ'],['ドラ','ドラ'],['ピンフ','ピンフ']])assert.equal(map.has(base),false,`${base} に不要なルビがあります`);
for(const [base,reading] of [['白','ハク'],['發','ハツ'],['中','チュン'],['門前ツモ','メンゼンツモ'],['捨て牌','ステハイ'],['東家','トンチャ'],['一通','イッツウ']])assert.equal(map.get(base),reading,`${base} の読みが不適切です`);

console.log(`✓ ルビ辞書 ${map.size}件の必要性・読み・かなだけの除外を検査しました。`);
