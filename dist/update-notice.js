import {compatibleSync} from './game-rules.js?v=20261011-free-cook74';
import {BUILD_ID} from './build-info.js?v=20261011-free-cook74';
export function startUpdateNotice({endpoint,version}){
  const notice=document.getElementById('updateNotice'),pageBuild=document.querySelector('meta[name="vrs-build"]')?.content||BUILD_ID;let serverBuild=null,busy=false;
  function show(){notice.hidden=false;}
  document.getElementById('reloadWorld').onclick=()=>{const url=new URL(location.href);url.searchParams.set('vrsReload',String(Date.now()));location.replace(url.href);};
  const serverURL=new URL(endpoint.replace(/^ws/,'http'));serverURL.pathname='/version';serverURL.search='';
  // These lightweight requests are the game's update notification feature;
  // they do not reload, interrupt movement, or run any game validation.
  async function refresh(){if(document.hidden||busy)return;busy=true;try{await Promise.allSettled([
    fetch(new URL('./release.json',import.meta.url),{cache:'no-store'}).then(response=>response.ok?response.json():null).then(release=>{if(release?.buildId&&release.buildId!==pageBuild)show();}),
    fetch(serverURL,{cache:'no-store'}).then(response=>response.ok?response.json():null).then(release=>{if(!release)return;if(release.version&&!compatibleSync(release))show();if(serverBuild!==null&&release.buildId!==serverBuild)show();serverBuild=release.buildId||null;})
  ]);}finally{busy=false;}}
  refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});return {show};
}
