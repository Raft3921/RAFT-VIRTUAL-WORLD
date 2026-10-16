import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createWorld} from '../dist/world.js';
import {GameRules} from '../dist/game-rules.js';
import {ServerPlayerPhysics} from '../dist/server-player-physics.js';
import {combatSpawn,COMBAT_MENU,combatArea} from '../dist/world-mode.js';
import {GUN_ENTRY,GUN_ZONE} from '../dist/gun-layout.js';
const member=()=>({id:'member',profile:'profile',skin:3,guest:false,...combatSpawn(),grounded:true});
function fixture(settings={combatOnly:true},save=()=>{}){const player=member(),entry={player,send(){}},players=new Map([['socket',entry]]),events=[];const rules=new GameRules(players,m=>events.push(m),{},()=>{},settings,save);return {rules,player,entry,events};}

test('combat-only geometry excludes other districts and preserves every combat prop',()=>{
 const full=createWorld(new T.Scene(),{physicsOnly:true}),small=createWorld(new T.Scene(),{physicsOnly:true,combatOnly:true});
 assert(small.bodies.length<full.bodies.length*.5);
 assert.deepEqual(small.bodies.filter(b=>b.gunPropId).map(b=>b.gunPropId),full.bodies.filter(b=>b.gunPropId).map(b=>b.gunPropId));
 assert.equal(small.moving.length+small.falling.length+small.pulsing.length,0);
 const point=new T.Vector3(0,0,0);assert.equal(small.nearby(point).length,0);assert(!small.canStand(point));
 const p=new T.Vector3(98.1,0,-90),v=new T.Vector3(-5,0,0);small.move(p,v,.05);assert(p.x>=98);
});
test('combat-only visual world contains reusable menu and no homes, course or arena',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})})})};
 try{const world=createWorld(new T.Scene(),{combatOnly:true});assert.equal(world.houses.length,0);assert.equal(world.athletic.platforms.length,0);assert.equal(world.seats.length+world.hazards.length+world.balls.length,0);assert(!world.inAthletic({x:0,z:500}));
  assert(world.boards.some(b=>b.kind==='world'&&b.x===COMBAT_MENU.x&&b.z===COMBAT_MENU.z));assert(world.boards.some(b=>b.kind==='gun-entry'&&b.x===GUN_ENTRY.x));assert(world.boards.some(b=>b.kind==='pc'));world.update(1,new T.Vector3());world.cull(new T.Vector3());world.setBackdrop('GB');
 }finally{globalThis.document=old;}
});
test('combat-only room never creates optional systems or handles their actions',async()=>{
 const {rules,player,entry}=fixture({combatOnly:true,positions:{profile:{x:2000,y:4,z:2000,yaw:0,mirrorRealm:'m|0|shared'}}});
 for(const type of ['housing-op','living-action','plaza-play','plaza-bounce','kitchen-open','cooking-start','checkpoint','ready','furniture-hit'])await rules.receive(entry,{type,index:0});
 rules.snapshot();rules.joinedContent();rules.savePosition(player,true);rules.state(entry);rules.removed('missing');
 assert.deepEqual(Object.keys(rules.optionalSystems),[]);assert(combatArea(rules.savedPosition('profile')));assert.equal(rules.settings.positions.profile.x,2000);
 assert.deepEqual(rules.joinedContent().houses,{});assert.deepEqual(rules.snapshot().living,[]);
});
test('mode saves, relocates all players and rebuilds server colliders in both directions',async()=>{
 let stored;const {rules,entry,player,events}=fixture({combatOnly:false,positions:{profile:{x:7,y:0,z:8,yaw:0}}},s=>{stored=structuredClone(s);});const physics=new ServerPlayerPhysics(rules),large=physics.world.bodies.length;
 await rules.setCombatOnly(player,true);assert(stored.combatOnly);assert(rules.settings.combatOnly);assert(physics.world.bodies.length<large/2);assert(combatArea(player));assert.equal(player.flight,false);assert.equal(entry.motion,null);assert(events.some(m=>m.type==='world'&&m.combatOnly));
 await rules.setCombatOnly(player,false);assert.equal(stored.combatOnly,false);assert.equal(physics.world.bodies.length,large);assert.equal(player.x,0);assert.equal(rules.savedPosition('profile').x,7);
});
test('guests, active participants and failed storage cannot change world mode',async()=>{
 const a=fixture();await a.rules.setCombatOnly({...a.player,guest:true},false);assert(a.rules.settings.combatOnly);
 a.rules.guns.members.set(a.player.id,{id:a.player.id});await a.rules.setCombatOnly(a.player,false);assert(a.rules.settings.combatOnly);
 const b=fixture({combatOnly:false},()=>{throw Error('storage offline');});await b.rules.setCombatOnly(b.player,true);assert.equal(b.rules.settings.combatOnly,false);assert(b.events.some(m=>m.type==='world-mode-error'));assert(!b.events.some(m=>m.type==='world'&&m.combatOnly));
});
