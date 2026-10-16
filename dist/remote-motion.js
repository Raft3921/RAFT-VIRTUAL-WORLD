const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const numeric=['x','y','z','speed','verticalSpeed','headPitch'];
// Render two snapshots behind the live stream. Arrival jitter never changes the
// velocity of the interpolation segment; short outages coast to a bounded stop.
export class RemoteMotion{
 constructor(){this.frames=[];this.interval=50;this.jitter=0;this.delay=100;this.playhead=null;this.lastRender=null;this.offset=null;this.lastArrival=null;this.output=null;this.correction={x:0,y:0,z:0};this.wasCoasting=false;}
 reset(state,arrival,at){
  this.frames=[];this.playhead=null;this.lastRender=null;this.output=null;this.correction={x:0,y:0,z:0};this.wasCoasting=false;this.lastArrival=null;this.offset=Number.isFinite(at)?at-arrival:0;
  this.push(state,arrival,at);return this;
 }
 push(state,arrival,at){
  if(![state.x,state.y,state.z,arrival].every(Number.isFinite))return false;
  if(this.offset===null)this.offset=Number.isFinite(at)?at-arrival:0;
  const time=Number.isFinite(at)?at:arrival+this.offset,last=this.frames.at(-1);
  if(last&&time<=last.at)return false;
  if(last&&(state.gunTeleportSerial!==last.gunTeleportSerial||state.mirrorRealm!==last.mirrorRealm||distance(state,last)>12||arrival-this.lastArrival>2000))return this.reset(state,arrival,at);
  if(last&&this.lastArrival!==null){const interval=time-last.at,gap=arrival-this.lastArrival;
   if(interval>10&&interval<300){this.interval+=(interval-this.interval)*.1;this.jitter+=(Math.abs(gap-interval)-this.jitter)*.12;this.delay=clamp(this.interval*1.6+this.jitter*2,90,180);}
  }
  this.frames.push({...state,at:time});if(this.frames.length>40)this.frames.shift();this.lastArrival=arrival;return true;
 }
 sample(now){
  if(!this.frames.length)return null;
  const dt=this.lastRender===null?0:clamp(now-this.lastRender,0,250),desired=now+this.offset-this.delay;
  if(this.playhead===null||now-this.lastRender>1000)this.playhead=desired;
  else this.playhead+=dt*clamp(1+(desired-this.playhead-dt)/500,.9,1.1);
  this.lastRender=now;
  while(this.frames.length>2&&this.frames[1].at<=this.playhead)this.frames.shift();
  const a=this.frames[0],b=this.frames.find(f=>f.at>=this.playhead)||this.frames.at(-1),latest=this.frames.at(-1);
  let out={...a},coasting=this.playhead>latest.at;
  if(b!==a&&this.playhead>=a.at){const t=clamp((this.playhead-a.at)/(b.at-a.at),0,1);out={...(t<1?a:b)};
   for(const key of numeric)out[key]=(a[key]||0)+((b[key]||0)-(a[key]||0))*t;
   for(const key of ['yaw','headYaw'])out[key]=angle(a[key]||0,b[key]||0,t);
  }
  if(coasting){out={...latest};const t=clamp((this.playhead-latest.at)/1000,0,.08),travel=t-t*t/.16;
   // Never extrapolate grounded players down through floors or activity poses.
   if(!latest.ragdoll&&!latest.seated&&!latest.sleeping&&!latest.mantling){out.x+=(latest.vx||0)*travel;out.z+=(latest.vz||0)*travel;if(!latest.grounded)out.y+=(latest.vy||0)*travel;}
   out.speed=(latest.speed||0)*(1-t/.08);
  }
  if(this.wasCoasting&&!coasting&&this.output&&distance(out,this.output)<2)for(const key of ['x','y','z'])this.correction[key]=this.output[key]-out[key];
  for(const key of ['x','y','z']){this.correction[key]*=Math.exp(-dt/75);out[key]+=this.correction[key];}
  this.wasCoasting=coasting;this.output=out;return out;
 }
}
