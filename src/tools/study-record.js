import {getLessonProgress,clearLessonProgress} from '../lib/progress.js';
import {clearProblemStudyRecord,getProblemStudyRecord} from '../questions/problem-hub.js';

const LEVELS=[['intro','入門'],['beginner','初級'],['intermediate','中級'],['advanced','上級'],['special','特例・ルール差']];
const percent=(done,total)=>total?Math.round(done/total*100):0;
function levelCard(level,items,progress){
  const done=items.filter(item=>progress.completed.has(item.id)).length;
  const value=percent(done,items.length);
  return '<article class="record-card"><div class="record-card-heading"><h3>'+level[1]+'</h3><strong>'+done+' / '+items.length+'章</strong></div><div class="record-bar" role="progressbar" aria-label="'+level[1]+'の進み具合" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+value+'"><span style="width:'+value+'%"></span></div><p>'+value+'%完了</p></article>';
}
function problemSummary(record){
  if(!record.categorySummary.length)return '<p>問題の記録はまだありません。</p>';
  return '<div class="record-problem-list">'+record.categorySummary.map(item=>'<div><span>'+item.name+'</span><strong>'+(item.total?item.rate+'%（'+item.total+'回答）':'未回答')+'</strong></div>').join('')+'</div>';
}

export function renderStudyRecord(app,ctx){
  const lessonProgress=getLessonProgress();
  const lessonDone=ctx.lessons.filter(item=>lessonProgress.completed.has(item.id)).length;
  const problem=getProblemStudyRecord(ctx.problemCatalog);
  const last=ctx.lessonById.get(lessonProgress.lastLesson);
  const lastHtml=last?'<p>最後に開いた教材：<a href="#'+last.id+'">'+last.title+'</a></p>':'<p>最後に開いた教材は、まだ記録されていません。</p>';
  const answerRate=problem.rate==null?'未回答':problem.rate+'%';
  app.innerHTML=[
    '<section class="lesson-head"><div class="eyebrow">記録</div><h1>学習記録</h1><p class="lead">この端末に保存された教材の進み具合と、問題の正答状況を確認できます。アカウント登録や外部送信はありません。</p></section>',
    '<section class="record-grid">',
    '<article class="record-stat"><span>教材</span><strong>'+lessonDone+' / '+ctx.lessons.length+'章</strong><small>学習済み</small></article>',
    '<article class="record-stat"><span>問題</span><strong>'+problem.attempts+'回答</strong><small>正答率 '+answerRate+'</small></article>',
    '<article class="record-stat"><span>復習待ち</span><strong>'+problem.wrongCount+'問</strong><small>間違えた問題</small></article>',
    '</section>',
    '<section class="panel"><h2>教材の進み具合</h2><div class="record-level-grid">'+LEVELS.map(level=>levelCard(level,ctx.lessons.filter(item=>item.level===level[0]),lessonProgress)).join('')+'</div></section>',
    '<section class="panel"><h2>問題の記録</h2><p>正答率は、この端末で保存された回答をもとに表示しています。</p>'+problemSummary(problem)+'</section>',
    '<section class="panel"><h2>最近の状態</h2>'+lastHtml+'<div class="action-row"><a class="primary" href="#problems">問題を解く</a><a class="secondary" href="#menu">メニューへ戻る</a></div></section>',
    '<section class="callout"><strong>保存場所について</strong><br>学習記録はこの端末のブラウザ内に保存されます。ブラウザのデータを消去すると、記録も消えることがあります。</section>',
    '<section class="panel"><h2>記録を消す</h2><p>教材の進捗、問題の正答記録、復習待ちの問題をまとめて消します。</p><div class="action-row"><button id="clear-all-study-record" class="secondary" type="button">この端末の学習記録を消す</button></div></section>'
  ].join('');
  app.querySelector('#clear-all-study-record')?.addEventListener('click',()=>{if(window.confirm('この端末の学習記録をすべて消します。よろしいですか？')){clearLessonProgress();clearProblemStudyRecord();renderStudyRecord(app,ctx)}});
}
