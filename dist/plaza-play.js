import * as THREE from 'three';
import {PLAZA,FURNITURE_BY_ID,furniturePose} from './housing-data.js';
import {playHint,stepSwing,swingSeat,motionAngle} from './plaza-play-shared.js?v=20261013-life89b';
import {springLaunch} from './plaza-surfaces.js?v=20261013-life89b';
export function createPlazaPlay({scene,camera,view,get,send,notify,onStart,onEnd,mapTexture,openMap,openMenu,openGuide,openPlayers}){
 const states=new Map(),notices=new Map(),bounces=new Map(),ray=new THREE.Raycaster(),direction=new THREE.Vector3(),point=new THREE.Vector3(),scratch=new THREE.Object3D(),matrix=new THREE.Matrix4();let run=null,near=null,lastUI=0,lastNear=0,lastSend=0,layoutKey='',requestAt=-Infinity,flight=null;
 const panel=document.createElement('aside');panel.id='plazaPlayControls';panel.hidden=true;panel.innerHTML='<strong></strong><p></p><div><button data-play-start>遊ぶ</button><button data-play-leave hidden>降りる</button></div>';document.body.append(panel);
 panel.querySelector('[data-play-start]').onclick=()=>start(near);panel.querySelector('[data-play-leave]').onclick=()=>leave();
 function itemAt(id){return view.rooms.plaza?.layout.items.find(i=>i.id===id);}
 function start(t){if(!t||run||['slide','trampoline'].includes(t.def.design)||performance.now()-requestAt<1000)return;const s=get();if(!s.connected){notify('接続してから遊んでください');return;}requestAt=performance.now();send({type:'plaza-play',action:'start',itemId:t.item.id});}
 function leave(sendStop=true,launch=null){if(!run)return;const r=run,position=get().player?.position.clone();run=null;if(sendStop)send({type:'plaza-play',action:'stop',itemId:r.itemId});if(launch){flight={velocity:new THREE.Vector3(launch.x,0,launch.z),at:performance.now()};}onEnd(position,launch);panel.hidden=true;}
 function receive(m){
  if(m.type==='plaza-bounce'){bounces.set(m.itemId,m);return true;}
  if(m.type!=='plaza-play-state'&&m.type!=='plaza-play-error')return false;
  if(m.type==='plaza-play-error'){if(m.playerId===get().selfId)notify(m.error);return true;}
  if(!m.active){states.delete(m.playerId);const item=itemAt(m.itemId);if(item)view.preview('plaza',item);if(run&&m.playerId===get().selfId)leave(false);return true;}
  states.set(m.playerId,m);
  if(m.playerId===get().selfId){if(!run){const item=itemAt(m.itemId);if(!item)return true;const pose=furniturePose(item),player=get().player,localZ=Math.sin(pose.yaw)*(player.position.x-PLAZA.x-pose.x)+Math.cos(pose.yaw)*(player.position.z-PLAZA.z-pose.z),end=['monkey','zipline'].includes(m.kind)&&localZ>0;run={...m,elapsed:0,progress:end?1:0,direction:end?-1:1,side:0,angle:0,angularVelocity:0,charge:0,chargeX:0,chargeZ:0};onStart(run,item);}else if(['seesaw','carousel'].includes(run.kind)){run.angle=m.angle||0;run.angularVelocity=m.angularVelocity||0;run.waiting=m.waiting;}}
  return true;
 }
 function jump(){if(!run)return false;const item=itemAt(run.itemId),p=furniturePose(item);let launch={x:0,y:4.6,z:0};if(run.kind==='carousel'){const speed=(run.angularVelocity||0)*FURNITURE_BY_ID.get(item.t).w*.25,a=run.angle||0;launch={x:Math.cos(a+p.yaw)*speed,y:5.5,z:-Math.sin(a+p.yaw)*speed};}leave(true,launch);return true;}
 function noticesSync(room){const key=room?room.geometryKey+':'+room.layout.rev:'';if(key===layoutKey)return;layoutKey=key;for(const entry of notices.values()){entry.mesh.removeFromParent();if(entry.owns)entry.texture.dispose();entry.mesh.geometry.dispose();entry.mesh.material.dispose();}notices.clear();if(!room)return;for(const item of room.layout.items){const f=FURNITURE_BY_ID.get(item.t);if(f.family!=='outdoor'||!['map','menu','guide','players'].includes(f.design))continue;const p=(room.references.get(item.id)||[]).find(ref=>ref.part.role==='notice')?.part;if(!p)continue;let texture=mapTexture,owns=false;if(f.design!=='map'){const c=document.createElement('canvas');c.width=256;c.height=128;const q=c.getContext('2d');q.fillStyle='#193641';q.fillRect(0,0,256,128);q.strokeStyle='#9ac9b3';q.lineWidth=8;q.strokeRect(4,4,248,120);q.fillStyle='#edf2db';q.textAlign='center';q.font='22px DotGothic16,monospace';q.fillText({menu:'WORLD MENU',guide:'遊び方',players:'プレイヤー'}[f.design],128,54);q.font='15px DotGothic16,monospace';q.fillText('E / タップで開く',128,91);texture=new THREE.CanvasTexture(c);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;owns=true;}const mesh=new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.h),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false})),pose=furniturePose(item);mesh.position.set(pose.x+p.x,pose.y+p.y,pose.z+p.z+p.d/2+.005);scratch.position.set(pose.x,pose.y,pose.z);scratch.rotation.set(0,pose.yaw,0);scratch.updateMatrix();point.set(p.x,p.y,p.z+p.d/2+.005).applyMatrix4(scratch.matrix);mesh.position.copy(point);mesh.rotation.y=pose.yaw;room.group.add(mesh);notices.set(item.id,{mesh,texture,owns});}}
 function openBoard(t){({map:openMap,menu:openMenu,guide:openGuide,players:openPlayers})[t.def.design]?.();}
 function nearest(room,s){if(!room||!s.player)return null;camera.getWorldDirection(direction);ray.set(camera.position,direction);const id=view.pick(ray,'plaza');let best=null,distance=Infinity;for(const item of room.layout.items){const def=FURNITURE_BY_ID.get(item.t);if(['slide','trampoline'].includes(def.design)||!['outdoor','playground'].includes(def.family)||def.family==='outdoor'&&!['map','menu','guide','players'].includes(def.design))continue;const pose=furniturePose(item);point.set(pose.x,pose.y+Math.min(1.5,pose.h/2),pose.z);room.group.localToWorld(point);const d=Math.hypot(s.player.position.x-point.x,s.player.position.z-point.z);if(d>Math.max(3,Math.hypot(def.w,def.d)*.55+1)||d>distance&&item.id!==id)continue;const aim=point.clone().sub(camera.position);if(item.id!==id&&aim.normalize().dot(direction)<.55)continue;best={item,def,pose,position:point.clone()};distance=item.id===id?-1:d;}return best;}
 function update(dt,now){
  const s=get(),room=view.rooms.plaza;noticesSync(room);
  if(run&&(!s.inStudio||s.editing||s.paused||s.ragdoll||!s.connected||!itemAt(run.itemId)))leave(s.connected);
  const allowed=s.inStudio&&!s.paused&&!s.editing&&!s.ragdoll;
  if(!allowed||run)near=null;else if(now-lastNear>100){lastNear=now;near=nearest(room,s);}
  if(run&&allowed){
   const input=s.input(),item=itemAt(run.itemId),def=FURNITURE_BY_ID.get(item.t);run.elapsed+=dt;run.input=input.y;run.inputX=input.x;run.lift=input.lift;
   if(run.kind==='swing')stepSwing(run,input.y,dt,swingSeat(def,0).length);
   else if(run.kind==='spring'){
    const held=Math.hypot(input.x,input.y)>.1;
    if(held){run.charge=Math.min(2.5,run.charge+dt);run.chargeX=THREE.MathUtils.damp(run.chargeX,input.x,8,dt);run.chargeZ=THREE.MathUtils.damp(run.chargeZ,-input.y,8,dt);}
    else if(run.charge>.12){const launch=springLaunch(run.chargeX,run.chargeZ,run.charge,furniturePose(item).yaw);leave(true,launch);}
   }else if(run.kind==='carousel'){run.angle+=(run.angularVelocity||0)*dt;}
   else if(run.kind==='climb'){run.progress=THREE.MathUtils.clamp(run.progress+input.y*dt*(input.lift?4.8:2.8)/def.h,0,1);run.side=THREE.MathUtils.clamp(run.side+input.x*dt*(input.lift?4:2.5)/def.w,-.4,.4);}
   else if(run.kind==='monkey')run.progress=THREE.MathUtils.clamp(run.progress+input.y*run.direction*dt*(input.lift?.9:.55),0,1);
   else if(run.kind==='zipline'){run.progress=THREE.MathUtils.clamp(run.progress+run.direction*dt*(.28+Math.max(0,input.y)*.35),0,1);run.angle=Math.sin(run.elapsed*3)*.18;}
   if(run?.kind==='climb'&&run.progress>=1&&input.y>0){run.mantle=(run.mantle||0)+dt;if(run.mantle>.4){constrain();leave(true,{x:0,y:1.8,z:0});}}
   if(run&&now-lastSend>180){lastSend=now;send({type:'plaza-play',action:'input',itemId:run.itemId,input:run.input,inputX:run.inputX,lift:run.lift,progress:run.progress,angle:run.angle,angularVelocity:run.angularVelocity,charge:run.charge});}
   if(run&&(run.direction>0?run.progress>=1:run.progress<=0)&&['zipline','monkey'].includes(run.kind)){const p=furniturePose(item),v=(run.kind==='zipline'?6:1.5)*run.direction;leave(true,{x:Math.sin(p.yaw)*v,y:2,z:Math.cos(p.yaw)*v});}
  }
  if(now-lastUI>100){lastUI=now;const t=run?{def:FURNITURE_BY_ID.get(itemAt(run.itemId)?.t)}:near;panel.hidden=!allowed||!t||!run&&t.def.family!=='playground';if(!panel.hidden){panel.querySelector('strong').textContent=t.def.name;panel.querySelector('p').textContent=(run?.kind==='seesaw'&&[...states.values()].filter(r=>r.itemId===run.itemId).length<2?'もう1人が乗ると動きます · ':'')+playHint[t.def.design];panel.querySelector('[data-play-start]').hidden=!!run;panel.querySelector('[data-play-leave]').hidden=!run;}}
 }
 function constrain(){
  if(!run)return false;const s=get(),item=itemAt(run.itemId);if(!item)return false;const def=FURNITURE_BY_ID.get(item.t),p=furniturePose(item),kind=run.kind,t=run.progress||0,a=kind==='seesaw'?motionAngle(states.get(s.selfId),s.serverNow()):run.angle||0,seatOffset=s.avatar?.seatOffset||.41;let x=0,y=.3,z=0;
  if(kind==='swing'){const seat=swingSeat(def,a,run.slot);x=seat.x;y=seat.y+def.h*.88*.0175-seatOffset;z=seat.z;}
  else if(kind==='zipline'){const seat=swingSeat(def,a);z=(t-.5)*def.d*.88*.86+seat.z;y=seat.y-(s.avatar?.eyeHeight||1.68)-.42;}
  else if(kind==='monkey'){z=(t-.5)*def.d*.88*.75;y=def.h*.88*.94-(s.avatar?.eyeHeight||1.68)-.48;}
  else if(kind==='climb'){x=(run.side||0)*def.w*.88;z=def.d*.88*(def.id==='play-climbing-wall'?-.18:.46);const reach=Math.max(.2,def.h*.88-(s.avatar?.eyeHeight||1.68)-.35),mantle=Math.min(1,(run.mantle||0)/.4);y=t*reach+mantle*(def.h*.88-reach);z-=mantle*def.d*.88*(def.id==='play-climbing-wall'?.2:.18);}
  else if(kind==='seesaw'){x=(run.slot===1?-1:1)*def.w*.88*.4;y=def.h*.88*.51+Math.sin(a)*x-seatOffset;}
  else if(kind==='spring'){x=run.chargeX*.14;z=run.chargeZ*.14;y=def.h*.88*.64-seatOffset;}
  else if(kind==='carousel'){const a=run.angle+(run.slot||0)*Math.PI/2;x=Math.sin(a)*def.w*.88*.28;z=Math.cos(a)*def.d*.88*.28;y=def.h*.88*.15;}
  point.set(p.x+Math.cos(p.yaw)*x+Math.sin(p.yaw)*z,p.y+Math.max(0,y),p.z-Math.sin(p.yaw)*x+Math.cos(p.yaw)*z);view.rooms.plaza.group.localToWorld(point);s.player.position.copy(point);if(kind==='carousel')s.player.rotation.y=p.yaw+run.angle+(run.slot||0)*Math.PI/2+Math.PI;return true;
 }
 function bounce(body,velocity){const m={type:'plaza-bounce',itemId:body.plazaItemId,velocity,playerId:get().selfId,at:get().serverNow()};receive(m);send(m);}
 function applyFlight(velocity,dt,grounded){if(!flight)return;if((grounded&&performance.now()-flight.at>250)||performance.now()-flight.at>5000){flight=null;return;}flight.velocity.multiplyScalar(Math.exp(-dt*.2));velocity.copy(flight.velocity);}
 function animate(now){
  const s=get(),room=view.rooms.plaza;if(!room?.group.visible)return;const clock=s.serverNow(),records=[...states.values()];if(run){const i=records.findIndex(r=>r.playerId===s.selfId);const own={...run,playerId:s.selfId,updatedAt:clock};if(i>=0)records[i]=own;else records.push(own);}
  const ids=new Set(records.map(r=>r.itemId));for(const [id,b]of bounces){if(clock-b.at<1000)ids.add(id);else{const item=itemAt(id);if(item)view.preview('plaza',item);bounces.delete(id);}}
  for(const id of ids){const item=itemAt(id);if(!item)continue;const def=FURNITURE_BY_ID.get(item.t),p=furniturePose(item),r=records.find(r=>r.itemId===id),bounce=bounces.get(id);
   for(const ref of room.references.get(id)||[]){if(!['ride','mat'].includes(ref.part.role))continue;const part=ref.part,occupant=part.rideSlot===undefined?r:records.find(r=>r.itemId===id&&(r.slot||0)===part.rideSlot),a=motionAngle(occupant,clock);scratch.position.set(part.x,part.y,part.z);scratch.rotation.set(part.rx||0,part.ry||0,part.rz||0);
    if(def.design==='swing'){const top=swingSeat(def,0).top;scratch.position.y=top+(part.y-top)*Math.cos(a)-part.z*Math.sin(a);scratch.position.z=(part.y-top)*Math.sin(a)+part.z*Math.cos(a);scratch.rotation.x=a;}
    else if(def.design==='zipline'){const top=def.h*.88*.95;scratch.position.y=top+(part.y-top)*Math.cos(a);scratch.position.z=(part.y-top)*Math.sin(a)+((occupant?.progress||0)-.5)*def.d*.88*.86;scratch.rotation.x=a;}
    else if(def.design==='seesaw'){const pivot=def.h*.88*.47;scratch.position.y=pivot+(part.y-pivot)*Math.cos(a)+part.x*Math.sin(a);scratch.position.x=part.x*Math.cos(a)-(part.y-pivot)*Math.sin(a);scratch.rotation.z=a;}
    else if(def.design==='spring'){const rx=(r?.input||0)*Math.min(.45,(r?.charge||0)*.18),rz=-(r?.inputX||0)*Math.min(.45,(r?.charge||0)*.18);scratch.rotation.x=rx;scratch.rotation.z=rz;const pivot=new THREE.Vector3(0,def.h*.88*.25,0);point.copy(scratch.position).sub(pivot).applyEuler(scratch.rotation).add(pivot);scratch.position.copy(point);}
    else if(def.design==='carousel'){scratch.position.x=part.x*Math.cos(a)+part.z*Math.sin(a);scratch.position.z=-part.x*Math.sin(a)+part.z*Math.cos(a);scratch.rotation.y=(part.ry||0)+a;}
    else if(def.design==='trampoline'&&bounce){const age=Math.max(0,(clock-bounce.at)/1000),rad=Math.hypot(part.x/(def.w*.4),part.z/(def.d*.4)),dip=Math.sin(age*19)*Math.exp(-age*5)*Math.min(.26,bounce.velocity*.022);scratch.position.y-=dip*Math.max(.1,1-rad*.7);scratch.rotation.x=part.z/(def.d*.4)*dip*.2;scratch.rotation.z=-part.x/(def.w*.4)*dip*.2;}
    scratch.scale.set(part.w,part.h,part.d);scratch.updateMatrix();matrix.copy(scratch.matrix);scratch.position.set(p.x,p.y,p.z);scratch.rotation.set(0,p.yaw,0);scratch.scale.set(1,1,1);scratch.updateMatrix();matrix.premultiply(scratch.matrix);ref.mesh.setMatrixAt(ref.instance,matrix);ref.mesh.instanceMatrix.needsUpdate=true;
   }
  }
  for(const person of [{id:s.selfId,actor:s.avatar},...(s.peers||[])]){if(!person.actor)continue;const r=records.find(r=>r.playerId===person.id);if(r){person.actor.applyPlayPose?.({kind:r.kind,angle:motionAngle(r,clock),phase:(clock-r.startedAt)/1000,lift:r.lift,charge:r.charge,inputX:r.inputX,input:r.input});continue;}const b=[...bounces.values()].find(b=>b.playerId===person.id);if(b){person.actor.applyPlayPose?.({kind:'trampoline',phase:(clock-b.at)/1000});continue;}const floor=s.world?.floorAt(person.actor.root.position,person.actor.root.position.y+.15);if(floor?.body?.playKind==='slide'&&Math.abs(person.actor.root.position.y-floor.y)<.3)person.actor.applyPlayPose?.({kind:'slide',phase:clock/1000});else if(person.id===s.selfId&&flight)person.actor.applyPlayPose?.({kind:'launch',phase:(performance.now()-flight.at)/1000});}
 }
 return {hydrate(records){const active=new Set(records.map(r=>r.playerId));for(const [id,r]of states)if(!active.has(id))receive({...r,active:false});for(const r of records)receive(r);},update,constrain,animate,receive,jump,bounce,applyFlight,stop:leave,get active(){return !!run;},get interaction(){if(run||!near)return null;return {x:near.position.x,y:near.position.y+.5,z:near.position.z,label:near.def.family==='playground'?'遊ぶ':near.def.name,action:()=>near.def.family==='playground'?start(near):openBoard(near)};}};
}
