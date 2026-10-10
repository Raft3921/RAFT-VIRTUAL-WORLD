import * as THREE from 'three';
const geometry=new THREE.BoxGeometry(1,1,1),barrel=new THREE.CylinderGeometry(1,1,1,10),steel=new THREE.MeshStandardMaterial({color:'#343b41',roughness:.38,metalness:.72}),black=new THREE.MeshStandardMaterial({color:'#171b20',roughness:.72,metalness:.25}),wood=new THREE.MeshStandardMaterial({color:'#71543b',roughness:.65}),lens=new THREE.MeshStandardMaterial({color:'#415c6c',metalness:.8,roughness:.12});
export function createGunModel(id){const root=new THREE.Group();root.name='weapon-'+id;
 const part=(x,y,z,w,h,d,mat=steel)=>{const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;};
 const tube=(x,y,z,r,l,mat=steel)=>{const mesh=new THREE.Mesh(barrel,mat);mesh.position.set(x,y,z);mesh.rotation.x=Math.PI/2;mesh.scale.set(r,l,r);root.add(mesh);};
 const pistol=id==='pistol',rocket=id==='rocket';
 if(rocket){tube(0,.02,.27,.13,1.05);tube(0,.02,.8,.16,.08,black);tube(0,.02,-.29,.15,.1,black);part(0,-.19,.05,.11,.29,.13,black);part(.13,.12,.23,.04,.13,.24);}
 else {part(0,0,.16,.12,pistol?.13:.16,pistol?.35:.54);part(0,-.18,.02,.1,.3,.13,black);tube(0,.025,pistol?.38:.65,pistol?.035:.027,pistol?.12:.54);part(0,.095,.08,.025,.05,.05,black);part(0,.095,pistol?.31:.75,.025,.05,.04,black);
  if(!pistol){part(0,-.035,-.23,.12,.2,.36,id==='shotgun'?wood:black);part(0,-.025,.45,.15,.17,.32,id==='shotgun'?wood:black);if(id==='machine')part(0,-.19,.23,.08,.25,.14,black);if(id==='sniper'){tube(0,.2,.18,.055,.36,black);tube(0,.2,.37,.057,.018,lens);part(0,.12,.18,.055,.1,.16);}}
  part(0,-.15,.14,.085,.024,.15);part(0,-.095,.215,.085,.12,.025);
 }return root;}
