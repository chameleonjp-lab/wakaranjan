const PROFILE_KEY='wakaranjan-profiles-v1';
const LEGACY_PROGRESS_KEY='wakaranjan-lesson-progress-v1';
const LEGACY_PROBLEM_KEYS=[
  'wakaranjan-wrong-question-ids-v2',
  'wakaranjan-question-stats-v2',
  'wakaranjan-misconceptions-v2'
];
const STORE_VERSION=1;
const MAX_NAME_LENGTH=40;

function emptyProgress(){return {completed:[],lastLesson:null}}

function normalizeName(value){
  if(typeof value!=='string')return '';
  return value.trim().replace(/\s+/g,' ').slice(0,MAX_NAME_LENGTH);
}

function nameKey(value){return normalizeName(value).toLocaleLowerCase('ja-JP')}

function normalizeProgress(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return emptyProgress();
  return {
    completed:Array.isArray(value.completed)?[...new Set(value.completed.filter(id=>typeof id==='string'))]:[],
    lastLesson:typeof value.lastLesson==='string'?value.lastLesson:null
  };
}

function normalizeProfile(value,index){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const name=normalizeName(value.name);
  if(!name)return null;
  return {
    id:typeof value.id==='string'&&value.id?value.id:`profile-${index+1}`,
    name,
    nameKey:nameKey(name),
    progress:normalizeProgress(value.progress)
  };
}

function normalizeStore(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {version:STORE_VERSION,activeId:null,profiles:[]};
  const seen=new Set();
  const profiles=(Array.isArray(value.profiles)?value.profiles:[]).map(normalizeProfile).filter(profile=>{
    if(!profile||seen.has(profile.nameKey))return false;
    seen.add(profile.nameKey);
    return true;
  });
  const activeId=profiles.some(profile=>profile.id===value.activeId)?value.activeId:null;
  return {version:STORE_VERSION,activeId,profiles};
}

function loadStore(){
  try{return normalizeStore(JSON.parse(localStorage.getItem(PROFILE_KEY)||'null'))}
  catch{return {version:STORE_VERSION,activeId:null,profiles:[]}}
}

function saveStore(store){
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(store))}catch{}
}

function nextId(profiles){
  let number=profiles.length+1;
  let id=`profile-${number}`;
  while(profiles.some(profile=>profile.id===id)){number++;id=`profile-${number}`}
  return id;
}

function copyLegacyData(profileId){
  const keys=[LEGACY_PROGRESS_KEY,...LEGACY_PROBLEM_KEYS];
  for(const base of keys){
    try{
      const value=localStorage.getItem(base);
      const scoped=`${base}:${profileId}`;
      if(value!==null&&localStorage.getItem(scoped)===null)localStorage.setItem(scoped,value);
    }catch{}
  }
}

export function getProfiles(){return loadStore().profiles.map(profile=>({...profile,progress:normalizeProgress(profile.progress)}))}

export function getActiveProfile(){
  const store=loadStore();
  const profile=store.profiles.find(item=>item.id===store.activeId);
  return profile?{...profile,progress:normalizeProgress(profile.progress)}:null;
}

export function hasActiveProfile(){return Boolean(getActiveProfile())}

export function activateProfile(value){
  const name=normalizeName(value);
  if(!name)return null;
  const store=loadStore();
  const firstProfile=store.profiles.length===0;
  let profile=store.profiles.find(item=>item.nameKey===nameKey(name));
  if(!profile){
    profile={id:nextId(store.profiles),name,nameKey:nameKey(name),progress:emptyProgress()};
    store.profiles.push(profile);
  }else{
    profile.name=name;
  }
  if(firstProfile)copyLegacyData(profile.id);
  store.activeId=profile.id;
  saveStore(store);
  return {...profile,progress:normalizeProgress(profile.progress)};
}

export function switchProfile(id){
  const store=loadStore();
  if(!store.profiles.some(profile=>profile.id===id))return null;
  store.activeId=id;
  saveStore(store);
  return getActiveProfile();
}

export function profileStorageKey(baseKey){
  const profile=getActiveProfile();
  return profile?`${baseKey}:${profile.id}`:baseKey;
}

export function getActiveProfileName(){return getActiveProfile()?.name||''}

export function normalizeProfileName(value){return normalizeName(value)}

export const PROFILE_STORAGE_KEY=PROFILE_KEY;
