const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createGunActionMotion(){return {primed:false,grounded:true,vy:0,speed:0,jump:0,land:0,accel:0};}
// Viewmodel motion is independent of player physics and aiming. It follows
// acceleration, airborne weight and landing, then settles without a hard snap.
export function stepGunActionMotion(state,input,dt){
 dt=clamp(dt,0,.05);const grounded=input.grounded!==false,vy=input.verticalSpeed||0,speed=Math.max(0,input.speed||0);
 let event=null,strength=0;
 if(input.teleported){state.primed=false;state.jump=state.land=state.accel=0;state.pose=null;}
 if(state.primed&&!input.teleported){
  if(state.grounded&&!grounded&&vy>1&&!input.mantling){state.jump=1;event='jump';strength=clamp(vy/8.4,.35,1.4);}
  if(!state.grounded&&grounded&&Math.abs(state.vy)>2){state.land=clamp(Math.abs(state.vy)/11,.25,1.4);event='land';strength=state.land;}
 }
 state.accel+=((speed>.1?clamp((speed-state.speed)/Math.max(.001,dt)/22,0,1):0)-state.accel)*(1-Math.exp(-dt*12));
 state.jump*=Math.exp(-dt*8);state.land*=Math.exp(-dt*10);state.primed=true;state.grounded=grounded;state.vy=vy;state.speed=speed;
 const phase=input.phase||0,walk=grounded&&!input.sliding?clamp(speed/4.6,0,1.5):0,sprint=clamp((speed-3.3)/3,0,1),air=grounded?0:clamp(-vy/14,-.65,.85),aim=1-clamp(input.ads||0,0,1)*.88;
 const targets={
  x:aim*(Math.sin(phase)*.009*walk+(input.strafe||0)*-.012),
  y:aim*(Math.cos(phase*2)*.006*walk-state.jump*.035-state.land*.045-air*.025-(input.sprintCharge||0)*.008),
  z:aim*(state.accel*.008+state.land*.035+sprint*.015),
  pitch:aim*(state.jump*.040+state.land*.060+air*.045+sprint*.025+(input.sliding?.025:0)),
  yaw:aim*Math.sin(phase)*.008*walk,
  roll:aim*(Math.sin(phase)*.008*walk-(input.strafe||0)*.012),
  cameraPitch:aim*(state.jump*.040+state.land*.060+air*.045)
 };
 // First-order settling cannot overshoot or rebound when movement is released.
 const pose=state.pose??={x:0,y:0,z:0,pitch:0,yaw:0,roll:0,cameraPitch:0},blend=1-Math.exp(-dt*24);
 for(const key of Object.keys(targets))pose[key]+=(targets[key]-pose[key])*blend;
 return {...pose,event,strength,sprint,jump:state.jump,land:state.land};
}
