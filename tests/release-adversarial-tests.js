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
const fixedRoutes=new Set(['home','intro-review','beginner-review','intermediate-review','problems','automatic-calculator','dictionary','yaku-guide','rules','study-record','teacher-record','print-materials','settings','practice','full-round']);
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
  for(const path of ['index.html','styles.css','accessibility.css','interactive-problems.css','settings.css','print-materials.css','src/app.js','src/data/tiles.json','src/data/yaku.json','src/data/rules.json'])assert.ok(readText(path).length>20,path);
});

test('エラー画面は再読み込み手段を利用者へ伝える',()=>{
  const app=readText('src/app.js');assert.match(app,/教材を読み込めませんでした/);assert.match(app,/再読み込み/);
});

test('学習進捗の保存処理はnull・配列・型違いを正規化する',()=>{
  const src=readText('src/lib/progress.js');assert.match(src,/!value\|\|typeof value!=='object'/);assert.match(src,/Array\.isArray\(value\.completed\)/);assert.match(src,/typeof value\.lastLesson==='string'/);
});

console.log(`\n${passed} release adversarial tests passed.`);
