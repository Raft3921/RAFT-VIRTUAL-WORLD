const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createGunActionMotion(){return {primed:false,grounded:true,vy:0,speed:0,jump:0,land:0,accel:0};}
// Viewmodel motion is independent of player physics and aiming. It follows
// acceleration, airborne weight and landing, then settles without a hard snap.
export function stepGunActionMotion(state,input,dt){
 dt=clamp(dt,0,.05);const grounded=input.grounded!==false,vy=input.verticalSpeed||0,speed=Math.max(0,input.speed||0);
 let event=null,strength=0;
 if(state.primed&&!input.teleported){
  if(state.grounded&&!grounded&&vy>1&&!input.mantling){state.jump=1;event='jump';strength=clamp(vy/8.4,.35,1.4);}
  if(!state.grounded&&grounded){state.land=clamp(Math.abs(state.vy)/11,.25,1.4);event='land';strength=state.land;}
 }
 state.accel+=(clamp((speed-state.speed)/Math.max(.001,dt)/22,-1,1)-state.accel)*(1-Math.exp(-dt*12));
 state.jump*=Math.exp(-dt*8);state.land*=Math.exp(-dt*10);state.primed=true;state.grounded=grounded;state.vy=vy;state.speed=speed;
 const phase=input.phase||0,walk=grounded?clamp(speed/4.6,0,1.5):0,sprint=clamp((speed-3.3)/3,0,1),air=grounded?0:clamp(-vy/14,-.65,.85),aim=1-clamp(input.ads||0,0,1)*.88;
 return {event,strength,sprint,jump:state.jump,land:state.land,
  x:aim*(Math.sin(phase)*.025*walk+(input.strafe||0)*-.035),
  y:aim*(Math.cos(phase*2)*.017*walk-state.jump*.07-state.land*.105-air*.04),
  z:aim*(state.accel*.028+state.land*.06+sprint*.04),
  pitch:aim*(state.jump*.075+state.land*.13+air*.065+sprint*.12),
  yaw:aim*Math.sin(phase)*.023*walk,
  roll:aim*(Math.sin(phase)*.025*walk-(input.strafe||0)*.045+state.land*.04),
 };
}
