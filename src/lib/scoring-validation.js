import {calculateScore} from './score.js';

export function validateScoringReference(){
  const errors=[];
  const cases=[
    [{han:3,fu:30,dealer:false,win:'ron'},3900,'子30符3翻ロン'],
    [{han:3,fu:30,dealer:true,win:'ron'},5800,'親30符3翻ロン'],
    [{han:3,fu:40,dealer:false,win:'ron'},5200,'子40符3翻ロン'],
    [{han:4,fu:30,dealer:false,win:'ron'},8000,'子30符4翻切り上げ満貫'],
    [{han:3,fu:60,dealer:false,win:'ron'},8000,'子60符3翻切り上げ満貫'],
    [{han:5,fu:30,dealer:false,win:'ron'},8000,'子満貫ロン'],
    [{han:5,fu:30,dealer:true,win:'ron'},12000,'親満貫ロン'],
    [{han:6,fu:30,dealer:false,win:'ron'},12000,'子跳満ロン'],
    [{han:8,fu:30,dealer:false,win:'ron'},16000,'子倍満ロン'],
    [{han:11,fu:30,dealer:false,win:'ron'},24000,'子三倍満ロン'],
    [{han:13,fu:30,dealer:false,win:'ron'},32000,'子役満ロン']
  ];
  for(const [input,expected,label] of cases){const actual=calculateScore(input).total;if(actual!==expected)errors.push({label,expected,actual})}
  const tsumo=calculateScore({han:3,fu:30,dealer:false,win:'tsumo'});
  if(tsumo.payments.child!==1000||tsumo.payments.dealer!==2000)errors.push({label:'子30符3翻ツモ',expected:'1000/2000',actual:`${tsumo.payments.child}/${tsumo.payments.dealer}`});
  const dealerTsumo=calculateScore({han:3,fu:30,dealer:true,win:'tsumo'});
  if(dealerTsumo.payments.each!==2000)errors.push({label:'親30符3翻ツモ',expected:'2000オール',actual:`${dealerTsumo.payments.each}オール`});
  return {ok:errors.length===0,errors};
}
