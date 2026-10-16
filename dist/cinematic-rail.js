import * as THREE from 'three';
// Select a whole shot once. Never change sides while the shot is playing.
export function planCinematicRail(world,pose,fallback,{clearance=.38,minimumDistance=.65,maximumStep=.3}={}){
 const frames=Array.from({length:49},(_,i)=>pose(i/48));
 const clear=p=>world.cameraClear(p,clearance*.84);
 const connected=(a,b)=>world.cameraPosition(a,b,clearance).distanceTo(b)<.015;
 let best=null,score=-Infinity;
 for(const lift of [0,1.8,-.2])for(const offset of [0,.52,-.52,1.05,-1.05,Math.PI]){
  const points=frames.map(f=>{
   const wanted=f.target.clone().add(new THREE.Vector3(Math.sin(f.heading+offset)*f.distance,f.elevation+lift,Math.cos(f.heading+offset)*f.distance));
   return world.cameraPosition(f.target,wanted,clearance);
  });
  if(points.some((p,i)=>!clear(p)||p.distanceTo(frames[i].target)<minimumDistance||i&&!connected(points[i-1],p)))continue;
  // Tight corners can produce a discontinuous ray-clipped route. Reject it.
  if(points.some((p,i)=>i&&p.distanceTo(points[i-1])>maximumStep+frames[i].target.distanceTo(frames[i-1].target)*1.4))continue;
  const value=points.reduce((n,p,i)=>n+Math.min(6,p.distanceTo(frames[i].target)),0)/points.length-Math.abs(offset)*.45-Math.abs(lift)*.2;
  if(value>score){score=value;best=points;}
 }
 if(!best){
  // A fixed camera is preferable to a collision-avoidance jump in a narrow room.
  const candidates=[];
  for(const f of [frames[24],frames[0],frames[48]])for(let i=0;i<16;i++){
   const a=i*Math.PI/8,wanted=f.target.clone().add(new THREE.Vector3(Math.sin(a)*4,1.2,Math.cos(a)*4));
   const p=world.cameraPosition(f.target,wanted,clearance);if(clear(p)&&p.distanceTo(f.target)>minimumDistance)candidates.push(p);
  }
  let station=clear(fallback)?fallback.clone():null,value=-Infinity;
  for(const p of candidates){const visible=frames.reduce((n,f)=>n+(connected(f.target,p)?1:0),0),s=visible-p.distanceTo(frames[24].target)*.05;if(s>value){value=s;station=p;}}
  best=frames.map(()=>station?.clone()||fallback.clone());
 }
 return {sample(t,out){const f=Math.max(0,Math.min(1,t))*48,i=Math.min(47,Math.floor(f));return out.copy(best[i]).lerp(best[i+1],f-i);},points:best};
}
