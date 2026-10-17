import {combatMovementEnabled} from './combat-movement.js?v=20261017-211143';
import {decodeMovement,MOVEMENT_BATCH,MOVEMENT_BACKLOG} from './movement-wire.js?v=20261017-authority122';
import {inGunZone} from './gun-layout.js?v=20261017-211143';
import {HOUSES,mirrorRealm} from './housing-data.js';
import * as THREE from './vendor/three.module.js';
import {createWorld} from './world.js?v=20261017-211143';
import {stepPlayer} from './player-physics.js?v=20261017-211143';
import {housingColliders,mirrorAvenueColliders} from './housing-collision.js?v=20261015-physics101';

// The room owns position, vertical velocity and contact state. Clients send
// ordered movement inputs and replay unacknowledged inputs after each reply.
export class ServerPlayerPhysics{
 constructor(rules){this.rules=rules;this.world=createWorld(new THREE.Scene(),{physicsOnly:true,combatOnly:(rules.settings?.combatOnly===true),gunMapId:rules.settings?.gunMap});rules.movementWorld=this.world;this.combatOnly=(rules.settings?.combatOnly===true);rules.onWorldModeChange=()=>this.resetWorld();this.layouts=new Map();this.entries=new Set();this.realms=new Set();this.timer=null;}
 resetWorld(){if(this.timer)clearInterval(this.timer);this.timer=null;for(const entry of this.entries)entry.motion=null;this.entries.clear();this.layouts.clear();this.realms.clear();this.combatOnly=(this.rules.settings?.combatOnly===true);this.world=createWorld(new THREE.Scene(),{physicsOnly:true,combatOnly:this.combatOnly,gunMapId:this.rules.settings?.gunMap});this.rules.movementWorld=this.world;}
 syncGeometry(){
  if(this.combatOnly!==(this.rules.settings?.combatOnly===true)||this.world.gunMapId!==this.rules.settings?.gunMap)this.resetWorld();
  if(this.combatOnly){for(const b of this.world.bodies)if(b.gunPropId)b.disabled=this.rules.guns.traces.has(b.gunPropId);return;}
  for(const key of this.rules.houses.realms?.keys()||[]){if(this.realms.has(key))continue;const realm=mirrorRealm(key,this.rules.houses.realms);if(!realm)continue;this.realms.add(key);
   this.world.setHouseBodies('mirror-avenue:'+key,mirrorAvenueColliders(this.world.bodies,realm,HOUSES));
   this.world.setMovementBounds(key,{...realm,allowed:(x,z)=>Math.abs(x-realm.x)<53.6&&Math.abs(z-(realm.z-62.5))<28.6});
  }
  for(const [index,layout]of Object.entries(this.rules.houses.snapshots())){if(index==='$realms')continue;
   const key=JSON.stringify([layout.rev,layout.items]);if(this.layouts.get(index)===key)continue;this.layouts.set(index,key);
   const {records,seats,beds}=housingColliders(index,layout);this.world.setHouseBodies(index,records,seats,beds);
  }
  for(const b of this.world.bodies)if(b.gunPropId)b.disabled=this.rules.guns.traces.has(b.gunPropId);
 }
 receive(entry,state,motion,now=Date.now()){
  // A board/round teleport is a server-owned boundary. In-flight packets from
  // before it must never restart a movement stream or overwrite its destination.
  if(state.gunTeleportSerial!==(entry.player.gunTeleportSerial||0)){entry.motion=null;this.entries.delete(entry);this.hold(entry,state);return;}
  if(entry.motion&&entry.motion.teleport!==(entry.player.gunTeleportSerial||0)){entry.motion=null;this.entries.delete(entry);}
  if(!motion||!Number.isInteger(motion.epoch)||!Array.isArray(motion.inputs)||motion.inputs.length>MOVEMENT_BATCH){if(entry.motion)this.apply(entry.motion,state);else if(combatMovementEnabled(entry.player,this.rules.settings.gunMap,entry.player.equippedWeapon))this.hold(entry,state);return;}
  this.syncGeometry();const p=entry.player;
  // Seated activities, portal travel, flight and knockback retain their existing
  // activity protocol. Their next walking segment starts a new prediction epoch.
  const combatZone=inGunZone(p,this.world.gunMapId),handsBusy=this.rules.living?.runs?.has(p.id)||Object.values(this.rules.cooking?.data||{}).some(record=>!!record.hands?.[p.id]),armedMovement=combatMovementEnabled(p,this.world.gunMapId,p.equippedWeapon)&&!handsBusy;
  if(combatZone){state.flight=false;state.seated=false;state.sleeping=false;}
  if(!motion.active){if(combatZone||armedMovement&&!state.flight&&!state.seated&&!state.sleeping&&!state.ragdoll){if(entry.motion)this.apply(entry.motion,state);else this.hold(entry,state);}entry.motion=null;this.entries.delete(entry);return;}
  if((combatZone?p.ragdoll:state.ragdoll)||state.flight||state.seated||state.sleeping){entry.motion=null;this.entries.delete(entry);return;}
  let m=entry.motion;
  if(!m||m.epoch!==motion.epoch||m.teleport!==(p.gunTeleportSerial||0)||Math.hypot(m.p.x-p.x,m.p.y-p.y,m.p.z-p.z)>1){
   m=entry.motion={epoch:motion.epoch,teleport:p.gunTeleportSerial||0,p:new THREE.Vector3(p.x,p.y,p.z),vy:p.verticalSpeed||0,grounded:p.grounded!==false,standingOn:null,seq:0,at:now,credit:.1};
   const support=this.world.floorAt(m.p,m.p.y+.28);m.grounded=p.grounded!==false&&Math.abs(support.y-m.p.y)<.28;
   if(m.grounded){m.p.y=support.y;m.vy=0;m.standingOn=support.body;}
  }
  if(m.suspended){this.apply(m,state);return m;}
  m.credit=Math.min(.75,m.credit+Math.max(0,now-m.at)/1000);m.at=now;m.lastInputAt=now;this.entries.add(entry);
  for(const row of motion.inputs){
   const raw=decodeMovement(row,motion.encoding);if(!raw)continue;
   if(!Number.isSafeInteger(raw.seq)||raw.seq<=m.seq||raw.seq>m.seq+MOVEMENT_BACKLOG||![raw.dt,raw.vx,raw.vz].every(Number.isFinite)||raw.dt<=0||raw.dt>.05)continue;
   if(raw.dt>m.credit+.002)break;
   m.credit-=raw.dt;const shape=raw.shape||{},clamp=(v,a,b,f)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):f;
   const input={dt:raw.dt,vx:clamp(raw.vx,-20,20,0),vz:clamp(raw.vz,-20,20,0),jump:raw.jump===true,lookYaw:clamp(raw.lookYaw,-1e6,1e6,state.yaw||0),lookPitch:clamp(raw.lookPitch,-1.3,1.3,0),prone:raw.prone===true,combat:combatMovementEnabled(m.p,this.world.gunMapId,p.equippedWeapon)&&!this.rules.duel?.ids?.includes(p.id)&&!handsBusy,wishX:clamp(raw.wishX,-1,1,0),wishZ:clamp(raw.wishZ,-1,1,0),sprint:raw.sprint===true,aiming:raw.aiming===true,crouched:raw.crouched===true,proneIntent:raw.proneIntent===true,pump:raw.pump===true,
    launch:state.attackProgress>0?clamp(raw.launch,0,10.4,0):0,lockedInArena:this.rules.duel?.ids?.includes(p.id),
    shape:{width:clamp(shape.width,.15,.75,.32),depth:clamp(shape.depth,.15,.9,.32),height:clamp(shape.height,.45,2.5,1.9),yaw:clamp(shape.yaw,-1e6,1e6,0),offset:clamp(shape.offset,0,.8,0)}};
   const standing=raw.standingShape||{};input.standingShape={width:clamp(standing.width,.15,.75,.32),depth:clamp(standing.depth,.15,.75,.32),height:clamp(standing.height,1,2.5,1.9),yaw:input.lookYaw};
   this.world.update(now/1000);stepPlayer(this.world,m,input);m.seq=raw.seq;m.input=input;m.crouched=input.crouched&&!m.combat?.prone&&!m.combat?.sliding;
  }
  this.apply(m,state);
  this.ensureTimer();return m;
 }
 hold(entry,state){const p=entry.player;for(const key of ['x','y','z','vx','vy','vz','speed','verticalSpeed','grounded','prone','crouched','sliding','slideAir','sprintCharge','hitSlideBlend','mantling','mantleProgress','parkourKind','parkourAge','parkourDuration','parkourSerial','wallSide','wallNX','wallNZ','wallSpinYaw','wallSpinRise','wallSpinTilt','wallSpinFinish','wallSpinFinishDuration'])if(p[key]!==undefined)state[key]=p[key];}
 apply(m,state){Object.assign(state,{x:m.p.x,y:m.p.y,z:m.p.z,vy:m.vy,verticalSpeed:m.vy,grounded:m.grounded,mantling:!!m.mantle});if(typeof m.crouched==='boolean')state.crouched=m.crouched;state.mantleProgress=m.mantle?m.mantle.elapsed/m.mantle.duration:0;state.parkourKind=m.combat?.parkourKind||'';for(const key of ['parkourAge','parkourDuration','parkourSerial','wallSide','wallNX','wallNZ','wallSpinYaw','wallSpinRise','wallSpinTilt','wallSpinFinish','wallSpinFinishDuration'])state[key]=m.combat?.[key]||0;if(m.combat){state.vx=m.combat.vx;state.vz=m.combat.vz;state.speed=Math.hypot(state.vx,state.vz,m.combat.parkourKind==='wallrun'?m.vy:0);state.hitSlideBlend=m.combat.slideBlend;state.sliding=m.combat.sliding;state.slideAir=m.combat.slideAir;state.sprintCharge=m.combat.sprintCharge||0;state.prone=m.combat.prone&&!state.sliding;}else{state.hitSlideBlend=0;state.sliding=false;state.slideAir=false;state.sprintCharge=0;}if(m.mantle){state.vx=state.vz=state.speed=0;}}
 reply(entry){const m=entry.motion;if(!m||(entry.player.gunTeleportSerial||0)!==m.teleport)return;entry.send({type:'motion',resync:!!m.suspended,epoch:m.epoch,seq:m.seq,teleport:m.teleport,x:m.p.x,y:m.p.y,z:m.p.z,vy:m.vy,grounded:m.grounded,mantle:m.mantle||null,combat:m.combat?{...m.combat}:null});}
 ensureTimer(){if(this.timer)return;this.tickAt=Date.now();this.timer=setInterval(()=>this.tick(),50);}
 tick(now=Date.now()){
  const dt=Math.min(.05,Math.max(0,(now-this.tickAt)/1000));this.tickAt=now;
  for(const entry of this.entries){if(![...this.rules.players.values()].includes(entry)||!entry.motion){this.entries.delete(entry);continue;}
   const m=entry.motion;if(now-m.lastInputAt<500)continue;
   const p=entry.player;if((p.gunTeleportSerial||0)!==m.teleport||p.ragdoll||p.flight||p.seated||p.sleeping){entry.motion=null;this.entries.delete(entry);continue;}
   // After a genuine input outage, stop on a new authoritative segment.
   // Old unacknowledged inputs cannot be applied on top of timeout gravity.
   m.suspended=true;m.credit=0;
   this.world.update(now/1000);stepPlayer(this.world,m,{...m.input,dt,vx:0,vz:0,wishX:0,wishZ:0,sprint:false,stop:true,jump:false,launch:0});Object.assign(p,{x:m.p.x,y:m.p.y,z:m.p.z,vy:m.vy,verticalSpeed:m.vy,grounded:m.grounded,mantling:!!m.mantle,vx:0,vz:0,speed:0});this.apply(m,p);this.reply(entry);this.rules.broadcast({type:'state',at:now,player:p});
  }
  if(!this.entries.size){clearInterval(this.timer);this.timer=null;}
 }
}
