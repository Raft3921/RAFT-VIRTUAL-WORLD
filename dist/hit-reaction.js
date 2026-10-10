import {DOWN_REST_SECONDS,RECOVERY_SECONDS} from './combat-policy.js?v=20261010-free-cook71';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function createHit(strength=.5){return {phase:'air',elapsed:0,downTime:0,recovery:0,strength:clamp(strength),groundTime:0};}
export function proneWeight(hit){return hit?.phase==='down'?1:hit?.phase==='recover'?1-smooth(hit.recovery/.72):0;}
export function hitShape(hit,yaw){const p=proneWeight(hit);return {yaw,width:.38,depth:hit?.phase==='air'?.85:.32+p*.83,offset:hit?.phase==='air'?.35:p*.85,height:1.9-p*1.25};}
// Deterministic hit / floor contact / kip-up, with an actual physics hop.
export function stepHit(hit,dt,grounded,velocity){
  if(!hit||hit.phase==='none')return 'done';
  hit.elapsed+=dt;
  if(hit.phase==='air'&&grounded){hit.phase='down';hit.downTime=0;}
  if(hit.phase==='down'){
    hit.downTime+=dt;velocity.x*=Math.exp(-dt*12);velocity.z*=Math.exp(-dt*12);
    if(hit.downTime>=DOWN_REST_SECONDS){hit.phase='recover';hit.recovery=0;velocity.x=velocity.z=0;velocity.y=4.6;return 'spring';}
  }else if(hit.phase==='recover'){
    hit.recovery+=dt/RECOVERY_SECONDS;
    if(hit.recovery>=1&&grounded){hit.phase='none';velocity.x=velocity.y=velocity.z=0;return 'done';}
  }else{velocity.x*=Math.exp(-dt*.22);velocity.z*=Math.exp(-dt*.22);}
  return null;
}
export function sampleHit(hit){
  const phase=hit?.phase||'none',t=hit?.elapsed||0,strength=hit?.strength||.5;
  if(phase==='impact')return {weight:1,tilt:-.1,height:0,hips:[-.15,-.12],knees:[.25,.2],arms:[-.5,-.55],elbows:[-.75,-.8],roll:0,spread:.14};
  // Bounded, damped limb inertia keeps the old loose ragdoll character without
  // random joint jitter or limbs folding through the torso. Shared hit time
  // makes the same reaction reproducible on every client.
  if(phase==='air'){
    const sway=Math.sin(t*7)*Math.exp(-t*.8)*(.12+strength*.28),lag=Math.sin(t*7-1)*Math.exp(-t*.9)*(.1+strength*.22);
    return {weight:.65+.35*smooth(t/.07),tilt:-.35-Math.min(1.22,t*(1.15+strength*.8)),height:.09,hips:[-.35+sway,-.18-lag],knees:[.75+lag,.55-sway],arms:[-.7-sway,-.85+lag],elbows:[-1+lag,-1.1-sway],roll:(.07+strength*.18)*Math.sin(t*4+.6)*Math.exp(-t*.6),spread:.14+Math.abs(sway)*.4};
  }
  if(phase==='down'){
    const d=hit.downTime||0,bounce=Math.sin(d*22)*Math.exp(-d*12)*.09,settle=Math.exp(-d*14);
    return {weight:1,tilt:-Math.PI/2+.14*settle,height:.32+Math.max(0,bounce),hips:[-.08-bounce,-.06+bounce],knees:[.18+settle*.25,.15+settle*.15],arms:[-.22-settle*.18,-.28-settle*.1],elbows:[-.50,-.60],roll:Math.sin(d*17)*settle*.045,spread:.08};
  }
  if(phase==='recover'){
    const r=clamp(hit.recovery),unfold=smooth((r-.20)/.48),tuck=Math.sin(Math.PI*clamp(r/.72));
    return {weight:1-smooth((r-.78)/.22),tilt:-Math.PI/2*(1-unfold),height:.32*(1-unfold),hips:[-.08-tuck*.95,-.06-tuck*.90],knees:[.18+tuck*1.65,.15+tuck*1.6],arms:[-.3-tuck*1.8,-.3-tuck*1.8],elbows:[-.5,-.5],roll:0,spread:.08*(1-unfold)};
  }
  return {weight:0,tilt:0,height:0,spread:0};
}
