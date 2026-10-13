import assert from 'node:assert/strict';
import {test} from 'node:test';
import {HousingStore} from '../dist/housing-store.js';
import {PLAZA,cleanHouse,applyHouseOperation,placementError,FURNITURE,cleanFurniture} from '../dist/housing-data.js';
import {PlazaPlayStore} from '../dist/plaza-play-store.js';
const item=(t,id='test',x=0,z=0)=>({t,id,x,z,y:0,r:0,c:10});
test('shared plaza survives save/reload; guests can edit but stale revisions cannot overwrite',async()=>{
 let saved;const replies=[],store=new HousingStore({},async d=>{saved=d;},m=>replies.push(m));
 await store.apply(8,{index:'plaza',action:'add',rev:0,item:item('plaza-fountain'),requestId:'a'});
 assert.equal(store.snapshots().plaza.items.length,1);assert.equal(saved.houses.plaza.items.length,1);
 await store.apply(1,{index:'plaza',action:'add',rev:0,item:item('plaza-bench','bench',30),requestId:'b'});
 assert.match(replies.at(-1).error,/編集/);assert.equal(store.snapshots().plaza.items.length,1);
 const restored=new HousingStore(saved,async()=>{},()=>{});assert.deepEqual(restored.snapshots().plaza,store.snapshots().plaza);
 await store.apply(1,{index:'plaza',action:'add',rev:1,item:item('plaza-bench','bench',30),requestId:'c'});assert.equal(store.snapshots().plaza.items.length,2);
});
test('plants overlap furniture and each other; solid furniture, entry and boundaries stay protected',()=>{
 const desk=item('desk'),plant=item('nature-small-palm','plant');assert.equal(placementError(plant,[desk,plant]),'');assert.equal(placementError(desk,[plant]),'');assert(placementError(item('table','table'),[desk]));
 assert(placementError(item('plaza-bench','outside',120),[],'plaza'));assert(placementError(item('plaza-bench','entry',64,86),[],'plaza'));
 const vine={...item('nature-hanging-vine','vine'),y:200};assert(cleanFurniture(vine,'plaza'));assert.equal(cleanFurniture(vine),null);
 assert.equal(cleanHouse({items:[desk,plant,item('nature-fern','fern')]},0).items.length,3);
 assert(!applyHouseOperation(cleanHouse({},'plaza'),{action:'add',item:item('nature-jungle-tree')},'plaza').error);
 assert(applyHouseOperation(cleanHouse({}),{action:'add',item:item('plaza-fountain')}).error);
});
test('all added scenery has unique IDs; playground sessions reserve and release a shared item',()=>{
 assert.equal(new Set(FURNITURE.map(f=>f.id)).size,FURNITURE.length);
 const messages=[],swing=item('play-swing'),game={broadcast:m=>messages.push(m),houses:{snapshots:()=>({plaza:{items:[swing]}})}},store=new PlazaPlayStore(game);
 const now=Date.now();
 const a={player:{id:'a',x:PLAZA.x,z:PLAZA.z}},b={player:{id:'b',x:PLAZA.x,z:PLAZA.z}};
 store.receive(a,{action:'start',itemId:swing.id},now);assert.equal(store.snapshot().length,1);
 store.receive(b,{action:'start',itemId:swing.id},now+100);assert.equal(messages.at(-1).type,'plaza-play-error');store.stop('a');store.receive(b,{action:'start',itemId:swing.id},now+700);assert.equal(store.snapshot()[0].playerId,'b');store.stop('b');assert.equal(store.snapshot().length,0);
});

import {rampHeight,bounceSpeed,springLaunch} from '../dist/plaza-surfaces.js';
import {swingSeat,stepSwing} from '../dist/plaza-play-shared.js';
test('physical surfaces preserve slope, bounce energy and opposite spring launch',()=>{
 const ramp={d:4,ramp:{base:.245,back:2,front:.1}};
 assert.equal(rampHeight(ramp,-2),2.245);assert(Math.abs(rampHeight(ramp,2)-.345)<1e-9);
 assert(bounceSpeed(9)>bounceSpeed(4));assert.equal(bounceSpeed(100),12);
 const forward=springLaunch(0,-1,2,0),right=springLaunch(1,0,2,0);
 assert(forward.z>0&&forward.y>0);assert(right.x<0&&right.y>0);
 assert(springLaunch(0,-1,2,0).y>springLaunch(0,-1,.2,0).y);
 const def=FURNITURE.find(f=>f.id==='play-swing'),state={angle:0,angularVelocity:0};stepSwing(state,1,.1,2);const seat=swingSeat(def,state.angle);
 assert(seat.z<0);assert(Math.abs(Math.hypot(seat.z,seat.y-seat.top)-seat.length)<1e-9);
});
test('seesaw requires two riders; either rider can lift independently without rate-limit suppression',()=>{
 const board=item('play-seesaw'),messages=[],game={broadcast:m=>messages.push(m),houses:{snapshots:()=>({plaza:{items:[board]}})}},store=new PlazaPlayStore(game),now=Date.now();
 const a={player:{id:'a',x:PLAZA.x,z:PLAZA.z}},b={player:{id:'b',x:PLAZA.x,z:PLAZA.z}};
 store.receive(a,{action:'start',itemId:board.id},now);
 store.receive(a,{action:'input',itemId:board.id,lift:true},now+200);assert.equal(store.sessions.get('a').angle,0);
 store.receive(b,{action:'start',itemId:board.id},now+250);
 store.receive(a,{action:'input',itemId:board.id,lift:true},now+400);assert.equal(store.sessions.get('a').angle,.28);
 store.receive(b,{action:'input',itemId:board.id,lift:true},now+401);assert.equal(store.sessions.get('a').angle,0);
 store.receive(a,{action:'input',itemId:board.id,lift:false},now+600);assert.equal(store.sessions.get('a').angle,-.28);
 store.stop('b');store.receive(a,{action:'input',itemId:board.id,lift:true},now+800);assert.equal(store.sessions.get('a').angle,0);
});
