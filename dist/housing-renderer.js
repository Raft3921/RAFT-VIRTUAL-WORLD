import * as THREE from 'three';
import {HOUSES,ROOM,FURNITURE_BY_ID,furnitureDefinition,FINISHES,emptyHouse,furniturePose} from './housing-data.js';
import {furnitureParts} from './furniture-models.js';
import {createHousingMirrors} from './housing-mirror.js';
import {createFurnitureEffects} from './furniture-effects.js';

const boxGeometry=new THREE.BoxGeometry(1,1,1),materials=new Map();
function material(color,detail=false,glow=false){const key=color+':'+detail+':'+glow;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.84,polygonOffset:detail,polygonOffsetFactor:-1,polygonOffsetUnits:-1,emissive:glow?color:'#000000',emissiveIntensity:glow?.65:0}));return materials.get(key);}
function finishMaterial(surface,id){
  const key=surface+':'+id;if(materials.has(key))return materials.get(key);
  const choice=FINISHES[surface].find(f=>f[0]===id)||FINISHES[surface][0],canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle=choice[2];ctx.fillRect(0,0,64,64);
  ctx.strokeStyle='#00000026';ctx.lineWidth=1;
  if(id.includes('wood')||id==='wood'){for(let y=0;y<64;y+=16){ctx.strokeRect(0,y,64,16);ctx.beginPath();ctx.moveTo(y%32?20:44,y);ctx.lineTo(y%32?20:44,y+16);ctx.stroke();}}
  else if(id==='brick'){for(let y=0;y<64;y+=16)for(let x=-32;x<64;x+=32)ctx.strokeRect(x+(y%32?16:0),y,32,16);}
  else if(id==='tile'||id==='checker'){for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16){if(id==='checker'&&(x+y)%32===0){ctx.fillStyle='#354353';ctx.fillRect(x,y,16,16);}ctx.strokeRect(x,y,16,16);}}
  else if(id==='stripe'){ctx.fillStyle='#ffffff45';for(let x=0;x<64;x+=16)ctx.fillRect(x,0,8,64);}
  else if(id==='carpet'){ctx.fillStyle='#ffffff24';for(let y=0;y<64;y+=4)for(let x=0;x<64;x+=4)ctx.fillRect(x+(y%8?1:0),y,1,1);}
  const texture=new THREE.CanvasTexture(canvas);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,surface==='floor'?6:2);
  const mat=new THREE.MeshStandardMaterial({map:texture,roughness:.92});materials.set(key,mat);return mat;
}
export function createHousingRenderer(scene,world){
  const rooms=HOUSES.map(h=>({group:new THREE.Group(),layout:emptyHouse(),meshes:[],references:new Map(),finishes:[],mirrors:[],animated:[],editing:false})),transform=new THREE.Object3D(),itemTransform=new THREE.Object3D(),partMatrix=new THREE.Matrix4(),partOffset=new THREE.Vector3(),mirrors=createHousingMirrors(scene,world),effects=createFurnitureEffects(scene);
  for(const h of HOUSES){const room=rooms[h.index];room.group.userData.houseIndex=h.index;room.group.name='Furnished house '+h.index;room.group.position.set(h.x,ROOM.floor,h.z);room.group.rotation.y=h.front<0?Math.PI:0;scene.add(room.group);}
  const pose=(item)=>{const p=furniturePose(item);itemTransform.position.set(p.x,p.y,p.z);itemTransform.rotation.set(0,p.yaw,p.roll);itemTransform.scale.setScalar(1);itemTransform.updateMatrix();return p;};
  function syncReference(ref,item,time=0){ref.item=item;pose(item);const p=ref.part;transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,0,0);transform.scale.set(p.w,p.h,p.d);
    if(p.motion==='spin'||p.motion==='orbit')transform.rotation.y=time*(p.rate||1);
    else if(p.motion==='sway')transform.rotation.z=Math.sin(time*1.5+(p.phase||0))*.035;
    else if(p.motion==='flap')transform.rotation.x=.2+Math.sin(time*.8)*.3;
    else if(p.motion==='fish')transform.position.x+=Math.sin(time*.8+(p.phase||0))*(p.amplitude||.1);
    else if(p.motion==='hand')transform.rotation.z=time*(p.rate||0);
    else if(p.motion==='key'&&p.key===ref.keyNote&&time<ref.pressedUntil)transform.position.y-=.018;
    if(p.pivot){partOffset.set(p.x-p.pivot[0],p.y-p.pivot[1],p.z-p.pivot[2]).applyEuler(transform.rotation);transform.position.set(...p.pivot).add(partOffset);}
    transform.updateMatrix();partMatrix.multiplyMatrices(itemTransform.matrix,transform.matrix);if(ref.mirror){transform.position.set(p.x,p.y,p.z+p.d/2+.0015);transform.rotation.set(0,0,0);transform.scale.set(p.w,p.h,1);transform.updateMatrix();partMatrix.multiplyMatrices(itemTransform.matrix,transform.matrix);ref.mesh.matrix.copy(partMatrix);ref.mesh.matrixAutoUpdate=false;ref.mesh.matrixWorldNeedsUpdate=true;}else{ref.mesh.setMatrixAt(ref.instance,partMatrix);ref.mesh.instanceMatrix.needsUpdate=true;}}
  function colliders(index,layout){
    const h=HOUSES[index],records=[{x:h.x,y:ROOM.floor-.009,z:h.z,w:ROOM.x*2,h:.018,d:ROOM.z*2}],seats=[],beds=[];
    for(const item of layout.items){const def=furnitureDefinition(item),p=furniturePose(item),yaw=p.yaw+(h.front<0?Math.PI:0),x=h.x+p.x*h.front,z=h.z+p.z*h.front;
      const add=(w,height,d,dy=height/2,dx=0,dz=0)=>records.push({x:x+Math.cos(yaw)*dx+Math.sin(yaw)*dz,y:ROOM.floor+dy,z:z-Math.sin(yaw)*dx+Math.cos(yaw)*dz,w,h:height,d,rotation:yaw,boardId:'furniture:'+index+':'+item.id});
      if(def.solid===false||def.family==='mirror'||def.family==='wall-mirror')continue;
      if(def.seat){const seatHeight=.88*(def.family==='chair'?def.h*.515:def.family==='sofa'?def.h*.55:def.seat);add(def.w*.88,seatHeight,def.d*.88);if(def.family==='chair'||def.family==='sofa')add(def.w*.88,def.h*.88-seatHeight,def.d*.14*.88,seatHeight+(def.h*.88-seatHeight)/2,0,-def.d*.43*.88);const spots=def.w>1.5?[-def.w*.23,def.w*.23]:[0];for(const offset of spots)seats.push({x:x+Math.cos(yaw)*offset,y:ROOM.floor+seatHeight,z:z-Math.sin(yaw)*offset,yaw});}
      else if(def.family==='bed'||def.family==='canopy'){const height=.55;add(def.w*.88,height,def.d*.88);add(def.w*.88,.88,def.d*.07,.44,0,-def.d*.46*.88);beds.push({id:index+':'+item.id,x,y:ROOM.floor+height,z,yaw,w:def.w*.75,d:def.d*.70});if(def.family==='canopy')for(const dx of [-def.w*.46*.88,def.w*.46*.88])for(const dz of [-def.d*.46*.88,def.d*.46*.88])add(def.w*.055*.88,def.h*.88,def.d*.055*.88,def.h*.44,dx,dz);}
      else add(p.w*.88,p.h*.88,p.d*.88,def.mount==='floor'?p.h*.44:def.mount==='ceiling'?ROOM.height-p.h*.44:p.centerY);
    }world.setHouseBodies(index,records,seats,beds);
  }
  function apply(index,layout){
    const room=rooms[index],h=HOUSES[index];if(!room)return;for(const entry of room.mirrors)mirrors.remove(entry);room.mirrors=[];room.animated=[];for(const mesh of room.meshes){room.group.remove(mesh);mesh.dispose?.();}room.meshes=[];room.finishes=[];room.references.clear();room.layout=layout;
    const batches=new Map(),push=(key,mat,part,item=null,hidden=false)=>{if(!batches.has(key))batches.set(key,{mat,parts:[],hidden,detail:part.detail===true});batches.get(key).parts.push({part,item});};
    for(const item of layout.items)for(const part of furnitureParts(item)){push(part.c+':'+!!part.detail+':'+!!part.glow,material(part.c,part.detail,part.glow),part,item);if(part.mirror){const entry=mirrors.add(room.group,item.id,part),ref={mesh:entry.mesh,part,mirror:true};room.mirrors.push(entry);if(!room.references.has(item.id))room.references.set(item.id,[]);room.references.get(item.id).push(ref);syncReference(ref,item);}}
    const floor={x:0,y:-.009,z:0,w:ROOM.x*2,h:.018,d:ROOM.z*2};push('floor',finishMaterial('floor',layout.finish.floor),floor);
    const panels=[{x:0,y:ROOM.height/2,z:-6.925,w:14.8,h:ROOM.height,d:.025,wallZ:-1},...[-1,1].map(sign=>({x:sign*7.425,y:ROOM.height/2,z:0,w:.025,h:ROOM.height,d:13.8,wallX:sign})),...[-1,1].map(sign=>({x:sign*4.85,y:ROOM.height/2,z:6.925,w:5.1,h:ROOM.height,d:.025,wallZ:1})),{x:0,y:4.53,z:6.925,w:4.6,h:1.44,d:.025,wallZ:1}];
    for(const p of panels)push('wall:'+p.wallX+':'+p.wallZ,finishMaterial('wallpaper',layout.finish.wallpaper),p);
    push('ceiling',finishMaterial('ceiling',layout.finish.ceiling),{x:0,y:ROOM.height+.01,z:0,w:14.8,h:.02,d:13.8},null,true);
    for(const batch of batches.values()){
      const mesh=new THREE.InstancedMesh(boxGeometry,batch.mat,batch.parts.length);mesh.userData.detail=batch.detail;mesh.userData.cutaway=batch.hidden;mesh.userData.wallX=batch.parts[0].part.wallX;mesh.userData.wallZ=batch.parts[0].part.wallZ;mesh.userData.house=index;mesh.userData.itemIds=[];mesh.receiveShadow=true;mesh.castShadow=!batch.detail;
      for(let i=0;i<batch.parts.length;i++){const {part,item}=batch.parts[i];const ref={mesh,instance:i,part};if(item){syncReference(ref,item);if(part.motion)room.animated.push(ref);if(!room.references.has(item.id))room.references.set(item.id,[]);room.references.get(item.id).push(ref);mesh.userData.itemIds[i]=item.id;}else{transform.position.set(part.x,part.y,part.z);transform.rotation.set(0,0,0);transform.scale.set(part.w,part.h,part.d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);}}
      mesh.computeBoundingSphere();mesh.boundingSphere.radius+=2;room.group.add(mesh);room.meshes.push(mesh);if(batch.hidden)room.finishes.push(mesh);
    }colliders(index,layout);room.cutKey=null;setEditing(index,room.editing);
  }
  function preview(index,item){for(const ref of rooms[index]?.references.get(item.id)||[])syncReference(ref,item);}
  function hidden(room,mesh){return room.editing&&(mesh.userData.cutaway||mesh.userData.wallX===room.sideX||mesh.userData.wallZ===room.sideZ);}
  function setEditing(index,value,position=null){
    const room=rooms[index],h=HOUSES[index];if(!room)return;
    const worldX=position?Math.sign(position.x-h.x)||1:1,worldZ=position?Math.sign(position.z-h.z)||h.front:h.front,key=value+':'+worldX+':'+worldZ;
    if(room.cutKey===key)return;room.cutKey=key;room.editing=value;room.sideX=worldX*h.front;room.sideZ=worldZ*h.front;world.cutawayHouse(index,value,worldX,worldZ);
    for(const mesh of room.meshes){mesh.frustumCulled=!value;mesh.visible=!hidden(room,mesh);}
  }
  function pick(ray,index){const room=rooms[index],hits=ray.intersectObjects([...room.meshes,...room.mirrors.map(e=>e.mesh)].filter(m=>m.visible),false);for(const hit of hits){const id=hit.object.userData.itemId||hit.object.userData.itemIds?.[hit.instanceId];if(id)return id;}return null;}
  function pianoHit(origin,facing){let match=null,best=3.6;for(const h of HOUSES){if(Math.hypot(origin.x-h.x,origin.z-h.z)>14)continue;for(const item of rooms[h.index].layout.items){if(FURNITURE_BY_ID.get(item.t)?.family!=='piano')continue;const p=furniturePose(item),x=h.x+p.x*h.front,z=h.z+p.z*h.front,dx=x-origin.x,dz=z-origin.z,along=dx*facing.x+dz*facing.z,side=Math.abs(dx*facing.z-dz*facing.x);if(along<0||along>best||side>1||Math.abs(origin.y-(ROOM.floor+.7))>2)continue;const point=new THREE.Vector3(x,ROOM.floor+.8,z);if(world.cameraPosition(origin,point,.025,'furniture:'+h.index+':'+item.id).distanceTo(point)>.08)continue;best=along;match={index:h.index,itemId:item.id,position:{x,y:ROOM.floor+1.25,z}};}}return match;}
  let animationTime=0;
  function playPiano(message,listener){const room=rooms[message.index],item=room?.layout.items.find(i=>i.id===message.itemId&&FURNITURE_BY_ID.get(i.t)?.family==='piano');if(!item)return;for(const ref of room.references.get(item.id)||[])if(ref.part.motion==='key'){ref.keyNote=message.note%14;ref.pressedUntil=animationTime+.22;ref.needsKeyReset=true;}const h=HOUSES[message.index],p=furniturePose(item);effects.play({x:h.x+p.x*h.front,y:ROOM.floor+1.25,z:h.z+p.z*h.front},message.note,listener);}
  function update(dt,time,camera,renderer,player,mobile=false,actor=null){animationTime=time;effects.update(dt,camera);for(const room of rooms){if(!room.group.visible)continue;const near=room.editing||player&&Math.hypot(player.x-room.group.position.x,player.z-room.group.position.z)<20;if(!near)continue;for(const ref of room.animated){if(!ref.mesh.visible||ref.part.motion==='key'&&!ref.needsKeyReset)continue;syncReference(ref,ref.item,time);if(ref.part.motion==='key'&&time>=ref.pressedUntil)ref.needsKeyReset=false;}}mirrors.update(dt,time,camera);}
  function cull(camera,mobile=false){for(const h of HOUSES){const room=rooms[h.index],distance=Math.hypot(camera.x-h.x,camera.y-2,camera.z-h.z);room.group.visible=room.editing||distance<(mobile?80:100);for(const mesh of room.meshes){mesh.visible=!hidden(room,mesh)&&(!mesh.userData.detail||room.editing||distance<35);mesh.castShadow=room.group.visible&&distance<35&&!mesh.userData.detail;}}}
  return {portals:mirrors,rooms,apply,preview,pick,setEditing,cull,update,pianoHit,playPiano};
}
