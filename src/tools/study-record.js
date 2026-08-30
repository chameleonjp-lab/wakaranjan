import {getLessonProgress} from '../lib/progress.js';
import {getProblemStudyRecord} from '../questions/problem-hub.js';
import {getActiveProfile} from '../lib/profile.js';
import {getCloudSyncStatus,resetActiveLearningState,retryActiveProfileCloudSync} from '../lib/cloud-sync.js';

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

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}

export function renderStudyRecord(app,ctx,{notice=''}={}){
  const profile=getActiveProfile();
  const sync=getCloudSyncStatus();
  const lessonProgress=getLessonProgress();
  const lessonDone=ctx.lessons.filter(item=>lessonProgress.completed.has(item.id)).length;
  const problem=getProblemStudyRecord(ctx.problemCatalog);
  const last=ctx.lessonById.get(lessonProgress.lastLesson);
  const lastHtml=last?'<p>最後に開いた教材：<a href="#'+last.id+'">'+last.title+'</a></p>':'<p>最後に開いた教材は、まだ記録されていません。</p>';
  const answerRate=problem.rate==null?'未回答':problem.rate+'%';
  app.innerHTML=[
    '<section class="lesson-head"><div class="eyebrow">記録</div><h1>学習記録</h1><p class="lead">'+escapeHtml(profile?.name||'この学習者')+'さんの教材の進み具合と、問題の正答状況を確認できます。名前を同期キーにしてSupabaseへ保存し、ゲームスコアとは別に管理します。</p><p class="sync-status" data-sync-state="'+escapeHtml(sync.state)+'" role="status" aria-live="polite">'+escapeHtml(sync.message)+'</p>'+(sync.state==='error'?'<div class="action-row"><button id="retry-cloud-sync" class="secondary" type="button">Supabase同期を再試行</button></div>':'')+'</section>',
    '<section class="record-grid">',
    '<article class="record-stat"><span>教材</span><strong>'+lessonDone+' / '+ctx.lessons.length+'章</strong><small>学習済み</small></article>',
    '<article class="record-stat"><span>問題</span><strong>'+problem.attempts+'回答</strong><small>正答率 '+answerRate+'</small></article>',
    '<article class="record-stat"><span>復習待ち</span><strong>'+problem.wrongCount+'問</strong><small>間違えた問題</small></article>',
    '</section>',
    '<section class="panel"><h2>教材の進み具合</h2><div class="record-level-grid">'+LEVELS.map(level=>levelCard(level,ctx.lessons.filter(item=>item.level===level[0]),lessonProgress)).join('')+'</div></section>',
    '<section class="panel"><h2>問題の記録</h2><p>正答率は、この名前で保存された回答をもとに表示しています。通信できない間の回答は端末内に保持し、復帰後に同期します。</p>'+problemSummary(problem)+'</section>',
    '<section class="panel"><h2>最近の状態</h2>'+lastHtml+'<div class="action-row"><a class="primary" href="#problems">問題を解く</a><a class="secondary" href="#menu">メニューへ戻る</a></div></section>',
    '<section class="callout"><strong>保存場所について</strong><br>名前と学習記録はSupabaseへ保存します。通信できないときは端末内の記録を使い、復帰後に保存を再試行します。ゲームスコアは別の仕組みで管理します。</section>',
    (notice?'<section class="callout" role="status">'+escapeHtml(notice)+'</section>':''),
    '<section class="panel"><h2>学習状況を解除</h2><p>教材の進捗、問題の正答記録、復習待ちの問題を、この名前についてまとめて初期状態へ戻します。同じ名前で使っている端末にも反映されます。</p><div class="action-row"><button id="clear-all-study-record" class="secondary" type="button">この名前の学習状況を解除</button></div></section>'
  ].join('');
  app.querySelector('#retry-cloud-sync')?.addEventListener('click',async event=>{
    const button=event.currentTarget;
    button.disabled=true;
    button.textContent='同期しています…';
    const result=await retryActiveProfileCloudSync();
    renderStudyRecord(app,ctx,{notice:result.ok?'Supabaseから学習記録を読み込みました。':'同期できませんでした。端末内の記録は保持しています。'});
  });
  app.querySelector('#clear-all-study-record')?.addEventListener('click',async event=>{
    if(!window.confirm('この名前の学習状況をSupabaseと端末から解除します。よろしいですか？'))return;
    const button=event.currentTarget;
    button.disabled=true;
    button.textContent='解除しています…';
    const result=await resetActiveLearningState();
    const message=result.ok?'学習状況を解除しました。': '端末では解除しましたが、Supabaseへの反映に失敗しました。通信が戻ったら再試行します。';
    renderStudyRecord(app,ctx,{notice:message});
  });
}
