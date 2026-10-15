import * as THREE from './vendor/three.module.js';
import {ARENA} from './world-layout.js';

const smooth=t=>t*t*(3-2*t);
function clear(world,p,shape={width:.32,depth:.32,height:1.9,yaw:0},locked){
 if(locked&&Math.hypot(p.x-ARENA.x,Math.max(0,p.y+shape.height/2-.24),p.z-ARENA.z)>ARENA.radius-.65)return false;
 return world.canStand(p,shape,-.003);
}
function segmentClear(world,a,b,shape,locked){
 const count=Math.max(1,Math.ceil(a.distanceTo(b)/.06)),p=new THREE.Vector3();
 for(let i=1;i<=count;i++){p.lerpVectors(a,b,i/count);if(!clear(world,p,shape,locked))return false;}return true;
}
function interval(origin,direction,hx,hz){
 let enter=-Infinity,exit=Infinity;
 for(const [p,d,h]of [[origin.x,direction.x,hx],[origin.z,direction.z,hz]]){
  if(h<=0)return null;
  if(Math.abs(d)<1e-8){if(Math.abs(p)>h)return null;continue;}
  const a=(-h-p)/d,b=(h-p)/d;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
 }return enter<=exit&&exit>=0?{enter,exit}:null;
}
// A reachable ledge must be in the view direction, have enough standing room,
// and admit the whole body along a lift-then-pull path. No client target is used.
export function findMantle(world,p,shape={width:.32,depth:.32,height:1.9,yaw:0},lookYaw=0,lookPitch=0,locked=false){
 if(!world.nearby||shape.height<.9||![lookYaw,lookPitch].every(Number.isFinite))return null;
 const direction={x:Math.sin(lookYaw),z:Math.cos(lookYaw)};let best=null,bestDistance=Infinity;
 for(const b of world.nearby(p)){
  if(b.disabled||b.ramp||b.bounce||b.motionMargin||b.activatedAt!==undefined)continue;
  const top=b.y+b.h/2,rise=top-p.y;if(rise<.22||rise>Math.min(2.15,shape.height+.25))continue;
  const c=Math.cos(b.rotation||0),s=Math.sin(b.rotation||0),dx=p.x-b.x,dz=p.z-b.z,q={x:c*dx-s*dz,z:s*dx+c*dz},ray={x:c*direction.x-s*direction.z,z:s*direction.x+c*direction.z};
  const edge=interval(q,ray,b.w/2,b.d/2);if(!edge||edge.enter<0||edge.enter>.95)continue;
  const elevation=Math.atan2(top-(p.y+shape.height*.88),Math.max(.15,edge.enter));if(Math.abs(elevation-lookPitch)>1.15)continue;
  const relative=(shape.yaw||0)-(b.rotation||0),rx=Math.abs(Math.cos(relative))*shape.width+Math.abs(Math.sin(relative))*shape.depth,rz=Math.abs(Math.sin(relative))*shape.width+Math.abs(Math.cos(relative))*shape.depth;
  const landing=interval(q,ray,b.w/2-rx-.045,b.d/2-rz-.045);if(!landing)continue;
  const distance=Math.max(0,landing.enter)+.015;if(distance>1.55||distance>landing.exit||distance>=bestDistance)continue;
  const target=new THREE.Vector3(p.x+direction.x*distance,top+.02,p.z+direction.z*distance),lift=new THREE.Vector3(p.x,target.y,p.z);
  if(!clear(world,target,shape,locked)||!segmentClear(world,p,lift,shape,locked)||!segmentClear(world,lift,target,shape,locked))continue;
  best={x:target.x,y:target.y,z:target.z};bestDistance=distance;
 }
 return best;
}
export function startMantle(world,body,input){
 if(body.grounded||input.prone||!input.jump)return false;
 const target=findMantle(world,body.p,input.shape,input.lookYaw??input.shape?.yaw??0,input.lookPitch||0,input.lockedInArena);if(!target)return false;
 body.mantle={from:{x:body.p.x,y:body.p.y,z:body.p.z},to:target,elapsed:0,duration:.42+(target.y-body.p.y)*.11};body.vy=0;body.standingOn=null;return true;
}
export function stepMantle(world,body,input,dt){
 const m=body.mantle;if(!m)return false;
 const from=new THREE.Vector3(m.from.x,m.from.y,m.from.z),to=new THREE.Vector3(m.to.x,m.to.y,m.to.z),support=world.floorAt(to,to.y+.025);
 if(Math.abs(support.y-(to.y-.02))>.04){body.mantle=null;return false;}
 const elapsed=Math.min(m.duration,m.elapsed+dt),u=elapsed/m.duration,desired=from.clone();
 if(u<.64)desired.y=from.y+(to.y-from.y)*smooth(u/.64);
 else{desired.y=to.y;desired.x=from.x+(to.x-from.x)*smooth((u-.64)/.36);desired.z=from.z+(to.z-from.z)*smooth((u-.64)/.36);}
 if(!segmentClear(world,body.p,desired,input.shape,input.lockedInArena)){body.mantle=null;return false;}
 body.p.copy(desired);m.elapsed=elapsed;body.vy=0;body.grounded=false;body.standingOn=null;
 if(elapsed>=m.duration){body.p.y=support.y;body.grounded=true;body.standingOn=support.body;body.mantle=null;}
 return true;
}
export function cloneMantle(m){return m?{from:{...m.from},to:{...m.to},elapsed:m.elapsed,duration:m.duration}:null;}
