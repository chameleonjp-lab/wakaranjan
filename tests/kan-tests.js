import assert from 'node:assert/strict';
import {applyKan,canDeclareKan,KAN_TYPES,MAX_KANS_PER_HAND,validateKan} from '../src/lib/kan.js';

assert.deepEqual(KAN_TYPES,['ankan','minkan','kakan'],'the three kan types are explicit');
assert.equal(MAX_KANS_PER_HAND,4,'the standard hand limit is four kans');

const ankanHand=['7p','7p','7p','7p','2m','3m','4m'];
const ankan=validateKan({type:'ankan',concealedTiles:ankanHand,ownTurn:true,drawnTile:'7p'});
assert.equal(ankan.ok,true,'ankan accepts four identical tiles in the hand');
assert.equal(ankan.meld.type,'ankan','ankan keeps its type');
assert.equal(ankan.meld.open,false,'ankan remains closed');
assert.equal(validateKan({type:'ankan',concealedTiles:ankanHand,ownTurn:false}).code,'own-turn-required','ankan requires the own turn');
assert.equal(validateKan({type:'ankan',concealedTiles:['7p','7p','7p'],ownTurn:true}).code,'four-of-a-kind-required','ankan requires four copies');

const minkan=validateKan({type:'minkan',concealedTiles:['7p','7p','7p','2m'],discardTile:'7p',from:'shimocha',ownTurn:false});
assert.equal(minkan.ok,true,'minkan accepts another player discard plus three tiles');
assert.equal(minkan.meld.open,true,'minkan is open');
assert.equal(minkan.meld.from,'shimocha','minkan records the discard source');
assert.equal(validateKan({type:'minkan',concealedTiles:['7p','7p','7p'],discardTile:'7p',from:'self',ownTurn:false}).code,'invalid-source','minkan rejects an own discard source');
assert.equal(validateKan({type:'minkan',concealedTiles:['7p','7p'],discardTile:'7p',from:'kamicha',ownTurn:false}).code,'three-in-hand-required','minkan requires three copies in hand');
assert.equal(validateKan({type:'minkan',concealedTiles:['7p','7p','7p'],discardTile:'7p',from:'kamicha',ownTurn:true}).code,'response-turn-required','minkan requires a response to another player');

const kakan=validateKan({
  type:'kakan',
  concealedTiles:['2z','3m','4m'],
  openMelds:[{type:'pon',tiles:['2z','2z','2z'],open:true}],
  ownTurn:true,
  drawnTile:'2z'
});
assert.equal(kakan.ok,true,'kakan accepts a matching tile for an open pon');
assert.equal(kakan.meld.type,'kakan','kakan keeps its type');
assert.equal(validateKan({type:'kakan',concealedTiles:['2z'],openMelds:[],ownTurn:true}).code,'pon-upgrade-required','kakan requires an existing pon');

const sourceHand=[...ankanHand];
const appliedAnkan=applyKan({type:'ankan',concealedTiles:sourceHand,openMelds:[],ownTurn:true,kanCount:0});
assert.equal(appliedAnkan.ok,true,'applyKan applies a valid ankan');
assert.equal(appliedAnkan.concealedTiles.includes('7p'),false,'ankan consumes all four copies');
assert.equal(appliedAnkan.openMelds[0].type,'ankan','applied ankan is exposed as a kan meld');
assert.equal(appliedAnkan.pendingRinshan,true,'a kan requests a rinshan draw');
assert.equal(appliedAnkan.pendingDoraIndicator,true,'a kan requests an additional dora indicator');
assert.deepEqual(sourceHand,ankanHand,'applyKan does not mutate the input hand');

const kakanState=applyKan({
  type:'kakan',
  concealedTiles:['2z','3m'],
  openMelds:[{type:'pon',tiles:['2z','2z','2z'],open:true}],
  ownTurn:true,
  kanCount:1
});
assert.equal(kakanState.ok,true,'applyKan upgrades a pon');
assert.equal(kakanState.openMelds[0].type,'kakan','the pon is replaced by kakan');
assert.deepEqual(kakanState.openMelds[0].tiles,['2z','2z','2z','2z'],'the upgraded meld has four tiles');
assert.equal(kakanState.concealedTiles.includes('2z'),false,'kakan consumes the added tile');

const minkanState=applyKan({type:'minkan',concealedTiles:['7p','7p','7p','2m'],openMelds:[],discardTile:'7p',from:'toimen',ownTurn:false});
assert.deepEqual(minkanState.concealedTiles,['2m'],'minkan consumes three hand tiles');
assert.equal(minkanState.openMelds[0].from,'toimen','minkan keeps its source');

assert.equal(canDeclareKan({type:'ankan',concealedTiles:['1z','1z','1z','1z'],ownTurn:true,kanCount:MAX_KANS_PER_HAND}).code,'max-kans','the fourth-kan limit rejects a fifth kan');
assert.equal(validateKan({type:'not-a-kan',concealedTiles:[],ownTurn:true}).code,'invalid-type','unknown kan types are rejected');

console.log('✓ kan validation and application contracts validated.');
