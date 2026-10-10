import * as THREE from 'three';
import {part} from './cooking-models.js?v=20261011-free-cook74';

// Every tool is a reusable model. Its local origin is the working end so that
// the same model can sit in the rack or perform a preparation animation.
export function toolModel(kind){
 const root=new THREE.Group();root.name=kind;
 const metal='#b9c8cf',wood='#a77443',dark='#35434b';
 const p=(shape,x,y,z,w,h,d,c=metal)=>part(root,shape,x,y,z,w,h,d,c);
 if(kind==='knife'||kind==='peeler'){
  if(kind==='knife'){p('box',0,.04,0,.24,.085,.012);p('box',-.025,.001,0,.19,.005,.014,'#e9f1f4');p('box',.195,.04,0,.15,.038,.035,wood);for(const x of [.15,.19,.23])p('round',x,.04,.019,.008,.008,.004);}
  else{p('box',0,.12,0,.035,.17,.025,wood);for(const x of [-.04,.04])p('box',x,.035,0,.012,.09,.02);p('box',0,0,0,.095,.012,.012);}
 }else if(kind==='rolling-pin'){
  const barrel=p('disc',0,.055,0,.1,.3,.1,wood);barrel.rotation.z=Math.PI/2;
  for(const x of [-.19,.19]){const handle=p('disc',x,.055,0,.034,.1,.034,'#d3a773');handle.rotation.z=Math.PI/2;}
 }else if(kind==='colander'||kind==='steamer'){
  p('basket',0,0,0,.42,.19,.42);p('rim',0,.19,0,.43,.43,.43);
  for(let i=0;i<5;i++)for(let j=0;j<5;j++){if(Math.hypot(i-2,j-2)>2.2)continue;p('disc',(i-2)*.055,.016,(j-2)*.055,.012,.004,.012,dark);}
  for(const x of [-.25,.25])p('box',x,.15,0,.12,.025,.04);
 }else if(kind==='tray'){
  p('box',0,.012,0,.54,.025,.38);for(const z of [-.19,.19])p('box',0,.035,z,.56,.05,.018);for(const x of [-.27,.27])p('box',x,.035,0,.018,.05,.38);p('box',0,.028,0,.49,.006,.33,'#e4d9bd');
 }else if(kind==='grater'){
  p('box',0,.11,0,.12,.22,.07);for(let i=0;i<4;i++)for(let j=0;j<3;j++)p('box',(j-1)*.026,.035+i*.045,.037,.015,.009,.003,dark);p('box',0,.24,0,.1,.03,.035,dark);
 }else if(kind==='mitt'){
  p('round',0,.07,0,.13,.19,.055,'#d2a06d');p('round',.065,.08,0,.05,.1,.05,'#d2a06d');for(let i=0;i<4;i++)p('box',0,.015+i*.035,.03,.1,.006,.005,'#ecd3a3');
 }else if(kind==='sponge'){
  p('box',0,.025,0,.11,.05,.07,'#e5c85f');p('box',0,.054,0,.11,.008,.07,'#4b826b');
 }else if(kind==='tongs'){
  for(const x of [-.03,.03]){const arm=p('box',x,.14,0,.018,.28,.025);arm.rotation.z=x*2;p('round',x*1.7,.01,0,.04,.06,.055);}
 }else{
  p('disc',0,.22,0,.023,.27,.023,['whisk','ladle'].includes(kind)?metal:wood);p('disc',0,.36,0,.036,.1,.036,wood);
  if(kind==='whisk'){for(let i=0;i<4;i++){const wire=p('wire',0,.07,0,.12,.21,.12);wire.rotation.y=i*Math.PI/4;}}
  else if(kind==='spatula'){p('box',0,.05,0,.11,.14,.018,wood);for(const x of [-.032,0,.032])p('box',x,.05,.011,.008,.072,.004,dark);}
  else {p('bowl',0,0,0,.11,.055,.11);}
 }
 return root;
}

export function toolRack(){
 const root=new THREE.Group();
 part(root,'box',0,.015,0,.32,.03,.17,'#a77443');
 part(root,'tube',-.08,.12,0,.15,.23,.15,'#d9e3dd');
 for(const [i,kind]of ['whisk','spatula','ladle','tongs'].entries()){
  const tool=toolModel(kind);tool.scale.setScalar(.7);tool.position.set(-.12+(i%2)*.07,.18,Math.floor(i/2)*.05-.03);tool.rotation.z=(i-1.5)*.12;root.add(tool);
 }
 const grater=toolModel('grater');grater.scale.setScalar(.65);grater.position.set(.11,.03,0);root.add(grater);
 return root;
}

export function seasoningModel(id,index=0){
 const root=new THREE.Group(),liquid=['oil','soy','vinegar','ketchup'].includes(id),color={oil:'#d3b744',soy:'#5c3929',vinegar:'#d9c594',ketchup:'#bd5041',herbs:'#6c8b48',curry:'#be8436',pepper:'#675440'}[id]||'#e4d8b4';
 part(root,'disc',0,.06,0,.066,.12,.066,liquid?'#adc6bd':'#e1e5db');part(root,'disc',0,.12,0,.06,.025,.06,color);part(root,'box',0,.06,.035,.052,.046,.004,color);
 // Distinct cap marks remain legible at countertop scale without textures.
 for(let i=0;i<=index%3;i++)part(root,'box',-.018+i*.016,.064,.038,.006,.021,.002,'#f6efe0');
 return root;
}
