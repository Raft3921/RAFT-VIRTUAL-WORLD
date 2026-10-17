const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const numeric=['y','speed','verticalSpeed','headPitch','hitProneBlend','hitCrouchBlend','hitSlideBlend','sprintCharge'];
// Bounded cubic interpolation follows endpoint velocities without overshooting
// walls or reversing along an otherwise monotone snapshot segment.
function position(a,b,va,vb,t,seconds){
 const delta=b-a;if(Math.abs(delta)<.00001)return a;
 let m0=clamp((va??delta/seconds)*seconds/delta,0,3),m1=clamp((vb??delta/seconds)*seconds/delta,0,3);
 const length=Math.hypot(m0,m1);if(length>3){m0*=3/length;m1*=3/length;}
 const t2=t*t,t3=t2*t;
 return clamp((2*t3-3*t2+1)*a+(t3-2*t2+t)*m0*delta+(-2*t3+3*t2)*b+(t3-t2)*m1*delta,Math.min(a,b),Math.max(a,b));
}
export class RemoteMotion{
 constructor(){this.frames=[];this.interval=33;this.jitter=0;this.delay=55;this.playhead=null;this.lastRender=null;this.offset=null;this.offsets=[];this.stamped=false;this.lastArrival=null;this.output=null;this.correction={x:0,y:0,z:0};this.wasCoasting=false;this.needsRecovery=false;}
 reset(state,arrival,at){
  this.frames=[];this.playhead=null;this.lastRender=null;this.output=null;this.correction={x:0,y:0,z:0};this.wasCoasting=false;this.needsRecovery=false;this.lastArrival=null;this.offset=null;this.offsets=[];this.stamped=false;
  this.push(state,arrival,at);return this;
 }
 push(state,arrival,at){
  if(![state.x,state.y,state.z,arrival].every(Number.isFinite))return false;
  const stamped=Number.isFinite(at);
  // Switch older, unstamped streams into the server clock domain once only.
  if(stamped&&!this.stamped&&this.frames.length)return this.reset(state,arrival,at);
  if(this.offset===null)this.offset=stamped?at-arrival:0;
  const time=stamped?at:arrival+this.offset,last=this.frames.at(-1);
  if(last&&time<=last.at)return false;
  if(last&&(state.gunTeleportSerial!==last.gunTeleportSerial||state.mirrorRealm!==last.mirrorRealm||distance(state,last)>12||arrival-this.lastArrival>2000))return this.reset(state,arrival,at);
  if(stamped){this.stamped=true;this.offsets.push(at-arrival);if(this.offsets.length>90)this.offsets.shift();}
  if(last&&this.lastArrival!==null){const interval=time-last.at,gap=arrival-this.lastArrival;
   if(interval>10&&interval<300){this.interval+=(interval-this.interval)*.12;this.jitter=Math.max(this.jitter*.94,Math.abs(gap-interval));const target=clamp(this.interval*1.15+this.jitter*1.5,45,125);this.delay+=(target-this.delay)*(target>this.delay?.35:.025);}
  }
  if(this.wasCoasting)this.needsRecovery=true;
  const frame={...state,at:time};
  if(last){const seconds=(time-last.at)/1000;for(const [key,v]of [['x','vx'],['z','vz']]){const measured=(state[key]-last[key])/seconds;frame[v]=clamp(Number.isFinite(state[v])?state[v]:measured,Math.min(0,measured*1.5),Math.max(0,measured*1.5));}}
  this.frames.push(frame);if(this.frames.length>40)this.frames.shift();this.lastArrival=arrival;return true;
 }
 sample(now,{combat=false}={}){
  if(!this.frames.length)return null;
  const dt=this.lastRender===null?0:clamp(now-this.lastRender,0,250);
  // The least delayed recent packet estimates the clock; slew corrections avoid
  // making an unlucky first packet a permanent latency penalty.
  if(this.offsets.length)this.offset+=clamp(Math.max(...this.offsets)-this.offset,-dt*.02,dt*.02);
  const desired=now+this.offset-(combat?Math.min(this.delay,75):this.delay);
  if(this.playhead===null||now-this.lastRender>1000)this.playhead=desired;
  else this.playhead+=dt*clamp(1+(desired-this.playhead-dt)/500,.92,1.08);
  this.lastRender=now;
  while(this.frames.length>2&&this.frames[1].at<=this.playhead)this.frames.shift();
  const a=this.frames[0],b=this.frames.find(f=>f.at>=this.playhead)||this.frames.at(-1),latest=this.frames.at(-1);
  let out={...a,stateAt:a.at},coasting=this.playhead>latest.at;
  if(b!==a&&this.playhead>=a.at){const t=clamp((this.playhead-a.at)/(b.at-a.at),0,1),seconds=(b.at-a.at)/1000;out={...(t<1?a:b),at:this.playhead,stateAt:t<1?a.at:b.at};
   for(const key of numeric){if((key==='hitProneBlend'||key==='hitCrouchBlend')&&!Number.isFinite(a[key])&&!Number.isFinite(b[key]))continue;out[key]=(a[key]||0)+((b[key]||0)-(a[key]||0))*t;}
   for(const [key,v]of [['x','vx'],['z','vz']])out[key]=combat?a[key]+(b[key]-a[key])*t:position(a[key],b[key],a[v],b[v],t,seconds);
   for(const key of ['yaw','headYaw'])out[key]=angle(a[key]||0,b[key]||0,t);
  }
  if(coasting){const t=clamp((this.playhead-latest.at)/1000,0,.08),tail=Math.max(0,t-.04),travel=t-tail*tail/.08,fade=1-tail/.04;
   out={...latest,at:latest.at+t*1000,stateAt:latest.at};
   // Short underflows keep full velocity before braking to a bounded stop.
   // Ground contact and special activity poses are never predicted through floors.
   if(!combat&&!latest.ragdoll&&!latest.seated&&!latest.sleeping&&!latest.mantling){out.x+=(latest.vx||0)*travel;out.z+=(latest.vz||0)*travel;if(!latest.grounded)out.y+=(latest.vy||0)*travel;}
   if(combat)out.at=latest.at;
   out.speed=(latest.speed||0)*fade;out.vx=(latest.vx||0)*fade;out.vz=(latest.vz||0)*fade;
  }
  if(combat){this.correction={x:0,y:0,z:0};}
  if(!combat&&this.needsRecovery&&this.output){
   const expected={x:this.output.x+(this.output.vx||0)*dt/1000,y:this.output.y,z:this.output.z+(this.output.vz||0)*dt/1000};
   if(distance(out,expected)<2)for(const key of ['x','y','z'])this.correction[key]=expected[key]-out[key];
  }
  this.needsRecovery=false;
  for(const key of ['x','y','z']){this.correction[key]*=Math.exp(-dt/65);out[key]+=this.correction[key];}
  this.wasCoasting=coasting;this.output=out;return out;
 }
}
