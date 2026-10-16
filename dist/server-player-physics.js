import {HOUSES,mirrorRealm} from './housing-data.js';
import * as THREE from './vendor/three.module.js';
import {createWorld} from './world.js?v=20261016-cinema106';
import {stepPlayer} from './player-physics.js?v=20261016-combatonly105';
import {housingColliders,mirrorAvenueColliders} from './housing-collision.js?v=20261015-physics101';

// The room owns position, vertical velocity and contact state. Clients send
// ordered movement inputs and replay unacknowledged inputs after each reply.
export class ServerPlayerPhysics{
 constructor(rules){this.rules=rules;this.world=createWorld(new THREE.Scene(),{physicsOnly:true,combatOnly:(rules.settings?.combatOnly===true)});rules.movementWorld=this.world;this.combatOnly=(rules.settings?.combatOnly===true);rules.onWorldModeChange=()=>this.resetWorld();this.layouts=new Map();this.entries=new Set();this.realms=new Set();this.timer=null;}
 resetWorld(){if(this.timer)clearInterval(this.timer);this.timer=null;for(const entry of this.entries)entry.motion=null;this.entries.clear();this.layouts.clear();this.realms.clear();this.combatOnly=(this.rules.settings?.combatOnly===true);this.world=createWorld(new THREE.Scene(),{physicsOnly:true,combatOnly:this.combatOnly});this.rules.movementWorld=this.world;}
 syncGeometry(){
  if(this.combatOnly!==(this.rules.settings?.combatOnly===true))this.resetWorld();
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
  if(!motion||!Number.isInteger(motion.epoch)||!Array.isArray(motion.inputs)||motion.inputs.length>32){if(entry.motion)this.apply(entry.motion,state);return;}
  this.syncGeometry();const p=entry.player;
  // Seated activities, portal travel, flight and knockback retain their existing
  // activity protocol. Their next walking segment starts a new prediction epoch.
  if(!motion.active||state.flight||state.ragdoll||state.seated||state.sleeping){entry.motion=null;this.entries.delete(entry);return;}
  let m=entry.motion;
  if(!m||m.epoch!==motion.epoch||m.teleport!==(p.gunTeleportSerial||0)||Math.hypot(m.p.x-p.x,m.p.y-p.y,m.p.z-p.z)>1){
   m=entry.motion={epoch:motion.epoch,teleport:p.gunTeleportSerial||0,p:new THREE.Vector3(p.x,p.y,p.z),vy:p.verticalSpeed||0,grounded:p.grounded!==false,standingOn:null,seq:0,at:now,credit:.1};
   const support=this.world.floorAt(m.p,m.p.y+.28);m.grounded=p.grounded!==false&&Math.abs(support.y-m.p.y)<.28;
   if(m.grounded){m.p.y=support.y;m.vy=0;m.standingOn=support.body;}
  }
  m.credit=Math.min(.3,m.credit+Math.max(0,now-m.at)/1000);m.at=now;m.lastInputAt=now;this.entries.add(entry);
  for(const raw of motion.inputs){
   if(!Number.isSafeInteger(raw.seq)||raw.seq<=m.seq||raw.seq>m.seq+120||![raw.dt,raw.vx,raw.vz].every(Number.isFinite)||raw.dt<=0||raw.dt>.05)continue;
   if(raw.dt>m.credit+.002)break;
   m.credit-=raw.dt;const shape=raw.shape||{},clamp=(v,a,b,f)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):f;
   const input={dt:raw.dt,vx:clamp(raw.vx,-20,20,0),vz:clamp(raw.vz,-20,20,0),jump:raw.jump===true,lookYaw:clamp(raw.lookYaw,-1e6,1e6,state.yaw||0),lookPitch:clamp(raw.lookPitch,-1.3,1.3,0),prone:state.prone,pump:raw.pump===true,
    launch:state.attackProgress>0?clamp(raw.launch,0,10.4,0):0,lockedInArena:this.rules.duel?.ids?.includes(p.id),
    shape:{width:clamp(shape.width,.15,.75,.32),depth:clamp(shape.depth,.15,.9,.32),height:clamp(shape.height,.45,2.5,1.9),yaw:clamp(shape.yaw,-1e6,1e6,0),offset:clamp(shape.offset,0,.8,0)}};
   this.world.update(now/1000);stepPlayer(this.world,m,input);m.seq=raw.seq;m.input=input;
  }
  this.apply(m,state);
  this.ensureTimer();return m;
 }
 apply(m,state){Object.assign(state,{x:m.p.x,y:m.p.y,z:m.p.z,vy:m.vy,verticalSpeed:m.vy,grounded:m.grounded,mantling:!!m.mantle});if(m.mantle){state.vx=state.vz=state.speed=0;}}
 reply(entry){const m=entry.motion;if(!m||(entry.player.gunTeleportSerial||0)!==m.teleport)return;entry.send({type:'motion',epoch:m.epoch,seq:m.seq,teleport:m.teleport,x:m.p.x,y:m.p.y,z:m.p.z,vy:m.vy,grounded:m.grounded,mantle:m.mantle||null});}
 ensureTimer(){if(this.timer)return;this.tickAt=Date.now();this.timer=setInterval(()=>this.tick(),50);}
 tick(now=Date.now()){
  const dt=Math.min(.05,Math.max(0,(now-this.tickAt)/1000));this.tickAt=now;
  for(const entry of this.entries){if(![...this.rules.players.values()].includes(entry)||!entry.motion){this.entries.delete(entry);continue;}
   const m=entry.motion;if(now-m.lastInputAt<150)continue;
   const p=entry.player;if((p.gunTeleportSerial||0)!==m.teleport||p.ragdoll||p.flight||p.seated||p.sleeping){entry.motion=null;this.entries.delete(entry);continue;}
   // Lost or suspended clients stop walking, but continue to fall on the server.
   this.world.update(now/1000);stepPlayer(this.world,m,{...m.input,dt,vx:0,vz:0,jump:false,launch:0});Object.assign(p,{x:m.p.x,y:m.p.y,z:m.p.z,vy:m.vy,verticalSpeed:m.vy,grounded:m.grounded,mantling:!!m.mantle,vx:0,vz:0,speed:0});this.reply(entry);this.rules.broadcast({type:'state',at:now,player:p});
  }
  if(!this.entries.size){clearInterval(this.timer);this.timer=null;}
 }
}
