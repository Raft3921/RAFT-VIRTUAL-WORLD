import * as THREE from 'three';
import {FOOD_BY_ID} from './cooking-data.js?v=20261011-free-cook73';

const cube=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial({roughness:.76,metalness:0}),pose=new THREE.Object3D();
const palette={tomato:'#f34f35',carrot:'#ff9235',pepper:'#69bd42',broccoli:'#42a65b',spinach:'#4fba57',cabbage:'#9ed650',lettuce:'#b5df5e',pumpkin:'#eea23b',corn:'#ffd153',apple:'#ee574b',strawberry:'#f25058',orange:'#ffa531',lemon:'#ffe05a',banana:'#ffd65b',grape:'#ad69c8',peach:'#ffad7d',pineapple:'#efb43f',salmon:'#ff976d',tuna:'#e85b70',beef:'#df6558',pork:'#ffb49a',shrimp:'#ffad80',egg:'#fff1be',rice:'#fff5d9',pasta:'#ffd77c',noodles:'#ffc960',udon:'#fff0cb',bread:'#dba253',potato:'#d5a65f',onion:'#efd096',tofu:'#fff5da',cheese:'#ffcf58',butter:'#ffe08b'};
function shade(base,n){return new THREE.Color(base).offsetHSL(0,.025,(n%5-2)*.024);}
function model(blocks){
 const root=new THREE.Group();if(!blocks.length)return root;
 const mesh=new THREE.InstancedMesh(cube,material,blocks.length);
 blocks.forEach((b,i)=>{pose.position.set(b.x,b.y,b.z);pose.rotation.set(0,0,0);pose.scale.setScalar(b.size);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);mesh.setColorAt(i,shade(b.color,i*13));});
 mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);return root;
}
function builder(){const blocks=[],used=new Set();return {blocks,put(x,y,z,size,color){const key=[x,y,z,size].map(n=>n.toFixed(4)).join(':');if(used.has(key))return;used.add(key);blocks.push({x,y,z,size,color});},grid(nx,ny,nz,size,at,color,mask=()=>true){for(let x=0;x<nx;x++)for(let y=0;y<ny;y++)for(let z=0;z<nz;z++)if(mask(x,y,z))this.put(at[0]+(x-(nx-1)/2)*size,at[1]+(y+.5)*size,at[2]+(z-(nz-1)/2)*size,size,typeof color==='function'?color(x,y,z):color);}};}

export function voxelFood(food,{portion=false}={}){
 const f=FOOD_BY_ID.get(food.id);if(!f)return new THREE.Group();const b=builder();
 let color=palette[f.id]||f.color;
 if(food.peeled&&['potato','onion','radish','apple'].includes(f.id))color='#ffe1a4';
 if(food.progress>0){const cooked=['meat','fish'].includes(f.group)?'#d79850':f.group==='vegetable'?'#a7b84b':color;color=new THREE.Color(color).lerp(new THREE.Color(cooked),Math.min(.8,Math.floor(food.progress/Math.max(1,f.time)*5)/5)).getStyle();}
 if(food.burn>35)color='#875036';
 const blob=(nx,ny,nz,size,at,c=color)=>b.grid(nx,ny,nz,size,at,c,(x,y,z)=>Math.pow((x-(nx-1)/2)/(nx*.53),2)+Math.pow((y-(ny-1)/2)/(ny*.56),2)+Math.pow((z-(nz-1)/2)/(nz*.53),2)<1);
 if(portion&&(['milk','cream','yogurt'].includes(f.id)||['cheese','butter'].includes(f.id)&&food.progress>3)){blob(8,1,7,.023,[0,0,0],color);return model(b.blocks);}
 if(f.id==='egg'&&(food.cut||food.method==='fry')){blob(9,1,7,.025,[0,0,0],'#fff3d7');blob(4,2,4,.025,[0,.025,0],'#ffba36');return model(b.blocks);}
 if(food.cut){
  const fine=['mince','grate'].includes(food.cut),slice=food.cut==='slice',size=fine?.016:.022;
  for(let i=0;i<8;i++)b.grid(fine?1:3,slice?1:fine?1:3,fine?1:3,size,[(i%3-1)*.07,.012+Math.floor(i/6)*.03,(Math.floor(i/3)-1)*.06],(x,y,z)=>slice&&x===1&&z===1?'#ffdb98':color);
  return model(b.blocks);
 }
 switch(f.shape){
 case 'leaf':for(let i=0;i<4;i++)blob(6,2,5,.027,[(i%2-.5)*.04,.018*i,(Math.floor(i/2)-.5)*.035],i%2?'#a3cf51':color);break;
 case 'carrot':for(let y=0;y<8;y++)b.grid(1+Math.floor(y/3),1,1+Math.floor(y/3),.026,[0,y*.026,0],color);b.grid(2,3,1,.026,[0,.208,0],'#56b74f');break;
 case 'broccoli':b.grid(2,4,2,.026,[0,0,0],'#98c96c');for(let i=0;i<3;i++)blob(4,3,4,.028,[(i-1)*.055,.1,0],color);break;
 case 'mushroom':b.grid(2,4,2,.023,[0,0,0],'#ffe6b5');blob(7,3,6,.025,[0,.085,0],color);break;
 case 'fish':blob(10,3,5,.025,[0,0,0]);for(let i=0;i<4;i++)b.grid(1,1,4,.022,[-.08+i*.055,.075,0],'#ffe4ba');break;
 case 'shrimp':for(let i=0;i<6;i++)blob(2,2,2,.03,[Math.round(Math.cos(i*.55)*3)*.03,.01,Math.round(Math.sin(i*.55)*3)*.03],i%2?color:'#ffe0ac');break;
 case 'sausage':blob(10,3,3,.024,[0,0,0]);break;
 case 'strip':for(let i=0;i<3;i++)b.grid(2,1,9,.025,[(i-1)*.06,.01,0],(x,y,z)=>f.id==='bacon'&&z%3===0?'#ffe0b2':color);break;
 case 'meat':blob(10,3,7,.025,[0,0,0]);for(let i=0;i<7;i++)b.put((i-3)*.025,.078,Math.round(Math.sin(i)*2)*.025,.025,food.progress>f.time?'#9c5a2d':'#ffd5a9');break;
 case 'long':blob(4,4,11,.023,[0,0,0]);break;
 case 'banana':for(let i=0;i<7;i++)blob(2,3,3,.026,[(i-3)*.026,Math.abs(i-3)*.014,0]);break;
 case 'grape':for(let i=0;i<8;i++)b.grid(2,2,2,.026,[(i%3-1)*.052,Math.floor(i/3)*.048,(i%2-.5)*.025],color);break;
 case 'berry':for(let y=0;y<5;y++)b.grid(2+Math.floor(y/2),1,2+Math.floor(y/2),.025,[0,y*.025,0],(x,yy,z)=>(x+z+y)%6===0?'#ffce7f':color);b.grid(4,1,3,.025,[0,.125,0],'#6eb847');break;
 case 'corn':b.grid(4,9,4,.024,[0,0,0],(x,y,z)=>y%3===0?'#ffdc65':color);break;
 case 'pasta':case 'noodles':
  for(let i=0;i<7;i++)for(let j=0;j<13;j++){const x=food.progress>0?Math.round(Math.cos(j*.45+i)*4)*.02:(i-3)*.02,z=food.progress>0?Math.round(Math.sin(j*.45+i)*4)*.02:(j-6)*.02;b.put(x,.012+(food.progress>0?Math.floor(i/2)*.019:0),z,.018,color);}break;
 case 'grains':for(let i=0;i<40;i++){const a=i*2.4,r=.013*Math.sqrt(i);b.put(Math.round(Math.cos(a)*r/.012)*.012,.012+Math.floor((40-i)/14)*.012,Math.round(Math.sin(a)*r/.012)*.012,.011,color);}break;
 case 'powder':blob(8,3,7,.023,[0,0,0]);break;
 case 'bottle':b.grid(4,7,4,.028,[0,0,0],(x,y,z)=>z===3&&y>1&&y<5?'#f7bd56':'#fff0cd');b.grid(3,1,3,.028,[0,.196,0],'#72bcab');break;
 case 'bread':b.grid(9,5,7,.025,[0,0,0],(x,y,z)=>y===4||x===0||x===8?'#d88c3c':'#ffdb8f');blob(8,2,6,.025,[0,.125,0],'#edb051');break;
 case 'pineapple':blob(6,8,6,.025,[0,0,0],(x,y,z)=>(x+y+z)%3===0?'#e3a52f':color);for(let i=0;i<3;i++)b.grid(1,4-i,1,.028,[(i-1)*.028,.2,0],'#68b844');break;
 case 'cheese':case 'block':b.grid(7,4,6,.025,[0,0,0],color);break;
 default:blob(f.shape==='potato'?8:7,7,7,.025,[0,0,0]);if(['fruit','vegetable'].includes(f.group))b.grid(1,2,1,.023,[0,.165,0],'#79ac3e');break;
 }
 if(food.washed&&['vegetable','fruit'].includes(f.group))for(let i=0;i<3;i++)b.put((i-1)*.028,.14+i*.014,.072,.011,'#bdede1');
 const result=model(b.blocks);
 if(food.cuts>0){for(let i=0;i<Math.ceil(food.cuts*2);i++){const piece=model([{x:.12+(i%3)*.032,y:.02,z:(Math.floor(i/3)-.5)*.04,size:.028,color}]);result.add(piece);}}
 return result;
}

export function voxelMound(kind,color='#ffdc97'){
 const b=builder(),n=kind==='rice'?13:16,layers=kind==='cake'?5:kind==='rice'?5:kind==='pancake'?4:2,size=.028;
 b.grid(n,layers,n,size,[0,0,0],(x,y,z)=>kind==='pancake'&&y%2===0?'#ffc65c':color,(x,y,z)=>Math.abs(x-(n-1)/2)+Math.abs(z-(n-1)/2)<n-2-(kind==='rice'?y:0));return model(b.blocks);
}
