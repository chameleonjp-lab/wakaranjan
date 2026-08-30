import {getLessonProgress} from '../lib/progress.js';
import {getProblemStudyRecord} from '../questions/problem-hub.js';
import {getSettings} from '../lib/settings.js';

const LEVELS=[['intro','入門'],['beginner','初級'],['intermediate','中級'],['advanced','上級'],['special','特例・ルール差']];

export function renderTeacherRecord(app,ctx){
  const lessons=getLessonProgress();
  const problems=getProblemStudyRecord(ctx.problemCatalog);
  const completed=ctx.lessons.filter(item=>lessons.completed.has(item.id)).length;
  const lastLesson=ctx.lessonById.get(lessons.lastLesson);
  const settings=getSettings();
  const lastPage=settings.lastRoute==='#home'?'ホーム':settings.lastRoute;
  app.innerHTML=`<section class="lesson-head"><div class="eyebrow">家庭・先生向け</div><h1>学習状況の確認</h1><p class="lead">この端末のブラウザに保存された記録を、学習者と一緒に確認するための画面です。外部へ送信したり、アカウントで共有したりはしません。</p></section>
  <section class="record-grid"><article class="record-stat"><span>教材</span><strong>${completed} / ${ctx.lessons.length}章</strong><small>学習済み</small></article><article class="record-stat"><span>問題</span><strong>${problems.attempts}回答</strong><small>正答率 ${problems.rate==null?'未回答':problems.rate+'%'}</small></article><article class="record-stat"><span>復習待ち</span><strong>${problems.wrongCount}問</strong><small>間違えた問題</small></article></section>
  <section class="panel"><h2>段階ごとの進み具合</h2><div class="record-level-grid">${LEVELS.map(([id,label])=>{const items=ctx.lessons.filter(item=>item.level===id);const done=items.filter(item=>lessons.completed.has(item.id)).length;const rate=items.length?Math.round(done/items.length*100):0;return `<article class="record-card"><div class="record-card-heading"><h3>${label}</h3><strong>${done} / ${items.length}章</strong></div><div class="record-bar" role="progressbar" aria-label="${label}の進み具合" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${rate}"><span style="width:${rate}%"></span></div><p>${rate}%完了</p></article>`}).join('')}</div></section>
  <section class="panel"><h2>最近の状態</h2><p>${lastLesson?`最後に開いた教材：<a href="#${lastLesson.id}">${lastLesson.title}</a>`:'最後に開いた教材はありません。'}</p><p>教材以外を含む最後のページ：${lastPage}</p><div class="action-row"><a class="primary" href="#study-record">詳しい学習記録</a><button id="print-teacher-record" class="secondary" type="button">この記録を印刷</button></div></section>
  <section class="callout"><strong>見守るときのポイント</strong><br>正答率だけでなく、間違えた問題を一緒に解き直し、教材の「学習済み」ボタンを押すタイミングを本人と確認してください。</section>
  <div class="lesson-nav"><a class="secondary" href="#print-materials">印刷用教材</a><a class="primary" href="#menu">メニューへ戻る</a></div>`;
  app.querySelector('#print-teacher-record').addEventListener('click',()=>window.print());
}
