import * as THREE from 'three';
import {FOOD_BY_ID,describeDish} from './cooking-data.js?v=20261010-free-cook70';
const geometries={box:new THREE.BoxGeometry(1,1,1),round:new THREE.SphereGeometry(.5,10,7),disc:new THREE.CylinderGeometry(.5,.5,1,12),tube:new THREE.CylinderGeometry(.5,.5,1,12,1,true),cone:new THREE.ConeGeometry(.5,1,10)},materials=new Map();
function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.83}));return materials.get(color);}
export function part(root,shape,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(geometries[shape]||geometries.box,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;}
export function foodModel(food){const root=new THREE.Group(),f=FOOD_BY_ID.get(food.id);if(!f)return root;let color=f.color;if(food.burn>35)color='#624632';else if(food.progress>f.time&&['meat','fish'].includes(f.group))color='#ad8053';
 if(food.cut){for(let i=0;i<6;i++){const fine=food.cut==='mince',slice=food.cut==='slice';part(root,slice?'disc':'box',(i%3-1)*.09,.04+Math.floor(i/3)*.04,(Math.floor(i/3)-.5)*.09,slice?.1:fine?.04:.07,slice?.025:fine?.03:.065,slice?.1:fine?.04:.07,color);}return root;}
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
 case 'pasta':case 'noodles':for(let i=0;i<6;i++)B('box',(i-2.5)*.023,.025,0,.014,.035,.3);break;
 case 'grains':case 'powder':for(let i=0;i<8;i++)B('round',(i%3-1)*.045,.035+Math.floor(i/3)*.028,(i%2-.5)*.06,.05,.035,.025);break;
 case 'bottle':B('disc',0,.1,0,.14,.2,.14);B('disc',0,.21,0,.06,.025,.06,'#96bcb9');break;
 case 'bread':B('box',0,.09,0,.24,.15,.18);B('round',0,.17,0,.24,.07,.18,'#e5c087');break;
 case 'pineapple':B('round',0,.11,0,.15,.23,.15);for(let i=0;i<3;i++)B('box',(i-1)*.035,.26,0,.03,.1,.035,'#668c4b');break;
 case 'cheese':B('box',0,.04,0,.2,.08,.13);break;
 case 'potato':B('round',0,.085,0,.22,.15,.17);break;
 case 'block':B('box',0,.06,0,.2,.12,.17);break;
 default:B('round',0,.095,0,.19,.19,.18);if(f.group==='fruit'||f.group==='vegetable')B('box',0,.2,0,.02,.04,.02,'#648e50');break;}
 return root;}
export function vesselModel(vessel,{dish=false}={}){const root=new THREE.Group(),kind=dish&&describeDish(vessel).shape==='soup'?'bowl':vessel.kind||'bowl',pot=kind==='pot',pan=kind==='pan',jug=kind==='jug',plate=kind==='plate';const w=plate?.65:pan?.53:jug?.22:.43,h=pot?.32:pan?.09:plate?.025:jug?.33:.18,color=pan||pot?'#536675':'#e8e3d2';part(root,'disc',0,.012,0,w,.024,w,color);if(!plate)part(root,'tube',0,h/2,0,w,h,w,color);part(root,'disc',0,.025,0,w*.83,.008,w*.83,pan||pot?'#263d47':'#eee9d9');if(pan)part(root,'box',w*.8,h*.55,0,.4,.045,.08,'#263846');if(pot)for(const x of [-.28,.28])part(root,'box',x,h*.7,0,.14,.045,.07,color);if(jug)part(root,'box',.15,.15,0,.075,.18,.045,'#93bcc5');
 if(vessel.water>.01)part(root,'disc',0,h*.7,0,w*.77,.02,w*.77,vessel.seasonings?.miso?'#b39669':vessel.seasonings?.curry?'#b59044':'#86b9c2');if(vessel.covered){part(root,'disc',0,h+.02,0,w*.97,.025,w*.97,color);part(root,'round',0,h+.05,0,.07,.045,.07,'#263846');return root;}
 const foods=vessel.foods||[],info=dish?describeDish(vessel):null;let base=h+.015;
 if(info?.shape==='rice'){part(root,'round',0,base+.07,0,.4,.16,.36,'#f4efdd');base+=.09;}
 if(info&&['pizza','pancake','cake'].includes(info.shape)){part(root,'disc',0,base+.035,0,.5,info.shape==='cake'?.15:.05,.5,'#d6aa68');base+=info.shape==='cake'?.16:.06;}
 if(info?.shape==='sandwich'){part(root,'box',0,base+.04,0,.38,.075,.3,'#d6ae73');base+=.08;}
 for(let i=0;i<foods.length;i++){const item=foodModel(foods[i]);item.position.set((i%3-1)*.12,base+Math.floor(i/6)*.05,(Math.floor(i/3)%2-.5)*.15);item.scale.setScalar(dish?.7:.65);root.add(item);}
 if(info?.shape==='sandwich')part(root,'box',0,base+.13,0,.38,.075,.3,'#d6ae73');return root;}
