import {createHandFlow,discardTile,passDiscard,HAND_PHASES} from '../lib/hand-flow.js';

const FIXED_WALL_OPTIONS={random:()=>0.5};

const CALL_HANDS={
  east:['1m','1m','1m','1m','2m','3m','4m','6m','7m','8m','9m','1p','2p','5m'],
  south:['5m','5m','5m','3p','4p','5p','6p','1s','2s','3s','4s','5s','6s'],
  west:['7s','8s','9s','1z','2z','3z','4z','5z','6z','7z','2m','3m','4m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};

const RIICHI_HANDS={
  east:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','1z'],
  south:['3p','4p','5p','6p','9p','1s','2s','3s','4s','5s','6s','7s','8s'],
  west:['7s','8s','9s','1z','2z','3z','4z','5z','6z','7z','2m','3m','4m'],
  north:['1p','2p','4p','5p','7p','9p','1s','2s','3s','4s','5s','6s','7s']
};

function moveLiveTile(state,code,position){
  const index=state.roundWall.live.findIndex(tile=>tile.code===code);
  if(index<0)throw new RangeError('scenario tile is not available in the live wall: '+code);
  const live=[...state.roundWall.live];
  const [tile]=live.splice(index,1);
  live.splice(Math.min(position,live.length),0,tile);
  return {...state,roundWall:{...state.roundWall,live}};
}

function prepareDrawScenario(state){
  const discarded=discardTile(state,{seat:state.currentSeat,tileId:state.drawnTileId});
  const passed=passDiscard(discarded);
  return {...passed,roundWall:{...passed.roundWall,live:[]}};
}

export const HAND_FLOW_SCENARIOS=Object.freeze({
  random:Object.freeze({
    label:'通常練習',
    description:'ランダムな配牌から、ツモ・捨て牌・応答・流局まで進めます。',
    hint:'自分の手番では牌をタップし、他家の手番では自動進行ボタンを押します。',
    deterministicWall:false
  }),
  call:Object.freeze({
    label:'鳴き確認',
    description:'親が五萬を捨てると、南家が大明槓する場面から始めます。',
    hint:'親の最後の牌（5m）を捨ててから、「他家の応答を進める」を押してください。',
    deterministicWall:true,
    initialHands:CALL_HANDS
  }),
  riichi:Object.freeze({
    label:'リーチ確認',
    description:'親の14枚目を捨ててリーチし、応答後に五萬をツモする場面です。',
    hint:'親の最後の牌を捨て、「リーチを確認」→「他家の応答を進める」を4回行います。',
    deterministicWall:true,
    initialHands:RIICHI_HANDS,
    prepare:state=>moveLiveTile(state,'5m',1)
  }),
  draw:Object.freeze({
    label:'流局確認',
    description:'捨て牌への応答を見送った直後、通常の牌山が尽きた場面です。',
    hint:'「他家のツモ・捨て牌を進める」→「流局として完了」の2操作で確認できます。',
    deterministicWall:true,
    prepare:prepareDrawScenario
  })
});

export function createHandFlowScenario(id='random',options={}){
  const scenario=HAND_FLOW_SCENARIOS[id]||HAND_FLOW_SCENARIOS.random;
  const {tileCodes,redFives,wallOptions={},...flowOptions}=options;
  const resolvedWallOptions={...wallOptions};
  if(scenario.deterministicWall&&typeof resolvedWallOptions.random!=='function')resolvedWallOptions.random=FIXED_WALL_OPTIONS.random;
  if(tileCodes)resolvedWallOptions.tileCodes=tileCodes;
  if(redFives)resolvedWallOptions.redFives=redFives;
  let state=createHandFlow({
    ...flowOptions,
    wallOptions:resolvedWallOptions,
    initialHands:scenario.initialHands||null
  });
  if(scenario.prepare)state=scenario.prepare(state);
  return state;
}

export function isHandFlowScenarioPhase(state,phase){
  return state?.phase===HAND_PHASES[phase];
}
