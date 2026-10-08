import {ARENA} from './world-layout.js';
import {HOUSES,ROOM,FURNITURE_BY_ID,furniturePose} from './housing-data.js';
export const BROWN_PROJECTILE={speed:15,up:1.2,gravity:2,radius:.19,life:1.5,damage:2};
export function projectileAt(p,now){const t=Math.max(0,Math.min(BROWN_PROJECTILE.life,(now-p.born)/1000));return {x:p.x+p.vx*t,y:p.y+p.vy*t-BROWN_PROJECTILE.gravity*t*t/2,z:p.z+p.vz*t};}
export function segmentBox(a,b,box,radius=0){
  const yaw=box.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
  const local=p=>{const x=p.x-box.x,z=p.z-box.z;return [c*x-s*z,p.y-box.y,s*x+c*z];};
  const start=local(a),end=local(b),half=[box.w/2+radius,box.h/2+radius,box.d/2+radius];let enter=0,leave=1;
  for(let axis=0;axis<3;axis++){const delta=end[axis]-start[axis];if(Math.abs(delta)<1e-8){if(Math.abs(start[axis])>half[axis])return null;continue;}let lo=(-half[axis]-start[axis])/delta,hi=(half[axis]-start[axis])/delta;if(lo>hi)[lo,hi]=[hi,lo];enter=Math.max(enter,lo);leave=Math.min(leave,hi);if(enter>leave)return null;}
  return enter>=0&&enter<=1?enter:null;
}
const STUDIO=[{x:-10.9,y:3.5,z:0,w:.3,h:7,d:18},{x:10.9,y:3.5,z:0,w:.3,h:7,d:18},{x:0,y:3.5,z:-8.9,w:22,h:7,d:.3},{x:-7.5,y:3.5,z:8.9,w:7,h:7,d:.3},{x:7.5,y:3.5,z:8.9,w:7,h:7,d:.3},{x:0,y:6.1,z:8.9,w:8,h:1.8,d:.3},{x:0,y:7,z:0,w:22.5,h:.25,d:18.5}];
export function projectileWallFraction(a,b,layouts=[]){
  let first=null;const check=box=>{const fraction=segmentBox(a,b,box,BROWN_PROJECTILE.radius);if(fraction!==null&&(first===null||fraction<first))first=fraction;};
  for(const box of STUDIO)check(box);
  for(const house of HOUSES){
    if(Math.min(a.x,b.x)>house.x+11||Math.max(a.x,b.x)<house.x-11||Math.min(a.z,b.z)>house.z+11||Math.max(a.z,b.z)<house.z-11)continue;
    const x=house.x,z=house.z,f=house.front;
    for(const box of [{x:x-7.6,y:2.8,z,w:.3,h:5.5,d:14.5},{x:x+7.6,y:2.8,z,w:.3,h:5.5,d:14.5},{x,y:2.8,z:z-f*7.1,w:15.5,h:5.5,d:.3},{x:x-5,y:2.8,z:z+f*7.1,w:5.4,h:5.5,d:.3},{x:x+5,y:2.8,z:z+f*7.1,w:5.4,h:5.5,d:.3},{x,y:4.8,z:z+f*7.1,w:4.6,h:1.5,d:.3},{x,y:5.9,z,w:16,h:.3,d:15},{x,y:.14,z,w:15.5,h:.21,d:14.5}])check(box);
    for(const item of layouts[house.index]?.items||[]){const def=FURNITURE_BY_ID.get(item.t);if(!def||def.solid===false)continue;const p=furniturePose(item);check({x:x+p.x*f,y:ROOM.floor+p.centerY,z:z+p.z*f,w:p.w,h:p.h,d:p.d,yaw:p.yaw+(f<0?Math.PI:0)});}
  }
  const floor=Math.hypot(b.x-ARENA.x,b.z-ARENA.z)<ARENA.radius?.24:0;
  if(b.y<=floor+BROWN_PROJECTILE.radius){const t=(a.y-floor-BROWN_PROJECTILE.radius)/Math.max(.0001,a.y-b.y);if(first===null||t<first)first=Math.max(0,Math.min(1,t));}
  return first;
}
