const ceil100=n=>Math.ceil(n/100)*100;

export function limitName(han,fu,{kiriageMangan=true,yakuman=0}={}){
  if(yakuman>0)return yakuman===1?'役満':`${yakuman}倍役満`;
  if(han>=11)return '三倍満';
  if(han>=8)return '倍満';
  if(han>=6)return '跳満';
  if(han>=5)return '満貫';
  if(kiriageMangan&&((han===4&&fu===30)||(han===3&&fu===60)))return '満貫';
  if(han===4&&fu>=40)return '満貫';
  if(han===3&&fu>=70)return '満貫';
  return null;
}

export function basePoints(han,fu,options={}){
  if(options.yakuman>0)return 8000*options.yakuman;
  const limit=limitName(han,fu,options);
  if(limit==='三倍満')return 6000;
  if(limit==='倍満')return 4000;
  if(limit==='跳満')return 3000;
  if(limit==='満貫')return 2000;
  return fu*(2**(han+2));
}

export function calculateScore({han,fu,dealer=false,win='ron',kiriageMangan=true,yakuman=0}){
  if(!Number.isInteger(han)||han<0||(!yakuman&&han<1))throw new Error('han must be a non-negative integer and at least 1 without yakuman');
  if(!Number.isInteger(fu)||fu<20)throw new Error('fu must be an integer of at least 20');
  if(!Number.isInteger(yakuman)||yakuman<0)throw new Error('yakuman must be a non-negative integer');
  if(!['ron','tsumo'].includes(win))throw new Error('win must be ron or tsumo');
  const options={kiriageMangan,yakuman};
  const base=basePoints(han,fu,options);
  const limit=limitName(han,fu,options);
  if(win==='ron'){
    const total=ceil100(base*(dealer?6:4));
    return {han,fu,dealer,win,limit,yakuman,total,payments:{discarder:total}};
  }
  if(dealer){
    const each=ceil100(base*2);
    return {han,fu,dealer,win,limit,yakuman,total:each*3,payments:{each}};
  }
  const child=ceil100(base);
  const dealerPay=ceil100(base*2);
  return {han,fu,dealer,win,limit,yakuman,total:child*2+dealerPay,payments:{child,dealer:dealerPay}};
}

export function formatPayment(result){
  if(result.win==='ron')return `${result.total.toLocaleString('ja-JP')}点`;
  if(result.dealer)return `${result.payments.each.toLocaleString('ja-JP')}点オール`;
  return `${result.payments.child.toLocaleString('ja-JP')} / ${result.payments.dealer.toLocaleString('ja-JP')}点`;
}
