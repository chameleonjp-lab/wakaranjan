import assert from 'node:assert/strict';

const store=new Map();
globalThis.localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
};
globalThis.window={addEventListener(){}};
globalThis.document={};

let remoteRows=[];
let failNextPost=false;
const requests=[];
const response=(body,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body),json:async()=>body});
globalThis.fetch=async(url,options={})=>{
  requests.push({url:String(url),method:options.method||'GET',body:options.body?JSON.parse(options.body):null,hasAuthorization:Object.keys(options.headers||{}).some(key=>key.toLowerCase()==='authorization')});
  if(options.method==='POST'&&failNextPost){failNextPost=false;return response({message:'temporary failure'},503)}
  return options.method==='POST'?response([]):response(remoteRows);
};

const {activateProfile,profileStorageKey}=await import('../src/lib/profile.js');
const {
  LEARNING_STORAGE_KEYS,
  flushCloudSync,
  normalizeLearningState,
  queueCloudSync,
  resetActiveLearningState,
  retryActiveProfileCloudSync,
  synchronizeActiveProfileFromCloud
}=await import('../src/lib/cloud-sync.js');

const malformed=normalizeLearningState({
  lessonProgress:{completed:['ok',42,'ok'],lastLesson:99},
  wrongQuestionIds:{ids:['q1',null,'q1']},
  questionStats:{questions:{q1:{correct:3,wrong:-1},q2:'broken'}},
  misconceptions:{items:{wait:2,broken:-3}}
});
assert.deepEqual(malformed.lessonProgress,{completed:['ok'],lastLesson:null});
assert.deepEqual(malformed.wrongQuestionIds,{version:2,ids:['q1']});
assert.deepEqual(malformed.questionStats,{version:2,questions:{q1:{correct:3,wrong:0}}});
assert.deepEqual(malformed.misconceptions,{version:2,items:{wait:2,broken:0}});

activateProfile('Cloud Tester');
const firstSync=await synchronizeActiveProfileFromCloud();
assert.equal(firstSync.ok,true);
assert.equal(requests.filter(request=>request.method==='GET').length,1,'名前の初回同期でGETが1回です');
assert.equal(requests.filter(request=>request.method==='POST').length,1,'名前の初回同期で空の学習状態を作成します');
assert.equal(requests[0].hasAuthorization,false,'publishable keyをAuthorizationヘッダーへ送っていません');
const firstBody=requests.at(-1).body;
assert.equal(firstBody.name_key,'cloud tester');
assert.ok(firstBody.learning_state.lessonProgress);
assert.equal('game_score' in firstBody,false,'ゲームスコアを学習状態へ混在させていません');

store.set(profileStorageKey(LEARNING_STORAGE_KEYS.lessonProgress),JSON.stringify({completed:['lesson-intro-01'],lastLesson:'lesson-intro-01'}));
store.set(profileStorageKey(LEARNING_STORAGE_KEYS.questionStats),JSON.stringify({version:2,questions:{q1:{correct:1,wrong:0}}}));
queueCloudSync();
queueCloudSync();
queueCloudSync();
assert.equal((await flushCloudSync()).ok,true);
assert.equal(requests.filter(request=>request.method==='POST').length,2,'連打された同期は1回へまとめます');
assert.deepEqual(requests.at(-1).body.learning_state.lessonProgress.completed,['lesson-intro-01']);

remoteRows=[{display_name:'Cloud Tester',learning_state:{lessonProgress:{completed:['lesson-beginner-01'],lastLesson:'lesson-beginner-01'}}}];
await synchronizeActiveProfileFromCloud({force:true});
assert.deepEqual(JSON.parse(store.get(profileStorageKey(LEARNING_STORAGE_KEYS.lessonProgress))),{completed:['lesson-beginner-01'],lastLesson:'lesson-beginner-01'});

store.set(profileStorageKey(LEARNING_STORAGE_KEYS.lessonProgress),JSON.stringify({completed:['lesson-intermediate-01'],lastLesson:'lesson-intermediate-01'}));
failNextPost=true;
queueCloudSync();
const failedSave=await flushCloudSync();
assert.equal(failedSave.ok,false,'保存失敗を呼び出し元へ返します');
const getsBeforeRetry=requests.filter(request=>request.method==='GET').length;
const retriedSave=await retryActiveProfileCloudSync();
assert.equal(retriedSave.ok,true,'未送信の最新記録を再送できます');
assert.equal(requests.filter(request=>request.method==='GET').length,getsBeforeRetry,'保存失敗の再試行で古いクラウド状態を読み込みません');
assert.deepEqual(requests.at(-1).body.learning_state.lessonProgress.completed,['lesson-intermediate-01']);

const reset=await resetActiveLearningState();
assert.equal(reset.ok,true);
assert.equal(store.has(profileStorageKey(LEARNING_STORAGE_KEYS.lessonProgress)),false,'解除後に端末の進捗を残していません');
assert.deepEqual(requests.at(-1).body.learning_state.lessonProgress,{completed:[],lastLesson:null});

console.log('cloud sync tests passed: defensive normalization, name-keyed upsert, batching, remote hydration, and in-app reset.');
