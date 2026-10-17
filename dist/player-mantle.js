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
// Search the contacted wall as well as the camera heading. Narrow surfaces
// need support under the feet, not room for the entire body inside their top.
export function findMantle(world,p,shape={width:.32,depth:.32,height:1.9,yaw:0},lookYaw=0,lookPitch=0,locked=false,approach=null){
 if(!world.nearby||shape.height<.9||![lookYaw,lookPitch].every(Number.isFinite))return null;
 const directions=[],length=approach?Math.hypot(approach.x,approach.z):0;if(length>.5)directions.push({x:approach.x/length,z:approach.z/length,contact:true});
 directions.push({x:Math.sin(lookYaw),z:Math.cos(lookYaw),contact:false});let best=null,bestScore=Infinity;
 const candidates=world.nearby(p);
 for(const b of candidates){
  if(b.disabled||b.ramp||b.bounce||b.motionMargin||b.activatedAt!==undefined||Math.min(b.w,b.d)<.14)continue;
  const top=b.y+b.h/2,rise=top-p.y;if(rise<.08||rise>Math.min(2.35,shape.height+.35))continue;
  const c=Math.cos(b.rotation||0),s=Math.sin(b.rotation||0),dx=p.x-b.x,dz=p.z-b.z,q={x:c*dx-s*dz,z:s*dx+c*dz};
  const relative=(shape.yaw||0)-(b.rotation||0),rx=Math.abs(Math.cos(relative))*shape.width+Math.abs(Math.sin(relative))*shape.depth,rz=Math.abs(Math.sin(relative))*shape.width+Math.abs(Math.cos(relative))*shape.depth;
  // On a narrow wall the player may straddle both sides while their feet rest
  // on the centre. The final standing-body clearance is still checked below.
  const hx=b.w/2-Math.min(rx+.045,Math.max(.02,b.w/2-.045)),hz=b.d/2-Math.min(rz+.045,Math.max(.02,b.d/2-.045));
  for(const direction of directions){
   const ray={x:c*direction.x-s*direction.z,z:s*direction.x+c*direction.z},edge=interval(q,ray,b.w/2,b.d/2);if(!edge||edge.enter<-.06||edge.enter>1.05)continue;
   const elevation=Math.atan2(top-(p.y+shape.height*.88),Math.max(.15,edge.enter));
   if(!direction.contact&&edge.enter>.72&&Math.abs(elevation-lookPitch)>1.25)continue;
   const landing=interval(q,ray,hx,hz);if(!landing)continue;
   const distance=Math.max(0,landing.enter)+.015;if(distance>1.6||distance>landing.exit)continue;
   const target=new THREE.Vector3(p.x+direction.x*distance,top+.02,p.z+direction.z*distance),lift=new THREE.Vector3(p.x,target.y,p.z);
   if(!clear(world,target,shape,locked))continue;
   let retreat=null,route=segmentClear(world,p,lift,shape,locked)&&segmentClear(world,lift,target,shape,locked);
   // A roof cap may project beyond its wall. Back off beneath the lip before
   // lifting, instead of demanding a vertical path straight through the cap.
   if(!route)for(const back of [.14,.28,.42,.56]){
    const away=new THREE.Vector3(p.x-direction.x*back,p.y,p.z-direction.z*back),above=new THREE.Vector3(away.x,target.y,away.z);
    if(above.distanceTo(target)>1.65)continue;
    if(segmentClear(world,p,away,shape,locked)&&segmentClear(world,away,above,shape,locked)&&segmentClear(world,above,target,shape,locked)){retreat={x:away.x,y:away.y,z:away.z};route=true;break;}
   }
   if(!route)continue;const score=distance+(retreat?.12:0)+(direction.contact?0:.06);if(score>=bestScore)continue;
   best={x:target.x,y:target.y,z:target.z,...(retreat?{retreat}:null)};bestScore=score;
  }
 }
 return best;
}
export function startMantle(world,body,input){
 if(body.grounded||input.prone||!input.jump)return false;
 const shape=input.standingShape||input.shape,wall=body.combat?.parkourKind==='wallrun'?{x:-body.combat.wallNX,z:-body.combat.wallNZ}:null,target=findMantle(world,body.p,shape,input.lookYaw??shape?.yaw??0,input.lookPitch||0,input.lockedInArena,wall);if(!target)return false;
 const {retreat,...to}=target;
 body.mantle={from:{x:body.p.x,y:body.p.y,z:body.p.z},to,...(retreat?{retreat}:null),elapsed:0,duration:.42+(target.y-body.p.y)*.11+(retreat?.12:0)};body.vy=0;body.standingOn=null;return true;
}
export function stepMantle(world,body,input,dt){
 const m=body.mantle;if(!m)return false;
 const from=new THREE.Vector3(m.from.x,m.from.y,m.from.z),to=new THREE.Vector3(m.to.x,m.to.y,m.to.z),support=world.floorAt(to,to.y+.025);
 if(Math.abs(support.y-(to.y-.02))>.04){body.mantle=null;return false;}
 const elapsed=Math.min(m.duration,m.elapsed+dt),u=elapsed/m.duration,desired=from.clone();
 if(m.retreat){const away=new THREE.Vector3(m.retreat.x,m.retreat.y,m.retreat.z),above=new THREE.Vector3(away.x,to.y,away.z);if(u<.2)desired.lerpVectors(from,away,smooth(u/.2));else if(u<.7)desired.lerpVectors(away,above,smooth((u-.2)/.5));else desired.lerpVectors(above,to,smooth((u-.7)/.3));}
 else if(u<.64)desired.y=from.y+(to.y-from.y)*smooth(u/.64);
 else{desired.y=to.y;desired.x=from.x+(to.x-from.x)*smooth((u-.64)/.36);desired.z=from.z+(to.z-from.z)*smooth((u-.64)/.36);}
 if(!segmentClear(world,body.p,desired,input.standingShape||input.shape,input.lockedInArena)){body.mantle=null;return false;}
 body.p.copy(desired);m.elapsed=elapsed;body.vy=0;body.grounded=false;body.standingOn=null;
 if(elapsed>=m.duration){body.p.y=support.y;body.grounded=true;body.standingOn=support.body;body.mantle=null;}
 return true;
}
export function cloneMantle(m){return m?{from:{...m.from},to:{...m.to},...(m.retreat?{retreat:{...m.retreat}}:null),elapsed:m.elapsed,duration:m.duration}:null;}
