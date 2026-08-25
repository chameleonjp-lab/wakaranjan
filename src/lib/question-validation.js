export function validateQuestionSet(questionSet,{lessonIds=[],rulesetIds=[]}={}){
  const errors=[];
  const push=(condition,code,message)=>{if(!condition)errors.push({code,message})};

  push(questionSet?.schemaVersion===1,'question-schema','問題データの schemaVersion は 1 である必要があります。');
  push(typeof questionSet?.setId==='string'&&questionSet.setId.length>0,'question-set-id','setId がありません。');
  push(Array.isArray(questionSet?.questions),'question-array','questions が配列ではありません。');
  if(errors.length)return {ok:false,errors};

  const ids=new Set();
  const lessonSet=new Set(lessonIds);
  const rulesetSet=new Set(rulesetIds);
  if(rulesetIds.length) push(rulesetSet.has(questionSet.ruleset),'question-ruleset',`存在しないルールセットです: ${questionSet.ruleset}`);
  push(Number.isInteger(questionSet.sessionSize)&&questionSet.sessionSize>=1&&questionSet.sessionSize<=questionSet.questions.length,'question-session-size','sessionSize は1以上、問題総数以下である必要があります。');

  for(const q of questionSet.questions){
    push(!ids.has(q.id),'duplicate-question-id',`問題IDが重複しています: ${q.id}`);
    ids.add(q.id);
    push(typeof q.id==='string'&&q.id.startsWith('question-'),'question-id',`問題IDが不正です: ${q.id}`);
    push(typeof q.prompt==='string'&&q.prompt.trim().length>0,'question-prompt',`${q.id} の問題文がありません。`);
    push(Array.isArray(q.choices)&&q.choices.length>=2,'question-choices',`${q.id} の選択肢が不足しています。`);
    if(Array.isArray(q.choices)){
      const unique=new Set(q.choices);
      push(unique.size===q.choices.length,'duplicate-choice',`${q.id} に同じ選択肢があります。`);
      push(Number.isInteger(q.answerIndex)&&q.answerIndex>=0&&q.answerIndex<q.choices.length,'answer-index',`${q.id} の正解番号が範囲外です。`);
    }
    push(typeof q.explanation==='string'&&q.explanation.trim().length>0,'question-explanation',`${q.id} の解説がありません。`);
    if(lessonIds.length) push(lessonSet.has(q.lessonRef),'question-lesson-ref',`${q.id} の解説ページ参照が存在しません: ${q.lessonRef}`);
  }

  return {ok:errors.length===0,errors};
}
