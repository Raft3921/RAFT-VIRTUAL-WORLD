import {stepParkour,parkourDefaults} from './player-parkour.js?v=20261017-wallfloor128';
import {inGunZone} from './gun-layout.js?v=20261017-settlement125';
import {proneShape} from './gun-posture.js?v=20261017-wallfloor128';
export const COMBAT_WALK=2.8,COMBAT_SPRINT_START=5.8,COMBAT_SPRINT_MAX=7.2,COMBAT_SPRINT_RAMP=.55;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const slideShape=(yaw,width=.32)=>({width:Math.max(.32,width),depth:.95,height:1.16,yaw});
export function createCombatMovement(){return {...parkourDefaults(),vx:0,vz:0,sprintTime:0,sprintCharge:0,sprinting:false,sliding:false,slideAge:0,slideBlend:0,cooldown:0,slideAir:false,prone:false,intent:false};}
export function stepCombatMovement(world,body,input,dt){
 if(!inGunZone(body.p,world.gunMapId)||input.combat!==true){body.combat=null;return null;}
 const m=body.combat??=createCombatMovement(),shape=input.standingShape||{width:.32,depth:.32,height:1.9,yaw:input.lookYaw||0},yaw=input.lookYaw||0;
 if(input.stop){m.vx=m.vz=m.sprintTime=0;m.sliding=m.slideAir=m.sprinting=false;input={...input,wishX:0,wishZ:0,sprint:false,jump:false};}
 const intent=input.proneIntent===true,pressed=intent&&!m.intent;m.intent=intent;m.cooldown=Math.max(0,m.cooldown-dt);
 let wx=Number.isFinite(input.wishX)?input.wishX:0,wz=Number.isFinite(input.wishZ)?input.wishZ:0;const amount=Math.hypot(wx,wz);if(amount>1){wx/=amount;wz/=amount;}
 const moving=amount>.05,aiming=input.aiming===true,forward=wx*Math.sin(yaw)+wz*Math.cos(yaw),speed=Math.hypot(m.vx,m.vz);
 if(!input.stop&&pressed&&body.grounded&&speed>=4.1&&m.sprintTime>.08&&m.cooldown===0&&!aiming&&world.canStand(body.p,slideShape(yaw,shape.width))){m.sliding=true;m.prone=false;m.slideAge=0;m.cooldown=1.1;const boost=Math.min(7.6,speed*1.04)/speed;m.vx*=boost;m.vz*=boost;}
 let jump=false;
 if(m.sliding){
  m.slideAge+=dt;m.sprintTime=0;m.sprinting=false;
  const canRise=world.canStand(body.p,shape);
  if(input.jump&&body.grounded&&canRise){m.sliding=false;m.prone=false;m.slideAir=true;jump=true;const boost=Math.min(7.8,Math.hypot(m.vx,m.vz)*1.06)/Math.max(.01,Math.hypot(m.vx,m.vz));m.vx*=boost;m.vz*=boost;}
  else{
   const drag=body.grounded?2.8+speed*.32:.12*speed,next=Math.max(0,speed-drag*dt),ratio=next/Math.max(.001,speed);m.vx*=ratio;m.vz*=ratio;
   if(moving){const steer=1-Math.exp(-dt*.75);m.vx+=(wx*next-m.vx)*steer;m.vz+=(wz*next-m.vz)*steer;}
   if(m.slideAge>1.65||next<2.1||!intent&&canRise){m.sliding=false;m.prone=intent||!canRise;}
  }
 }else if(!m.slideAir){
  if(intent&&world.canStand(body.p,proneShape(yaw)))m.prone=true;
  else if(!intent&&world.canStand(body.p,shape))m.prone=false;
 }
 if(!m.sliding){
  const sprint=input.sprint===true&&moving&&forward>.25&&!aiming&&!m.prone&&!input.crouched&&!m.slideAir;
  m.sprintTime=sprint?clamp(m.sprintTime+dt,0,COMBAT_SPRINT_RAMP):Math.max(0,m.sprintTime-dt*5);
  const target=m.prone?COMBAT_WALK*.20:input.crouched?COMBAT_WALK*.42:aiming?COMBAT_WALK*.78:sprint?COMBAT_SPRINT_START+(COMBAT_SPRINT_MAX-COMBAT_SPRINT_START)*clamp(m.sprintTime/COMBAT_SPRINT_RAMP,0,1):COMBAT_WALK;
  m.sprinting=sprint;
  if(!moving&&body.grounded&&!jump){m.vx=m.vz=m.sprintTime=0;}
  else if(!body.grounded||jump){
   const steer=1-Math.exp(-dt*1.1);if(moving){m.vx+=(wx*Math.max(target,speed)-m.vx)*steer;m.vz+=(wz*Math.max(target,speed)-m.vz)*steer;}m.vx*=Math.exp(-dt*.08);m.vz*=Math.exp(-dt*.08);
  }else{m.slideAir=false;m.vx=wx*target;m.vz=wz*target;}
 }
 const parkour=stepParkour(world,body,input,m,dt);
 m.sprintCharge=clamp(m.sprintTime/COMBAT_SPRINT_RAMP,0,1);
 m.slideBlend+=(Number(m.sliding)-m.slideBlend)*(1-Math.exp(-dt*(m.sliding?14:9)));
 const current=Math.hypot(m.vx,m.vz);if(current>7.8){m.vx*=7.8/current;m.vz*=7.8/current;}
 return {...parkour,vx:m.vx,vz:m.vz,prone:m.prone,sliding:m.sliding,jump,shape:m.sliding?slideShape(yaw,shape.width):m.prone?proneShape(yaw):input.crouched?{...shape,height:shape.height-Math.min(.52,shape.height*.3)}:shape};
}
