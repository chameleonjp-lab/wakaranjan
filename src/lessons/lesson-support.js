export function attachLessonSupport(app,ctx,id){
  const q=ctx.lessonQualityById?.get(id);if(!q)return;
  const section=document.createElement('section');section.className='panel lesson-support';
  const terms=(q.termRefs||[]).map(termId=>ctx.termById.get(termId)).filter(Boolean);
  section.innerHTML=`<h2>この章でできるようになること</h2><p>${q.objective}</p><h3>考える順番</h3><ol class="explain-list">${(q.steps||[]).map(x=>`<li>${x}</li>`).join('')}</ol><h3>よくある間違い</h3><ul class="mistake-list">${(q.mistakes||[]).map(x=>`<li>${x}</li>`).join('')}</ul>${terms.length?`<h3>関連用語</h3><div class="term-links">${terms.map(t=>`<a class="secondary" href="#dictionary?term=${encodeURIComponent(t.id)}">${t.nameJa}<small>${t.readingJa}</small></a>`).join('')}</div>`:''}`;
  const progress=app.querySelector('.progress-panel');
  if(progress)app.insertBefore(section,progress);else app.append(section);
}
