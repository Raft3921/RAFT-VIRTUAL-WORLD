import * as THREE from 'three';
// Close-up geometry is allocated only for the final-shot sequence.
export function createCinematicProjectile(weapon){
 const rocket=weapon==='rocket',root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const copper=new THREE.MeshStandardMaterial({color:'#c58b50',metalness:.82,roughness:.24}),steel=new THREE.MeshStandardMaterial({color:'#5b656c',metalness:.7,roughness:.3}),olive=new THREE.MeshStandardMaterial({color:'#556345',metalness:.45,roughness:.39}),dark=new THREE.MeshStandardMaterial({color:'#181d23',metalness:.35,roughness:.55});
 const flame=new THREE.MeshBasicMaterial({color:'#ffb846',transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),core=new THREE.MeshBasicMaterial({color:'#fff4d1',transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 function add(geometry,material,z=0){const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=Math.PI/2;mesh.position.z=z;mesh.castShadow=true;body.add(mesh);return mesh;}
 let exhaust=null,inner=null;
 if(rocket){
  add(new THREE.CylinderGeometry(.135,.135,.58,24),olive,0);
  const nose=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.135,0),new THREE.Vector2(.13,.06),new THREE.Vector2(.105,.15),new THREE.Vector2(.065,.23),new THREE.Vector2(.012,.30),new THREE.Vector2(0,.31)],32),olive);nose.rotation.x=Math.PI/2;nose.position.z=.29;body.add(nose);
  for(const z of [-.22,.16])add(new THREE.CylinderGeometry(.142,.142,.035,24),steel,z);
  add(new THREE.CylinderGeometry(.095,.12,.11,24),dark,-.34);
  for(let i=0;i<4;i++){const fin=new THREE.Mesh(new THREE.BoxGeometry(.24,.022,.28),steel);fin.position.set(Math.cos(i*Math.PI/2)*.16,Math.sin(i*Math.PI/2)*.16,-.23);fin.rotation.z=i*Math.PI/2;body.add(fin);}
  exhaust=add(new THREE.ConeGeometry(.14,.85,16),flame,-.79);exhaust.rotation.x=-Math.PI/2;
  inner=add(new THREE.ConeGeometry(.065,.48,16),core,-.60);inner.rotation.x=-Math.PI/2;
 }else{
  const r=weapon==='sniper'?.058:weapon==='shotgun'?.075:.048,length=weapon==='sniper'?.34:.23;
  const points=[new THREE.Vector2(0,0),new THREE.Vector2(r*.85,0),new THREE.Vector2(r,.018),new THREE.Vector2(r,length*.58),new THREE.Vector2(r*.8,length*.77),new THREE.Vector2(r*.42,length*.94),new THREE.Vector2(0,length)];
  const jacket=new THREE.Mesh(new THREE.LatheGeometry(points,32),copper);jacket.rotation.x=Math.PI/2;jacket.position.z=-length*.5;body.add(jacket);
  for(const z of [-length*.35,-length*.25])add(new THREE.CylinderGeometry(r*1.015,r*1.015,.008,24),steel,z);
  exhaust=add(new THREE.ConeGeometry(r*.45,.7,12),flame,-length*.5-.35);exhaust.rotation.x=-Math.PI/2;flame.opacity=.22;
 }
 const light=new THREE.PointLight('#ffbb68',rocket?5:1,rocket?3:1.5,2);light.position.z=-.3;root.add(light);
 root.name='Cinematic '+weapon+' projectile';
 return {root,update(t){body.rotation.z=t*(rocket?1.8:12);if(exhaust){exhaust.scale.y=1+Math.sin(t*37)*.09;flame.opacity=(rocket?.65:.2)+Math.sin(t*29)*.04;}if(inner)inner.scale.y=1+Math.sin(t*43)*.1;},dispose(){root.removeFromParent();root.traverse(node=>node.geometry?.dispose());for(const material of [copper,steel,olive,dark,flame,core])material.dispose();}};
}
