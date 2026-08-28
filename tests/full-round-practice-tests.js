import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FULL_ROUND_SCENARIOS,resolveFullRoundStep} from '../src/practice/full-round.js';

const tiles=JSON.parse(readFileSync(new URL('../src/data/tiles.json',import.meta.url),'utf8')).tiles;
const valid=new Set(tiles.map(t=>t.code));
let checks=0;
for(const scenario of FULL_ROUND_SCENARIOS){
  assert.ok(scenario.id&&scenario.title&&scenario.description,scenario.id);
  assert.ok(scenario.steps.length>=5,`${scenario.id}: at least five linked decisions`);
  for(const [index,step] of scenario.steps.entries()){
    assert.ok(step.title&&step.prompt,`${scenario.id}[${index}] text`);
    assert.ok(step.choices.length>=3,`${scenario.id}[${index}] choices`);
    assert.equal(step.feedback.length,step.choices.length,`${scenario.id}[${index}] feedback`);
    assert.ok(Number.isInteger(step.answer)&&step.answer>=0&&step.answer<step.choices.length,`${scenario.id}[${index}] answer`);
    for(const code of [...(step.hand||[]),...(step.meld||[]),...(step.river||[]),...(step.draw?[step.draw]:[]),...(step.opponentDiscard?[step.opponentDiscard]:[])])assert.ok(valid.has(code),`${scenario.id}[${index}] unknown tile ${code}`);
    checks++;
  }
}
assert.ok(FULL_ROUND_SCENARIOS.length>=3,'three scenario minimum');
assert.ok(FULL_ROUND_SCENARIOS.some(s=>s.steps.some(x=>x.title.includes('リーチ'))),'riichi decision included');
assert.ok(FULL_ROUND_SCENARIOS.some(s=>s.steps.some(x=>x.title.includes('鳴')||x.prompt.includes('チー'))),'call decision included');
assert.ok(FULL_ROUND_SCENARIOS.some(s=>s.steps.some(x=>x.prompt.includes('押し引き')||x.title.includes('現物'))),'defense decision included');
const speed=FULL_ROUND_SCENARIOS.find(s=>s.id==='speed-riichi');
assert.match(resolveFullRoundStep(speed,3,{}).title,/見送った/,'前のリーチ判断を引き継いだ分岐がありません');
assert.equal(resolveFullRoundStep(speed,3,{riichi:true}).title,'危険牌を引く','リーチ成立後の次の場面がありません');
const calls=FULL_ROUND_SCENARIOS.find(s=>s.id==='call-or-close');
assert.match(resolveFullRoundStep(calls,1,{}).title,/鳴かなかった/,'前の鳴き判断を引き継いだ分岐がありません');
assert.equal(resolveFullRoundStep(calls,1,{called:true}).title,'鳴いた後','鳴き成立後の次の場面がありません');
console.log(`${checks} linked full-round decisions validated across ${FULL_ROUND_SCENARIOS.length} scenarios.`);
