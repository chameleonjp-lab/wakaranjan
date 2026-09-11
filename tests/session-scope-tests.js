import assert from 'node:assert/strict';
import {filterByScope,questionScope,selectWeakestScope} from '../src/questions/session-scope.js';

const questions=[
  {id:'wait-1',topic:'wait-shape'},
  {id:'ron-1',topic:'ron-decision'},
  {id:'ron-2',topic:'ron-decision'},
  {id:'score-1',category:'score'}
];

assert.equal(questionScope(questions[0]),'wait-shape');
assert.equal(questionScope(questions[3]),'score');
assert.equal(selectWeakestScope(questions,{order:['wait-shape','ron-decision','score']}),'wait-shape','未記録時は初心者向けの待ち牌から始める');
assert.equal(selectWeakestScope(questions,{
  stats:{questions:{'ron-1':{correct:0,wrong:2},'ron-2':{correct:1,wrong:1}}},
  order:['wait-shape','ron-decision','score']
}),'ron-decision','苦手な分類を1つに絞る');
assert.deepEqual(filterByScope(questions,'ron-decision').map(q=>q.id),['ron-1','ron-2']);

console.log('✓ 苦手・誤答復習のセッション分類を混在させないロジックを検査しました。');
