import * as THREE from 'three';
import {FOOD_BY_ID,describeDish} from './cooking-data.js?v=20261011-free-cook72';
const profile=points=>new THREE.LatheGeometry(points.map(([x,y])=>new THREE.Vector2(x,y)),32);
const geometries={
 box:new THREE.BoxGeometry(1,1,1),round:new THREE.SphereGeometry(.5,16,10),disc:new THREE.CylinderGeometry(.5,.5,1,32),
 tube:new THREE.CylinderGeometry(.5,.5,1,32,1,true),cone:new THREE.ConeGeometry(.5,1,12),
 rim:new THREE.TorusGeometry(.48,.025,8,32).rotateX(Math.PI/2),
 wire:new THREE.TorusGeometry(.42,.022,6,24),
 bowl:profile([[0,0],[.22,0],[.36,.15],[.47,.65],[.5,1],[.46,1],[.43,.67],[.32,.2],[0,.15]]),
 basket:profile([[0,0],[.35,0],[.49,.9],[.5,1],[.465,1],[.315,.1],[0,.1]])
},materials=new Map();
// Noodles are round tubes lying in the XZ plane, never single-sided strips.
for(let i=0;i<6;i++){
 const points=[];for(let j=0;j<=14;j++){const a=j/14*Math.PI*1.7+i*.6;points.push(new THREE.Vector3(Math.cos(a)*(.045+j*.002),.008+Math.sin(j*.7+i)*.004,Math.sin(a)*(.045+j*.002)));}
 geometries['noodle'+i]=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.007,6,false);
}
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
export function foodModel(food,{portion=false}={}){const root=new THREE.Group(),f=FOOD_BY_ID.get(food.id);if(!f)return root;let color=f.color;if(food.burn>35)color='#624632';else if(food.progress>0&&['meat','fish','vegetable','starch'].includes(f.group)){const blend=Math.min(1,Math.floor(food.progress/Math.max(1,f.time)*5)/5);color=new THREE.Color(f.color).lerp(new THREE.Color(['meat','fish'].includes(f.group)?'#b7814d':f.group==='starch'?'#e5cf9c':'#819650'),blend*.75).getStyle();}
 if(portion&&(['milk','cream','yogurt'].includes(f.id)||['butter','cheese'].includes(f.id)&&food.progress>3)){part(root,'round',0,.012,0,.21,.026,.18,f.color);return root;}
 if(!food.cut&&food.cuts>0&&f.id!=='egg'){
  const whole=foodModel({...food,cuts:0},{portion});whole.scale.x=.75-food.cuts*.12;whole.position.x=-.055;root.add(whole);
  for(let i=0;i<Math.ceil(food.cuts*2);i++)part(root,'box',.045+(i%3)*.035,.022,Math.floor(i/3)*.045-.03,.028,.035,.04,color);
  return root;
 }
 if(f.id==='egg'&&(food.cut||food.method==='fry')){part(root,'round',0,.017,0,.23,.035,.19,food.progress>=f.time?'#f8efdb':'#e3d6a3');part(root,'round',0,.037,0,.095,.055,.095,'#eeb331');return root;}
 if(food.cut){for(let i=0;i<8;i++){const fine=food.cut==='mince'||food.cut==='grate',slice=food.cut==='slice',x=(i%3-1)*.075,z=(Math.floor(i/3)-1)*.065,y=.025+Math.floor(i/6)*.035;const piece=part(root,slice?'disc':'box',x,y,z,slice?.1:fine?.025:.06,slice?.024:fine?.022:.05,slice?.1:fine?.045:.06,color);piece.rotation.y=i*.7;if(slice&&['cucumber','carrot','tomato','radish','leek','onion','apple','orange','lemon'].includes(f.id)){const inner=part(root,'disc',x,y+.013,z,.077,.002,.077,['orange','lemon','carrot','tomato'].includes(f.id)?color:'#ebdfb7');if(f.id==='tomato'||f.id==='cucumber')for(let seed=0;seed<3;seed++)part(root,'round',x+Math.cos(seed*2.1)*.023,y+.016,z+Math.sin(seed*2.1)*.023,.006,.003,.01,'#eee5a8');}}return root;}
 if(food.peeled&&['potato','apple','radish','carrot','onion'].includes(f.id))color=f.id==='carrot'?'#eeac61':'#eadcba';
 const B=(shape,x,y,z,w,h,d,c=color)=>part(root,shape,x,y,z,w,h,d,c);
 switch(f.shape){case 'egg':if(food.method==='fry'){B('disc',0,.025,0,.29,.025,.24,'#f4efdc');B('round',0,.048,0,.11,.05,.11,'#e4bf58');}else B('round',0,.11,0,.15,.23,.15);break;
 case 'leaf':for(let i=0;i<5;i++){const leaf=B('round',Math.sin(i*1.26)*.08,.06+i*.015,Math.cos(i*1.26)*.07,.18,.07,.14);leaf.rotation.z=(i-2)*.18;}break;
 case 'carrot':{const mesh=B('cone',0,.11,0,.1,.27,.1);mesh.rotation.z=Math.PI;B('box',0,.27,0,.04,.08,.04,'#5b955a');break;}
 case 'broccoli':B('box',0,.07,0,.065,.14,.06,'#97b872');for(const x of [-.07,0,.07])B('round',x,.18,0,.13,.14,.13);break;
 case 'mushroom':B('disc',0,.07,0,.055,.14,.055,'#e4d9ba');B('round',0,.15,0,.19,.09,.18);break;
 case 'fish':B('round',0,.065,0,.3,.11,.14);B('cone',-.16,.065,0,.1,.07,.1);for(let i=0;i<4;i++)B('box',-.1+i*.065,.12,0,.015,.008,.12,'#f0dac1');break;
 case 'shrimp':for(let i=0;i<5;i++)B('round',Math.cos(i*.55)*.09,.04,Math.sin(i*.55)*.09,.075,.07,.07);break;
 case 'sausage':B('round',0,.065,0,.27,.1,.1);break;
 case 'strip':for(let i=0;i<3;i++)B('box',(i-1)*.065,.025,0,.05,.04,.24);break;
 case 'meat':B('round',0,.07,0,.29,.11,.19);B('box',0,.125,0,.18,.006,.025,'#e6c9aa');break;
 case 'long':B('round',0,.07,0,.1,.12,.32);break;
 case 'banana':for(let i=0;i<4;i++)B('round',(i-1.5)*.05,.06+Math.abs(i-1.5)*.02,0,.09,.085,.09);break;
 case 'grape':for(let i=0;i<7;i++)B('round',(i%3-1)*.065,.055+Math.floor(i/3)*.06,0,.075,.075,.075);break;
 case 'berry':B('cone',0,.08,0,.16,.15,.14);B('disc',0,.15,0,.11,.012,.1,'#668c4b');break;
 case 'corn':B('round',0,.13,0,.1,.27,.1);for(let i=0;i<5;i++)B('disc',0,.03+i*.045,0,.12,.015,.12,'#f1d582');break;
 case 'pasta':case 'noodles':if(food.progress>0){for(let i=0;i<6;i++){const noodle=B('noodle'+i,(i%2-.5)*.08,.02+Math.floor(i/2)*.013,(Math.floor(i/2)-1)*.035,1,1,1);noodle.rotation.y=i*1.6;}}else for(let i=0;i<9;i++){const strand=B('disc',(i-4)*.013,.012,0,.009,.29,.009);strand.rotation.x=Math.PI/2;}break;
 case 'grains':for(let i=0;i<32;i++){const a=i*2.4,r=.015*Math.sqrt(i),grain=B('round',Math.cos(a)*r,.015+Math.max(0,.045-r*.3),Math.sin(a)*r,.018,.012,.009);grain.rotation.y=a;}break;
 case 'powder':B('round',0,.02,0,.2,.045,.16);break;
 case 'bottle':B('disc',0,.1,0,.14,.2,.14);B('disc',0,.21,0,.06,.025,.06,'#96bcb9');break;
 case 'bread':B('box',0,.09,0,.24,.15,.18);B('round',0,.17,0,.24,.07,.18,'#e5c087');break;
 case 'pineapple':B('round',0,.11,0,.15,.23,.15);for(let i=0;i<3;i++)B('box',(i-1)*.035,.26,0,.03,.1,.035,'#668c4b');break;
 case 'cheese':B('box',0,.04,0,.2,.08,.13);break;
 case 'potato':B('round',0,.085,0,.22,.15,.17);break;
 case 'block':B('box',0,.06,0,.2,.12,.17);break;
 default:B('round',0,.095,0,.19,.19,.18);if(f.group==='fruit'||f.group==='vegetable')B('box',0,.2,0,.02,.04,.02,'#648e50');break;}
 if(['tomato','apple','peach','pepper'].includes(f.id)&&!food.peeled){for(let i=0;i<5;i++){const a=i*Math.PI*2/5,leaf=B('round',Math.cos(a)*.025,.186,Math.sin(a)*.025,.065,.008,.022,'#5e873d');leaf.rotation.y=-a;}}
 if(['orange','lemon','pineapple'].includes(f.id)){for(let i=0;i<12;i++){const a=i*2.4;B('round',Math.cos(a)*.082,.055+(i%4)*.027,Math.sin(a)*.072,.009,.01,.008,'#efbd62');}}
 if(f.id==='onion'&&!food.peeled){for(let i=0;i<3;i++)B('rim',0,.08+i*.035,0,.18-i*.018,.18-i*.018,.18-i*.018,'#c9af77');}
 if(['meat','fish'].includes(f.group)&&food.progress>=f.time&&['fry','bake'].includes(food.method))for(let i=0;i<4;i++)part(root,'box',-.09+i*.06,.127,0,.012,.004,.115,'#765136');
 if(food.washed&&['vegetable','fruit'].includes(f.group))for(let i=0;i<3;i++){const drop=fx(root,'round',waterMaterial);drop.position.set((i-1)*.035,.15+i*.015,.055);drop.scale.set(.012,.025,.012);}
 return root;}
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
 if(info?.shape==='rice'){part(root,'round',0,base+.07,0,.4,.16,.36,'#f4efdd');base+=.09;}
 if(info&&['pizza','pancake','cake'].includes(info.shape)){
  const layers=info.shape==='pancake'?3:1;for(let i=0;i<layers;i++)part(root,'disc',0,base+.028+i*.04,0,.49,info.shape==='cake'?.15:.04,.49,'#d6aa68');
  base+=info.shape==='cake'?.16:layers*.04;
  if(info.shape==='pizza')part(root,'disc',0,base,0,.44,.008,.44,'#d7633f');
 }
 if(info?.shape==='sandwich'){part(root,'box',0,base+.04,0,.38,.075,.3,'#d6ae73');base+=.08;}
 const foods=vessel.foods||[],dough=vessel.mixed&&foods.some(f=>f.id==='flour');
 if(dough&&!dish){
  const doughMesh=part(root,'round',0,base+.04,0,.3,vessel.rolled?.025:.11,.27,'#e5d4a6');doughMesh.userData.effect={kind:'dough',y:base+.04};
 }else for(let i=0;i<foods.length;i++){
  const food=foods[i],item=foodModel(food,{portion:true}),angle=i*2.4,radius=foods.length===1?0:Math.min(w*.3,.045*Math.sqrt(i+1));
  item.position.set(Math.cos(angle)*radius,base+Math.floor(i/8)*.035,Math.sin(angle)*radius);
  item.scale.setScalar(dish?.62:.48);root.add(item);
  if(vessel.temperature>=99&&vessel.water>.01&&!vessel.covered)item.userData.effect={kind:'food',y:item.position.y,i};
 }
 if(info?.shape==='sandwich')part(root,'box',0,base+.14,0,.38,.075,.3,'#d6ae73');
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
