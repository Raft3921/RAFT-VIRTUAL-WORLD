import * as THREE from 'three';
import {createPortalViews,portalFrame,passageTransform} from './portal-view.js';
import {HOUSES,ROOM,mirrorRealmKey,mirrorRealm,mirrorHouseKey,houseDescriptor} from './housing-data.js';

// Portal windows render their linked rooms from the viewer’s perspective. A source mirror owns
// a complete reversed residential avenue, shared by everyone using that mirror.
export function createHousingMirrors(scene,world){
  const planeGeometry=new THREE.PlaneGeometry(1,1),boxGeometry=new THREE.BoxGeometry(1,1,1);
  const boardMaterial=new THREE.MeshBasicMaterial({color:'#cad9df',fog:false,toneMapped:false,side:THREE.DoubleSide});
  const black=new THREE.MeshBasicMaterial({color:'#000000',fog:false,toneMapped:false});
  const entries=new Set(),spaces=new Map(),inverse=new THREE.Matrix4(),probe=new THREE.Vector3(),point=new THREE.Vector3(),normal=new THREE.Vector3(),transform=new THREE.Object3D();
  let active=null,cooldownUntil=0,renderer=null,bridge=null;const views=createPortalViews(scene),fallbacks=new Map();
  function add(group,id,part){const mesh=new THREE.Mesh(planeGeometry,boardMaterial);mesh.userData.itemId=id;mesh.userData.portalHeight=1;mesh.userData.portalShape=part.portalShape||0;group.add(mesh);const entry={mesh,part,id,house:group.userData.houseIndex};entries.add(entry);return entry;}
  function remove(entry){views.release(entry.mesh);entries.delete(entry);entry.mesh.removeFromParent();}
  function originals(){return [...entries].filter(e=>!houseDescriptor(e.house)?.realm);}
  function reflectedMatrix(mesh,realm){mesh.updateWorldMatrix(true,false);return new THREE.Matrix4().makeTranslation(realm.x,0,realm.z).multiply(new THREE.Matrix4().makeScale(1,1,-1)).multiply(mesh.matrixWorld);}
  function refreshGateways(space){
    const source=originals(),signature=source.map(e=>{e.mesh.updateWorldMatrix(true,false);return e.house+':'+e.id+':'+e.mesh.matrixWorld.elements.join(',');}).join(';');
    if(space.signature===signature)return;space.signature=signature;
    // Keep the last passage when a source mirror is removed while visitors are
    // inside; returning falls back to that home's entrance.
    for(const e of source){const key=e.house+':'+e.id;let gate=space.gates.get(key);if(!gate){gate={mesh:new THREE.Mesh(planeGeometry,boardMaterial),house:e.house,id:e.id};gate.mesh.matrixAutoUpdate=false;space.group.add(gate.mesh);space.gates.set(key,gate);}gate.mesh.matrix.copy(reflectedMatrix(e.mesh,space));gate.mesh.matrixWorldNeedsUpdate=true;gate.mesh.userData.portalHeight=1;gate.mesh.userData.portalShape=e.mesh.userData.portalShape;}
    for(const h of HOUSES.slice(0,8)){
      const key=h.index+':entrance',hasMirror=source.some(e=>e.house===h.index)||[...space.gates.values()].some(e=>e.house===h.index&&e.id);
      let gate=space.gates.get(key);if(hasMirror){if(gate){gate.mesh.removeFromParent();space.gates.delete(key);}continue;}
      if(!gate){const mesh=new THREE.Mesh(planeGeometry,boardMaterial);mesh.position.set(space.x+h.x,1.7,space.z-h.z+h.front*(ROOM.z-.15));mesh.rotation.y=h.front>0?Math.PI:0;mesh.scale.set(1.5,2.6,1);space.group.add(mesh);space.gates.set(key,{mesh,house:h.index,id:null});}
    }
  }
  function createSpace(key){
    if(spaces.has(key))return spaces.get(key);
    const realm=mirrorRealm(key);if(!realm)return null;
    const group=new THREE.Group();group.name='Mirror avenue '+key;scene.add(group);
    const space={...realm,group,gates:new Map(),shells:[],signature:null};spaces.set(key,space);
    const solidSources=new Set(world.bodies),batches=new Map(),bodies=[];
    for(const source of world.houses.slice(0,8)){
      const index=mirrorHouseKey(key,source.index),home=houseDescriptor(index);renderer?.ensure(index);
      for(const p of source.parts){
        // Interior finishes are supplied by the regular editor. Architectural
        // facade, roof and porch keep the original home's member colour.
        if(p.y<.25||p.y===1.1)continue;
        const part={...p,x:realm.x+p.x,z:realm.z-p.z,rotation:-(p.rotation||0),houseIndex:index,...(p.boardId!==undefined?{boardId:'mirror-board:'+index}:{})};
        const mat=p.mesh?.material;if(!mat)continue;if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(part);
        if(solidSources.has(p)&&!(p.y>5.5||Math.abs(p.x-source.x)>7.4&&Math.abs(p.z-source.z)<7.4||Math.abs(p.z-source.z)>6.8&&Math.abs(p.z-source.z)<7.5))bodies.push(part);
      }
      const label=new THREE.Mesh(planeGeometry,new THREE.MeshBasicMaterial({color:source.color,fog:false,toneMapped:false,side:THREE.DoubleSide}));label.position.set(home.x-6,1.7,home.z+home.front*9.13);label.rotation.y=home.front<0?Math.PI:0;label.scale.set(.9,1.8,1);group.add(label);
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#142d3c';ctx.fillRect(0,0,128,256);ctx.fillStyle=source.color;ctx.fillRect(12,18,104,18);ctx.fillStyle='#ffffff';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.fillText('MIRROR',64,84);ctx.fillText('HOME',64,116);ctx.fillText('EDIT',64,210);label.material.map=new THREE.CanvasTexture(canvas);label.material.needsUpdate=true;
      const board={boardId:'mirror-board:'+index,houseIndex:index,owner:source.owner,kind:'house',x:label.position.x,y:label.position.y,z:label.position.z,label,pick:label};world.boards.push(board);space.shells.push({index,board});
    }
    for(const [mat,parts]of batches){const mesh=new THREE.InstancedMesh(boxGeometry,mat,parts.length);for(let i=0;i<parts.length;i++){const p=parts[i];transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.rotation,0);transform.scale.set(p.w,p.h,p.d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);}mesh.computeBoundingSphere();mesh.receiveShadow=true;group.add(mesh);space.shells.push({mesh,parts});}
    function box(x,y,z,w,h,d,mat,solid=true){const mesh=new THREE.Mesh(boxGeometry,mat);mesh.position.set(realm.x+x,y,realm.z-z);mesh.scale.set(w,h,d);group.add(mesh);if(solid)bodies.push({x:mesh.position.x,y,z:mesh.position.z,w,h,d});}
    const road=new THREE.MeshStandardMaterial({color:'#c9c4b7',roughness:.9});
    box(0,.045,62,92,.09,9,road);
    for(const h of HOUSES.slice(0,8))box(h.x,.09,h.index<4?54.7:70,5,.18,h.index<4?12:13,road);
    // Black void at every road edge and between houses has a tall collision
    // boundary, so walking, jumping and air-walking cannot cross the gaps.
    for(const sign of [-1,1])box(sign*46.3,30,62,.6,60,9,black);
    for(const z of [57.2,66.8]){
      let start=-46;for(const x of [-39,-13,13,39]){const end=x-2.6;if(end>start)box((start+end)/2,30,z,end-start,60,.6,black);start=x+2.6;}if(start<46)box((start+46)/2,30,z,46-start,60,.6,black);
    }
    for(const h of HOUSES.slice(0,8))for(const side of [-1,1])box(h.x+side*2.85,30,h.index<4?54.7:70,.5,60,h.index<4?5.5:5,black);
    // Enclose the realm in black so distant meadow/sky cannot show through.
    const voidMaterial=black.clone();voidMaterial.side=THREE.BackSide;const voidMesh=new THREE.Mesh(new THREE.BoxGeometry(140,100,110),voidMaterial);voidMesh.position.set(realm.x,40,realm.z-62.5);group.add(voidMesh);
    world.setMovementBounds?.(key,{...realm,allowed:(x,z)=>{x-=realm.x;z=realm.z-z;if(Math.abs(x)<45.65&&Math.abs(z-62)<4.15)return true;return HOUSES.slice(0,8).some(h=>Math.abs(x-h.x)<7.3&&Math.abs(z-h.z)<7.2||Math.abs(x-h.x)<2.25&&z>Math.min(h.z,62)&&z<Math.max(h.z,62));}});
    world.setHouseBodies('mirror-avenue:'+key,bodies);refreshGateways(space);return space;
  }
  const previousCutaway=world.cutawayHouse;
  world.cutawayHouse=(index,enabled,sideX=1,sideZ=1)=>{
    const h=houseDescriptor(index);if(!h?.realm)return previousCutaway(index,enabled,sideX,sideZ);
    const space=spaces.get(h.realm);if(!space)return;
    for(const shell of space.shells){if(shell.index===index){shell.board.editorHidden=enabled;shell.board.label.visible=!enabled;}if(!shell.mesh)continue;let changed=false;for(let i=0;i<shell.parts.length;i++){const p=shell.parts[i];if(p.houseIndex!==index)continue;const hide=enabled&&(p.y>5.5||(p.z-h.z)*sideZ>6.8||(p.x-h.x)*sideX>7.4);transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.rotation,0);transform.scale.set(hide?0:p.w,hide?0:p.h,hide?0:p.d);transform.updateMatrix();shell.mesh.setMatrixAt(i,transform.matrix);changed=true;}if(changed)shell.mesh.instanceMatrix.needsUpdate=true;}
    for(const gate of space.gates.values())if(gate.house===h.sourceIndex)gate.mesh.visible=!enabled;
  };
  function fallback(house){
    if(fallbacks.has(house))return fallbacks.get(house);
    const h=HOUSES[house],mesh=new THREE.Mesh(planeGeometry,boardMaterial);mesh.position.set(h.x,1.7,h.z+h.front*(ROOM.z-.15));mesh.rotation.y=h.front>0?Math.PI:0;mesh.scale.set(1.5,2.6,1);mesh.updateMatrixWorld();fallbacks.set(house,mesh);return mesh;
  }
  function counterpart(link){return originals().find(e=>e.house===link.house&&e.id===link.id)?.mesh||fallback(link.house);}
  function windowPairs(camera){
    const pairs=[];
    for(const entry of originals()){
      const f=portalFrame(entry.mesh);if(camera.position.distanceTo(f.center)>32||camera.position.clone().sub(f.center).dot(f.normal)<=.015)continue;
      const space=createSpace(mirrorRealmKey(entry.house,entry.id));if(!space)continue;refreshGateways(space);const gate=space.gates.get(entry.house+':'+entry.id);if(gate)pairs.push({source:entry.mesh,destination:gate.mesh});
    }
    for(const space of spaces.values())if(Math.abs(camera.position.x-space.x)<100&&Math.abs(camera.position.z-(space.z-62.5))<85){refreshGateways(space);for(const gate of space.gates.values())pairs.push({source:gate.mesh,destination:counterpart(gate)});}
    for(const entry of entries){const h=houseDescriptor(entry.house);if(h?.realm)pairs.push({source:entry.mesh,destination:counterpart({house:h.sourceIndex,id:entry.id})});}
    return pairs;
  }
  function intersectsBody(mesh,position,height){
    mesh.updateWorldMatrix(true,false);inverse.copy(mesh.matrixWorld).invert();
    for(const lift of [.18,height*.5,height-.1]){probe.set(position.x,position.y+lift,position.z).applyMatrix4(inverse);if(Math.abs(probe.x)<.49&&Math.abs(probe.y)<.5)return true;}return false;
  }
  function crossing(mesh,position,previous,height){
    const f=portalFrame(mesh),before=previous.clone().sub(f.center).dot(f.normal),after=position.clone().sub(f.center).dot(f.normal);
    return before>.025&&after<=.025&&after<before&&intersectsBody(mesh,position,height);
  }
  // Open only the small part of a thin house wall covered by a live portal.
  // All other parts retain their regular collision and camera obstruction.
  world.portalPassage=(body,position,previous,height=1.9,cameraRay=false)=>{
    if(body.h<.5)return false;
    const portals=[...entries].map(e=>e.mesh);for(const space of spaces.values())for(const gate of space.gates.values())portals.push(gate.mesh);
    for(const mesh of portals){const f=portalFrame(mesh);if(Math.hypot(position.x-f.center.x,position.z-f.center.z)>Math.hypot(f.width,f.height)+5&&!cameraRay)continue;
      const c=Math.cos(body.rotation||0),sn=Math.sin(body.rotation||0),extent=Math.abs(f.normal.x*c-f.normal.z*sn)*body.w/2+Math.abs(f.normal.x*sn+f.normal.z*c)*body.d/2;
      if(extent>.45||Math.abs((body.x-f.center.x)*f.normal.x+(body.z-f.center.z)*f.normal.z)>extent+.18)continue;
      if(cameraRay){const a=previous.clone().sub(f.center).dot(f.normal),b=position.clone().sub(f.center).dot(f.normal);if(a*b>0||Math.abs(a-b)<.0001)continue;const crossingPoint=previous.clone().lerp(position,a/(a-b));mesh.updateWorldMatrix(true,false);probe.copy(crossingPoint).applyMatrix4(inverse.copy(mesh.matrixWorld).invert());if(Math.abs(probe.x)<.49&&Math.abs(probe.y)<.49)return true;
      }else if(intersectsBody(mesh,position,height))return true;
    }return false;
  };
  function travel(source,destination,position,entering,realm,time){
    const matrix=passageTransform(source,destination),newPosition=position.clone().applyMatrix4(matrix),rotation=new THREE.Matrix3().setFromMatrix4(matrix),heading=new THREE.Vector3(0,0,1).applyMatrix3(rotation),yawDelta=Math.atan2(heading.x,heading.z);
    active=realm;cooldownUntil=time+.12;bridge={source,destination,matrix:matrix.clone(),inverse:matrix.clone().invert()};
    return {position:newPosition,yawDelta,matrix,rotation,entering,seamless:true};
  }
  function step(position,velocity,height,time,previous){
    if(!previous||time<cooldownUntil)return null;
    if(active){const space=createSpace(active);if(!space)return null;refreshGateways(space);for(const gate of space.gates.values())if(crossing(gate.mesh,position,previous,height))return travel(gate.mesh,counterpart(gate),position,false,null,time);
      for(const e of entries){const h=houseDescriptor(e.house);if(h?.realm===active&&crossing(e.mesh,position,previous,height))return travel(e.mesh,counterpart({house:h.sourceIndex,id:e.id}),position,false,null,time);}return null;}
    for(const entry of originals()){if(!crossing(entry.mesh,position,previous,height))continue;const key=mirrorRealmKey(entry.house,entry.id),space=createSpace(key);if(!space)continue;const gate=space.gates.get(entry.house+':'+entry.id);if(gate)return travel(entry.mesh,gate.mesh,position,true,key,time);}return null;
  }
  // A follow camera remains on its own side of the window after the actor
  // crosses. It changes coordinate space only when the camera crosses too.
  function adjustCamera(camera){
    if(!bridge)return;const f=portalFrame(bridge.destination),distance=camera.position.clone().sub(f.center).dot(f.normal);
    if(distance>=.02){bridge=null;return;}
    camera.updateMatrixWorld();const matrix=bridge.inverse.clone().multiply(camera.matrixWorld);matrix.decompose(camera.position,camera.quaternion,camera.scale);camera.scale.setScalar(1);camera.updateMatrixWorld();
  }
  function renderViews(gpu,camera,{mobile=false,roots=[]}={}){
    const pairs=windowPairs(camera);views.render(gpu,camera,pairs,{mobile,roots,prepare:virtual=>{renderer?.prepareView(virtual.position);world.cull(virtual.position);renderer?.cull(virtual.position,mobile);update(0,0,virtual);},restore:view=>{renderer?.prepareView(view.position);world.cull(view.position);renderer?.cull(view.position,mobile);update(0,0,view);}});
  }
  function update(_dt,_time,camera){for(const space of spaces.values()){space.group.visible=Math.abs(camera.position.x-space.x)<130&&Math.abs(camera.position.z-(space.z-62.5))<100;if(space.group.visible)refreshGateways(space);}}
  return {add,remove,step,update,adjustCamera,renderViews,configure:value=>renderer=value,createSpace,spaces,reset(){active=null;bridge=null;},clearSpaces(){active=null;bridge=null;views.clear();fallbacks.clear();for(const space of spaces.values()){space.group.removeFromParent();for(const shell of space.shells)if(shell.mesh)shell.mesh.dispose();world.setHouseBodies('mirror-avenue:'+space.key,[]);world.setMovementBounds?.(space.key,null);}spaces.clear();for(let i=world.boards.length-1;i>=0;i--)if(String(world.boards[i].houseIndex).startsWith('m|'))world.boards.splice(i,1);},get active(){return active!==null;},get realm(){return active;}};
}
