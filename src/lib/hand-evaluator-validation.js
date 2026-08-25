import {evaluateClosedHand} from './hand-evaluator.js';

const hasYaku=(r,id)=>r.ok&&r.best.yaku.some(y=>y.id===id);

export function validateHandEvaluator(){
  const errors=[];
  const check=(condition,label,detail='')=>{if(!condition)errors.push({label,detail})};

  const riichiTanyao=evaluateClosedHand({
    tiles:['2m','3m','4m','3p','4p','5p','4s','5s','6s','6s','7s','8s','5m','5m'],
    winTile:'5m',win:'ron',riichi:true,dealer:false,seatWind:'2z',roundWind:'1z'
  });
  check(riichiTanyao.ok,'リーチタンヤオが成立する');
  check(riichiTanyao.best?.han===2&&riichiTanyao.best?.fu===40&&riichiTanyao.best?.score.total===2600,'リーチタンヤオの点数','期待: 2翻40符2600点');

  const pinfuTsumo=evaluateClosedHand({
    tiles:['1m','2m','3m','4m','5m','6m','2p','3p','4p','6s','7s','8s','5p','5p'],
    winTile:'4p',win:'tsumo',dealer:false,seatWind:'2z',roundWind:'1z'
  });
  check(pinfuTsumo.ok&&hasYaku(pinfuTsumo,'yaku-pinfu')&&hasYaku(pinfuTsumo,'yaku-menzen-tsumo'),'ピンフツモを判定する');
  check(pinfuTsumo.best?.fu===20&&pinfuTsumo.best?.score.payments.child===400&&pinfuTsumo.best?.score.payments.dealer===700,'ピンフツモの20符と支払','期待: 400/700');

  const chiitoi=evaluateClosedHand({
    tiles:['2m','2m','3m','3m','4p','4p','5p','5p','6s','6s','7s','7s','8s','8s'],
    winTile:'8s',win:'ron',riichi:true,dealer:false,seatWind:'2z',roundWind:'1z'
  });
  check(chiitoi.ok&&hasYaku(chiitoi,'yaku-chiitoitsu'),'七対子を判定する');
  check(chiitoi.best?.fu===25&&chiitoi.best?.score.total===6400,'七対子25符','期待: 4翻25符6400点');

  const yakuhai=evaluateClosedHand({
    tiles:['5z','5z','5z','2m','3m','4m','4p','5p','6p','6s','7s','8s','2m','2m'],
    winTile:'8s',win:'ron',dealer:false,seatWind:'2z',roundWind:'1z'
  });
  check(yakuhai.ok&&hasYaku(yakuhai,'yaku-haku'),'白の役牌を判定する');
  check(yakuhai.best?.han===1&&yakuhai.best?.fu===40&&yakuhai.best?.score.total===1300,'役牌の符と点数','期待: 1翻40符1300点');

  const multi=evaluateClosedHand({
    tiles:['1m','1m','2m','2m','3m','3m','4m','4m','5m','5m','6m','6m','7m','7m'],
    winTile:'6m',win:'ron',dealer:false,seatWind:'2z',roundWind:'1z'
  });
  check(multi.ok&&multi.alternatives.length>0,'複数分解を列挙する');
  check(hasYaku(multi,'yaku-ryanpeikou'),'二盃口を一盃口と重複させず判定する');

  const invalid=evaluateClosedHand({tiles:['1m','1m'],winTile:'1m'});
  check(!invalid.ok,'14枚未満を拒否する');

  return {ok:errors.length===0,errors};
}
