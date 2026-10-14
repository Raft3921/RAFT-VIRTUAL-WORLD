import * as THREE from 'three';
import {projectileGeometry} from './cinematic-projectile.js?v=20261014-fps94';
const ids=['pistol','machine','sniper','shotgun','rocket'];
export function createProjectileRenderer(scene,limit=96){
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.55,roughness:.34}),batches=new Map(),transform=new THREE.Object3D(),direction=new THREE.Vector3(),axis=new THREE.Vector3(0,0,1);scene.add(root);
 for(const id of ids){const mesh=new THREE.InstancedMesh(projectileGeometry(id),material,limit);mesh.frustumCulled=false;mesh.count=0;mesh.visible=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);batches.set(id,{mesh,count:0});}
 return {update(shots,now,visible=true){root.visible=visible;for(const batch of batches.values())batch.count=0;
  for(const [id,shot]of shots){const age=(now-shot.born)/1000;if(age>shot.life){shots.delete(id);continue;}const batch=batches.get(shot.weapon);if(!visible||!batch||batch.count>=limit)continue;const start=shot.origin||shot.position;transform.position.set(start.x+shot.vx*age,start.y+shot.vy*age,start.z+shot.vz*age);direction.set(shot.vx,shot.vy,shot.vz).normalize();transform.quaternion.setFromUnitVectors(axis,direction);transform.scale.setScalar(1);transform.updateMatrix();batch.mesh.setMatrixAt(batch.count++,transform.matrix);}
  for(const batch of batches.values()){batch.mesh.count=batch.count;batch.mesh.visible=batch.count>0;if(batch.count)batch.mesh.instanceMatrix.needsUpdate=true;}
 }};
}
