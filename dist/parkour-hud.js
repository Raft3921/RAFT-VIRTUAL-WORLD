import {findMantle} from './player-mantle.js?v=20261017-parkour126';
import {findParkourWall} from './player-parkour.js?v=20261017-wallfloor128';
export function createParkourHud(get){
 const node=document.createElement('div');node.id='parkourHint';node.hidden=true;node.innerHTML='<span></span><i><b></b></i>';document.body.append(node);
 const label=node.querySelector('span'),track=node.querySelector('i'),fill=node.querySelector('b');let queryAt=0,available='',last='';
 return {update(blocked=false){const s=get();if(blocked||!s.inStudio||s.paused||s.ragdoll||s.seated||s.prone||!s.world||!s.player||!s.world.gunZone){node.hidden=true;return;}
  const q=s.world.gunZone,p=s.player.position;if(p.x<=q.minX||p.x>=q.maxX||p.z<=q.minZ||p.z>=q.maxZ){node.hidden=true;return;}
  let text='',progress=null;
  if(s.mantling){text='縁をつかんで、体を引き上げる';progress=s.mantleProgress||0;}
  else if(s.parkourKind){text={wallrun:'壁を足場に走る · ジャンプで次の壁へ',wallkick:'壁蹴り',backflip:'バク宙',sideflip:'横宙返り'}[s.parkourKind]||'';progress=(s.parkourAge||0)/Math.max(.01,s.parkourDuration||1);}
  else if(!s.grounded&&s.now>=queryAt){queryAt=s.now+120;const shape={...(s.avatar?.collisionShape||{width:.32,depth:.32,height:1.9}),yaw:s.yaw};available=findMantle(s.world,p,shape,s.yaw,s.pitch)?'ジャンプ：縁をつかんでよじ登る':findParkourWall(s.world,p,shape,s.yaw)?'ジャンプ：壁蹴り / ダッシュ：足で壁を走る':'';text=available;}
  else if(!s.grounded)text=available;else available='';
  node.hidden=!text;if(text!==last){label.textContent=text;last=text;}track.hidden=progress===null;if(progress!==null)fill.style.transform='scaleX('+Math.max(0,Math.min(1,progress))+')';
 },hide(){node.hidden=true;available='';}};
}
