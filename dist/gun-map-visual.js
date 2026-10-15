import * as THREE from 'three';
import {cutConvexGeometry} from './convex-cut.js?v=20261015-tactics99';
// All permanent cut fragments share one draw. Rebuild only on a new trace.
export function createGunMapVisual(group,bodies){
 const changed=new Map(),scratch=new THREE.Object3D(),cutPoint=new THREE.Vector3(),normal=new THREE.Vector3(),color=new THREE.Color(),positions=[],normals=[],colors=[];
 const debris=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}));debris.name='permanent cut traces';debris.receiveShadow=true;debris.visible=false;group.add(debris);
 const byId=new Map();for(const b of bodies)if(b.gunPropId){const list=byId.get(b.gunPropId)||[];list.push(b);byId.set(b.gunPropId,list);}
 function transform(b,open=false){b.disabled=true;scratch.position.set(b.x-(open?b.w/2:0),b.y,b.z+(open?b.w/2:0));scratch.rotation.set(0,open?Math.PI/2:0,0);scratch.scale.set(open?b.w:0,open?b.h:0,open?b.d:0);scratch.updateMatrix();b.mesh.setMatrixAt(b.instance,scratch.matrix);b.mesh.instanceMatrix.needsUpdate=true;}
 return {apply(traces){let dirty=false;
  for(const trace of traces||[]){if(changed.has(trace.id)&&!(changed.get(trace.id).mode==='open'&&trace.mode==='cut'))continue;const list=byId.get(trace.id);if(!list)continue;changed.set(trace.id,trace);
   for(const b of list){const open=trace.mode==='open'&&b.gunPropKind==='door';transform(b,open);if(open)continue;
    const geometry=new THREE.BoxGeometry(b.w,b.h,b.d);normal.fromArray(trace.normal).normalize();cutPoint.set(b.gunBounds.x-b.x,b.gunBounds.y-b.y,b.gunBounds.z-b.z);const cuts=cutConvexGeometry(geometry,cutPoint,normal);geometry.dispose();
    for(const cut of cuts){
     if(cut.volume<1e-8){cut.geometry.dispose();continue;}
     scratch.position.set(b.x+cut.side*.20,.16+b.h*.13,b.z+cut.side*.24);scratch.rotation.set(cut.side*.65,cut.side*.2,cut.side*1.1);scratch.scale.setScalar(1);scratch.updateMatrix();cut.geometry.applyMatrix4(scratch.matrix);
     const p=cut.geometry.attributes.position,n=cut.geometry.attributes.normal;color.copy(b.mesh.material.color);
     for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(color.r,color.g,color.b);}cut.geometry.dispose();dirty=true;
    }
   }
  }
  if(dirty){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();debris.geometry.dispose();debris.geometry=geometry;debris.visible=true;}
 },get changed(){return changed;}};
}
