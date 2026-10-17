#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const argv=process.argv.slice(2),options={resume:false,message:null};
for(let i=0;i<argv.length;i++){
  if(argv[i]==='--resume')options.resume=true;
  else if(argv[i]==='--message'&&argv[i+1])options.message=argv[++i];
  else if(argv[i]==='--help'){
    console.log('使い方: ./publish.command [--message "変更内容"] [--resume]\n通常: 公開番号更新 → 全変更をコミット → push → Worker 公開 → Pages 配信待ち\n--resume: 未変更の現在のコミットを再公開（新しい番号・コミットを作らない）');process.exit(0);
  }else{console.error('不明な引数です。--help を参照してください。');process.exit(1);}
}
const stateDir=path.join(root,'.publish'),lock=path.join(stateDir,'publish.lock');
let receipt={startedAt:new Date().toISOString(),status:'running',stage:'準備'},locked=false;
const log=message=>console.log(`\n${message}`);
function save(){fs.mkdirSync(stateDir,{recursive:true});const target=path.join(stateDir,'last-attempt.json');fs.writeFileSync(target+'.tmp',JSON.stringify(receipt,null,2)+'\n');fs.renameSync(target+'.tmp',target);}
function stage(name){receipt.stage=name;save();log(`▶ ${name}`);}
function git(args){const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw new Error(`git ${args[0]} に失敗しました。${(result.stderr||'').trim()}`);return result.stdout.trim();}
function run(command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd:root,stdio:'inherit',env:process.env});child.on('error',reject);child.on('exit',(code,signal)=>code===0?resolve():reject(new Error(`${path.basename(command)} が失敗しました (${signal||code})。`)));});}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function stampParts(){const values=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return {date:`${values.year}-${values.month}-${values.day}`,compact:`${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`};}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function stampRelease(){
  const {date,compact}=stampParts(),releaseId=`vrs-publish-${compact}`,version=`${date}-vrs-publish-${compact.slice(9)}`;
  fs.writeFileSync('dist/build-info.js',`export const BUILD_ID='${releaseId}';\nexport const RELEASE_ID='${releaseId}';\n`);
  fs.writeFileSync('dist/release.json',JSON.stringify({buildId:releaseId,releaseId})+'\n');
  const protocolFile='dist/sync-protocol.js',protocol=fs.readFileSync(protocolFile,'utf8');
  if(!/export const SYNC_VERSION\s*=\s*['"][^'"]+['"]/.test(protocol))throw new Error('SYNC_VERSION の形式を読み取れません。');
  fs.writeFileSync(protocolFile,protocol.replace(/(export const SYNC_VERSION\s*=\s*)['"][^'"]+['"]/,`$1'${version}'`));
  const files=walk(path.join(root,'dist')),changes=new Set([
    ...git(['diff','HEAD','--name-only','-z','--','dist']).split('\0'),
    ...git(['ls-files','--others','--exclude-standard','-z','--','dist']).split('\0')
  ].filter(Boolean).map(p=>path.resolve(root,p)));
  changes.add(path.resolve('dist/build-info.js'));changes.add(path.resolve(protocolFile));
  // Include changed direct imports and every importing module in the same cache generation.
  let again=true;
  while(again){again=false;for(const file of files.filter(f=>/\.[cm]?js$/.test(f))){const before=fs.readFileSync(file,'utf8'),after=before.replace(/(['"])(\.\.?\/[^'"\s?#]+)(?:\?v=[^'"\s]+)?\1/g,(full,quote,url)=>changes.has(path.resolve(path.dirname(file),url))?`${quote}${url}?v=${compact}${quote}`:full);if(after!==before){fs.writeFileSync(file,after);if(!changes.has(file)){changes.add(file);again=true;}}}}
  for(const file of files.filter(f=>f.endsWith('.html'))){const before=fs.readFileSync(file,'utf8');let after=before.replace(/((?:src|href)=["'])([^"'?#]+)(?:\?v=[^"']+)?(["'])/g,(full,start,url,end)=>changes.has(path.resolve(path.dirname(file),url))?`${start}${url}?v=${compact}${end}`:full);if(path.resolve(file)===path.resolve('dist/index.html'))after=after.replace(/(name="vrs-build" content=")[^"]+"/,`$1${releaseId}"`);if(after!==before)fs.writeFileSync(file,after);}
  return {releaseId,version};
}
function releaseState(){const data=JSON.parse(fs.readFileSync('dist/release.json','utf8')),protocol=fs.readFileSync('dist/sync-protocol.js','utf8'),version=protocol.match(/SYNC_VERSION\s*=\s*['"]([^'"]+)/)?.[1],wire=Number(protocol.match(/SYNC_PROTOCOL\s*=\s*(\d+)/)?.[1]);if(!data.releaseId||!version||!wire)throw new Error('公開情報を読み取れません。');return {releaseId:data.releaseId,version,protocol:wire};}
async function json(url,github=false){const headers={'User-Agent':'RAFT-VIRTUAL-WORLD-publish','Cache-Control':'no-cache'};if(github){headers.Accept='application/vnd.github+json';const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;if(token)headers.Authorization=`Bearer ${token}`;}const result=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});if(!result.ok)throw new Error(`公開情報の取得: HTTP ${result.status}`);return result.json();}
async function waitWorker(){const deadline=Date.now()+120000;while(Date.now()<deadline){try{const info=await json(`${receipt.workerUrl}/version?publish=${Date.now()}`);if(info.buildId===receipt.revision&&info.version===receipt.version&&info.protocol===receipt.protocol){receipt.worker=info;save();return;}}catch{}await sleep(3000);}throw new Error('Worker の公開番号が一致しませんでした。--resume で再開できます。');}
async function waitPages(){
  const deadline=Date.now()+15*60*1000;let last='',lastError='';
  while(Date.now()<deadline){
    try{
      const data=await json('https://api.github.com/repos/Raft3921/RAFT-VIRTUAL-WORLD/actions/runs?per_page=30',true);
      const names=new Set(['Publish GitHub Pages','pages build and deployment']),runs=data.workflow_runs.filter(r=>r.head_sha===receipt.commit&&names.has(r.name));
      // Ignore older retries; only the newest run of each workflow is relevant.
      const newest=[...new Map(runs.slice().reverse().map(r=>[r.name,r])).values()];
      const report=newest.map(r=>`${r.name}: ${r.status}/${r.conclusion||'待機'}`).join('\n');if(report&&report!==last){console.log(report);last=report;}
      const failed=newest.find(r=>r.status==='completed'&&r.conclusion!=='success');if(failed)throw Object.assign(new Error(`Pages が ${failed.conclusion} になりました: ${failed.html_url}`),{fatal:true});
      const primary=newest.find(r=>r.name==='Publish GitHub Pages');
      if(primary?.status==='completed'&&primary.conclusion==='success'&&newest.every(r=>r.status==='completed'&&r.conclusion==='success')){receipt.pagesRuns=newest.map(({name,id,html_url,conclusion})=>({name,id,url:html_url,conclusion}));save();return;}
    }catch(error){if(error.fatal)throw error;lastError=error.message;}
    await sleep(15000);
  }
  throw new Error(`Pages の配信待ちが時間切れになりました。${lastError} --resume で再開できます。`);
}
async function waitPublic(){
  const deadline=Date.now()+180000,base='https://raft3921.github.io/RAFT-VIRTUAL-WORLD';
  while(Date.now()<deadline){for(const suffix of ['/dist/release.json','/release.json']){try{const info=await json(`${base}${suffix}?publish=${receipt.releaseId}&at=${Date.now()}`);if(info.releaseId===receipt.releaseId){receipt.publicRelease=info;receipt.metadataUrl=base+suffix;receipt.gameUrl=`${base}/dist/?vrsReload=${receipt.releaseId}`;save();return;}}catch{}}await sleep(5000);}
  throw new Error('公開ページの番号がまだ一致しません。配信反映後、--resume で再開できます。');
}
async function main(){
  if(Number(process.versions.node.split('.')[0])<20)throw new Error('Node.js 20 以上が必要です。');
  fs.mkdirSync(stateDir,{recursive:true});
  if(fs.existsSync(lock)){let alive=false;try{const pid=Number(fs.readFileSync(path.join(lock,'pid'),'utf8'));if(pid>0){try{process.kill(pid,0);alive=true;}catch(error){if(error.code==='EPERM')alive=true;}}}catch{}if(alive)throw new Error('別の公開処理が動いています。そちらの完了を待ってください。');fs.rmSync(lock,{recursive:true,force:true});}
  fs.mkdirSync(lock);locked=true;fs.writeFileSync(path.join(lock,'pid'),String(process.pid));
  stage('プロジェクト・Git を確認');
  if(git(['rev-parse','--show-toplevel'])!==root)throw new Error('プロジェクトの Git ルートが一致しません。');
  if(git(['branch','--show-current'])!=='main')throw new Error('main ブランチで実行してください。ブランチは自動変更しません。');
  const remote=git(['remote','get-url','--push','origin']);if(!/^(https:\/\/github\.com\/|git@github\.com:)Raft3921\/RAFT-VIRTUAL-WORLD(?:\.git)?\/?$/.test(remote))throw new Error('origin の公開先が RAFT-VIRTUAL-WORLD と一致しません。');
  if(git(['diff','--name-only','--diff-filter=U']))throw new Error('未解決の Git 競合があります。');
  await run('git',['fetch','origin','main']);git(['merge-base','--is-ancestor','origin/main','HEAD']);
  if(options.resume&&git(['status','--porcelain']))throw new Error('--resume は変更のない作業ツリーで実行してください。変更も公開する場合は通常実行してください。');
  const manifest=JSON.parse(fs.readFileSync('package.json','utf8')),wrangler=path.join(root,'node_modules/wrangler/bin/wrangler.js');let installed='';try{installed=JSON.parse(fs.readFileSync('node_modules/wrangler/package.json','utf8')).version;}catch{}
  if(!fs.existsSync(wrangler)||installed!==manifest.devDependencies?.wrangler||!fs.existsSync('node_modules/ws')){stage('公開ツールをインストール');await run('npm',['ci']);}
  if(!options.resume){stage('公開番号・読み込みキャッシュを更新');stampRelease();stage('すべてのプロジェクト変更をコミット');await run('git',['add','--all']);await run('git',['commit','-m',options.message||`Publish RAFT World ${stampParts().compact}`]);}
  Object.assign(receipt,releaseState(),{commit:git(['rev-parse','HEAD']),workerUrl:'https://raft-studio-room-sync.minecraft-studio.workers.dev'});receipt.revision=`${receipt.commit.slice(0,12)}-${receipt.releaseId}`;save();
  stage('GitHub に送信');await run('git',['push','origin','main']);
  stage('Cloudflare Worker を公開');await run(process.execPath,[wrangler,'deploy','--config','worker/wrangler.jsonc','--var',`DEPLOYMENT_REVISION:${receipt.revision}`]);
  stage('Worker の公開番号を確認');await waitWorker();
  stage('GitHub Pages の配信完了を待機');await waitPages();
  stage('公開ページの番号を確認');await waitPublic();
  receipt.status='success';receipt.stage='完了';receipt.finishedAt=new Date().toISOString();save();fs.writeFileSync(path.join(stateDir,'last-success.json'),JSON.stringify(receipt,null,2)+'\n');
  log(`公開完了\nコミット: ${receipt.commit}\n公開番号: ${receipt.releaseId}\nゲーム: ${receipt.gameUrl}\n記録: .publish/last-success.json\n参加者全員で再読み込みしてください。ゲームの動作検証は実行していません。`);
}
try{await main();}catch(error){receipt.status='failed';receipt.error=error.message;receipt.finishedAt=new Date().toISOString();if(locked)save();console.error(`\n公開は完了していません: ${error.message}\n失敗段階: ${receipt.stage}\n記録: .publish/last-attempt.json\n原因を直して通常実行、または変更のない現在のコミットを --resume で再公開してください。`);process.exitCode=1;}finally{if(locked)fs.rmSync(lock,{recursive:true,force:true});}
