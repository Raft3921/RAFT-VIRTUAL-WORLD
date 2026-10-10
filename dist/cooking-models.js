import * as THREE from 'three';
import {describeDish} from './cooking-data.js?v=20261011-free-cook73';
import {voxelFood,voxelMound} from './cooking-food.js?v=20261011-free-cook73';
const profile=points=>new THREE.LatheGeometry(points.map(([x,y])=>new THREE.Vector2(x,y)),32);
const geometries={
 box:new THREE.BoxGeometry(1,1,1),round:new THREE.SphereGeometry(.5,16,10),disc:new THREE.CylinderGeometry(.5,.5,1,32),
 tube:new THREE.CylinderGeometry(.5,.5,1,32,1,true),cone:new THREE.ConeGeometry(.5,1,12),
 rim:new THREE.TorusGeometry(.48,.025,8,32).rotateX(Math.PI/2),
 wire:new THREE.TorusGeometry(.42,.022,6,24),
 bowl:profile([[0,0],[.22,0],[.36,.15],[.47,.65],[.5,1],[.46,1],[.43,.67],[.32,.2],[0,.15]]),
 basket:profile([[0,0],[.35,0],[.49,.9],[.5,1],[.465,1],[.315,.1],[0,.1]])
},materials=new Map();
function material(color){
 if(!materials.has(color)){
  const metal=['#b9c8cf','#e9f1f4','#536675'].includes(color);
  materials.set(color,new THREE.MeshStandardMaterial({color,roughness:metal?.25:.65,metalness:metal?.78:0,side:THREE.DoubleSide}));
 }return materials.get(color);
}
const waterMaterial=new THREE.MeshPhysicalMaterial({color:'#83c6cc',roughness:.13,metalness:.05,transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide});
const glassMaterial=new THREE.MeshPhysicalMaterial({color:'#d1e8ea',roughness:.1,transparent:true,opacity:.27,depthWrite:false,side:THREE.DoubleSide});
const steamMaterial=new THREE.MeshBasicMaterial({color:'#edf8fa',transparent:true,opacity:.11,depthWrite:false});
const bubbleMaterial=new THREE.MeshBasicMaterial({color:'#e5fcff',transparent:true,opacity:.42,depthWrite:false});
const flameMaterial=new THREE.MeshBasicMaterial({color:'#268dff',transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending});
const flameCoreMaterial=new THREE.MeshBasicMaterial({color:'#94eeff',transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending});
const smokeMaterial=new THREE.MeshBasicMaterial({color:'#77665d',transparent:true,opacity:.15,depthWrite:false});
function fx(root,shape,mat){const mesh=new THREE.Mesh(geometries[shape],mat);mesh.raycast=()=>{};root.add(mesh);return mesh;}
export function part(root,shape,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(geometries[shape]||geometries.box,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;}
export const foodModel=voxelFood;
export function vesselModel(vessel,{dish=false}={}){
 const root=new THREE.Group(),info=dish?describeDish(vessel):null,kind=info?.shape==='soup'?'bowl':vessel.kind||'bowl';
 const pot=kind==='pot',pan=kind==='pan',jug=kind==='jug',plate=kind==='plate',bowl=kind==='bowl',tray=vessel.mode==='bake'&&!dish;
 const w=plate?.65:pan?.53:jug?.24:.44,h=pot?.32:pan?.085:plate?.027:jug?.34:.2,metal='#b9c8cf';
 if(tray){part(root,'box',0,.018,0,.55,.025,.4,metal);for(const x of [-.27,.27])part(root,'box',x,.04,0,.014,.065,.4,metal);for(const z of [-.2,.2])part(root,'box',0,.04,z,.55,.065,.014,metal);}
 else if(bowl)part(root,'bowl',0,0,0,w,h,w,'#e8e3d2');
 else{
  part(root,'disc',0,.013,0,w,.026,w,pan?'#35434b':metal);
  if(!plate){const wall=part(root,'tube',0,h/2,0,w,h,w,pan?'#35434b':metal);if(jug)wall.material=glassMaterial;}
 }
 part(root,'rim',0,h,0,w,w,w,plate?'#e6ddc9':metal);
 if(plate){part(root,'disc',0,.023,0,w*.85,.006,w*.85,'#f6f0df');part(root,'rim',0,.024,0,w*.84,w*.84,w*.84,'#557e73');}
 if(pan){part(root,'box',w*.72,.04,0,.32,.045,.06,'#35434b');for(const x of [.25,.29])part(root,'round',x,.066,0,.012,.005,.012,metal);}
 if(pot)for(const x of [-.28,.28]){part(root,'box',x,h*.7,0,.14,.04,.075,'#35434b');}
 if(jug){const handle=part(root,'wire',.16,.17,0,.2,.24,.08,metal);handle.rotation.y=Math.PI/2;for(let i=1;i<5;i++)part(root,'box',.085,.04+i*.05,.082,.045,.004,.004,'#425761');}
 const capacity={pan:.8,pot:3,bowl:1.5,jug:1.5},level=.033+(h-.05)*Math.min(1,(vessel.water||0)/(capacity[kind]||1));
 let base=plate?.042:.04;
 if(vessel.water>.01){
  const liquid=part(root,'disc',0,level,0,w*.86,.014,w*.86,vessel.seasonings?.miso?'#b39669':vessel.seasonings?.curry?'#b59044':'#86b9c2');
  if(!vessel.seasonings?.miso&&!vessel.seasonings?.curry)liquid.material=waterMaterial;
  liquid.userData.effect={kind:'surface',y:level};base=Math.max(base,level-.025);
  if(vessel.temperature>75&&!dish){for(let i=0;i<16;i++){const bubble=fx(root,'round',bubbleMaterial);bubble.userData.effect={kind:'bubble',i,level,radius:w*.35,heat:Math.max(0,(vessel.temperature-75)/25)};}}
 }else if(vessel.seasonings?.oil){
  const oil=part(root,'disc',0,.033,0,w*.7,.004,w*.7,'#c9b76c');oil.userData.effect={kind:'surface',y:.033};
 }
 if(vessel.mode==='steam'&&pot){part(root,'basket',0,h*.4,0,w*.85,.07,w*.85,metal);base=h*.58;}
 if(info?.shape==='rice'){const rice=voxelMound('rice','#fff3ca');rice.position.y=base;root.add(rice);base+=.09;}
 if(info&&['pizza','pancake','cake'].includes(info.shape)){
  const dough=voxelMound(info.shape,'#eeb35e');dough.position.y=base;root.add(dough);base+=info.shape==='cake'?.15:info.shape==='pancake'?.12:.06;
  if(info.shape==='pizza'){const sauce=voxelMound('pizza','#f06535');sauce.position.y=base;root.add(sauce);base+=.04;}
 }
 if(info?.shape==='sandwich'){const bread=voxelFood({id:'bread'});bread.position.y=base;root.add(bread);base+=.15;}
 const foods=vessel.foods||[],dough=vessel.mixed&&foods.some(f=>f.id==='flour');
 if(dough&&!dish){
  const doughMesh=voxelMound(vessel.rolled?'pizza':'rice','#ffe0a4');doughMesh.position.y=base;doughMesh.scale.setScalar(.7);root.add(doughMesh);
 }else for(let i=0;i<foods.length;i++){
  const food=foods[i],item=foodModel(food,{portion:true}),angle=i*2.4,radius=foods.length===1?0:Math.min(w*.3,.045*Math.sqrt(i+1));
  item.position.set(Math.cos(angle)*radius,base+Math.floor(i/8)*.035,Math.sin(angle)*radius);
  item.scale.setScalar(dish?.62:.48);root.add(item);
  if(vessel.temperature>=99&&vessel.water>.01&&!vessel.covered)item.userData.effect={kind:'food',y:item.position.y,i};
 }
 if(info?.shape==='sandwich'){const bread=voxelFood({id:'bread'});bread.position.y=base+.14;root.add(bread);}
 if(vessel.covered){
  const lid=part(root,'round',0,h+.005,0,w*.97,.05,w*.97,metal);lid.material=glassMaterial;part(root,'rim',0,h+.005,0,w,w,w,metal);part(root,'round',0,h+.053,0,.065,.04,.065,'#35434b');
 }
 if(!dish&&vessel.temperature>65&&(vessel.water>.01||foods.length)){
  const smoky=foods.some(f=>f.burn>35);
  for(let i=0;i<8;i++){const puff=fx(root,'round',smoky?smokeMaterial:steamMaterial);puff.userData.effect={kind:'steam',i,base:h+.06,covered:vessel.covered};}
 }
 if(!dish&&vessel.location==='stove'&&vessel.fire){
  if(vessel.mode==='bake'){part(root,'box',0,-.02,0,.48,.012,.3,'#ba683d');}
  else for(let i=0;i<16;i++){
   const angle=i*Math.PI/8,x=Math.cos(angle)*w*.45,z=Math.sin(angle)*w*.45;
   for(let core=0;core<2;core++){const flame=fx(root,'cone',core?flameCoreMaterial:flameMaterial);flame.position.set(x,-.025,z);flame.userData.effect={kind:'flame',i,core,fire:vessel.fire};}
  }
  if(!vessel.water&&vessel.temperature>120)for(let i=0;i<8;i++){const drop=fx(root,'round',bubbleMaterial);drop.userData.effect={kind:'sizzle',i,base:.05,radius:w*.25};}
 }
 return root;
}
export function animateCookingModel(root,time){
 root.traverse(mesh=>{
  const e=mesh.userData.effect;if(!e)return;
  const phase=(time*.65+(e.i||0)*.137)%1;
  if(e.kind==='flame'){const pulse=.85+.15*Math.sin(time*18+e.i*2);mesh.scale.set(e.core?.021:.033,(.035+e.fire*.023)*pulse*(e.core?.6:1),e.core?.021:.033);mesh.rotation.z=Math.sin(time*11+e.i)*.12;}
  if(e.kind==='surface'){mesh.position.y=e.y+Math.sin(time*3)*.0015;mesh.rotation.z=Math.sin(time*2.4)*.003;}
  if(e.kind==='bubble'){const a=e.i*2.4,r=e.radius*Math.sqrt((e.i+1)/16),size=(.008+.021*phase)*e.heat;mesh.position.set(Math.cos(a)*r,e.level-.02+phase*.032,Math.sin(a)*r);mesh.scale.set(size,size*.6,size);}
  if(e.kind==='steam'){const a=e.i*2.4;mesh.position.set(Math.cos(a)*.07+Math.sin(time+e.i)*phase*.08,e.base+phase*.65,Math.sin(a)*.07);const size=(.035+phase*.16)*(e.covered?.55:1)*Math.sin(phase*Math.PI);mesh.scale.set(size,size*1.4,size);}
  if(e.kind==='food')mesh.position.y=e.y+Math.sin(time*3+e.i)*.006;
  if(e.kind==='sizzle'){const a=e.i*2.4;mesh.position.set(Math.cos(a)*e.radius,e.base+Math.sin(phase*Math.PI)*.1,Math.sin(a)*e.radius);mesh.scale.setScalar(.008*(1-phase));}
  if(e.kind==='waterfall'){const t=(time*2.2+e.i/12)%1;mesh.position.set(Math.sin(e.i*2.4)*.008,.36-t*.4,Math.cos(e.i*2.4)*.008);}
 });
}
