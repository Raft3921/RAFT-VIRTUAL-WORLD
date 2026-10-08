import * as THREE from 'three';
import {HOUSES,ROOM} from './housing-data.js';

// Mirrors are static passage boards. No reflection camera, texture or pass.
// Each house opens into one equally sized white room shared by its visitors.
export function createHousingMirrors(scene,world){
  const planeGeometry=new THREE.PlaneGeometry(1,1),boxGeometry=new THREE.BoxGeometry(1,1,1),boardMaterial=new THREE.MeshBasicMaterial({color:'#cad9df',fog:false,toneMapped:false,side:THREE.DoubleSide}),white=new THREE.MeshBasicMaterial({color:'#ffffff',fog:false,toneMapped:false});
  const entries=new Set(),spaces=new Map(),inverse=new THREE.Matrix4(),probe=new THREE.Vector3(),point=new THREE.Vector3(),normal=new THREE.Vector3(),transform=new THREE.Object3D();
  let active=null,cooldownUntil=0;
  function add(group,id,part){const mesh=new THREE.Mesh(planeGeometry,boardMaterial);mesh.userData.itemId=id;mesh.userData.portalHeight=part.portalHeight||1;group.add(mesh);const entry={mesh,part,id,house:group.userData.houseIndex};entries.add(entry);return entry;}
  function remove(entry){entries.delete(entry);entry.mesh.removeFromParent();}
  function createSpace(index){
    if(spaces.has(index))return spaces.get(index);
    const x=-980+index*40,z=-980,y=60,group=new THREE.Group();group.name='White mirror room '+index;group.position.set(x,y,z);scene.add(group);
    const panels=[{x:0,y:-.1,z:0,w:ROOM.x*2,h:.2,d:ROOM.z*2},{x:0,y:ROOM.height+.1,z:0,w:ROOM.x*2+.4,h:.2,d:ROOM.z*2+.4},...[-1,1].map(sign=>({x:sign*(ROOM.x+.1),y:ROOM.height/2,z:0,w:.2,h:ROOM.height,d:ROOM.z*2+.4})),...[-1,1].map(sign=>({x:0,y:ROOM.height/2,z:sign*(ROOM.z+.1),w:ROOM.x*2,h:ROOM.height,d:.2}))];
    const shell=new THREE.InstancedMesh(boxGeometry,white,panels.length);for(let i=0;i<panels.length;i++){const p=panels[i];transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,0,0);transform.scale.set(p.w,p.h,p.d);transform.updateMatrix();shell.setMatrixAt(i,transform.matrix);}shell.computeBoundingSphere();group.add(shell);
    // The exit is the only object in the blank room. Its centre is passable;
    // approaching it triggers the return before the solid wall behind it.
    const exit=new THREE.Mesh(planeGeometry,boardMaterial);exit.position.set(0,1.55,-ROOM.z+.16);exit.scale.set(2,3,1);group.add(exit);
    const space={index,x,y,z,group,exit};spaces.set(index,space);world.setHouseBodies('mirror-space:'+index,panels.map(p=>({...p,x:x+p.x,y:y+p.y,z:z+p.z})));return space;
  }
  function approaching(mesh,position,velocity,height){
    mesh.updateWorldMatrix(true,false);point.setFromMatrixPosition(mesh.matrixWorld);normal.set(0,0,1).transformDirection(mesh.matrixWorld);
    const distance=(position.x-point.x)*normal.x+(position.y+height*.5-point.y)*normal.y+(position.z-point.z)*normal.z;
    if(distance<-.15||distance>.5||velocity.dot(normal)>=-.08)return false;
    inverse.copy(mesh.matrixWorld).invert();
    // Check vertical body samples rather than demanding the short/small mirror
    // accommodate an entire skin, including Gyoza's wider head.
    for(const lift of [.18,height*.5,height-.10]){probe.set(position.x,position.y+lift,position.z).applyMatrix4(inverse);if(Math.abs(probe.x)<.55&&Math.abs(probe.y)<.55*(mesh.userData.portalHeight||1))return true;}
    return false;
  }
  function enter(entry,time){
    const space=createSpace(entry.house);entry.mesh.updateWorldMatrix(true,false);point.setFromMatrixPosition(entry.mesh.matrixWorld);normal.set(0,0,1).transformDirection(entry.mesh.matrixWorld);
    active={house:entry.house,id:entry.id};cooldownUntil=time+1;
    return {position:new THREE.Vector3(space.x,space.y+.02,space.z-ROOM.z+2),yaw:0,entering:true};
  }
  function leave(time){
    const link=active,h=HOUSES[link.house],entry=[...entries].find(e=>e.house===link.house&&e.id===link.id);let destination,heading;
    if(entry){entry.mesh.updateWorldMatrix(true,false);point.setFromMatrixPosition(entry.mesh.matrixWorld);normal.set(0,0,1).transformDirection(entry.mesh.matrixWorld);destination=point.clone().addScaledVector(normal,1.35);destination.y=ROOM.floor+.02;heading=Math.atan2(normal.x,normal.z);}
    else{destination=new THREE.Vector3(h.x,ROOM.floor+.02,h.z+h.front*8.5);heading=h.front<0?Math.PI:0;}
    // Use a nearby safe floor position if another visitor has edited furniture
    // while we were inside. Never lose the exit when its source was removed.
    world.move(destination,new THREE.Vector3(),1/60,{shape:{height:1.9,width:.65,depth:.35,yaw:heading}});
    active=null;cooldownUntil=time+1;return {position:destination,yaw:heading,entering:false};
  }
  function step(position,velocity,height,time){
    if(active){const space=spaces.get(active.house);if(Math.abs(position.x-space.x)>ROOM.x+3||Math.abs(position.z-space.z)>ROOM.z+3||Math.abs(position.y-space.y)>ROOM.height+3)active=null;}
    if(time<cooldownUntil)return null;
    if(active){const space=spaces.get(active.house);if(approaching(space.exit,position,velocity,height))return leave(time);return null;}
    for(const entry of entries){const h=HOUSES[entry.house];if(!h||Math.hypot(position.x-h.x,position.z-h.z)>12)continue;if(approaching(entry.mesh,position,velocity,height))return enter(entry,time);}
    return null;
  }
  function update(_dt,_time,camera){for(const space of spaces.values())space.group.visible=camera.position.distanceToSquared(space.group.position)<8100;}
  return {add,remove,step,update,get active(){return active!==null;}};
}
