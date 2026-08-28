const KEY='wakaranjan-settings-v1';
const DEFAULTS={displayScale:'system',sound:true,reducedMotion:'system',lastRoute:'#home'};
const DISPLAY_SCALES=new Set(['system','large','larger']);
const MOTION_MODES=new Set(['system','on','off']);
const ROUTE_PATTERN=/^#[A-Za-z0-9_-]+(?:\?[^#\s]*)?$/;

function safeRoute(value){
  if(typeof value!=='string'||!ROUTE_PATTERN.test(value))return DEFAULTS.lastRoute;
  return value;
}
function normalize(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {...DEFAULTS};
  return {
    displayScale:DISPLAY_SCALES.has(value.displayScale)?value.displayScale:DEFAULTS.displayScale,
    sound:typeof value.sound==='boolean'?value.sound:DEFAULTS.sound,
    reducedMotion:MOTION_MODES.has(value.reducedMotion)?value.reducedMotion:DEFAULTS.reducedMotion,
    lastRoute:safeRoute(value.lastRoute)
  };
}
function load(){
  try{return normalize(JSON.parse(localStorage.getItem(KEY)||'null'))}
  catch{return {...DEFAULTS}}
}
function save(value){try{localStorage.setItem(KEY,JSON.stringify(normalize(value)))}catch{} }

export function getSettings(){return load()}
export function updateSettings(changes={}){const next=normalize({...load(),...changes});save(next);return next}
export function setLastRoute(route){return updateSettings({lastRoute:safeRoute(route)})}
export function resetSettings(){try{localStorage.removeItem(KEY)}catch{};return {...DEFAULTS}}
export function normalizeSettings(value){return normalize(value)}

export function applySettings(root=document.documentElement,settings=getSettings()){
  const current=normalize(settings);
  root.dataset.displayScale=current.displayScale;
  root.dataset.sound=current.sound?'on':'off';
  root.dataset.reducedMotion=current.reducedMotion;
  return current;
}
