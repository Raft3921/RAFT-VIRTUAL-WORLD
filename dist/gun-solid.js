import {segmentBox} from './projectile-motion.js';
export function solidExtents(b){const c=Math.abs(Math.cos(b.yaw||b.rotation||0)),s=Math.abs(Math.sin(b.yaw||b.rotation||0));return {x:(c*b.w+s*b.d)/2,z:(s*b.w+c*b.d)/2};}
export function segmentGunSolid(a,b,box,radius=0){
 if(!box.ramp)return segmentBox(a,b,box,radius);
 const angle=box.yaw||box.rotation||0,c=Math.cos(angle),s=Math.sin(angle),local=p=>({x:c*(p.x-box.x)-s*(p.z-box.z),y:p.y,z:s*(p.x-box.x)+c*(p.z-box.z)}),p=local(a),q=local(b),slope=(box.ramp.front-box.ramp.back)/box.d,top=box.ramp.base+(box.ramp.front+box.ramp.back)/2;
 let enter=0,leave=1;
 for(const [fa,fb]of [[p.x-box.w/2-radius,q.x-box.w/2-radius],[-p.x-box.w/2-radius,-q.x-box.w/2-radius],[p.z-box.d/2-radius,q.z-box.d/2-radius],[-p.z-box.d/2-radius,-q.z-box.d/2-radius],[box.y-box.h/2-radius-p.y,box.y-box.h/2-radius-q.y],[p.y-slope*p.z-top-radius,q.y-slope*q.z-top-radius]]){
  if(fa>0&&fb>0)return null;if(fa<=0&&fb<=0)continue;const t=fa/(fa-fb);if(fa>0)enter=Math.max(enter,t);else leave=Math.min(leave,t);if(enter>leave)return null;
 }return enter;
}
