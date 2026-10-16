import * as THREE from 'three';
// Material clipping is a final contact boundary, after the animated weapon has
// moved into a close-ready posture. Depth testing remains enabled in every view.
export function createWeaponClearance(){
 const wall=new THREE.Plane(new THREE.Vector3(0,1,0),1e5),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),planes=[wall,floor],point=new THREE.Vector3(),incoming=new THREE.Vector3(),bounds=new THREE.Box3();
 let root=null,weight=0,materials=[];
 function dispose(){for(const item of materials){item.mesh.material=item.original;for(const m of item.copies)m.dispose();}materials=[];root=null;}
 function bind(model){if(root===model)return;dispose();root=model;if(!root)return;root.traverse(mesh=>{if(!mesh.isMesh)return;const original=mesh.material,copies=(Array.isArray(original)?original:[original]).map(m=>{const copy=m.clone();copy.onBeforeCompile=m.onBeforeCompile;copy.customProgramCacheKey=m.customProgramCacheKey;copy.depthTest=true;copy.clippingPlanes=planes;copy.clipShadows=true;return copy;});materials.push({mesh,original,copies});mesh.material=Array.isArray(original)?copies:copies[0];});}
 function update(world,anchor,model,dt){
  bind(model);if(!model||!world)return 0;model.updateWorldMatrix(true,true);
  point.set(0,.025,model.userData.weapon==='katana'?1.48:model.userData.muzzle?.position.z||.7).applyMatrix4(model.matrixWorld);
  const reach=anchor.distanceTo(point),safe=world.cameraPosition(anchor,point,.075),blocked=safe.distanceTo(point)>.035;
  const target=blocked?THREE.MathUtils.clamp(1-anchor.distanceTo(safe)/Math.max(.05,reach),0,1):0;weight=THREE.MathUtils.damp(weight,target,target>weight?24:10,Math.min(.05,dt));
  if(blocked){incoming.subVectors(point,anchor).normalize();const n=world.surfaceNormal(safe,incoming);if(n.dot(incoming)>0)n.negate();wall.normal.copy(n);wall.constant=-n.dot(safe)+.012;}else{wall.normal.set(0,1,0);wall.constant=1e5;}
  const base=world.floorAt(anchor,anchor.y+.045).y;floor.constant=-(base+.012);return weight;
 }
 function liftAboveFloor(world,anchor,rig,model){if(!model)return;rig.updateWorldMatrix(true,true);bounds.setFromObject(model);const ground=world.floorAt(anchor,anchor.y+.045).y+.035,raise=Math.max(0,ground-bounds.min.y);if(raise>0){const position=rig.getWorldPosition(point);position.y+=raise;rig.position.copy(rig.parent.worldToLocal(position));rig.updateWorldMatrix(true,true);}}
 return {update,liftAboveFloor,dispose,get weight(){return weight;}};
}
