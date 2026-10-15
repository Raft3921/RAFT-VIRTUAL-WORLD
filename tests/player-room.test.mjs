import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {WebSocket} from 'ws';
test('LAN room acknowledges authoritative jump inputs and broadcasts the same coordinates to a peer',async t=>{
 const cwd=await mkdtemp(join(tmpdir(),'raft-motion-test-'));await symlink(resolve('dist'),join(cwd,'dist'));
 const child=spawn(process.execPath,[resolve('server/lan.js')],{cwd,env:{...process.env,PORT:'4188'},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{child.kill();await rm(cwd,{recursive:true,force:true});});
 await new Promise((ok,bad)=>{child.stdout.once('data',ok);child.stderr.once('data',d=>bad(Error(String(d))));child.once('error',bad);});
 async function connect(){const ws=new WebSocket('ws://localhost:4188/room',{origin:'http://localhost:4188'}),queue=[];ws.on('message',d=>queue.push(JSON.parse(d)));t.after(()=>ws.terminate());
  async function wait(predicate){const end=Date.now()+3000;while(Date.now()<end){const i=queue.findIndex(predicate);if(i>=0)return queue.splice(i,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('Missing room message');}
  const joined=await wait(m=>m.type==='joined');return {ws,wait,joined};}
 const a=await connect(),peer=await connect();
 const state={...a.joined.self,x:100,y:40,z:100,grounded:true,verticalSpeed:200};
 a.ws.send(JSON.stringify({type:'state',state,motion:{active:true,epoch:1,inputs:[{seq:1,dt:.05,vx:2,vz:0,jump:true,shape:{width:.32,depth:.32,height:1.9}}]}}));
 const ack=await a.wait(m=>m.type==='motion'&&m.seq===1),remote=await peer.wait(m=>m.type==='state'&&m.player.id===a.joined.self.id);
 assert(ack.x<1);assert(ack.y>.35&&ack.y<.45);assert(ack.vy>3&&ack.vy<5);assert(!ack.grounded);
 for(const axis of ['x','y','z'])assert.equal(remote.player[axis],ack[axis]);
 await new Promise(r=>setTimeout(r,60));a.ws.send(JSON.stringify({type:'state',state,motion:{active:true,epoch:1,inputs:[{seq:1,dt:.05,vx:2,vz:0,jump:true},{seq:2,dt:.05,vx:2,vz:0,jump:true}]}}));
 const second=await a.wait(m=>m.type==='motion'&&m.seq===2);assert(second.vy<ack.vy);assert(second.y>ack.y);assert(second.x<.21);
});
