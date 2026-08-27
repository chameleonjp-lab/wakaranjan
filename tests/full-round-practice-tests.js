import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FULL_ROUND_SCENARIOS} from '../src/practice/full-round.js';

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
console.log(`${checks} linked full-round decisions validated across ${FULL_ROUND_SCENARIOS.length} scenarios.`);
