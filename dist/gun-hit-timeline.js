import {segmentBox} from './projectile-motion.js?v=20261017-bodyhit131';
import {gunBulletBoxes} from './gun-posture.js?v=20261017-wallspin133';
export const MAX_GUN_REWIND=240;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const sameEpoch=(a,b)=>a.skin===b.skin&&(a.gunTeleportSerial||0)===(b.gunTeleportSerial||0)&&a.mirrorRealm===b.mirrorRealm;
export class GunHitTimeline{
 constructor(){this.players=new Map();}
 remove(id){this.players.delete(id);}
 observe(p,at){
  if(!Number.isFinite(at)||![p.x,p.y,p.z].every(Number.isFinite))return;
  let frames=this.players.get(p.id)||[],previous=frames.at(-1);
  if(previous&&(!sameEpoch(previous,p)||Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)>6)){frames=[];previous=null;}
  if(previous&&at<previous.at)return;
  const seconds=previous?Math.max(0,at-previous.at)/1000:0,target=p.prone?1:0;
  const crouchTarget=p.crouched?1:0;
  const frame={ragdoll:!!p.ragdoll,seated:!!p.seated,sleeping:!!p.sleeping,mantling:!!p.mantling,parkourKind:p.parkourKind||'',parkourAge:p.parkourAge||0,parkourDuration:p.parkourDuration||0,parkourSerial:p.parkourSerial||0,wallSide:p.wallSide||0,wallNX:p.wallNX||0,wallNZ:p.wallNZ||0,wallSpinYaw:p.wallSpinYaw??0,wallSpinRise:p.wallSpinRise??0,wallSpinTilt:p.wallSpinTilt??1,wallSpinFinish:p.wallSpinFinish??-1,wallSpinFinishDuration:p.wallSpinFinishDuration??0,hitSlideBlend:p.hitSlideBlend||0,sliding:!!p.sliding,hitCrouchBlend:previous?lerp(previous.hitCrouchBlend,crouchTarget,1-Math.exp(-seconds*12)):crouchTarget,id:p.id,at,x:p.x,y:p.y,z:p.z,yaw:p.yaw||0,headYaw:p.headYaw||0,headPitch:p.headPitch||0,skin:p.skin,prone:!!p.prone,crouched:!!p.crouched,gunTeleportSerial:p.gunTeleportSerial||0,mirrorRealm:p.mirrorRealm,hitProneBlend:previous?lerp(previous.hitProneBlend,target,1-Math.exp(-seconds*(target?7:5))):target};
  if(previous&&at===previous.at)frames[frames.length-1]=frame;else frames.push(frame);
  while(frames.length>32||frames.length>2&&frames[1].at<at-800)frames.shift();this.players.set(p.id,frames);p.hitProneBlend=frame.hitProneBlend;p.hitCrouchBlend=frame.hitCrouchBlend;
 }
 sample(p,at){
  const frames=this.players.get(p.id),latest=frames?.at(-1);if(!latest||!sameEpoch(latest,p))return {...p,hitProneBlend:p.prone?1:0};
  // Never interpolate across a teleport, character change or an absent history interval.
  if(at<frames[0].at)return {...p,hitProneBlend:p.prone?1:0};
  let a=frames[0];for(const b of frames){if(b.at>=at){const t=b.at===a.at?0:clamp((at-a.at)/(b.at-a.at),0,1),out={...(t<1?a:b)};for(const key of ['x','y','z','headPitch','hitProneBlend','hitCrouchBlend','hitSlideBlend','parkourAge','parkourDuration','wallSide'])out[key]=['parkourAge','parkourDuration','wallSide'].includes(key)&&a.parkourSerial!==b.parkourSerial?(key==='parkourAge'?Math.min((t<1?a:b).parkourDuration||0,((t<1?a:b).parkourAge||0)+(t<1?(at-a.at)/1000:0)):(t<1?a:b)[key]):lerp(a[key],b[key],t);out.yaw=angle(a.yaw,b.yaw,t);out.headYaw=angle(a.headYaw,b.headYaw,t);return out;}a=b;}
  return {...latest};
 }
 lags(message,now){
  const result=new Map();if(!Array.isArray(message.viewTimes))return result;
  for(const value of message.viewTimes.slice(0,9)){if(typeof value?.id!=='string'||!Number.isFinite(value.at)||value.at>now+15||now-value.at>MAX_GUN_REWIND)continue;if(this.players.has(value.id)&&value.at>=this.players.get(value.id)[0].at)result.set(value.id,clamp(now-value.at,0,MAX_GUN_REWIND));}
  return result;
 }
}
// Relative motion sweeps a projectile against the moving body's occupied interval.
// Short slices also follow turns and posture changes, rather than testing only a tick endpoint.
export function movingGunHit(a,b,p,startAt,endAt,timeline,radius){
 const steps=Math.max(1,Math.min(48,Math.ceil((endAt-startAt)/5)));let earliest=null;
 for(let step=0;step<steps;step++){
  const lo=step/steps,hi=(step+1)/steps,mid=(lo+hi)/2,s=timeline.sample(p,lerp(startAt,endAt,lo)),e=timeline.sample(p,lerp(startAt,endAt,hi)),pose=timeline.sample(p,lerp(startAt,endAt,mid));
  const from={x:lerp(a.x,b.x,lo),y:lerp(a.y,b.y,lo),z:lerp(a.z,b.z,lo)},to={x:lerp(a.x,b.x,hi)-(e.x-s.x),y:lerp(a.y,b.y,hi)-(e.y-s.y),z:lerp(a.z,b.z,hi)-(e.z-s.z)};
  // Mid-slice orientation keeps rotated limbs tight. Sweep only root motion,
  // never the enlarged union of differently rotated endpoints or part indices.
  for(const part of gunBulletBoxes(pose)){
   const box={...part,x:part.x+s.x-pose.x,y:part.y+s.y-pose.y,z:part.z+s.z-pose.z},hit=segmentBox(from,to,box,radius);
   if(hit!==null){const fraction=lerp(lo,hi,hit);if(earliest===null||fraction<earliest)earliest=fraction;}
  }
  if(earliest!==null)break;
 }
 return earliest;
}
