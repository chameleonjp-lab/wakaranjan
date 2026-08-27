import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clarifyQuestion,clarifiedQuestionIds} from '../src/questions/question-copy.js';
import {misconceptionOf,misconceptionKeysFor,MISCONCEPTION_LABELS,misconceptionQuestionIds} from '../src/questions/misconceptions.js';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const catalog=read('../src/data/questions/catalog.json').questions;
const visual=read('../src/data/questions/visual-catalog.json').questions;
const practical=read('../src/data/questions/practical-rules.json').questions;
const intro=read('../src/data/questions/intro/review.json').questions;
const beginner=read('../src/data/questions/beginner/review.json').questions;
const intermediate=read('../src/data/questions/intermediate/scoring-review.json').questions;
const problemHub=[...catalog,...visual,...practical].map(clarifyQuestion);
const all=[...problemHub,...intro,...beginner,...intermediate];
const norm=s=>(s||'').normalize('NFKC').replace(/[\s、。，．・!?！？「」『』]/g,'').toLowerCase();
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};

test('全問題IDが横断して重複しない',()=>{const ids=all.map(q=>q.id);assert.equal(new Set(ids).size,ids.length)});
test('全問題の選択肢は正規化後も重複しない',()=>{for(const q of all){const choices=q.choices||[];assert.ok(choices.length>=2,q.id);const normalized=choices.map(norm);assert.equal(new Set(normalized).size,normalized.length,`${q.id}: ${choices.join(' / ')}`)}});
test('正解番号と解説が教材として最低限成立する',()=>{for(const q of all){assert.ok(Number.isInteger(q.answerIndex)&&q.answerIndex>=0&&q.answerIndex<q.choices.length,q.id);assert.ok((q.prompt||'').length>=3,`${q.id}: prompt`);assert.ok((q.explanation||'').length>=5,`${q.id}: explanation`);assert.notEqual(norm(q.explanation),norm(q.choices[q.answerIndex]),`${q.id}: explanation only repeats answer`)}});
test('実戦判断・ルール差問題は条件と理由を説明できる文章量を持つ',()=>{for(const q of problemHub.filter(q=>q.category==='practical'||q.category==='rule-diff')){assert.ok(q.prompt.length>=8,`${q.id}: prompt too short`);assert.ok(q.explanation.length>=10,`${q.id}: explanation too short`)}});
test('実戦判断問題に一目で捨てられる冗談選択肢を置かない',()=>{const giveaway=/メーカー|年齢|服装|製造年|点棒の色|牌の傷|相手の名前|山の高さ|麻雀にルールがない|役が存在しない|ドラを全部切る/;for(const q of problemHub.filter(q=>q.category==='practical'))for(const [index,choice] of q.choices.entries())if(index!==q.answerIndex)assert.doesNotMatch(choice,giveaway,`${q.id}: ${choice}`)});
test('個別フィードバックを持つ問題は全選択肢に説明がある',()=>{const withFeedback=problemHub.filter(q=>q.choiceFeedback);assert.ok(withFeedback.length>=9,'choice feedback coverage');for(const q of withFeedback){assert.equal(q.choiceFeedback.length,q.choices.length,`${q.id}: feedback count`);for(const [i,text] of q.choiceFeedback.entries()){assert.ok(text.length>=12,`${q.id}[${i}]: feedback too short`);assert.notEqual(norm(text),norm(q.choices[i]),`${q.id}[${i}]: feedback only repeats choice`)}}});
test('勘違い分類は実在する問題・誤答選択肢だけを参照する',()=>{const byId=new Map(problemHub.map(q=>[q.id,q]));assert.ok(misconceptionQuestionIds.size>=9);for(const id of misconceptionQuestionIds){const q=byId.get(id);assert.ok(q,id);assert.ok(misconceptionKeysFor(q).length>=1,id);for(let i=0;i<q.choices.length;i++){const key=misconceptionOf(q,i);if(!key)continue;assert.notEqual(i,q.answerIndex,`${id}[${i}] correct choice must not be misconception`);assert.ok(MISCONCEPTION_LABELS[key],`${id}[${i}] missing label`)}}});
test('曖昧さ補正対象は実際の問題IDとして存在する',()=>{const ids=new Set([...catalog,...visual,...practical].map(q=>q.id));for(const id of clarifiedQuestionIds)assert.equal(ids.has(id),true,id)});
test('対々和問題は四暗刻との別解が生まれない問い方になっている',()=>{const q=problemHub.find(q=>q.id==='q-yaku-007');assert.ok(q);assert.match(q.prompt,/鳴いて/);assert.match(q.prompt,/2翻/);assert.match(q.explanation,/四暗刻/)});
test('45萬と46萬の牌効率問題は残り枚数の前提を明示する',()=>{const q=problemHub.find(q=>q.id==='q-practical-003');assert.ok(q);assert.match(q.prompt,/見えている牌の枚数が同じ/);assert.match(q.explanation,/実戦/);assert.match(q.explanation,/見えている枚数/)});
test('ルール差問題はサイト標準か一般差かを設問内で区別する',()=>{for(const q of problemHub.filter(q=>q.category==='rule-diff')){const text=`${q.prompt}${q.explanation}`;assert.ok(/本サイト|ワカランジャン|ルール|規定|採用|団体|サービス/.test(text),`${q.id}: ruleset context missing`)}});

console.log(`\n${passed} question wording quality tests passed (${all.length} questions audited).`);
