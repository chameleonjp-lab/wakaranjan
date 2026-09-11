function toKatakana(value){
  return String(value||'').replace(/[ぁ-ゖ]/g,character=>String.fromCharCode(character.charCodeAt(0)+0x60)).trim().replace(/\s+/g,' ');
}

const KANJI_PATTERN=/[\u3400-\u9fff々]/u;

function addEntry(map,text,reading){
  if(typeof text!=='string'||!text.trim()||typeof reading!=='string'||!reading.trim())return;
  const key=text.trim();
  // Kana-only words are already readable. Adding a small, duplicate ruby to
  // them makes headings and buttons taller without helping a beginner.
  if(!KANJI_PATTERN.test(key))return;
  if(!map.has(key))map.set(key,toKatakana(reading));
}

function addAliases(map,record,{fallback=false}={}){
  for(const alias of record?.aliases||[]){
    const reading=record.aliasReadings?.[alias]||(fallback?record.readingJa:'');
    addEntry(map,alias,reading);
  }
}

export function buildMahjongRubyMap(ctx){
  const map=new Map();
  for(const [text,reading] of [
    ['麻雀','マージャン'],['役牌','ヤクハイ'],['牌','パイ'],['役','ヤク'],
    ['対局','タイキョク'],['点数','テンスウ'],['点棒','テンボウ'],
    // These compounds appear in learner-facing labels and explanations. Keep
    // them whole so an unknown compound does not receive a misleading ruby
    // only on its final "牌" character.
    ['牌姿','ハイシ'],['あがり牌','アガリハイ'],['表示牌','ヒョウジハイ'],
    ['完成牌','カンセイハイ'],['待ち部分','マチブブン'],['待ち形','マチガタ'],
    ['中張牌','チュンチャンパイ'],['么九牌','ヤオチュウハイ'],
    ['安全牌','アンゼンパイ'],['危険牌','キケンパイ'],['同一牌','ドウイツハイ'],
    ['副露牌','フーロハイ'],['嶺上牌','リンシャンハイ'],['連風牌','レンプウハイ'],
    ['海底牌','ハイテイハイ'],['加槓牌','カカンハイ'],
    ['両面待ち','リャンメンマチ'],['嵌張待ち','カンチャンマチ'],
    ['辺張待ち','ペンチャンマチ'],['双碰待ち','シャンポンマチ'],['単騎待ち','タンキマチ'],
    ['両面','リャンメン'],['嵌張','カンチャン'],['辺張','ペンチャン'],['双碰','シャンポン'],['単騎','タンキ']
  ])addEntry(map,text,reading);
  for(const term of ctx?.terms||[]){
    addEntry(map,term.nameJa,term.readingJa);
    addAliases(map,term);
  }
  for(const tile of ctx?.tiles||[]){
    addEntry(map,tile.nameJa,tile.readingJa);
    addAliases(map,tile,{fallback:true});
  }
  for(const wait of ctx?.waitTypes||[]){
    addEntry(map,wait.nameJa,wait.readingJa);
  }
  for(const yaku of ctx?.yaku||[]){
    const name=yaku.displayNameJa||yaku.nameJa;
    addEntry(map,name,yaku.displayReadingJa||yaku.readingJa);
    addEntry(map,yaku.nameJa,yaku.readingJa);
    addAliases(map,yaku);
  }
  return map;
}

function makeRuby(document,text,reading){
  const ruby=document.createElement('ruby');
  ruby.className='mahjong-ruby';
  const base=document.createElement('rb');
  base.textContent=text;
  const rt=document.createElement('rt');
  rt.textContent=reading;
  ruby.append(base,rt);
  return ruby;
}

function shouldSkip(node){
  const parent=node.parentElement;
  return !parent||Boolean(parent.closest('ruby,script,style,svg,input,textarea,select,option,[data-ruby="off"]'));
}

function decorateTextNode(node,document,map){
  const value=node.nodeValue||'';
  if(!value.trim())return;
  const entries=[...map.entries()].sort((a,b)=>b[0].length-a[0].length);
  if(!entries.length)return;
  const expression=new RegExp(entries.map(([text])=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  const matches=[...value.matchAll(expression)];
  if(!matches.length)return;
  const fragment=document.createDocumentFragment();
  let cursor=0;
  for(const match of matches){
    const start=match.index??0;
    if(start>cursor)fragment.append(document.createTextNode(value.slice(cursor,start)));
    const reading=map.get(match[0]);
    fragment.append(makeRuby(document,match[0],reading));
    cursor=start+match[0].length;
  }
  if(cursor<value.length)fragment.append(document.createTextNode(value.slice(cursor)));
  node.replaceWith(fragment);
}

export function decorateMahjongTerms(root,ctx){
  if(!root||typeof document==='undefined')return;
  const map=buildMahjongRubyMap(ctx);
  if(!map.size)return;
  const nodes=[];
  const walker=document.createTreeWalker(root,4);
  let node;
  while((node=walker.nextNode()))if(!shouldSkip(node))nodes.push(node);
  for(const textNode of nodes)decorateTextNode(textNode,document,map);
}

export {toKatakana};
