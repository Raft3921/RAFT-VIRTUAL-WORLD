import test from 'node:test';
import assert from 'node:assert/strict';
import {GunRules} from '../dist/gun-rules.js';
import {GUN_PROP_DEFS} from '../dist/gun-map-state.js';
import {ServerPlayerPhysics} from '../dist/server-player-physics.js';
function fixture(){
 const messages=[],saved=[],players=[{id:'a',skin:0,x:182,y:.12,z:-90,equippedWeapon:'pistol'},{id:'b',skin:1,x:182,y:.12,z:-88,equippedWeapon:'pistol'}];
 const rules={settings:{gunLife:6,gunTraces:[{id:'door-0-1',mode:'open'}]},settingsQueue:Promise.resolve(),saveSettings:async s=>saved.push(s),onAsyncWork(){},entries:()=>players.map(player=>({player})),players:new Map(),broadcast:m=>messages.push(m),characters:{get:()=>({coins:1,weaponWins:{},ownedWeapons:['pistol']}),change:async()=>{}},houses:{snapshots:()=>({})}};
 const gun=rules.guns=new GunRules(rules);gun.phase='active';for(const [i,p]of players.entries())gun.members.set(p.id,{id:p.id,skin:p.skin,team:i,damage:0,out:false,weapon:'pistol',previousWeapon:'pistol'});
 return {gun,rules,players,messages,saved};
}
test('starting a match restores props, old marks and collision before publishing active state',async()=>{
 const {gun,rules,messages,saved}=fixture(),door='door-0-1',bars=[...GUN_PROP_DEFS.values()].find(p=>p.kind==='bars').id;
 assert.equal(gun.traces.size,0,'legacy persistent damage is discarded on room startup');gun.changeProp(door,'open');gun.changeProp(bars,'broken');gun.marks.push({id:'old-hole'});gun.charges.set('a',100);gun.slashes.set('b',200);
 const physics=new ServerPlayerPhysics(rules);physics.syncGeometry();const colliders=physics.world.bodies.filter(b=>[door,bars].includes(b.gunPropId));assert(colliders.length>1);assert(colliders.every(b=>b.disabled));
 gun.phase='waiting';gun.begin(1000);assert.equal(gun.phase,'active');assert.equal(gun.round,1);assert.equal(gun.traces.size,0);assert.equal(gun.marks.length,0);assert.equal(gun.charges.size,0);assert.equal(gun.slashes.size,0);
 physics.syncGeometry();assert(colliders.every(b=>!b.disabled),'server movement collision is solid again');
 const reset=messages.findIndex(m=>m.type==='gun-map'&&m.reset),active=messages.findIndex(m=>m.type==='gun-battle'&&m.battle.phase==='active');assert(reset>=0&&reset<active);assert.deepEqual(messages[active].battle.traces,[]);
 await rules.settingsQueue;assert.deepEqual(saved.at(-1).gunTraces,[]);assert.equal(saved.at(-1).gunLife,6);
});
test('a finished match resets the map when returning to the entrance waiting state',async()=>{
 const {gun,rules,messages}=fixture();gun.changeProp('door-0-1','open');gun.members.get('b').out=true;gun.resolve();
 assert.equal(gun.phase,'waiting');assert.equal(gun.members.size,0);assert.equal(gun.traces.size,0);assert(messages.some(m=>m.type==='gun-map'&&m.reset));assert.deepEqual(gun.snapshot().traces,[]);await rules.settingsQueue;
});
test('an aborted match resets immediately; waiting players cannot leave props damaged',()=>{
 const {gun}=fixture();gun.changeProp('door-0-1','open');gun.remove('a');assert.equal(gun.traces.size,0);
 gun.phase='waiting';assert(!gun.changeProp('door-0-1','open'));assert.equal(gun.traces.size,0);
});
