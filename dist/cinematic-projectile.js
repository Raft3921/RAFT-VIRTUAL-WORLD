import * as THREE from 'three';
import {bakeMeshes} from './model-batching.js?v=20261014-fps94';
const cache=new Map(),metal=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.64,roughness:.3}),profiles={pistol:{r:.048,length:.22,color:'#c89161',tip:.84},machine:{r:.04,length:.29,color:'#d3a269',tip:.94},sniper:{r:.058,length:.39,color:'#bb7848',tip:.96},shotgun:{r:.065,length:.13,color:'#8b929c',tip:.65},rocket:{r:.135,length:.9,color:'#566549'}};
export function projectileGeometry(weapon,{detail=false}={}){
 const id=profiles[weapon]?weapon:'pistol',key=id+':'+detail;if(cache.has(key))return cache.get(key);const p=profiles[id],segments=detail?28:8,parts=[];
 const add=(geometry,color,z=0,rx=Math.PI/2)=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color}));mesh.position.z=z;mesh.rotation.x=rx;parts.push(mesh);return mesh;};
 if(id==='rocket'){
  add(new THREE.CylinderGeometry(.135,.135,.58,segments),p.color);
  add(new THREE.LatheGeometry([new THREE.Vector2(.135,0),new THREE.Vector2(.13,.06),new THREE.Vector2(.105,.15),new THREE.Vector2(.065,.23),new THREE.Vector2(.012,.30),new THREE.Vector2(0,.31)],segments),p.color,.29);
  for(const z of [-.22,.16])add(new THREE.CylinderGeometry(.142,.142,.035,segments),'#838d95',z);
  add(new THREE.CylinderGeometry(.095,.12,.11,segments),'#252c32',-.34);
  for(let i=0;i<4;i++){const fin=add(new THREE.BoxGeometry(.24,.022,.28),'#66727d',-.23,0);fin.position.x=Math.cos(i*Math.PI/2)*.16;fin.position.y=Math.sin(i*Math.PI/2)*.16;fin.rotation.z=i*Math.PI/2;}
 }else if(id==='shotgun')add(new THREE.SphereGeometry(p.r,segments,detail?16:6),p.color,0,0);
 else{
  add(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(p.r*.85,0),new THREE.Vector2(p.r,.018),new THREE.Vector2(p.r,p.length*.56),new THREE.Vector2(p.r*.8,p.length*.76),new THREE.Vector2(p.r*.4,p.length*p.tip),new THREE.Vector2(0,p.length)],segments),p.color,-p.length*.5);
  if(detail)for(const z of [-p.length*.35,-p.length*.25])add(new THREE.CylinderGeometry(p.r*1.015,p.r*1.015,.008,segments),'#846347',z);
 }
 const geometry=bakeMeshes(parts);for(const part of parts){part.geometry.dispose();part.material.dispose();}cache.set(key,geometry);return geometry;
}
export function createCinematicProjectile(weapon){
 const root=new THREE.Group(),body=new THREE.Group(),rocket=weapon==='rocket';root.add(body);body.add(new THREE.Mesh(projectileGeometry(weapon,{detail:true}),metal));
 let exhaust=null,core=null;const flame=new THREE.MeshBasicMaterial({color:'#ffb846',transparent:true,opacity:rocket?.7:.18,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 exhaust=new THREE.Mesh(new THREE.ConeGeometry(rocket?.14:.025,rocket?.85:.5,12),flame);exhaust.rotation.x=-Math.PI/2;exhaust.position.z=rocket?-.79:-.39;root.add(exhaust);
 if(rocket){core=new THREE.Mesh(new THREE.ConeGeometry(.065,.48,12),new THREE.MeshBasicMaterial({color:'#fff4d1',transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));core.rotation.x=-Math.PI/2;core.position.z=-.60;root.add(core);}
 const streakMaterial=new THREE.MeshBasicMaterial({color:rocket?'#ffb455':'#a8e9ff',transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),streakGeometry=new THREE.BoxGeometry(1,1,1),streaks=new THREE.InstancedMesh(streakGeometry,streakMaterial,24),scratch=new THREE.Object3D();streaks.frustumCulled=false;root.add(streaks);
 const haloMaterial=new THREE.MeshBasicMaterial({color:'#fff0b5',side:THREE.DoubleSide,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),halo=new THREE.Mesh(new THREE.RingGeometry(rocket?.20:.075,rocket?.23:.09,32),haloMaterial);root.add(halo);
 root.name='Cinematic '+weapon+' projectile';
 return {root,update(t){body.rotation.z=t*(rocket?1.8:12);for(let i=0;i<24;i++){const a=i*2.39996+t*2,r=(rocket?.15:.055)*(1+i*.05);scratch.position.set(Math.cos(a)*r,Math.sin(a)*r,-.2-i*(rocket?.14:.085));scratch.rotation.set(0,0,a);scratch.scale.set(.009,.009,.14+i*.012);scratch.updateMatrix();streaks.setMatrixAt(i,scratch.matrix);}streaks.instanceMatrix.needsUpdate=true;halo.rotation.z=t*3;halo.scale.setScalar(1+Math.sin(t*8)*.18);exhaust.scale.y=1+Math.sin(t*37)*.09;flame.opacity=(rocket?.65:.18)+Math.sin(t*29)*.04;if(core)core.scale.y=1+Math.sin(t*43)*.1;},dispose(){root.removeFromParent();streakGeometry.dispose();streakMaterial.dispose();halo.geometry.dispose();haloMaterial.dispose();exhaust.geometry.dispose();flame.dispose();if(core){core.geometry.dispose();core.material.dispose();}}};
}
