import test from 'node:test';
import assert from 'node:assert/strict';
import {RemoteMotion} from '../dist/remote-motion.js';
const state=(t,extra={})=>({x:t/1000*4,y:0,z:0,vx:4,vy:0,vz:0,yaw:0,headYaw:0,headPitch:0,speed:4,verticalSpeed:0,grounded:true,gunTeleportSerial:0,...extra});
function simulate(fps,jitter){
 const motion=new RemoteMotion(),packets=Array.from({length:81},(_,i)=>({at:i*50,arrival:i*50+40+jitter[i%jitter.length]})).sort((a,b)=>a.arrival-b.arrival),out=[];let i=0;
 for(let now=0;now<4000;now+=1000/fps){while(i<packets.length&&packets[i].arrival<=now){const p=packets[i++];motion.push(state(p.at),p.arrival,p.at+1000000);}const s=motion.sample(now);if(s&&now>500)out.push({now,...s});}
 return out;
}
test('snapshot interpolation keeps constant walking smooth despite irregular packet arrival at 30/60/120fps',()=>{
 for(const fps of [30,60,120]){const out=simulate(fps,[0,20,5,30,0,15]);for(let i=1;i<out.length;i++){const speed=(out[i].x-out[i-1].x)/((out[i].now-out[i-1].now)/1000);assert(speed>3.5&&speed<4.5,`fps=${fps} speed=${speed}`);assert.equal(out[i].y,0);}}
});
test('short outages coast to a stop with bounded drift and recover smoothly',()=>{
 const m=new RemoteMotion();for(let t=0;t<=500;t+=50){m.push(state(t),t,t);m.sample(t);}let previous=m.sample(500).x;
 for(let t=516;t<1200;t+=16){const out=m.sample(t);assert(out.x>=previous-1e-9);assert(out.x<=2.161);previous=out.x;}
 assert.equal(m.sample(1300).speed,0);m.push(state(1300),1300,1300);const resumed=m.sample(1316);assert(Number.isFinite(resumed.x));
});
test('stale frames are ignored; teleports and realm changes discard the old trail',()=>{
 const m=new RemoteMotion();m.push(state(0),0,1000);m.push(state(50),50,1050);assert.equal(m.push(state(20),60,1020),false);
 m.push(state(100,{x:100,gunTeleportSerial:1}),100,1100);assert.equal(m.sample(100).x,100);assert.equal(m.frames.length,1);
 m.push(state(150,{x:101,gunTeleportSerial:1,mirrorRealm:'other'}),150,1150);assert.equal(m.sample(150).x,101);
});
test('rotation wraps along the short arc and jump heights interpolate without floor prediction',()=>{
 const m=new RemoteMotion();m.push(state(0,{yaw:Math.PI-.1,y:1,grounded:false}),0,0);m.push(state(100,{yaw:-Math.PI+.1,y:2,grounded:false}),100,100);const out=m.sample(150);assert(out.y>=1&&out.y<=2);assert(Math.abs(out.yaw)>3);
});
test('an unstamped older server remains supported',()=>{const m=new RemoteMotion();m.push(state(0),100);m.push(state(50),150);assert(Number.isFinite(m.sample(200).x));});
