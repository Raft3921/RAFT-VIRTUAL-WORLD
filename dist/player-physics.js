import {startMantle,stepMantle} from './player-mantle.js?v=20261015-mantle103';
import * as THREE from './vendor/three.module.js';
import {COURSE} from './world-layout.js';
import {bounceSpeed} from './plaza-surfaces.js';
import {tentBounceSpeed} from './gun-locomotion.js?v=20261015-spectacle104';
export const PLAYER_GRAVITY=24,PLAYER_JUMP_SPEED=8.4;
// The course deliberately retains its reachable jump arc. Ordinary movement
// reaches 147 cm in 350 ms, then accelerates down under the same gravity.
export function jumpParameters(world,p){return p.x>COURSE.minX&&p.x<COURSE.maxX&&p.z>COURSE.minZ&&p.z<COURSE.maxZ?{gravity:15,jump:7.95}:{gravity:PLAYER_GRAVITY,jump:PLAYER_JUMP_SPEED};}
export function stepPlayer(world,body,input){
 const dt=Math.max(0,Math.min(.05,input.dt)),params=jumpParameters(world,body.p);
 if(input.jump&&!body.grounded&&!body.mantle)startMantle(world,body,input);
 if(body.mantle&&stepMantle(world,body,input,dt))return {grounded:body.grounded,body:body.standingOn,bounceBody:null};
 if(body.standingOn&&body.grounded&&!body.standingOn.disabled){
  const b=body.standingOn;
  if(Number.isFinite(b.motionTime)&&b.motionMargin){const delta=(Math.sin(b.motionTime*.9+b.phase)-Math.sin((b.motionTime-dt)*.9+b.phase))*b.amplitude;if(b.lift)body.p.y+=delta;else if(b.forward)body.p.x+=delta;else body.p.z+=delta;}
 }
 if(input.jump&&body.grounded&&!input.prone){body.vy=params.jump;body.grounded=false;body.standingOn=null;}
 // Separate combat launches from ordinary jumps, and never reset a fall from a
 // client-reported grounded bit. These impulses are only accepted on support.
 if(input.launch>0&&body.grounded){body.vy=Math.min(10.4,input.launch);body.grounded=false;}
 const v=new THREE.Vector3(input.vx,body.vy,input.vz);let result,bounceBody=null;
 // Fixed upper timestep keeps the ballistic arc independent of display FPS.
 const count=Math.max(1,Math.ceil(dt*120)),h=dt/count;
 for(let i=0;i<count;i++){v.y=Math.max(-55,v.y-params.gravity*h);const incoming=v.y;result=world.move(body.p,v,h,{shape:input.shape,lockedInArena:input.lockedInArena});
  if(result.grounded&&result.body?.bounce){bounceBody=result.body;v.y=result.body.gunTent?tentBounceSpeed(incoming,input.pump):bounceSpeed(incoming,input.pump);result={grounded:false,body:null};}
 }
 body.vy=v.y;body.grounded=result.grounded;body.standingOn=result.body;return {...result,bounceBody};
}
