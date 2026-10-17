import {stepCombatMovement} from './combat-movement.js?v=20261017-flipjump129';
import {startMantle,stepMantle} from './player-mantle.js?v=20261015-mantle103';
import * as THREE from './vendor/three.module.js';
import {COURSE} from './world-layout.js';
import {bounceSpeed} from './plaza-surfaces.js';
import {tentBounceSpeed} from './gun-locomotion.js?v=20261015-spectacle104';
export const PLAYER_GRAVITY=24,PLAYER_JUMP_SPEED=8.4;
// The course deliberately retains its reachable jump arc. Ordinary movement
// reaches 147 cm in 350 ms, then accelerates down under the same gravity.
export function jumpParameters(world,p){return !world.combatOnly&&p.x>COURSE.minX&&p.x<COURSE.maxX&&p.z>COURSE.minZ&&p.z<COURSE.maxZ?{gravity:15,jump:7.95}:{gravity:PLAYER_GRAVITY,jump:PLAYER_JUMP_SPEED};}
export function stepPlayer(world,body,input){
 const dt=Math.max(0,Math.min(.05,input.dt)),params=jumpParameters(world,body.p);
 if(input.jump&&!body.grounded&&!body.mantle&&body.combat?.parkourKind!=='wallrun')startMantle(world,body,input);
 const combat=stepCombatMovement(world,body,input,dt);
 if(combat)input={...input,vx:combat.vx,vz:combat.vz,prone:combat.prone,jump:combat.sliding||combat.consumeJump?false:combat.jump||input.jump,shape:combat.shape};
 if(body.mantle&&stepMantle(world,body,input,dt)){if(body.combat){body.combat.vx=body.combat.vz=body.combat.sprintTime=body.combat.sprintCharge=0;body.combat.sprinting=false;body.combat.parkourKind='';body.combat.sliding=body.combat.slideAir=false;}return {grounded:body.grounded,body:body.standingOn,bounceBody:null};}
 if(body.standingOn&&body.grounded&&!body.standingOn.disabled){
  const b=body.standingOn;
  if(Number.isFinite(b.motionTime)&&b.motionMargin){const delta=(Math.sin(b.motionTime*.9+b.phase)-Math.sin((b.motionTime-dt)*.9+b.phase))*b.amplitude;if(b.lift)body.p.y+=delta;else if(b.forward)body.p.x+=delta;else body.p.z+=delta;}
 }
 if(input.jump&&body.grounded&&!input.prone){body.vy=params.jump*(combat?.jumpMultiplier||1);if(body.combat?.parkourKind==='slideflip')body.combat.parkourDuration=2*body.vy/params.gravity*.96;body.grounded=false;body.standingOn=null;}
 // Separate combat launches from ordinary jumps, and never reset a fall from a
 // client-reported grounded bit. These impulses are only accepted on support.
 if(input.launch>0&&body.grounded){body.vy=Math.min(10.4,input.launch);body.grounded=false;}
 const startX=body.p.x,startZ=body.p.z,v=new THREE.Vector3(input.vx,body.vy,input.vz);let result,bounceBody=null;
 // Fixed upper timestep keeps the ballistic arc independent of display FPS.
 const count=Math.max(1,Math.ceil(dt*120)),h=dt/count;
 for(let i=0;i<count;i++){v.y=Math.max(-55,v.y-(combat?.gravity??params.gravity)*h);const incoming=v.y;const wallOffset=combat?.wallOffset;if(wallOffset){body.p.x+=wallOffset.x;body.p.y+=wallOffset.y;body.p.z+=wallOffset.z;}result=world.move(body.p,v,h,{shape:combat?.wallShape||input.shape,lockedInArena:input.lockedInArena});if(wallOffset){body.p.x-=wallOffset.x;body.p.y-=wallOffset.y;body.p.z-=wallOffset.z;}
  if(result.grounded&&result.body?.bounce){bounceBody=result.body;v.y=result.body.gunTent?tentBounceSpeed(incoming,input.pump):bounceSpeed(incoming,input.pump);result={grounded:false,body:null};}
 }
 if(combat&&dt>0){const m=body.combat;m.vx=(body.p.x-startX)/dt;m.vz=(body.p.z-startZ)/dt;if(result.grounded)m.slideAir=false;if(Math.hypot(m.vx,m.vz)<.5)m.sprintTime=0;}
 body.vy=v.y;body.grounded=result.grounded;body.standingOn=result.body;return {...result,bounceBody};
}
