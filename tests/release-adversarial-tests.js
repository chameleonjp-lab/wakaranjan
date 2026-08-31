import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';

const root=new URL('../',import.meta.url);
const readText=path=>readFileSync(new URL(path,root),'utf8');
const readJson=path=>JSON.parse(readText(path));
const walk=dir=>readdirSync(dir).flatMap(name=>{const p=join(dir,name);return statSync(p).isDirectory()?walk(p):[p]});
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`✓ ${name}`)};

const lessonData=readJson('src/data/lessons.json').lessons;
const scoringLessons=readJson('src/data/scoring-core.json').lessons;
const advanced=readJson('src/data/advanced-special.json').lessons;
const extra=readJson('src/data/curriculum-extra.json').lessons;
const lessonIds=new Set([...lessonData,...scoringLessons,...advanced,...extra].map(x=>x.id));
const fixedRoutes=new Set(['home','menu','learn','lookup','intro-review','beginner-review','intermediate-review','problems','automatic-calculator','dictionary','yaku-guide','rules','study-record','teacher-record','print-materials','settings','practice','full-round']);
const documentFragments=new Set(['app']);

function staticHashTargets(){
  const srcDir=new URL('src/',root).pathname;
  const files=[...walk(srcDir).filter(p=>p.endsWith('.js')),new URL('index.html',root).pathname];
  const found=new Set();
  for(const file of files){const text=readFileSync(file,'utf8');for(const m of text.matchAll(/href=["'`]#([a-z0-9-]+)(?:\?[^"'`]*)?["'`]/gi))found.add(m[1])}
  return found;
}

test('静的な内部リンクは実装済みルート・教材・ページ内アンカーへ到達する',()=>{
  const bad=[...staticHashTargets()].filter(id=>!fixedRoutes.has(id)&&!lessonIds.has(id)&&!documentFragments.has(id));
  assert.deepEqual(bad,[],`unresolved routes: ${bad.join(', ')}`);
});

test('主要公開ルートはapp.jsに実装されている',()=>{
  const app=readText('src/app.js');
  for(const route of fixedRoutes)assert.ok(app.includes(route),`missing route: ${route}`);
  assert.doesNotMatch(app,/href=["'`]#(?:todo|coming-soon|unavailable)/i);
});

test('公開時に必要なトップレベル資産が存在する',()=>{
  for(const path of ['index.html','favicon.svg','styles.css','accessibility.css','interactive-problems.css','settings.css','print-materials.css','ux-reorganization.css','src/app.js','src/lib/profile.js','src/lib/mahjong-ruby.js','src/lib/supabase-config.js','src/lib/cloud-sync.js','src/data/manifest.json','src/data/tiles.json','src/data/yaku.json','src/data/rules.json','scripts/prepare-pages.mjs','.github/actions/release-checks/action.yml','supabase/migrations/20260830090000_create_wakaranjan_learning_profiles.sql'])assert.ok(readText(path).length>20,path);
});

test('スキップリンクは画面遷移とページ内移動を分離する',()=>{
  const html=readText('index.html');const app=readText('src/app.js');
  assert.match(html,/class="skip-link" href="#app"/);
  assert.match(app,/preventDefault\(\)/);assert.match(app,/target\.focus\(\{preventScroll:true\}\)/);assert.match(app,/target\.scrollIntoView/);
  assert.match(app,/if\(!isKnownRoute\(id,ctx\)\)/);assert.match(app,/history\.replaceState\(null,'','#home'\)/);
});

test('エラー画面は通信失敗から再試行できる',()=>{
  const app=readText('src/app.js');assert.match(app,/教材を読み込めませんでした/);assert.match(app,/通信状態/);assert.match(app,/id="load-retry"/);assert.match(app,/もう一度読み込む/);
});

test('Pages公開前の検査は生成した同一ファイルを対象にする',()=>{
  const action=readText('.github/actions/release-checks/action.yml');const deploy=readText('.github/workflows/deploy-pages.yml');const e2e=readText('tests/e2e-smoke.js');
  assert.match(action,/npm run prepare:pages/);assert.match(action,/E2E_ROOT/);assert.match(action,/test:e2e:webkit/);assert.match(deploy,/release-checks/);assert.match(e2e,/process\.env\.E2E_ROOT/);
  assert.doesNotMatch(deploy,/rm -rf _site|cp -R src/,'検査後に別のPages成果物を作り直しています');
});

test('学習進捗の保存処理はnull・配列・型違いを正規化する',()=>{
  const src=readText('src/lib/progress.js');assert.match(src,/!value\|\|typeof value!=='object'/);assert.match(src,/Array\.isArray\(value\.completed\)/);assert.match(src,/typeof value\.lastLesson==='string'/);
});

test('名前別の学習記録と問題記録を分離する',()=>{
  const profile=readText('src/lib/profile.js');const app=readText('src/app.js');const problem=readText('src/questions/problem-hub.js');
  assert.match(app,/id="profile-form"/);assert.match(app,/activateProfile/);assert.match(profile,/wakaranjan-profiles-v1/);assert.match(profile,/profileStorageKey/);
  assert.match(problem,/profileStorageKey\(WRONG_KEY\)/);assert.match(problem,/profileStorageKey\(STATS_KEY\)/);
});

test('学習状態はゲームスコアと別のSupabase表へ名前で同期する',()=>{
  const config=readText('src/lib/supabase-config.js');const cloud=readText('src/lib/cloud-sync.js');const migration=readText('supabase/migrations/20260830090000_create_wakaranjan_learning_profiles.sql');
  assert.match(config,/SUPABASE_PUBLISHABLE_KEY/);assert.match(config,/sb_publishable_/);assert.doesNotMatch(config,/SUPABASE_PUBLISHABLE_KEY[^\n]*(service_role|secret)/i);
  assert.match(cloud,/SUPABASE_LEARNING_TABLE/);assert.match(cloud,/learning_state/);assert.match(cloud,/nameKey/);assert.match(cloud,/retryActiveProfileCloudSync/);assert.match(cloud,/resetActiveLearningState/);
  assert.match(migration,/create table if not exists public\.wakaranjan_learning_profiles/);assert.match(migration,/enable row level security/);assert.match(migration,/grant select, insert, update, delete/);assert.doesNotMatch(migration,/game_scores|score_runs/);
});

test('ルビと横スクロール不要の牌姿表示を実装する',()=>{
  const ruby=readText('src/lib/mahjong-ruby.js');const problem=readText('src/questions/problem-hub.js');const css=readText('ux-reorganization.css');
  assert.match(ruby,/createElement\('ruby'\)/);assert.match(ruby,/麻雀/);assert.match(ruby,/reading/);assert.match(problem,/no-scroll-hand/);assert.match(css,/grid-template-columns:repeat\(7/);assert.match(css,/overflow:visible/);
});

test('ページごとに共通の戻る・メニュー操作を取り付ける',()=>{
  const app=readText('src/app.js');assert.match(app,/className='page-toolbar'/);assert.match(app,/className='page-back'/);assert.match(app,/textContent='メニュー'/);assert.match(app,/routeHistory/);
});

console.log(`\n${passed} release adversarial tests passed.`);
