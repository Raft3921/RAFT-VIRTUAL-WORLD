import * as THREE from 'three';

// Deliberately made from a small set of shared box/cylinder geometries.  This keeps
// the expanded world cheap enough for phones while still giving every object a body.
const palette={red:'#d84a42',green:'#52a96d',cyan:'#48b8d4',orange:'#e88a38',gray:'#87929a',purple:'#9a70c5',yellow:'#e4c84d',brown:'#9a6748'};
const boxGeo=new THREE.BoxGeometry(1,1,1), cylinderGeo=new THREE.CylinderGeometry(1,1,1,16), ringGeo=new THREE.TorusGeometry(1,.12,6,20);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.03,...extra});
const white=mat('#f5f4ed'),wood=mat('#b9875d'),path=mat('#dfd1af'),dark=mat('#27323a'),glass=mat('#7de8ff',{transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}),hazard=mat('#ff322c',{emissive:'#ff0900',emissiveIntensity:2});
const v=new THREE.Vector3();

function cube(group,material,x,y,z,sx,sy,sz,name=''){
  const mesh=new THREE.Mesh(boxGeo,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=sy>1;mesh.receiveShadow=true;mesh.name=name;group.add(mesh);return mesh;
}
function cylinder(group,material,x,y,z,r,h,name=''){
  const mesh=new THREE.Mesh(cylinderGeo,material);mesh.position.set(x,y,z);mesh.scale.set(r,h,r);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;group.add(mesh);return mesh;
}
function labelSprite(text,color='#fff'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');
  c.fillStyle='rgba(9,22,25,.82)';c.fillRect(0,12,512,104);c.strokeStyle=color;c.lineWidth=5;c.strokeRect(3,15,506,98);c.fillStyle='#fff';c.font='700 43px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,66);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));sprite.scale.set(7,1.75,1);return sprite;
}
function addHouse(group,colliders,x,color,name){
  const paint=mat(color), roof=mat(new THREE.Color(color).multiplyScalar(.58));
  // Four solid walls with a wide front entrance, white interior walls and timber floor.
  cube(group,wood,x,.08,31,9,.16,10,'house timber floor');
  cube(group,white,x-4.35,2.2,31,.3,4.4,10,'house wall');cube(group,white,x+4.35,2.2,31,.3,4.4,10,'house wall');
  cube(group,white,x,2.2,35.35,9,4.4,.3,'house back wall');cube(group,white,x-2.9,2.2,26.65,3.2,4.4,.3,'house front wall');cube(group,white,x+2.9,2.2,26.65,3.2,4.4,.3,'house front wall');
  cube(group,roof,x,5.0,31,9.5,.45,10.5,'colour roof');cube(group,paint,x,5.5,31,8.9,.45,9.9,'colour roof trim');
  cube(group,paint,x,1.1,35.05,2.4,1.8,.15,'colour interior panel');
  const sign=labelSprite(name,color);sign.position.set(x,6.3,26.2);group.add(sign);
  colliders.push({minX:x-4.65,maxX:x-4.05,minZ:21,maxZ:41},{minX:x+4.05,maxX:x+4.65,minZ:21,maxZ:41},{minX:x-4.65,maxX:x+4.65,minZ:34.95,maxZ:35.65},{minX:x-4.65,maxX:x-1.4,minZ:26.35,maxZ:26.95},{minX:x+1.4,maxX:x+4.65,minZ:26.35,maxZ:26.95});
}
function addArena(group){
  const center={x:55,z:-18};const stone=mat('#b7c0c3'),seat=mat('#53656a');
  cylinder(group,stone,center.x,.18,center.z,22,.36,'arena floor');
  for(let i=0;i<36;i++){const a=i/36*Math.PI*2,x=center.x+Math.sin(a)*19,z=center.z+Math.cos(a)*19;cylinder(group,seat,x,.65,z,1.18,.52,'sit seat');}
  // Thin hexagonal barrier: it only becomes visible close to it.
  const barrier=new THREE.Group();barrier.name='proximity hex barrier';const lineMat=new THREE.LineBasicMaterial({color:'#8deeff',transparent:true,opacity:0});
  for(let y=2;y<17;y+=2.15)for(let i=0;i<28;i++){const a=i/28*Math.PI*2;const p=new THREE.Vector3(center.x+Math.sin(a)*22,y,center.z+Math.cos(a)*22);const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:7},(_,n)=>new THREE.Vector3(Math.cos(n*Math.PI/3)*.68,Math.sin(n*Math.PI/3)*.68,0))),lineMat);ring.position.copy(p);ring.lookAt(center.x,y,center.z);barrier.add(ring)}
  group.add(barrier);const sign=labelSprite('ARENA · 2人でパンチをほぼ同時に',' #9defff');sign.position.set(center.x,4,center.z-23);group.add(sign);
  return {center,radius:22,barrier,lineMat};
}
function addAthletic(group){
  const startZ=76;cube(group,path,0,.03,70,7,.06,18,'athletic path');const sign=labelSprite('ATHLETIC · 飛行OFF / ジャンプで進む','#ffdb54');sign.position.set(0,4,72);group.add(sign);
  const checkpoints=[];for(let i=0;i<24;i++){const z=startZ+i*4.5,x=Math.sin(i*1.7)*4.2,y=.65+(i%5===0?1.1:0);const color=mat(`hsl(${(i*42)%360} 72% 58%)`);cube(group,color,x,y,z,2.4,.35,2.4,'athletic block');if(i===0||i===8||i===16||i===23){const cp={x,z};checkpoints.push(cp);cylinder(group,mat('#63f0d2',{emissive:'#1d9f82',emissiveIntensity:.5}),x,.9,z,1.25,.12,'checkpoint');const s=labelSprite(`CHECK ${checkpoints.length}`,'#64f4d0');s.position.set(x,3,z);group.add(s)}if(i===5||i===13||i===20){const beam=cube(group,hazard,x+2,1.2,z+1.5,5,.13,.13,'red lethal beam');beam.userData.hazard=true;}}
  return {minZ:68,maxZ:190,checkpoints,finish:{x:Math.sin(23*1.7)*4.2,z:startZ+23*4.5}};
}
function addStudio(group){
  const x=0,z=-20;cube(group,white,x,.08,z,18,.16,14,'studio floor');cube(group,white,x-9,3,z,.25,6,14);cube(group,white,x+9,3,z,.25,6,14);cube(group,white,x,3,z+7,.25,6,18);cube(group,white,x,6,z,18,.25,14);const backdrop=cube(group,mat('#2bbf7b'),x,3,z+6.7,15,.02,9,'studio chroma backdrop');const board=cube(group,dark,x,2.2,z-6.7,4,2.1,.18,'studio menu board');const s=labelSprite('STUDIO BOARD · 背景 / マスター','#d5ffea');s.position.set(x,4.9,z-6.35);group.add(s);return {x,z,board,backdrop};
}
export function createWorld(scene){
  const group=new THREE.Group();group.name='RAFT expanded lightweight world';scene.add(group);const colliders=[];
  cube(group,path,0,.02,17,5,.04,82,'main road');cube(group,path,28,.02,0,56,.04,5,'arena road');cube(group,path,0,.02,52,72,.04,5,'houses road');
  [['赤','red'],['緑','green'],['水色','cyan'],['オレンジ','orange'],['灰色','gray'],['紫','purple'],['黄色','yellow'],['茶色','brown']].forEach(([name,key],i)=>addHouse(group,colliders,-38+i*11,palette[key],`${name}の家`));
  const arena=addArena(group),athletic=addAthletic(group),studio=addStudio(group);const board=studio.board;
  function resolve(position,radius=.42){for(const c of colliders){const x=Math.max(c.minX,Math.min(position.x,c.maxX)),z=Math.max(c.minZ,Math.min(position.z,c.maxZ));const dx=position.x-x,dz=position.z-z;if(dx*dx+dz*dz<radius*radius){if(Math.abs(dx)>Math.abs(dz))position.x=x+(dx<0?-radius:radius);else position.z=z+(dz<0?-radius:radius)}}return position}
  function inAthletic(p){return Math.abs(p.x)<15&&p.z>athletic.minZ&&p.z<athletic.maxZ}
  function update(t,player){const near=Math.max(0,1-Math.abs(Math.hypot(player.x-arena.center.x,player.z-arena.center.z)-arena.radius)/7);arena.lineMat.opacity=.03+.32*near;arena.lineMat.needsUpdate=true;}
  function boardHit(origin,facing){const to=v.set(studio.x,2.2,studio.z-6.7).sub(origin);return to.length()<5&&to.normalize().dot(facing)>.7}
  function seatAt(p){for(let i=0;i<36;i++){const a=i/36*Math.PI*2;if(Math.hypot(p.x-(arena.center.x+Math.sin(a)*19),p.z-(arena.center.z+Math.cos(a)*19))<1.25)return {x:arena.center.x+Math.sin(a)*19,z:arena.center.z+Math.cos(a)*19}}return null}
  function setBackdrop(mode){studio.backdrop.material.color.set(mode==='RB'?'#ef3d53':mode==='BB'?'#2779df':'#2bbf7b')}
  return {group,arena,athletic,studio,resolve,inAthletic,update,boardHit,seatAt,setBackdrop};
}
