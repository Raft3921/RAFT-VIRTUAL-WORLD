import * as THREE from 'three';
import {footProfile,FOOTPRINT_LIMIT,FOOTPRINT_LIFETIME} from './footprint-store.js?v=20261017-maps121';
export function createFootprints(scene){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');
 // Square, block-model sole rather than an unrelated human shoe silhouette.
 c.fillStyle='rgba(255,255,255,.72)';c.fillRect(4,4,56,56);c.clearRect(9,9,46,46);c.fillStyle='rgba(255,255,255,.60)';
 for(let row=0;row<4;row++)for(let col=0;col<4;col++)c.fillRect(10+col*11,10+row*11,8,8);
 const texture=new THREE.CanvasTexture(canvas),geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
 const born=new THREE.InstancedBufferAttribute(new Float32Array(FOOTPRINT_LIMIT),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('printBorn',born);
 const epoch=Date.now(),clock={value:0},material=new THREE.MeshBasicMaterial({map:texture,color:'#514333',transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 material.onBeforeCompile=shader=>{shader.uniforms.printNow=clock;shader.vertexShader='attribute float printBorn;varying float vPrintBorn;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPrintBorn=printBorn;');shader.fragmentShader='uniform float printNow;varying float vPrintBorn;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=.65*pow(clamp(1.0-(printNow-vPrintBorn)/60.0,0.0,1.0),.75);');};
 material.customProgramCacheKey=()=> 'footprints-fade-1';
 const mesh=new THREE.InstancedMesh(geometry,material,FOOTPRINT_LIMIT);mesh.name='Synchronized sixty-second sole impressions';mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 const records=new Map(),transform=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),yawRotation=new THREE.Quaternion();let dirty=false,nextCull=0;
 function add(marks){for(const mark of marks||[])if(Number.isFinite(mark.id)&&[mark.x,mark.y,mark.z,mark.born,mark.yaw].every(Number.isFinite)){records.set(mark.id,mark);dirty=true;}while(records.size>FOOTPRINT_LIMIT)records.delete(records.keys().next().value);}
 function clear(ids){if(ids)for(const id of ids)records.delete(id);else records.clear();dirty=true;}
 return {add,clear,hydrate(marks){clear();add(marks);},update(now,position,visible=true){clock.value=(now-epoch)/1000;mesh.visible=visible&&mesh.count>0;if(!position||!dirty&&now<nextCull)return;nextCull=now+250;dirty=false;let count=0;
  for(const [id,m]of records){if(now-m.born>=FOOTPRINT_LIFETIME){records.delete(id);continue;}if((m.x-position.x)**2+(m.z-position.z)**2>100**2)continue;const profile=footProfile(m.skin);transform.position.set(m.x,m.y+.009,m.z);normal.set(m.nx||0,1,m.nz||0).normalize();transform.quaternion.setFromUnitVectors(up,normal);yawRotation.setFromAxisAngle(up,m.yaw+(m.side?.025:-.025));transform.quaternion.multiply(yawRotation);transform.scale.set(profile.width,1,profile.length);transform.updateMatrix();mesh.setMatrixAt(count,transform.matrix);born.setX(count++,(m.born-epoch)/1000);}
  mesh.count=count;mesh.visible=visible&&count>0;if(count){mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;born.addUpdateRange(0,count);born.needsUpdate=true;}
 }};
}
