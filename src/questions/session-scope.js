function statFor(stats,questionId){
  const item=stats?.questions?.[questionId];
  return item&&Number.isInteger(item.correct)&&Number.isInteger(item.wrong)?item:{correct:0,wrong:0};
}

function scopeScore(questions,stats,misconceptions,misconceptionKeysFor){
  let attempts=0;
  let wrong=0;
  let misconceptionsFound=0;
  for(const question of questions){
    const stat=statFor(stats,question.id);
    attempts+=stat.correct+stat.wrong;
    wrong+=stat.wrong;
    if(misconceptionKeysFor){
      for(const key of misconceptionKeysFor(question))misconceptionsFound+=Number(misconceptions?.[key]||0);
    }
  }
  // Keep the priority understandable: repeated mistakes come first, then
  // repeated misconception records, then the error rate within the scope.
  return wrong*2+misconceptionsFound*1.2+(attempts?wrong/attempts:0);
}

export function questionScope(question){return question?.topic||question?.category||''}

export function selectWeakestScope(questions,{stats={},misconceptions={},order=[],misconceptionKeysFor}={}){
  const groups=new Map();
  for(const question of questions||[]){
    const scope=questionScope(question);
    if(!scope)continue;
    const group=groups.get(scope)||[];
    group.push(question);
    groups.set(scope,group);
  }
  const rank=scope=>{const index=order.indexOf(scope);return index<0?Number.MAX_SAFE_INTEGER:index};
  return [...groups.entries()].sort(([left,leftQuestions],[right,rightQuestions])=>{
    const scoreDifference=scopeScore(rightQuestions,stats,misconceptions,misconceptionKeysFor)-scopeScore(leftQuestions,stats,misconceptions,misconceptionKeysFor);
    if(scoreDifference)return scoreDifference;
    const rankDifference=rank(left)-rank(right);
    if(rankDifference)return rankDifference;
    return left.localeCompare(right,'ja');
  })[0]?.[0]||null;
}

export function filterByScope(questions,scope){return (questions||[]).filter(question=>questionScope(question)===scope)}
