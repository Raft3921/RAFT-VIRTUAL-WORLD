import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createCollisionWorld} from '../dist/world-collision.js';
import {createWorld} from '../dist/world.js';
import {buildCourse} from '../dist/world-layout.js';
import {stepPlayer,PLAYER_GRAVITY,PLAYER_JUMP_SPEED} from '../dist/player-physics.js';
import {ServerPlayerPhysics} from '../dist/server-player-physics.js';
import {PlayerPrediction} from '../dist/player-prediction.js';
const body=(x=0,y=0,z=0)=>({p:new THREE.Vector3(x,y,z),vy:0,grounded:true,standingOn:null});
const input=(dt=1/60)=>({dt,vx:0,vz:0,shape:{width:.32,depth:.32,height:1.9,yaw:0}});

test('ordinary jumps peak at 80 cm, land in about half a second, consistently at 20/60/144 fps',()=>{
 for(const fps of [20,60,144]){const w=createCollisionWorld([]),b=body();let peak=0,landed=0;
  for(let i=0;i<fps;i++){stepPlayer(w,b,{...input(1/fps),jump:i===0});peak=Math.max(peak,b.p.y);if(i>0&&b.grounded){landed=(i+1)/fps;break;}}
  assert(peak>.75&&peak<.81,`peak at ${fps}: ${peak}`);assert(landed>=.5&&landed<=.56);}
 assert(PLAYER_GRAVITY>=24);assert(PLAYER_JUMP_SPEED**2/(2*PLAYER_GRAVITY)<.85);
});
test('airborne crossing of a low ledge does not step or warp onto it',()=>{
 for(const ramp of [undefined,{base:0,back:.24,front:.24}]){
  const w=createCollisionWorld([{x:0,y:.12,z:0,w:2,h:.24,d:2,ramp}]),p=new THREE.Vector3(-1.4,.16,0),v=new THREE.Vector3(4,-.1,0);
  w.move(p,v,.05);assert(p.y<.17);assert(p.x<=-1.32+.001);}
});
test('a descending body lands only when its feet sweep through a platform top',()=>{
 const w=createCollisionWorld([{x:0,y:2,z:0,w:3,h:.2,d:3}]),p=new THREE.Vector3(0,3,0),v=new THREE.Vector3(0,-40,0);
 assert(w.move(p,v,.05).grounded);assert.equal(p.y,2.1);assert.equal(v.y,0);
 const q=new THREE.Vector3(0,0,0),up=new THREE.Vector3(0,10,0);w.move(q,up,.1);assert(q.y<.001);assert.equal(up.y,0);
});
test('stair sides are solid at low and high levels and for rotated stairs',()=>{
 for(const angle of [0,Math.PI/2,Math.PI/4])for(const y of [0,.6,1.5]){
  const w=createCollisionWorld([{x:0,y:1,z:0,w:2,h:2,d:6,rotation:angle,ramp:{base:0,back:0,front:2}}]);
  const local=new THREE.Vector3(-2,y,2),p=new THREE.Vector3(Math.cos(angle)*local.x+Math.sin(angle)*local.z,y,-Math.sin(angle)*local.x+Math.cos(angle)*local.z),v=new THREE.Vector3(Math.cos(angle)*6,0,-Math.sin(angle)*6);
  for(let i=0;i<30;i++)w.move(p,v,1/60);const x=Math.cos(angle)*p.x-Math.sin(angle)*p.z;
  if(y<1.65)assert(x<=-1.31,`${angle} at ${y}: ${x}`);assert(Math.abs(p.y-y)<.001);
 }
});
test('support is cleared immediately when leaving a platform and steps require head clearance',()=>{
 const w=createCollisionWorld([{x:0,y:1,z:0,w:1,h:.2,d:1}]),p=new THREE.Vector3(.7,1.1,0),v=new THREE.Vector3(10,-1,0);
 assert(!w.move(p,v,.1).grounded);
 const obstacle=createCollisionWorld([{x:0,y:.1,z:0,w:1,h:.2,d:2},{x:0,y:1.95,z:0,w:1,h:.1,d:2}]),q=new THREE.Vector3(-1,0,0),vx=new THREE.Vector3(4,-.1,0);
 obstacle.move(q,vx,.1);assert.equal(q.y,0);assert(q.x<=-.82+.001);
});
function fixture(){const replies=[],players=new Map(),rules={players,houses:{snapshots:()=>({})},guns:{traces:new Map()},broadcast(){}};
 const physics=new ServerPlayerPhysics(rules);physics.world=createCollisionWorld([]);
 const entry={player:{id:'p',x:0,y:0,z:0,verticalSpeed:0,grounded:true},send:m=>replies.push(m)};players.set('p',entry);
 return {physics,entry,replies,close:()=>clearInterval(physics.timer)};}
test('room owns jump velocity and height, ignores claimed coordinates, duplicate inputs and repeated airborne jumps',()=>{
 const f=fixture();try{let state={x:100,y:50,z:100,grounded:true,verticalSpeed:100};
  f.physics.receive(f.entry,state,{active:true,epoch:1,inputs:[{...input(.05),seq:1,jump:true}]},1000);
  assert.equal(state.x,0);assert(state.y>.26&&state.y<.30);assert(state.verticalSpeed<PLAYER_JUMP_SPEED);
  Object.assign(f.entry.player,state);const first=state.y;
  f.physics.receive(f.entry,state,{active:true,epoch:1,inputs:[{...input(.05),seq:1,jump:true},{...input(.05),seq:2,jump:true}]},1050);
  assert(state.y>first);assert(state.verticalSpeed<4.0);assert.equal(f.entry.motion.seq,2);
  f.physics.reply(f.entry);assert.equal(f.replies.at(-1).seq,2);
 }finally{f.close();}
});
test('prediction replays pending input after a delayed acknowledgement and discards old teleport replies',()=>{
 const w=createCollisionWorld([]),client=new PlayerPrediction(),b=body();
 client.step(w,b,{...input(.05),vx:2,jump:true},true);const first={p:b.p.clone(),vy:b.vy,grounded:b.grounded};
 client.step(w,b,{...input(.05),vx:2},true);const expected=b.p.clone();
 assert(client.reconcile(w,b,{epoch:client.epoch,seq:1,teleport:0,x:first.p.x,y:first.p.y,z:first.p.z,vy:first.vy,grounded:first.grounded},0));assert(b.p.distanceTo(expected)<1e-9);assert.equal(client.pending.length,1);
 assert(!client.reconcile(w,b,{epoch:client.epoch,seq:2,teleport:0,x:99,y:99,z:99,vy:0},1));
});
test('headless server builds the same stair and platform collider count without a DOM',()=>{
 const world=createWorld(new THREE.Scene(),{physicsOnly:true});assert(world.bodies.length>4000);assert(world.bodies.filter(b=>b.gunStairRoof).length>=20);
});
test('server continues falling when input stops and removes disconnected simulation entries',()=>{
 const f=fixture();try{f.entry.player.y=4;f.entry.player.grounded=false;let state={};f.physics.receive(f.entry,state,{active:true,epoch:1,inputs:[{...input(.05),seq:1}]},1000);Object.assign(f.entry.player,state);const height=state.y;
  f.physics.tickAt=1150;f.physics.tick(1200);assert(f.entry.player.y<height);assert(f.entry.player.verticalSpeed<0);
  f.physics.rules.players.clear();f.physics.tick(1300);assert.equal(f.physics.entries.size,0);assert.equal(f.physics.timer,null);
 }finally{f.close();}
});
test('rendered and headless worlds have identical colliders; furniture seats and beds remain queryable',()=>{
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:20})},{get:(o,k)=>o[k]??(()=>{})});globalThis.document={createElement:()=>({getContext:()=>context})};
 try{const visible=createWorld(new THREE.Scene()),headless=createWorld(new THREE.Scene(),{physicsOnly:true});
  const geometry=w=>w.bodies.map(({x,y,z,w,h,d,rotation,ramp})=>({x,y,z,w,h,d,rotation,ramp}));assert.deepEqual(geometry(visible),geometry(headless));
  visible.setHouseBodies('test',[],[{x:400,y:1,z:400,yaw:0}],[{id:'bed',x:404,y:1,z:404,yaw:0,w:2,d:3}]);
  assert(visible.seatAt(new THREE.Vector3(400,.95,400),1.2,-1));assert(visible.bedAt(new THREE.Vector3(404,.95,404),1.2,-1));assert.equal(visible.bedById('bed').id,'bed');
 }finally{delete globalThis.document;}
});

test('all 599 course hops remain reachable through the shared player simulation',()=>{
 const world=createWorld(new THREE.Scene(),{physicsOnly:true}),pads=buildCourse();
 for(let i=1;i<pads.length;i++){
  const a=pads[i-1],target=pads[i],b=body(a.x,a.y,a.z),direction=new THREE.Vector3(target.x-a.x,0,target.z-a.z).normalize();
  b.p.addScaledVector(direction,(Math.abs(direction.x)>.5?a.w:a.d)/2-.08);let landed=false;
  for(let n=0;n<150;n++){const near=Math.hypot(b.p.x-target.x,b.p.z-target.z)<.13;
   stepPlayer(world,b,{...input(1/120),vx:near?0:direction.x*2.8,vz:near?0:direction.z*2.8,jump:n===0});
   if(b.grounded&&b.p.y>=target.y-.02&&b.p.y<=target.y+.51&&Math.hypot(b.p.x-target.x,b.p.z-target.z)<target.size/2+.4){landed=true;break;}
  }assert(landed,'unreachable course hop '+i);
 }
});
test('normal walking in the mirror world also uses server floor and collision state',()=>{
 const f=fixture();try{f.physics.world=createWorld(new THREE.Scene(),{physicsOnly:true});f.physics.rules.houses.realms=new Map([['m|0|shared',0]]);f.physics.rules.houses.snapshots=()=>({'m|0|shared|0':{rev:0,items:[]}});
  Object.assign(f.entry.player,{x:1961,y:.245,z:1955,mirrorRealm:'m|0|shared'});const state={mirrorRealm:'m|0|shared',x:2100,y:40,z:2100};
  f.physics.receive(f.entry,state,{active:true,epoch:1,inputs:[{...input(.05),seq:1,vx:1}]},1000);
  assert(f.entry.motion);assert(Math.abs(state.x-1961.05)<1e-6);assert.equal(state.y,.245);assert(state.grounded);
 }finally{f.close();}
});
