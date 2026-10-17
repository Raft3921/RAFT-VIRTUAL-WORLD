import {compatibleSync} from './sync-protocol.js?v=20261017-hit115';
import {BUILD_ID,RELEASE_ID} from './build-info.js?v=20261017-hit115';
export function startUpdateNotice({endpoint,version}){
 const notice=document.getElementById('updateNotice');let busy=false,clientUpdate=false,incompatible=false,explicit=false;
 const draw=()=>{notice.hidden=!(explicit||clientUpdate||incompatible);};
 document.getElementById('reloadWorld').onclick=()=>{const url=new URL(location.href);url.searchParams.set('vrsReload',String(Date.now()));location.replace(url.href);};
 const serverURL=new URL(endpoint.replace(/^ws/,'http'));serverURL.pathname='/version';serverURL.search='';
 async function refresh(){if(document.hidden||busy)return;busy=true;try{
  await Promise.allSettled([
   fetch(new URL('./release.json',import.meta.url),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(release=>{if(!release)return;clientUpdate=release.releaseId?release.releaseId!==RELEASE_ID:!!release.buildId&&release.buildId!==BUILD_ID;}),
   fetch(serverURL,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(release=>{if(release)incompatible=!compatibleSync(release);})
  ]);draw();
 }finally{busy=false;}}
 refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});return {show(){explicit=true;draw();}};
}
