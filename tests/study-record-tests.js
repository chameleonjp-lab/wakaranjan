import assert from 'node:assert/strict';
import {getProblemStudyRecord,normalizeProblemStats,summarizeProblemStats} from '../src/questions/problem-hub.js';

const store=new Map();
globalThis.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const data={categories:[{id:'score',name:'点数',description:''}],questions:[{id:'q-score-1',category:'score',skill:'score'},{id:'q-score-2',category:'score',skill:'score'}]};
const valid={version:2,questions:{'q-score-1':{correct:1,wrong:0}}};

assert.equal(normalizeProblemStats(valid,['q-score-1','q-score-2']).questions['q-score-1'].correct,1);
assert.deepEqual(normalizeProblemStats(null,['q-score-1']).questions,{});
assert.deepEqual(normalizeProblemStats([],['q-score-1']).questions,{});
assert.deepEqual(normalizeProblemStats('broken',['q-score-1']).questions,{});
assert.deepEqual(normalizeProblemStats({version:2,questions:{unknown:{correct:1,wrong:0}}},['q-score-1']).questions,{});

store.set('wakaranjan-question-stats-v2',JSON.stringify(valid));
store.set('wakaranjan-wrong-question-ids-v2',JSON.stringify({version:2,ids:[]}));
store.set('wakaranjan-misconceptions-v2',JSON.stringify({version:2,items:{}}));
const record=getProblemStudyRecord(data);
assert.equal(record.attempts,1,'1問の記録を分類内の問題数だけ重複させない');
assert.equal(record.categorySummary[0].total,1,'分類別集計も問題ID単位で数える');
assert.equal(record.categorySummary[0].rate,100);
assert.equal(summarizeProblemStats(data,valid)[0].total,1);

for(const broken of [null,[], 'broken', {version:2,questions:{unknown:{correct:1,wrong:0}}}]){
  store.set('wakaranjan-question-stats-v2',JSON.stringify(broken));
  assert.doesNotThrow(()=>getProblemStudyRecord(data),'壊れた問題記録でも学習記録を表示できる');
  assert.equal(getProblemStudyRecord(data).attempts,0);
}

console.log('problem study record tests passed: per-question aggregation and corrupted storage normalization.');
