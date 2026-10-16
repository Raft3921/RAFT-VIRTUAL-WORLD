import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,symlink,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {WebSocket} from 'ws';
import {combatArea} from '../dist/world-mode.js';

test('persisted mode starts both clients at combat entry and switching broadcasts to everyone',async t=>{
 const cwd=await mkdtemp(join(tmpdir(),'raft-mode-room-'));await symlink(resolve('dist'),join(cwd,'dist'));await writeFile(join(cwd,'.room-settings.json'),JSON.stringify({combatOnly:true,positions:{}}));
 const child=spawn(process.execPath,[resolve('server/lan.js')],{cwd,env:{...process.env,PORT:'4191'},stdio:['ignore','pipe','pipe']});t.after(async()=>{child.kill();await rm(cwd,{recursive:true,force:true});});
 await new Promise((ok,bad)=>{child.stdout.once('data',ok);child.stderr.once('data',d=>bad(Error(String(d))));child.once('error',bad);});
 assert.equal((await(await fetch('http://localhost:4191/world-mode')).json()).combatOnly,true);
 async function connect(skin){const ws=new WebSocket('ws://localhost:4191/room?skin='+skin,{origin:'http://localhost:4191'}),queue=[];ws.on('message',d=>queue.push(JSON.parse(d)));t.after(()=>ws.terminate());
  async function wait(predicate){const end=Date.now()+3000;while(Date.now()<end){const i=queue.findIndex(predicate);if(i>=0)return queue.splice(i,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('Missing room event');}
  const joined=await wait(m=>m.type==='joined');return {ws,wait,joined};}
 const a=await connect(3),b=await connect(8);for(const peer of [a,b]){assert(peer.joined.combatOnly);assert(combatArea(peer.joined.self));assert.deepEqual(peer.joined.houses,{});assert.deepEqual(peer.joined.kitchens,[]);}
 a.ws.send(JSON.stringify({type:'world-mode-settings',combatOnly:false}));for(const peer of [a,b])assert.equal((await peer.wait(m=>m.type==='world'&&m.combatOnly===false)).combatOnly,false);
 assert.equal((await(await fetch('http://localhost:4191/world-mode')).json()).combatOnly,false);assert.equal(JSON.parse(await readFile(join(cwd,'.room-settings.json'),'utf8')).combatOnly,false);
 b.ws.send(JSON.stringify({type:'world-mode-settings',combatOnly:true}));await b.wait(m=>m.type==='world-mode-error');assert.equal((await(await fetch('http://localhost:4191/world-mode')).json()).combatOnly,false);
});
