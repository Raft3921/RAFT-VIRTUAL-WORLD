import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createCollisionWorld} from '../dist/world-collision.js';
import {findMantle,cloneMantle} from '../dist/player-mantle.js';
import {stepPlayer} from '../dist/player-physics.js';
import {PlayerPrediction} from '../dist/player-prediction.js';
import {ServerPlayerPhysics} from '../dist/server-player-physics.js';
const shape={width:.32,depth:.32,height:1.9,yaw:0};
const box=()=>({x:0,y:1,z:0,w:4,h:2,d:3});
const body=()=>({p:new T.Vector3(0,.6,-1.82),vy:1,grounded:false});
const input=(extra={})=>({dt:1/60,vx:0,vz:0,shape,lookYaw:0,lookPitch:0,...extra});
test('a second airborne jump lifts then pulls onto a reachable ledge without teleporting',()=>{
 for(const fps of [20,60,144]){const w=createCollisionWorld([box()]),b=body();let previous=b.p.clone(),started=false;
  for(let i=0;i<fps;i++){stepPlayer(w,b,input({dt:1/fps,jump:i===0}));started ||=!!b.mantle;
   assert(b.p.distanceTo(previous)<11/fps,`sudden mantle displacement at ${fps}`);assert(w.canStand(b.p,shape,-.003));previous.copy(b.p);if(b.grounded)break;
  }assert(started);assert(b.grounded);assert.equal(b.p.y,2);assert(b.p.z>-1.2&&b.p.z<-.9);assert(!b.mantle);
 }
});
test('airborne movement never automatically starts a mantle and empty space gives no double jump',()=>{
 const w=createCollisionWorld([box()]),b=body();stepPlayer(w,b,input());assert(!b.mantle);
 const empty=createCollisionWorld([]),q=body();stepPlayer(empty,q,input({jump:true}));assert(!q.mantle);assert(q.vy<1);
});
test('mantling requires the viewed ledge, sufficient hand reach and standing depth',()=>{
 const p=body().p,w=createCollisionWorld([box()]);assert(findMantle(w,p,shape,0,0));assert(!findMantle(w,p,shape,Math.PI,0));
 assert(!findMantle(w,new T.Vector3(0,.6,-3),shape,0,0));assert(!findMantle(createCollisionWorld([{...box(),y:3,h:6}]),p,shape,0,0));
 assert(!findMantle(createCollisionWorld([{...box(),d:.3,z:-1.35}]),p,shape,0,0));assert(!findMantle(w,p,shape,0,1.3));
});
test('ceiling, landing obstruction and an intervening wall each reject a mantle',()=>{
 const p=body().p;
 for(const obstacle of [
  {x:0,y:3.2,z:-1.8,w:4,h:.2,d:1},
  {x:0,y:2.8,z:-.9,w:4,h:1.6,d:.5},
  {x:0,y:2,z:-1.55,w:4,h:4,d:.12},
 ])assert(!findMantle(createCollisionWorld([box(),obstacle]),p,shape,0,0));
});
test('rotated ledges have the same reach and support requirements',()=>{
 const a=Math.PI/4,b=body(),old=b.p.clone();b.p.set(Math.cos(a)*old.x+Math.sin(a)*old.z,old.y,-Math.sin(a)*old.x+Math.cos(a)*old.z);
 const w=createCollisionWorld([{...box(),rotation:a}]),s={...shape,yaw:a};assert(findMantle(w,b.p,s,a,0));
 for(let i=0;i<90;i++)stepPlayer(w,b,input({shape:s,lookYaw:a,jump:i===0}));assert(b.grounded);assert.equal(b.p.y,2);
});
test('losing support or gaining an obstruction cancels a mantle instead of passing through it',()=>{
 for(const remove of [true,false]){const ledge=box(),w=createCollisionWorld([ledge]),b=body();stepPlayer(w,b,input({jump:true}));assert(b.mantle);
  if(remove)ledge.disabled=true;else w.setHouseBodies('obstruction',[{x:0,y:2.8,z:-1.82,w:3,h:.2,d:1}]);
  for(let i=0;i<25&&b.mantle;i++)stepPlayer(w,b,input());assert(!b.mantle);assert(b.p.z<=-1.8);assert(b.p.y<2);
 }
});
test('acknowledgements include mantle progress and prediction replays the rest of the climb',()=>{
 const w=createCollisionWorld([box()]),b=body(),prediction=new PlayerPrediction();prediction.step(w,b,input({jump:true}),true);
 const state={epoch:prediction.epoch,seq:1,teleport:0,x:b.p.x,y:b.p.y,z:b.p.z,vy:b.vy,grounded:b.grounded,mantle:cloneMantle(b.mantle)};
 for(let i=0;i<8;i++)prediction.step(w,b,input(),true);const expected=b.p.clone();
 assert(prediction.reconcile(w,b,state,0));assert(b.p.distanceTo(expected)<1e-9);assert(prediction.mantle);assert.equal(state.mantle.elapsed,1/60,'replay does not mutate the server acknowledgement');
});
test('server finds the ledge itself, ignores forged climb targets and publishes climbing state',()=>{
 const replies=[],entry={player:{id:'p',x:0,y:.6,z:-1.82,verticalSpeed:1,grounded:false,yaw:0},send:m=>replies.push(m)};
 const rules={players:new Map([['p',entry]]),houses:{snapshots:()=>({})},guns:{traces:new Map()},broadcast(){}};
 const physics=new ServerPlayerPhysics(rules);physics.world=createCollisionWorld([box()]);const state={...entry.player};
 try{physics.receive(entry,state,{active:true,epoch:1,inputs:[{...input({jump:true}),seq:1,mantle:{to:{x:999,y:999,z:999}}}]},1000);assert(state.mantling);assert.equal(state.speed,0);assert.equal(state.vx,0);assert.equal(state.vz,0);assert(state.y<.7);physics.reply(entry);assert(replies[0].mantle);assert.equal(replies[0].mantle.to.y,2.02);}
 finally{clearInterval(physics.timer);}
});
