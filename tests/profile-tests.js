import assert from 'node:assert/strict';
import {activateProfile,getActiveProfile,getProfiles,profileStorageKey,PROFILE_STORAGE_KEY} from '../src/lib/profile.js';
import {clearLessonProgress,getLessonProgress,markLessonComplete} from '../src/lib/progress.js';

const store=new Map();
globalThis.localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
};

store.set('wakaranjan-lesson-progress-v1',JSON.stringify({completed:['lesson-intro-01'],lastLesson:'lesson-intro-01'}));
store.set(PROFILE_STORAGE_KEY,'not-json');
assert.doesNotThrow(()=>getProfiles(),'壊れた名前一覧で例外が発生しない');
assert.equal(getActiveProfile(),null);

const alice=activateProfile('  Alice  ');
assert.equal(alice.name,'Alice');
assert.equal(getActiveProfile().name,'Alice');
assert.deepEqual([...getLessonProgress().completed],['lesson-intro-01'],'既存の記録を最初の名前へ安全に引き継げる');
assert.equal(getLessonProgress().lastLesson,'lesson-intro-01');
assert.ok(store.has(profileStorageKey('wakaranjan-lesson-progress-v1')));

markLessonComplete('lesson-beginner-01');
assert.equal(getLessonProgress().completed.has('lesson-beginner-01'),true);
const aliceProgressKey=profileStorageKey('wakaranjan-lesson-progress-v1');

const bob=activateProfile('Bob');
assert.equal(bob.name,'Bob');
assert.equal(getLessonProgress().completed.size,0,'別の名前に記録が混ざらない');
markLessonComplete('lesson-intro-02');
const bobProgressKey=profileStorageKey('wakaranjan-lesson-progress-v1');
assert.notEqual(aliceProgressKey,bobProgressKey);

activateProfile('alice');
assert.equal(getLessonProgress().completed.has('lesson-intro-01'),true);
assert.equal(getLessonProgress().completed.has('lesson-beginner-01'),true);
assert.equal(getLessonProgress().completed.has('lesson-intro-02'),false);
clearLessonProgress();
assert.equal(getLessonProgress().completed.size,0,'現在の名前だけ進捗を削除できる');
activateProfile('Bob');
assert.equal(getLessonProgress().completed.has('lesson-intro-02'),true,'他の名前の進捗を削除していない');

console.log('profile tests passed: corruption recovery, legacy migration, and per-name progress isolation.');
