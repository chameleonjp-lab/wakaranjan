function toKatakana(value){
  return String(value||'').replace(/[ぁ-ゖ]/g,character=>String.fromCharCode(character.charCodeAt(0)+0x60));
}

function addEntry(map,text,reading){
  if(typeof text!=='string'||!text.trim()||typeof reading!=='string'||!reading.trim())return;
  const key=text.trim();
  if(!map.has(key))map.set(key,toKatakana(reading));
}

export function buildMahjongRubyMap(ctx){
  const map=new Map();
  for(const [text,reading] of [['麻雀','マージャン'],['牌','パイ'],['役','ヤク'],['対局','タイキョク'],['点数','テンスウ']])addEntry(map,text,reading);
  for(const term of ctx?.terms||[]){
    addEntry(map,term.nameJa,term.readingJa);
    for(const alias of term.aliases||[])addEntry(map,alias,term.readingJa);
  }
  for(const yaku of ctx?.yaku||[]){
    const name=yaku.displayNameJa||yaku.nameJa;
    addEntry(map,name,yaku.readingJa);
    addEntry(map,yaku.nameJa,yaku.readingJa);
    for(const alias of yaku.aliases||[])addEntry(map,alias,yaku.readingJa);
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
  return !parent||Boolean(parent.closest('ruby,script,style,svg,input,textarea,select,option'));
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
