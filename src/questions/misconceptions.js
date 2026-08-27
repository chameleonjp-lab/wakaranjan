const MAP={
  'q-practical-004':['efficiency-only',null,'efficiency-only','efficiency-only'],
  'q-practical-006':['suji-safe',null,'suji-genbutsu','suji-kabe'],
  'q-practical-007':[null,'suji-kabe','wall-limited','wall-limited'],
  'q-practical-009':[null,'ranking-one-factor','ranking-one-factor','ranking-one-factor'],
  'q-practical-010':[null,'ranking-highest-score','ranking-fastest','ranking-defense-only'],
  'q-practical-011':[null,'push-one-factor','push-one-factor','push-one-factor'],
  'q-practical-012':[null,'decision-one-answer','decision-one-answer','decision-always-fold'],
  'q-rule-010':[null,'pao-missing-yakuman','pao-missing-yakuman','pao-missing-yakuman'],
  'q-rule-012':[null,'ruleset-single-check','ruleset-single-check','ruleset-single-check']
};

export const MISCONCEPTION_LABELS={
  'efficiency-only':'受け入れだけで打牌を決める',
  'suji-safe':'筋なら必ず安全だと思う',
  'suji-genbutsu':'筋と現物を同じだと思う',
  'suji-kabe':'筋と壁を混同する',
  'wall-limited':'壁で見る牌を限定しすぎる',
  'ranking-one-factor':'順位条件を1要素だけで考える',
  'ranking-highest-score':'オーラスで最高打点だけを見る',
  'ranking-fastest':'オーラスで速度だけを見る',
  'ranking-defense-only':'オーラスで守備だけを見る',
  'push-one-factor':'押し引きを1要素だけで決める',
  'decision-one-answer':'実戦判断に固定の唯一解があると思う',
  'decision-always-fold':'リーチには必ず降りると思う',
  'pao-missing-yakuman':'責任払いの対象役満を取り違える',
  'ruleset-single-check':'採用ルールを1項目だけ確認すればよいと思う'
};

export function misconceptionOf(question,choiceIndex){return MAP[question?.id]?.[choiceIndex]||null}
export function misconceptionKeysFor(question){return (MAP[question?.id]||[]).filter(Boolean)}
export const misconceptionQuestionIds=new Set(Object.keys(MAP));
