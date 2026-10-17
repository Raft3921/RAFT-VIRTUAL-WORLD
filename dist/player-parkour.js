// Shared contact-based acrobatics. The client submits only ordinary movement /
// jump controls; wall normals, impulses and action budgets are server-derived.
export function parkourDefaults(){return {parkourKind:'',parkourAge:0,parkourDuration:0,parkourSerial:0,wallSide:0,wallNX:0,wallNZ:0,wallTime:0,climbTime:0,kickCooldown:0,flipCooldown:0,kicks:0,lastWallNX:0,lastWallNZ:0,airAction:false};}
export function parkourHandsBusy(p){return !!p.mantling||['climb','backflip','wallkick'].includes(p.parkourKind);}
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
 if(body.grounded){if(m.airAction)action(m,'',0);m.wallTime=m.climbTime=0;m.kicks=0;m.lastWallNX=m.lastWallNZ=0;m.airAction=false;if(m.parkourKind!=='backflip')action(m,'',0);}
 if(body.mantle||m.prone||m.sliding||input.stop){action(m,'',0);return {};}
 const yaw=input.lookYaw||0,shape=input.standingShape||{width:.32,depth:.32,height:1.9},wx=input.wishX||0,wz=input.wishZ||0,amount=Math.hypot(wx,wz),forward=wx*Math.sin(yaw)+wz*Math.cos(yaw);
 // Back + jump is an explicit grounded action; require the whole jump arc's
 // headroom so a low ceiling does not initiate a spin that cannot finish.
 if(body.grounded&&input.jump&&!input.crouched&&!input.aiming&&forward<-.35&&m.flipCooldown===0&&world.canStand(body.p,{...shape,height:shape.height+1.5,yaw})){
  m.flipCooldown=1;m.airAction=true;m.vx=-Math.sin(yaw)*4.8;m.vz=-Math.cos(yaw)*4.8;action(m,'backflip',.64);return {};
 }
 if(body.grounded)return {};
 const wall=findParkourWall(world,body.p,shape,yaw),speed=Math.hypot(m.vx,m.vz);
 if(!wall){if(['wallrun','climb'].includes(m.parkourKind))action(m,'',0);return {};}
 m.wallNX=wall.nx;m.wallNZ=wall.nz;m.wallSide=-(wall.nx*-Math.cos(yaw)+wall.nz*Math.sin(yaw))>=0?1:-1;
 const sameWall=m.kicks>0&&m.lastWallNX*wall.nx+m.lastWallNZ*wall.nz>.8;
 if(input.jump&&m.kickCooldown===0&&m.kicks<3&&!sameWall){
  m.kicks++;m.kickCooldown=.30;m.lastWallNX=wall.nx;m.lastWallNZ=wall.nz;m.airAction=true;m.slideAir=true;
  const dot=wx*wall.nx+wz*wall.nz;m.vx=wall.nx*5.8+(wx-dot*wall.nx)*2.4;m.vz=wall.nz*5.8+(wz-dot*wall.nz)*2.4;body.vy=7.8;action(m,'wallkick',.42);return {consumeJump:true};
 }
 if(m.kickCooldown>0||!input.sprint||input.aiming||amount<.25||m.wallTime>=1.2||m.parkourKind==='backflip'){if(['wallrun','climb'].includes(m.parkourKind))action(m,'',0);return {};}
 const toward=wx*wall.nx+wz*wall.nz;
 // A frontal dash jump climbs for a bounded burst; ledge pull-up takes over
 // in player-physics as soon as its full-body path becomes available.
 if(toward<-.65&&m.climbTime<.90){
  m.wallTime+=dt;m.climbTime+=dt;m.airAction=true;m.vx=-wall.nx*.35;m.vz=-wall.nz*.35;body.vy=Math.max(4.4,Math.min(5.6,body.vy));action(m,'climb',.95);return {gravity:2,climbing:true};
 }
 const alongX=wx-toward*wall.nx,alongZ=wz-toward*wall.nz,along=Math.hypot(alongX,alongZ);
 if(speed>=4.4&&along>.55&&toward<.35&&body.p.y-world.floorAt(body.p,body.p.y+.01).y>.25){
  m.wallTime+=dt;m.airAction=true;m.vx=alongX/along*Math.max(5.8,Math.min(7.2,speed))-wall.nx*.12;m.vz=alongZ/along*Math.max(5.8,Math.min(7.2,speed))-wall.nz*.12;body.vy=Math.max(-.8,Math.min(1.5,body.vy));action(m,'wallrun',1.2);return {gravity:4};
 }
 if(['wallrun','climb'].includes(m.parkourKind))action(m,'',0);return {};
}
