import * as THREE from 'three';
import {createPortalViews,portalFrame,passageTransform} from './portal-view.js?v=20261010-mirror-entry65';
import {HOUSES,ROOM,mirrorRealmKey,mirrorRealm,mirrorHouseKey,houseDescriptor} from './housing-data.js';

// Portal windows render their linked rooms from the viewer’s perspective. A source mirror owns
// the same reversed residential avenue as every other member mirror.
export function createHousingMirrors(scene,world){
  const planeGeometry=new THREE.PlaneGeometry(1,1),boxGeometry=new THREE.BoxGeometry(1,1,1);
  const fallbackFrameMaterial=new THREE.MeshStandardMaterial({color:'#bd9166',roughness:.85});
  const boardMaterial=new THREE.MeshBasicMaterial({color:'#cad9df',fog:false,toneMapped:false,side:THREE.DoubleSide});
  const entries=new Set(),spaces=new Map(),inverse=new THREE.Matrix4(),probe=new THREE.Vector3(),point=new THREE.Vector3(),normal=new THREE.Vector3(),transform=new THREE.Object3D();
  let active=null,cooldownUntil=0,renderer=null,bridge=null,mirrorRevision=0,lastWindowEntry=null,travelMode='seamless';const views=createPortalViews(scene),fallbacks=new Map();
  function add(group,id,part){const mesh=new THREE.Mesh(planeGeometry,boardMaterial);mesh.userData.itemId=id;mesh.userData.portalHeight=1;mesh.userData.portalShape=part.portalShape||0;group.add(mesh);const entry={mesh,part,id,house:group.userData.houseIndex};entries.add(entry);mirrorRevision++;return entry;}
  function remove(entry){mirrorRevision++;views.release(entry.mesh);entries.delete(entry);entry.mesh.removeFromParent();}
  function originals(){return [...entries].filter(e=>{const h=houseDescriptor(e.house);return h&&!h.realm&&!h.guest;});}
  function livePortals(){return [...entries].filter(e=>!houseDescriptor(e.house)?.guest).map(e=>e.mesh);}
  function reflectedMatrix(mesh,realm){mesh.updateWorldMatrix(true,false);return new THREE.Matrix4().makeTranslation(realm.x,0,realm.z).multiply(new THREE.Matrix4().makeScale(1,1,-1)).multiply(mesh.matrixWorld);}
  function refreshGateways(space){
    if(space.signature===mirrorRevision)return;space.signature=mirrorRevision;const source=originals();
    const keys=new Set(source.map(e=>e.house+':'+e.id));
    for(const [key,gate]of space.gates)if(gate.id&&!keys.has(key)){views.release(gate.mesh);if(gate.owned)gate.mesh.removeFromParent();gate.appearance?.removeFromParent();space.gates.delete(key);}
    for(const e of source){const key=e.house+':'+e.id,linked=[...entries].find(p=>houseDescriptor(p.house)?.realm===space.key&&houseDescriptor(p.house)?.sourceIndex===e.house&&p.id===e.id);let gate=space.gates.get(key);
      if(gate&&gate.mesh!==linked?.mesh&&linked){views.release(gate.mesh);if(gate.owned)gate.mesh.removeFromParent();gate.appearance?.removeFromParent();space.gates.delete(key);gate=null;}
      if(!gate){gate={mesh:linked?.mesh||new THREE.Mesh(planeGeometry,boardMaterial),appearance:linked?null:new THREE.Group(),owned:!linked,house:e.house,id:e.id};if(gate.owned){space.group.add(gate.appearance);gate.mesh.matrixAutoUpdate=false;space.group.add(gate.mesh);}space.gates.set(key,gate);}
      if(gate.owned){gate.mesh.matrix.copy(reflectedMatrix(e.mesh,space));gate.mesh.matrixWorldNeedsUpdate=true;gate.mesh.userData.portalHeight=1;gate.mesh.userData.portalShape=e.mesh.userData.portalShape;renderer?.copyMirrorAppearance(e,gate.appearance,new THREE.Matrix4().makeTranslation(space.x,0,space.z).multiply(new THREE.Matrix4().makeScale(1,1,-1)));}
    }
    for(const h of HOUSES.slice(0,8)){
      const key=h.index+':entrance',hasMirror=source.some(e=>e.house===h.index);
      let gate=space.gates.get(key);if(hasMirror){if(gate){gate.mesh.removeFromParent();gate.appearance?.removeFromParent();space.gates.delete(key);}continue;}
      if(!gate){const mesh=new THREE.Mesh(planeGeometry,boardMaterial);mesh.position.set(space.x+h.x,1.7,space.z-h.z+h.front*(ROOM.z-.15));mesh.rotation.y=h.front>0?Math.PI:0;mesh.scale.set(1.5,2.6,1);space.group.add(mesh);const appearance=new THREE.Group();appearance.matrixAutoUpdate=false;mesh.updateWorldMatrix(true,false);appearance.matrix.copy(mesh.matrixWorld);space.group.add(appearance);for(const part of [{x:-.53,y:0,w:.07,h:1.12},{x:.53,y:0,w:.07,h:1.12},{x:0,y:-.53,w:1,h:.07},{x:0,y:.53,w:1,h:.07}]){const frame=new THREE.Mesh(boxGeometry,fallbackFrameMaterial);frame.position.set(part.x,part.y,-.04);frame.scale.set(part.w,part.h,.08);appearance.add(frame);}space.gates.set(key,{mesh,appearance,house:h.index,id:null});}
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
        if(p.y===1.1)continue;
        const part={...p,x:realm.x+p.x,z:realm.z-p.z,rotation:-(p.rotation||0),houseIndex:index,...(p.boardId!==undefined?{boardId:'mirror-board:'+index}:{})};
        const mat=p.mesh?.material;if(!mat)continue;if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(part);
        if(solidSources.has(p)&&!(p.y>5.5||Math.abs(p.x-source.x)>7.4&&Math.abs(p.z-source.z)<7.4||Math.abs(p.z-source.z)>6.8&&Math.abs(p.z-source.z)<7.5))bodies.push(part);
      }
      const label=new THREE.Mesh(planeGeometry,new THREE.MeshBasicMaterial({color:source.color,fog:false,toneMapped:false,side:THREE.DoubleSide}));label.position.set(home.x-6,1.7,home.z+home.front*9.13);label.rotation.y=home.front<0?Math.PI:0;label.scale.set(.9,1.8,1);group.add(label);
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#142d3c';ctx.fillRect(0,0,128,256);ctx.fillStyle=source.color;ctx.fillRect(12,18,104,18);ctx.fillStyle='#ffffff';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.fillText('MIRROR',64,84);ctx.fillText('MENU',64,116);ctx.fillText('OPEN',64,210);label.material.map=new THREE.CanvasTexture(canvas);label.material.needsUpdate=true;
      const board={boardId:'mirror-board:'+index,houseIndex:index,owner:source.owner,kind:'world',x:label.position.x,y:label.position.y,z:label.position.z,label,pick:label};world.boards.push(board);space.shells.push({index,board});
    }
    for(const [mat,parts]of batches){const mesh=new THREE.InstancedMesh(boxGeometry,mat,parts.length);for(let i=0;i<parts.length;i++){const p=parts[i];transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.rotation,0);transform.scale.set(p.w,p.h,p.d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);}mesh.computeBoundingSphere();mesh.receiveShadow=true;group.add(mesh);space.shells.push({mesh,parts});}
    function box(x,y,z,w,h,d,mat,solid=true){const mesh=new THREE.Mesh(boxGeometry,mat);mesh.position.set(realm.x+x,y,realm.z-z);mesh.scale.set(w,h,d);group.add(mesh);if(solid)bodies.push({x:mesh.position.x,y,z:mesh.position.z,w,h,d});}
    const road=new THREE.MeshStandardMaterial({color:'#c9c4b7',roughness:.9});
    box(0,.045,62,92,.09,9,road);
    for(const h of HOUSES.slice(0,8))box(h.x,.09,h.index<4?54.7:70,5,.18,h.index<4?12:13,road);
    // The void is a background colour, never wall geometry. A single outer
    // boundary encloses the whole neighbourhood without hiding any facade.
    const halfX=54,halfZ=29,centerZ=realm.z-62.5;
    for(const sign of [-1,1]){
      bodies.push({x:realm.x+sign*halfX,y:256,z:centerZ,w:.5,h:1024,d:halfZ*2});
      bodies.push({x:realm.x,y:256,z:centerZ+sign*halfZ,w:halfX*2,h:1024,d:.5});
    }
    world.setMovementBounds?.(key,{...realm,allowed:(x,z)=>Math.abs(x-realm.x)<halfX-.4&&Math.abs(z-centerZ)<halfZ-.4});
    world.setHouseBodies('mirror-avenue:'+key,bodies);refreshGateways(space);return space;
  }
  const previousCutaway=world.cutawayHouse;
  world.cutawayHouse=(index,enabled,sideX=1,sideZ=1)=>{
    const h=houseDescriptor(index);if(!h?.realm)return previousCutaway(index,enabled,sideX,sideZ);
    const space=spaces.get(h.realm);if(!space)return;
    for(const shell of space.shells){if(shell.index===index){shell.board.editorHidden=enabled;shell.board.label.visible=!enabled;}if(!shell.mesh)continue;let changed=false;for(let i=0;i<shell.parts.length;i++){const p=shell.parts[i];if(p.houseIndex!==index)continue;const hide=enabled&&(p.y>5.5||(p.z-h.z)*sideZ>6.8||(p.x-h.x)*sideX>7.4);transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.rotation,0);transform.scale.set(hide?0:p.w,hide?0:p.h,hide?0:p.d);transform.updateMatrix();shell.mesh.setMatrixAt(i,transform.matrix);changed=true;}if(changed)shell.mesh.instanceMatrix.needsUpdate=true;}
    for(const gate of space.gates.values())if(gate.house===h.sourceIndex){if(gate.owned!==false)gate.mesh.visible=!enabled;if(gate.appearance)gate.appearance.visible=!enabled;}
  };
  function fallback(house){
    if(fallbacks.has(house))return fallbacks.get(house);
    const h=HOUSES[house],mesh=new THREE.Mesh(planeGeometry,boardMaterial);mesh.position.set(h.x,1.7,h.z+h.front*(ROOM.z-.15));mesh.rotation.y=h.front>0?Math.PI:0;mesh.scale.set(1.5,2.6,1);mesh.updateMatrixWorld();fallbacks.set(house,mesh);return mesh;
  }
  function counterpart(link){return originals().find(e=>e.house===link.house&&e.id===link.id)?.mesh||fallback(link.house);}
  function windowPairs(camera){
    const pairs=[];
    camera.updateMatrixWorld();const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let nearest=null,best=14*14;
    for(const entry of originals()){
      const f=portalFrame(entry.mesh),distance=camera.position.distanceToSquared(f.center);if(distance>=best||camera.position.clone().sub(f.center).dot(f.normal)<=.0001||!frustum.intersectsSphere(new THREE.Sphere(f.center,Math.hypot(f.width,f.height)*.5)))continue;nearest=entry;best=distance;
    }
    if(lastWindowEntry&&entries.has(lastWindowEntry)){const f=portalFrame(lastWindowEntry.mesh),distance=camera.position.distanceToSquared(f.center);if(distance<14*14&&best>distance*.75&&camera.position.clone().sub(f.center).dot(f.normal)>.0001&&frustum.intersectsSphere(new THREE.Sphere(f.center,Math.hypot(f.width,f.height)*.5)))nearest=lastWindowEntry;}lastWindowEntry=nearest;
    // A mirrored avenue is costly to instantiate. Keep the ordinary mirror
    // until the viewer is close enough for its doorway to fill the shot.
    if(nearest&&best<36){const space=createSpace(mirrorRealmKey(nearest.house,nearest.id));if(space){refreshGateways(space);const gate=space.gates.get(nearest.house+':'+nearest.id);if(gate)pairs.push({source:nearest.mesh,destination:gate.mesh});}}
    for(const space of spaces.values())if(Math.abs(camera.position.x-space.x)<100&&Math.abs(camera.position.z-(space.z-62.5))<85){refreshGateways(space);for(const gate of space.gates.values())pairs.push({source:gate.mesh,destination:counterpart(gate)});}
    for(const entry of entries){const h=houseDescriptor(entry.house);if(h?.realm&&originals().some(p=>p.house===h.sourceIndex&&p.id===entry.id))pairs.push({source:entry.mesh,destination:counterpart({house:h.sourceIndex,id:entry.id})});}
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
  // Walking never disables a wall collider. Portal entry is detected on its
  // front side before the collider prevents crossing the mirror plane.
  world.portalPassage=(body,position,previous,height=1.9,cameraRay=false)=>{
    if(!cameraRay||body.h<.5)return false;
    const portals=livePortals();for(const space of spaces.values())for(const gate of space.gates.values())portals.push(gate.mesh);
    for(const mesh of portals){const f=portalFrame(mesh);if(Math.hypot(position.x-f.center.x,position.z-f.center.z)>Math.hypot(f.width,f.height)+5&&!cameraRay)continue;
      const c=Math.cos(body.rotation||0),sn=Math.sin(body.rotation||0),extent=Math.abs(f.normal.x*c-f.normal.z*sn)*body.w/2+Math.abs(f.normal.x*sn+f.normal.z*c)*body.d/2;
      if(extent>.45||Math.abs((body.x-f.center.x)*f.normal.x+(body.z-f.center.z)*f.normal.z)>extent+.18)continue;
      if(cameraRay){const a=previous.clone().sub(f.center).dot(f.normal),b=position.clone().sub(f.center).dot(f.normal);if(a*b>0||Math.abs(a-b)<.0001)continue;const crossingPoint=previous.clone().lerp(position,a/(a-b));mesh.updateWorldMatrix(true,false);probe.copy(crossingPoint).applyMatrix4(inverse.copy(mesh.matrixWorld).invert());if(Math.abs(probe.x)<.49&&Math.abs(probe.y)<.49)return true;
      }
    }return false;
  };
  function travel(source,destination,position,entering,realm,time){
    const sourceFrame=portalFrame(source),entryPosition=position.clone(),distance=entryPosition.clone().sub(sourceFrame.center).dot(sourceFrame.normal);
    if(distance>0)entryPosition.addScaledVector(sourceFrame.normal,-distance-.4);
    const matrix=passageTransform(source,destination),newPosition=entryPosition.applyMatrix4(matrix),rotation=new THREE.Matrix3().setFromMatrix4(matrix),heading=new THREE.Vector3(0,0,1).applyMatrix3(rotation),yawDelta=Math.atan2(heading.x,heading.z);
    active=realm;cooldownUntil=time+.12;bridge={source,destination,matrix:matrix.clone(),inverse:matrix.clone().invert()};
    return {position:newPosition,yawDelta,matrix,rotation,entering,seamless:true};
  }
  function approaching(mesh,position,previous,velocity,height){
    const f=portalFrame(mesh),before=previous.clone().sub(f.center).dot(f.normal),after=position.clone().sub(f.center).dot(f.normal);
    if(after<-.2||after>.82||(after>=before&&velocity.dot(f.normal)>=-.02))return false;
    mesh.updateWorldMatrix(true,false);inverse.copy(mesh.matrixWorld).invert();
    for(const lift of [.18,height*.5,height-.1]){probe.set(position.x,position.y+lift,position.z).applyMatrix4(inverse);if(Math.abs(probe.x)<.62&&Math.abs(probe.y)<.62)return true;}
    return false;
  }
  function classicTravel(destination,realm,time){
    const f=portalFrame(destination),position=f.center.clone().addScaledVector(f.normal,1.1);position.y=ROOM.floor+.02;
    active=realm;cooldownUntil=time+1;bridge=null;
    return {position,yaw:Math.atan2(f.normal.x,f.normal.z),classic:true};
  }
  function step(position,velocity,height,time,previous){
    if(!previous||time<cooldownUntil)return null;
    const enters=mesh=>{if(travelMode==='classic')return approaching(mesh,position,previous,velocity,height);if(crossing(mesh,position,previous,height))return true;const f=portalFrame(mesh),distance=position.clone().sub(f.center).dot(f.normal);return distance>=0&&distance<=.6&&velocity.dot(f.normal)<-.02&&intersectsBody(mesh,position,height);};
    if(active){const space=createSpace(active);if(!space)return null;refreshGateways(space);for(const gate of space.gates.values())if(enters(gate.mesh))return travelMode==='classic'?classicTravel(counterpart(gate),null,time):travel(gate.mesh,counterpart(gate),position,false,null,time);
      for(const e of entries){const h=houseDescriptor(e.house);if(h?.realm===active&&originals().some(p=>p.house===h.sourceIndex&&p.id===e.id)&&enters(e.mesh))return travelMode==='classic'?classicTravel(counterpart({house:h.sourceIndex,id:e.id}),null,time):travel(e.mesh,counterpart({house:h.sourceIndex,id:e.id}),position,false,null,time);}return null;}
    for(const entry of originals()){if(!enters(entry.mesh))continue;const key=mirrorRealmKey(entry.house,entry.id),space=createSpace(key);if(!space)continue;const gate=space.gates.get(entry.house+':'+entry.id);if(gate)return travelMode==='classic'?classicTravel(gate,key,time):travel(entry.mesh,gate.mesh,position,true,key,time);}return null;
  }
  // A follow camera remains on its own side of the window after the actor
  // crosses. It changes coordinate space only when the camera crosses too.
  function adjustCamera(camera){
    if(!bridge)return;const f=portalFrame(bridge.destination),distance=camera.position.clone().sub(f.center).dot(f.normal);
    if(distance>=0){bridge=null;return;}
    camera.updateMatrixWorld();const matrix=bridge.inverse.clone().multiply(camera.matrixWorld);matrix.decompose(camera.position,camera.quaternion,camera.scale);camera.scale.setScalar(1);camera.updateMatrixWorld();
  }
  function renderViews(gpu,camera,{mobile=false,roots=[]}={}){
    if(travelMode==='classic')return;
    const pairs=windowPairs(camera);views.render(gpu,camera,pairs,{mobile,roots,prepare:virtual=>{renderer?.prepareView(virtual.position);world.cull(virtual.position);renderer?.cull(virtual.position,mobile);update(0,0,virtual);},restore:view=>{renderer?.prepareView(view.position);world.cull(view.position);renderer?.cull(view.position,mobile);update(0,0,view);}});
  }
  function realmForView(position){let nearest=null,best=Infinity;for(const space of spaces.values()){const dx=position.x-space.x,dz=position.z-(space.z-62.5),d=dx*dx+dz*dz;if(Math.abs(dx)<125&&Math.abs(dz)<110&&d<best){nearest=space.key;best=d;}}if(!nearest&&active&&(position.x>1500||position.z>1500))nearest=active;return nearest;}
  function update(_dt,_time,camera){const visibleRealm=realmForView(camera.position);for(const space of spaces.values()){space.group.visible=space.key===visibleRealm;if(space.group.visible)refreshGateways(space);}}
  return {restoreRealm(key){key=mirrorRealmKey();const space=createSpace(key);if(!space)return false;active=key;refreshGateways(space);for(const house of Object.values(HOUSES).filter(h=>h&&h.realm===key))renderer?.ensure?.(house.index);return true;},add,remove,markChanged(){mirrorRevision++;},setTravelMode(value){travelMode=value==='classic'?'classic':'seamless';bridge=null;lastWindowEntry=null;},step,update,realmForView,adjustCamera,renderViews,configure:value=>renderer=value,createSpace,spaces,reset(){active=null;bridge=null;},clearSpaces(){active=null;bridge=null;lastWindowEntry=null;views.clear();fallbacks.clear();for(const space of spaces.values()){space.group.removeFromParent();for(const shell of space.shells)if(shell.mesh)shell.mesh.dispose();for(const gate of space.gates.values())for(const child of gate.appearance?.children||[])child.dispose?.();world.setHouseBodies('mirror-avenue:'+space.key,[]);world.setMovementBounds?.(space.key,null);}spaces.clear();for(let i=world.boards.length-1;i>=0;i--)if(String(world.boards[i].houseIndex).startsWith('m|'))world.boards.splice(i,1);},get active(){return active!==null;},get realm(){return active;}};
}
