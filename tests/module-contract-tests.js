import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,extname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]).filter(p=>extname(p)==='.js')}
function exportsOf(text){const out=new Set();for(const m of text.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g))out.add(m[1]);for(const m of text.matchAll(/export\s*\{([^}]+)\}/g))for(const part of m[1].split(',')){const name=part.trim().split(/\s+as\s+/)[0];if(name)out.add(name)}return out}
let imports=0,modules=0;
for(const file of walk(join(root,'src'))){const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(syntax.status,0,`${file}: syntax error\n${syntax.stderr}`);modules++;const text=readFileSync(file,'utf8');for(const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)){const spec=m[2];if(!spec.startsWith('.'))continue;const target=resolve(dirname(file),spec);assert.equal(existsSync(target),true,`${file}: import target missing ${spec}`);const available=exportsOf(readFileSync(target,'utf8'));for(const part of m[1].split(',')){const source=part.trim().split(/\s+as\s+/)[0];if(!source)continue;assert.equal(available.has(source),true,`${file}: ${source} is not exported by ${target}`);imports++;}}}
const beginner=readFileSync(join(root,'src/lessons/beginner-core.js'),'utf8');const intermediate=readFileSync(join(root,'src/lessons/intermediate-scoring.js'),'utf8');const guided=readFileSync(join(root,'src/lessons/intro-06.js'),'utf8');
assert.match(beginner,/lesson-beginner-05','lesson-beginner-07'/,'初級6→7の導線が必要');
assert.match(intermediate,/lesson-beginner-07','lesson-intermediate-02'/,'中級1の前は初級7');
assert.match(intermediate,/lesson-intermediate-04','lesson-intermediate-06'/,'中級5→6の導線が必要');
assert.doesNotMatch(intermediate,/まだ牌姿から自動で役・符を判定する段階ではありません/,'廃止済み機能説明が残っている');
assert.match(guided,/import \{createTile\}/,'案内付き一局は共通牌部品createTileを使う');
assert.match(guided,/markLessonComplete\('lesson-intro-06'\)/,'案内付き一局完了時に進捗を保存する');
console.log(`✓ ${modules} modules, ${imports} named imports and course navigation contracts validated.`);
