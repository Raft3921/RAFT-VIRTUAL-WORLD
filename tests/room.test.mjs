import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import assert from 'node:assert/strict';
import {ARENA} from '../dist/world-layout.js';
const server=spawn(process.execPath,['server/lan.js'],{env:{...process.env,PORT:'4180'},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.stderr.once('data',d=>reject(Error(String(d))));});
const clients=[];
async function connect(profile=crypto.randomUUID()){
  const ws=new WebSocket('ws://localhost:4180/room?profile='+profile,{origin:'http://localhost:4180'}),inbox=[];
  ws.on('message',data=>inbox.push(JSON.parse(data)));
  const wait=async type=>{const start=Date.now();while(Date.now()-start<3000){const i=inbox.findIndex(m=>m.type===type);if(i>=0)return inbox.splice(i,1)[0];await new Promise(r=>setTimeout(r,10));}throw Error('Missing '+type);};
  const joined=await wait('joined');clients.push(ws);return {ws,wait,profile,id:joined.self.id,self:joined.self};
}
try{
  const a=await connect(),b=await connect(),spectator=await connect();
  const state=(x,z)=>({x,y:.24,z,yaw:0,grounded:true,crownEnabled:true,seated:false});
  a.ws.send(JSON.stringify({type:'state',state:state(ARENA.x,ARENA.z)}));b.ws.send(JSON.stringify({type:'state',state:state(ARENA.x,ARENA.z+2)}));
  await spectator.wait('state');await spectator.wait('state');
  a.ws.send(JSON.stringify({type:'swing',held:0}));await b.wait('duel-ready');
  b.ws.send(JSON.stringify({type:'swing',held:0}));const startA=await a.wait('duel-start'),startB=await b.wait('duel-start');assert.deepEqual(startA.ids,startB.ids);
  await new Promise(r=>setTimeout(r,280));a.ws.send(JSON.stringify({type:'swing',held:9,target:b.id}));
  const damage=await b.wait('duel-damage');assert.equal(damage.damage[b.id],10);
  const hit=await spectator.wait('punch');assert.equal(hit.hitSerial,1);
  assert(hit.freeze>=.12&&hit.freeze<=.3);assert.deepEqual(hit.targetPosition,{x:ARENA.x,y:.24,z:ARENA.z+2});
  // A state sent just before receiving the hit cannot restore an upright pose.
  b.ws.send(JSON.stringify({type:'state',state:{...state(ARENA.x+3,ARENA.z+2),hitSerial:0,ragdoll:false}}));
  const stale=await spectator.wait('state');assert.equal(stale.player.ragdoll,true);assert.equal(stale.player.hitSerial,1);assert.equal(stale.player.hitPhase,'impact');assert.equal(stale.player.x,ARENA.x);
  a.ws.send(JSON.stringify({type:'state',state:state(ARENA.x+3,ARENA.z)}));
  const attackerFreeze=await spectator.wait('state');assert.equal(attackerFreeze.player.x,ARENA.x);assert.equal(attackerFreeze.player.vx,0);
  await new Promise(r=>setTimeout(r,hit.freeze*1000+40));
  for(const [phase,recovery]of [['air',0],['down',0],['recover',.4]]){
    await new Promise(r=>setTimeout(r,30));b.ws.send(JSON.stringify({type:'state',state:{...state(ARENA.x,ARENA.z+2),hitSerial:1,ragdoll:true,hitPhase:phase,hitTime:.8,hitDownTime:.2,hitRecovery:recovery,hitStrength:.7,attackKind:11,attackProgress:.5,attackDuration:1.24}}));
    const observed=await spectator.wait('state');assert.equal(observed.player.hitPhase,phase);assert.equal(observed.player.hitDownTime,.2);assert.equal(observed.player.hitRecovery,recovery);assert.equal(observed.player.attackKind,11);
  }
  await new Promise(r=>setTimeout(r,280));a.ws.send(JSON.stringify({type:'swing',held:0,target:b.id}));
  const result=await spectator.wait('duel-result');assert.equal(result.scores[a.id],1);assert.equal(result.scores[b.id],-1);assert.equal(result.scores[spectator.id],undefined);
  a.ws.close();await new Promise(r=>setTimeout(r,80));const restored=await connect(a.profile);assert.equal(restored.self.score,1);
  restored.ws.send(JSON.stringify({type:'state',state:{...state(-80,138),y:230,seated:true,crownEnabled:true}}));
  let received;for(let i=0;i<6;i++){const m=await b.wait('state');if(m.player.id===restored.id){received=m.player;break;}}
  assert.equal(received.y,230);assert.equal(received.seated,true);assert.equal(received.crownEnabled,true);assert.equal(received.score,1);
  console.log('PASS: three-client duel, 10+1 damage, hit serial / stale upright rejection, air/down/recover and attack sync, saved score, high altitude/seated/crown state.');
}finally{clients.forEach(ws=>ws.close());server.kill();}
