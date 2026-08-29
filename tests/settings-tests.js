import assert from 'node:assert/strict';
import {applySettings,getSettings,normalizeSettings,resetSettings,setLastRoute,updateSettings} from '../src/lib/settings.js';

const store=new Map();
globalThis.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};

assert.deepEqual(getSettings(),{displayScale:'system',sound:true,reducedMotion:'system',lastRoute:'#home'});
assert.deepEqual(normalizeSettings(null),{displayScale:'system',sound:true,reducedMotion:'system',lastRoute:'#home'});
assert.deepEqual(normalizeSettings([]),{displayScale:'system',sound:true,reducedMotion:'system',lastRoute:'#home'});
assert.equal(normalizeSettings({displayScale:'huge',sound:'yes',reducedMotion:'fast',lastRoute:'javascript:alert(1)'}).lastRoute,'#home');

updateSettings({displayScale:'larger',sound:false,reducedMotion:'on'});
assert.deepEqual(getSettings(),{displayScale:'larger',sound:false,reducedMotion:'on',lastRoute:'#home'});
setLastRoute('#dictionary?term=term-riichi');
assert.equal(getSettings().lastRoute,'#dictionary?term=term-riichi');
setLastRoute('javascript:alert(1)');
assert.equal(getSettings().lastRoute,'#home');

const root={dataset:{}};
applySettings(root,getSettings());
assert.deepEqual(root.dataset,{displayScale:'larger',sound:'off',reducedMotion:'on'});
resetSettings();
assert.deepEqual(getSettings(),{displayScale:'system',sound:true,reducedMotion:'system',lastRoute:'#home'});

console.log('settings tests passed: defaults, corruption normalization, route safety, and DOM application.');
