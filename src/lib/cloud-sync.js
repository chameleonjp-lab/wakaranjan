import {getActiveProfile,profileStorageKey} from './profile.js';
import {SUPABASE_LEARNING_TABLE,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL} from './supabase-config.js';

export const LEARNING_STORAGE_KEYS=Object.freeze({
  lessonProgress:'wakaranjan-lesson-progress-v1',
  wrongQuestionIds:'wakaranjan-wrong-question-ids-v2',
  questionStats:'wakaranjan-question-stats-v2',
  misconceptions:'wakaranjan-misconceptions-v2'
});

const CLOUD_STATE_VERSION=1;
const RECORD_VERSION=2;
const MAX_IDS=2000;
const MAX_QUESTIONS=3000;
const MAX_NAME_LENGTH=80;
const REQUEST_TIMEOUT_MS=8000;
const DISABLE_FLAG='__WAKARANJAN_DISABLE_CLOUD__';

let pendingSnapshot=null;
let syncTimer=null;
let retryTimer=null;
let inFlight=null;
let status={state:'idle',message:'Supabase同期はまだ実行していません。'};
const loadedNames=new Set();
const loadingNames=new Map();

function isBrowser(){return typeof window!=='undefined'&&typeof document!=='undefined'&&typeof fetch==='function'}
function isDisabled(){return Boolean(globalThis[DISABLE_FLAG])}
export function isCloudSyncAvailable(){return isBrowser()&&!isDisabled()&&Boolean(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY)}
function setStatus(state,message){status={state,message}}
export function getCloudSyncStatus(){return {...status}}

function isObject(value){return Boolean(value&&typeof value==='object'&&!Array.isArray(value))}
function safeJson(raw){try{return raw===null?null:JSON.parse(raw)}catch{return null}}
function stringList(value,max=MAX_IDS){
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter(item=>typeof item==='string'&&item.length>0&&item.length<=160))].slice(0,max);
}
function integer(value){return Number.isInteger(value)&&value>=0&&value<=1000000?value:0}

function normalizeLessonProgress(value){
  return {
    completed:stringList(value?.completed),
    lastLesson:typeof value?.lastLesson==='string'&&value.lastLesson.length<=160?value.lastLesson:null
  };
}

function normalizeWrong(value){return {version:RECORD_VERSION,ids:stringList(value?.ids)}}

function normalizeStats(value){
  const questions={};
  if(isObject(value?.questions)){
    for(const [id,item] of Object.entries(value.questions).slice(0,MAX_QUESTIONS)){
      if(!id||id.length>160||!isObject(item))continue;
      questions[id]={correct:integer(item.correct),wrong:integer(item.wrong)};
    }
  }
  return {version:RECORD_VERSION,questions};
}

function normalizeMisconceptions(value){
  const items={};
  if(isObject(value?.items)){
    for(const [key,count] of Object.entries(value.items).slice(0,MAX_QUESTIONS)){
      if(key.length<=160)items[key]=integer(count);
    }
  }
  return {version:RECORD_VERSION,items};
}

export function normalizeLearningState(value){
  const source=isObject(value)?value:{};
  return {
    version:CLOUD_STATE_VERSION,
    lessonProgress:normalizeLessonProgress(source.lessonProgress),
    wrongQuestionIds:normalizeWrong(source.wrongQuestionIds),
    questionStats:normalizeStats(source.questionStats),
    misconceptions:normalizeMisconceptions(source.misconceptions)
  };
}

function readLocal(baseKey){
  try{return safeJson(localStorage.getItem(profileStorageKey(baseKey)))}catch{return null}
}

function snapshotFor(profile=getActiveProfile()){
  if(!profile)return null;
  const state=normalizeLearningState({
    lessonProgress:readLocal(LEARNING_STORAGE_KEYS.lessonProgress),
    wrongQuestionIds:readLocal(LEARNING_STORAGE_KEYS.wrongQuestionIds),
    questionStats:readLocal(LEARNING_STORAGE_KEYS.questionStats),
    misconceptions:readLocal(LEARNING_STORAGE_KEYS.misconceptions)
  });
  return {nameKey:profile.nameKey,displayName:profile.name,state};
}

function emptyState(){return normalizeLearningState(null)}

function writeLocal(baseKey,value){
  try{localStorage.setItem(profileStorageKey(baseKey),JSON.stringify(value))}catch{}
}

function applyLearningState(state){
  const normalized=normalizeLearningState(state);
  writeLocal(LEARNING_STORAGE_KEYS.lessonProgress,normalized.lessonProgress);
  writeLocal(LEARNING_STORAGE_KEYS.wrongQuestionIds,normalized.wrongQuestionIds);
  writeLocal(LEARNING_STORAGE_KEYS.questionStats,normalized.questionStats);
  writeLocal(LEARNING_STORAGE_KEYS.misconceptions,normalized.misconceptions);
  return normalized;
}

function tableUrl(){return `${SUPABASE_URL.replace(/\/$/,'')}/rest/v1/${SUPABASE_LEARNING_TABLE}`}
function requestHeaders(extra={}){
  return {
    apikey:SUPABASE_PUBLISHABLE_KEY,
    Accept:'application/json',
    ...extra
  };
}

async function request(url,options={}){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetch(url,{...options,signal:controller.signal,headers:requestHeaders(options.headers||{})});
    if(!response.ok){
      const detail=(await response.text()).slice(0,240);
      throw new Error(`Supabase同期に失敗しました（${response.status}）${detail?`：${detail}`:''}`);
    }
    return response;
  }finally{clearTimeout(timeout)}
}

async function readRemote(nameKey){
  const url=new URL(tableUrl());
  url.searchParams.set('select','display_name,learning_state,updated_at');
  url.searchParams.set('name_key',`eq.${nameKey}`);
  url.searchParams.set('limit','1');
  const response=await request(url.toString(),{cache:'no-store'});
  const rows=await response.json();
  if(!Array.isArray(rows)||!rows[0])return null;
  return {state:normalizeLearningState(rows[0].learning_state),updatedAt:rows[0].updated_at||null};
}

async function writeRemote(snapshot){
  const url=new URL(tableUrl());
  url.searchParams.set('on_conflict','name_key');
  const response=await request(url.toString(),{
    method:'POST',
    headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify({
      name_key:snapshot.nameKey,
      display_name:snapshot.displayName.slice(0,MAX_NAME_LENGTH),
      learning_state:normalizeLearningState(snapshot.state),
      updated_at:new Date().toISOString()
    })
  });
  return response.ok;
}

function scheduleRetry(){
  if(retryTimer||!pendingSnapshot)return;
  retryTimer=setTimeout(()=>{retryTimer=null;void flushCloudSync()},5000);
}

export async function synchronizeActiveProfileFromCloud({force=false}={}){
  const profile=getActiveProfile();
  if(!profile)return {ok:false,skipped:true,reason:'no-profile'};
  if(!isCloudSyncAvailable()){
    if(isBrowser()&&isDisabled())setStatus('disabled','テスト用にSupabase同期を無効にしています。');
    return {ok:false,skipped:true,reason:'disabled'};
  }
  if(!force&&loadedNames.has(profile.nameKey))return {ok:true,source:'cached'};
  if(loadingNames.has(profile.nameKey))return loadingNames.get(profile.nameKey);
  const profileKey=profile.nameKey;
  const task=(async()=>{
    setStatus('loading',`${profile.name}さんの学習記録をSupabaseから読み込んでいます。`);
    try{
      const remote=await readRemote(profileKey);
      const current=getActiveProfile();
      if(!current||current.nameKey!==profileKey)return {ok:false,skipped:true,reason:'profile-changed'};
      if(remote){
        applyLearningState(remote.state);
      }else{
        const snapshot=snapshotFor(current);
        if(snapshot)await writeRemote(snapshot);
      }
      loadedNames.add(profileKey);
      setStatus('synced',`${current.name}さんの学習記録をSupabaseと同期しました。`);
      return {ok:true,source:remote?'cloud':'created'};
    }catch(error){
      setStatus('error','Supabaseと同期できませんでした。端末内の記録を使い、通信が戻ったら再試行します。');
      return {ok:false,error};
    }finally{loadingNames.delete(profileKey)}
  })();
  loadingNames.set(profileKey,task);
  return task;
}

export function queueCloudSync(){
  if(!isCloudSyncAvailable())return;
  const snapshot=snapshotFor();
  if(!snapshot)return;
  pendingSnapshot=snapshot;
  setStatus('pending',`${snapshot.displayName}さんの学習記録を保存しています。`);
  if(syncTimer)clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>{syncTimer=null;void flushCloudSync()},250);
}

export async function flushCloudSync(){
  if(!isCloudSyncAvailable())return {ok:false,skipped:true,reason:'disabled'};
  if(syncTimer){clearTimeout(syncTimer);syncTimer=null}
  if(inFlight){
    const result=await inFlight;
    if(pendingSnapshot&&result.ok)return flushCloudSync();
    return result;
  }
  if(!pendingSnapshot)return {ok:true,skipped:true,reason:'nothing-to-sync'};
  const snapshot=pendingSnapshot;
  pendingSnapshot=null;
  inFlight=(async()=>{
    setStatus('syncing',`${snapshot.displayName}さんの学習記録をSupabaseへ保存しています。`);
    try{
      await writeRemote(snapshot);
      if(retryTimer){clearTimeout(retryTimer);retryTimer=null}
      setStatus('synced',`${snapshot.displayName}さんの学習記録をSupabaseと同期しました。`);
      return {ok:true};
    }catch(error){
      if(!pendingSnapshot)pendingSnapshot=snapshot;
      setStatus('error','Supabaseへ保存できませんでした。端末内の記録は保持しています。');
      scheduleRetry();
      return {ok:false,error};
    }
  })();
  const result=await inFlight;
  inFlight=null;
  if(pendingSnapshot&&result.ok)return flushCloudSync();
  return result;
}

export async function retryActiveProfileCloudSync(){
  const profile=getActiveProfile();
  if(profile&&pendingSnapshot?.nameKey===profile.nameKey)return flushCloudSync();
  return synchronizeActiveProfileFromCloud({force:true});
}

export async function resetActiveLearningState(){
  const profile=getActiveProfile();
  for(const key of Object.values(LEARNING_STORAGE_KEYS)){
    try{localStorage.removeItem(profileStorageKey(key))}catch{}
  }
  if(!profile||!isCloudSyncAvailable()){
    return {ok:true,cloud:false};
  }
  // Finish an already-running save before replacing it with the reset state.
  // This prevents an older answer from being the last write after reset.
  if(inFlight)await flushCloudSync();
  pendingSnapshot={nameKey:profile.nameKey,displayName:profile.name,state:emptyState()};
  if(syncTimer){clearTimeout(syncTimer);syncTimer=null}
  const result=await flushCloudSync();
  if(result.ok)loadedNames.add(profile.nameKey);
  return {ok:result.ok,cloud:true,error:result.error};
}

if(isBrowser())window.addEventListener('online',()=>{if(pendingSnapshot)void flushCloudSync()});
