const OVERRIDES=new Map([
  ['q-yaku-007',{
    prompt:'鳴いていても成立し、4つの面子をすべて刻子または槓子で作る2翻役は？',
    explanation:'4面子すべてが刻子・槓子なら対々和です。門前で4組すべてが暗刻・暗槓なら、別に四暗刻の役満も検討します。'
  }],
  ['q-practical-003',{
    prompt:'場に見えている牌の枚数が同じと仮定します。4萬5萬と4萬6萬では、受け入れの種類が多いのは？',
    explanation:'残り枚数が同じなら、4萬5萬は3萬・6萬の2種類、4萬6萬は5萬の1種類です。実戦では見えている枚数によって実際の受け入れ枚数は変わります。'
  }]
]);

export function clarifyQuestion(question){
  const patch=OVERRIDES.get(question?.id);
  return patch?{...question,...patch}:question;
}

export function clarifyQuestions(items){return items.map(clarifyQuestion)}
export const clarifiedQuestionIds=new Set(OVERRIDES.keys());
