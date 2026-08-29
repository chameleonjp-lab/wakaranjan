import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const outputName=process.argv[2]||'_site';
const output=path.resolve(projectRoot,outputName);
const relativeOutput=path.relative(projectRoot,output);

if(!relativeOutput||relativeOutput.startsWith('..')||path.isAbsolute(relativeOutput)){
  throw new Error('Pagesの出力先はリポジトリ内に指定してください。');
}

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});

for(const entry of ['index.html','favicon.svg','styles.css','waits.css','scoring.css','lesson-quality.css','mobile-lesson-quality.css','interactive-problems.css','tile-faces.css','settings.css','print-materials.css','accessibility.css']){
  await cp(path.join(projectRoot,entry),path.join(output,entry));
}
await cp(path.join(projectRoot,'src'),path.join(output,'src'),{recursive:true});
await writeFile(path.join(output,'.nojekyll'),'');

console.log(`Prepared Pages site at ${relativeOutput}`);
