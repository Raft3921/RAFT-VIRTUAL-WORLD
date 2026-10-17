import {transformParkourBox} from './parkour-pose.js?v=20261017-wallfloor128';
export const PRONE_HEIGHT=.62;
export function proneShape(yaw=0){return {width:.30,depth:.78,height:PRONE_HEIGHT,yaw};}
export function gunHitBox(p){const height=p.sliding?1.16:p.prone?PRONE_HEIGHT:p.crouched?1.28:1.8;return {x:p.x,y:p.y+height/2,z:p.z,w:p.prone?.62:.65,h:height,d:p.sliding?1.9:p.prone?1.6:.65,yaw:p.yaw||0};}
export function gunDamage(id,charge=0){return id==='katana'?1+Math.min(1,Math.max(0,charge))*4:({rocket:2,machine:.5,sniper:1.5}[id]||1);}

// Slim player geometry is 32/16=2m tall, not the old 1.8m box. Split the
// silhouette so the head/arms count without turning the entire body into a wide box.
export function gunBulletBoxes(p){
 const crouch=Number.isFinite(p.hitCrouchBlend)?Math.max(0,Math.min(1,p.hitCrouchBlend)):(p.crouched?1:0),custom=p.skin===7,drop=crouch*(custom ? .20 : .48),yaw=p.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
 const blend=Number.isFinite(p.hitProneBlend)?Math.max(0,Math.min(1,p.hitProneBlend)):(p.prone?1:0),angle=blend*Math.PI/2,co=Math.cos(angle),si=Math.sin(angle),base=.24*blend-drop*(1-blend);
 const shapes=custom?[
  [0,.16,0,.54,.32,.30],[0,.56,0,.94,.51,.34],[0,1.095,.15*blend,1.19,.63,.57]
 ]:[
  [0,.40,0,.54,.80,.32],[0,1.15,0,.94,.80,.40],[0,1.76,.15*blend,.56,.56,.56]
 ];
 return shapes.map(([x,y,z,w,h,d],i)=>{
  // In crouch the feet stay planted; the upper body drops with the pelvis.
  let localY=base+y*co-z*si,localZ=y*si+z*co-(.13*crouch)*(1-blend);
  if(i===2){const pivot=custom?13/16:1.5,half=custom?9/32:.25,tilt=angle*(1-blend)+Math.max(-.65,Math.min(.7,p.headPitch||0));localY=base+pivot*co-z*si+half*Math.cos(tilt);localZ=pivot*si+z*co+half*Math.sin(tilt)-(.13*crouch)*(1-blend);const oldH=h,oldD=d;h=Math.abs(oldH*Math.cos(tilt))+Math.abs(oldD*Math.sin(tilt));d=Math.abs(oldH*Math.sin(tilt))+Math.abs(oldD*Math.cos(tilt));}
  const box={x:p.x+c*x+s*localZ,y:p.y+localY,z:p.z-s*x+c*localZ,w,h:i===2?h:Math.abs(h*co)+Math.abs(d*si),d:i===2?d:Math.abs(h*si)+Math.abs(d*co),yaw:i===2?yaw+Math.max(-.95,Math.min(.95,p.headYaw||0)):yaw};
  if(i===0&&crouch>.001&&blend<.01){box.h=Math.max(.2,h-drop);box.y=p.y+box.h/2;}
  const slide=Math.max(0,Math.min(1,p.hitSlideBlend??(p.sliding?1:0)));
  if(slide>0){const co=Math.cos(-.95),si=Math.sin(-.95),pivot=custom?13/16:1.5,half=custom?9/32:.25,tilt=Math.max(-.65,Math.min(.7,p.headPitch||0));let sy=-.30+y*co,sz=.55+y*si,sh=Math.abs(h*co)+Math.abs(d*si),sd=Math.abs(h*si)+Math.abs(d*co);
   if(i===0){sy=.17;sz=.30;sh=.34;sd=1.15;}if(i===2){sy=-.30+pivot*co+half*Math.cos(tilt);sz=.55+pivot*si+half*Math.sin(tilt);sh=h;sd=d;}
   box.x+=(p.x+c*x+s*sz-box.x)*slide;box.y+=(p.y+sy-box.y)*slide;box.z+=(p.z-s*x+c*sz-box.z)*slide;box.h+=(sh-box.h)*slide;box.d+=(sd-box.d)*slide;
  }
  if(['backflip','sideflip'].includes(p.parkourKind)&&i===0){const tuck=Math.sin(Math.PI*Math.max(0,Math.min(1,(p.parkourAge||0)/Math.max(.01,p.parkourDuration||1))));box.y+=.24*tuck;box.h*=1-.22*tuck;}
  return transformParkourBox(box,p);
 });
}
export function gunProjectileRadius(id){return {pistol:.048,machine:.04,sniper:.058,shotgun:.065,rocket:.18}[id]||.025;}
