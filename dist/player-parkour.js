// Shared contact-based acrobatics. The client submits only ordinary movement /
// jump controls; wall normals, impulses and action budgets are server-derived.
export function parkourDefaults(){return {parkourKind:'',parkourAge:0,parkourDuration:0,parkourSerial:0,wallSide:0,wallNX:0,wallNZ:0,wallTime:0,wallSpinYaw:0,wallSpinRise:0,wallSpinTilt:1,wallSpinFinish:-1,wallSpinFinishDuration:0,kickCooldown:0,flipCooldown:0,kicks:0,lastWallNX:0,lastWallNZ:0,airAction:false};}
export const isParkourFlip=kind=>['backflip','sideflip','frontflip','slideflip','wallspin'].includes(kind);
export function parkourHandsBusy(p){return !!p.mantling||['backflip','sideflip','frontflip','slideflip','wallspin','wallkick'].includes(p.parkourKind);}
export function findParkourWall(world,p,shape,yaw=0){
 if(!world.nearby)return null;let best=null,bestGap=Infinity;
 for(const b of world.nearby(p)){
  if(b.disabled||b.ramp||b.bounce||b.motionMargin||b.gunPropId||b.y+b.h/2<p.y+1.25||b.y-b.h/2>p.y+.75)continue;
  const c=Math.cos(b.rotation||0),s=Math.sin(b.rotation||0),dx=p.x-b.x,dz=p.z-b.z,x=c*dx-s*dz,z=s*dx+c*dz,relative=yaw-(b.rotation||0),rx=Math.abs(Math.cos(relative))*shape.width+Math.abs(Math.sin(relative))*shape.depth,rz=Math.abs(Math.sin(relative))*shape.width+Math.abs(Math.cos(relative))*shape.depth;
  let gap,nx,nz;
  if(Math.abs(x)>b.w/2&&Math.abs(z)<b.d/2-.12){gap=Math.abs(x)-b.w/2-rx;nx=Math.sign(x)*c;nz=-Math.sign(x)*s;}
  else if(Math.abs(z)>b.d/2&&Math.abs(x)<b.w/2-.12){gap=Math.abs(z)-b.d/2-rz;nx=Math.sign(z)*s;nz=Math.sign(z)*c;}else continue;
  if(gap<-.08||gap>.20||gap>=bestGap)continue;
  bestGap=gap;best={nx,nz,gap,top:b.y+b.h/2};
 }
 return best;
}
function action(m,kind,duration){if(m.parkourKind===kind)return;m.parkourKind=kind;m.parkourAge=0;m.parkourDuration=duration;m.parkourSerial++;}
export function stepParkour(world,body,input,m,dt){
 if(m.parkourKind===undefined)Object.assign(m,parkourDefaults());
 m.kickCooldown=Math.max(0,m.kickCooldown-dt);m.flipCooldown=Math.max(0,m.flipCooldown-dt);m.parkourAge+=dt;
 if(m.parkourKind&&m.parkourAge>=m.parkourDuration)action(m,'',0);
 const rotating=isParkourFlip(m.parkourKind);
 if(body.grounded){m.wallTime=0;m.kicks=0;m.lastWallNX=m.lastWallNZ=0;m.airAction=false;if(!rotating)action(m,'',0);}
 // Finish the full turn even after an early landing or a released input.
 // No stance, wall transfer or new jump can replace an unfinished rotation.
 if(rotating){
  if(m.parkourKind==='wallspin'&&m.wallSpinFinish<0){
   const gravity=input.gravity||24,floor=world.floorAt(body.p,body.p.y+.02).y,drop=Math.max(0,body.p.y-floor),initial=(body.vy+Math.sqrt(body.vy*body.vy+2*gravity*drop))/gravity,predicted={x:body.p.x+m.vx*initial,y:body.p.y,z:body.p.z+m.vz*initial},landing=world.floorAt(predicted,body.p.y+.02).y,impact=(body.vy+Math.sqrt(body.vy*body.vy+2*gravity*Math.max(0,body.p.y-landing)))/gravity;
   if(body.grounded||body.vy<0&&impact<.28){m.wallSpinFinish=m.parkourAge;m.wallSpinFinishDuration=body.grounded?.18:Math.max(.12,impact*.95);m.parkourDuration=m.wallSpinFinish+m.wallSpinFinishDuration;}
  }
  return {};
 }
 if(body.mantle||m.prone||m.sliding||input.stop){action(m,'',0);return {};}
 // This flag is derived by shared slide state, never accepted from the wire.
 if(body.grounded&&input.slideJump){m.flipCooldown=1.1;m.airAction=true;action(m,'slideflip',.95);return {jumpMultiplier:Math.SQRT2};}
 const yaw=input.lookYaw||0,shape=input.standingShape||{width:.32,depth:.32,height:1.9},wx=input.wishX||0,wz=input.wishZ||0,amount=Math.hypot(wx,wz),forward=wx*Math.sin(yaw)+wz*Math.cos(yaw);
 // Back + jump is an explicit grounded action; require the whole jump arc's
 // headroom so a low ceiling does not initiate a spin that cannot finish.
 if(body.grounded&&input.jump&&!input.crouched&&!input.aiming&&forward<-.35&&-forward>Math.abs(wx*-Math.cos(yaw)+wz*Math.sin(yaw))&&m.flipCooldown===0&&world.canStand(body.p,{...shape,height:shape.height+1.5,yaw})){
  m.flipCooldown=1;m.airAction=true;m.vx=-Math.sin(yaw)*4.8;m.vz=-Math.cos(yaw)*4.8;action(m,'backflip',.64);return {};
 }
 if(body.grounded&&input.jump&&!input.crouched&&!input.aiming&&m.flipCooldown===0){
  const side=wx*-Math.cos(yaw)+wz*Math.sin(yaw);
  if(Math.abs(side)>.55&&Math.abs(side)>Math.abs(forward)*1.1&&world.canStand(body.p,{width:Math.max(shape.width,.72),depth:Math.max(shape.depth,.72),height:shape.height+1,yaw})){
   m.flipCooldown=.9;m.airAction=true;m.wallSide=Math.sign(side);m.vx=wx/amount*5.8;m.vz=wz/amount*5.8;action(m,'sideflip',.66);return {};
  }
 }
 if(body.grounded&&input.jump&&!input.crouched&&!input.aiming&&m.flipCooldown===0&&forward>.35&&forward>=Math.abs(wx*-Math.cos(yaw)+wz*Math.sin(yaw))&&world.canStand(body.p,{...shape,height:shape.height+1,yaw})){
  m.flipCooldown=.8;m.airAction=true;action(m,'frontflip',.64);return {};
 }
 if(body.grounded)return {};
 const wall=findParkourWall(world,body.p,shape,yaw),speed=Math.hypot(m.vx,m.vz);
 if(!wall){if(m.parkourKind==='wallrun')action(m,'',0);return {};}
 const changedWall=m.wallNX*wall.nx+m.wallNZ*wall.nz<.8;
 if(changedWall)m.wallTime=0;
 m.wallNX=wall.nx;m.wallNZ=wall.nz;
 m.wallSide=-(wall.nx*-Math.cos(yaw)+wall.nz*Math.sin(yaw))>=0?1:-1;
 const sameWall=m.kicks>0&&m.lastWallNX*wall.nx+m.lastWallNZ*wall.nz>.8;
 if(input.jump&&m.kickCooldown===0&&m.kicks<6&&(!sameWall||m.parkourKind==='wallrun')){
  m.kicks++;m.kickCooldown=.30;m.lastWallNX=wall.nx;m.lastWallNZ=wall.nz;m.airAction=true;m.slideAir=true;
  if(m.parkourKind==='wallrun'){
   const entry=Math.max(0,Math.min(1,m.parkourAge/.14));m.wallSpinTilt=entry*entry*(3-2*entry);m.wallSpinYaw=yaw;m.wallSpinRise=Math.max(0,body.vy)/(input.gravity||24);m.wallSpinFinish=-1;m.wallSpinFinishDuration=0;
   const launch=(input.baseJumpSpeed||8.4)*2;m.vx=wall.nx*launch;m.vz=wall.nz*launch;action(m,'wallspin',30);return {consumeJump:true};
  }
  const dot=wx*wall.nx+wz*wall.nz;m.vx=wall.nx*6.2+(wx-dot*wall.nx)*3.5;m.vz=wall.nz*6.2+(wz-dot*wall.nz)*3.5;body.vy=7.4;action(m,'wallkick',.42);return {consumeJump:true};
 }
 if(m.kickCooldown>0||!input.sprint||input.aiming||input.crouched||amount<.25||m.wallTime>=2.4){if(m.parkourKind==='wallrun')action(m,'',0);return {};}
 const toward=wx*wall.nx+wz*wall.nz,alongX=wx-toward*wall.nx,alongZ=wz-toward*wall.nz,along=Math.hypot(alongX,alongZ);
 // Redirect input onto the wall plane: into the wall becomes upward travel,
 // tangent input runs across it. Both axes can combine for a diagonal run.
 if((speed>=3.8||body.vy>=3.8||m.parkourKind==='wallrun')&&toward<.35&&(along>.25||toward<-.35)&&body.p.y-world.floorAt(body.p,body.p.y+.01).y>.25){
  const up=Math.max(-.25,-toward),length=Math.max(.01,Math.hypot(along,up)),run=7.2;
  const height=shape.height,half=height/2,radius=Math.min(shape.width,shape.depth),offset={x:wall.nx*(half-radius),y:half-.36,z:wall.nz*(half-radius)};
  const wallShape={width:half,depth:Math.max(.36,shape.width),height:.72,yaw:Math.atan2(-wall.nz,wall.nx)};
  const occupied={x:body.p.x+offset.x,y:body.p.y+offset.y,z:body.p.z+offset.z};
  if(world.canStand(occupied,wallShape,-.015)){
   m.wallTime+=dt;m.airAction=true;m.slideAir=true;m.vx=alongX/length*run-wall.nx*.16;m.vz=alongZ/length*run-wall.nz*.16;body.vy=up>.1?up/length*run:Math.max(-1.2,Math.min(.5,body.vy));
   action(m,'wallrun',2.4);return {gravity:up>.1?0:1.5,wallShape,wallOffset:offset};
  }
 }
 if(m.parkourKind==='wallrun')action(m,'',0);return {};
}
