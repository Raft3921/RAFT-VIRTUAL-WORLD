import * as THREE from 'three';
import {part,foodModel,vesselModel,animateCookingModel} from './cooking-models.js?v=20261011-free-cook73';
import {toolModel,seasoningModel} from './cooking-tools.js?v=20261011-free-cook73';

export function createCookingMotion({scene,point}){
 const root=new THREE.Group();root.name='Cooking hand work';scene.add(root);
 const water=new THREE.MeshStandardMaterial({color:'#9ad9e7',transparent:true,opacity:.65,roughness:.15,depthWrite:false});
 let event=null,key='',tool=null,prop=null,stream=null;
 function play(id,station,source=null){if(!['cut','chop','peel','grate','mix','stir','drain','clean','roll','knead','plate','stove-pick','wash','fill','pour-water','stove-pour','bowl-merge','sprinkle'].includes(id))return;event={id,station,source,remaining:.65,duration:.65};key='';}
 function clearModels(){root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});root.clear();}
 function clear(){event=null;key='';clearModels();root.visible=false;}
 function update(session,task,dt){
  if(!session){clear();return;}
  if(event){event.remaining-=dt;if(event.remaining<=0)event=null;}
  const work=task||event;root.visible=!!work;if(!work){key='';clearModels();return;}
  const id=work.id,next=id+':'+(work.station?.item.id||'')+':'+(work.source?.id||'')+(id==='fill'?':'+Math.floor((session.vessels[work.source?.id]?.water||0)*10):'');
  if(key!==next){
   key=next;clearModels();tool=null;prop=null;stream=null;
   const toolId=work.source?.type==='tool'?work.source.id:{cut:'knife',chop:'knife',peel:'peeler',grate:'grater',mix:'whisk',stir:'ladle',drain:'colander',clean:'sponge',roll:'rolling-pin',knead:'rolling-pin',plate:'ladle','stove-pick':'mitt'}[id];
   if(toolId){tool=toolModel(toolId);root.add(tool);}
   if(id==='sprinkle'&&work.source?.type==='seasoning'){tool=seasoningModel(work.source.id);root.add(tool);}
   if(['wash','fill','drain','clean','pour-water','stove-pour','bowl-merge','knead','roll','plate'].includes(id)&&work.source){
    prop=work.source.type==='food'?foodModel(work.source.food):work.source.type==='vessel'?vesselModel(id==='fill'?session.vessels[work.source.id]||work.source.vessel:work.source.vessel):null;if(prop)root.add(prop);
   }
   if(['fill','wash','clean','drain','pour-water','stove-pour','bowl-merge','sprinkle','season','plate'].includes(id)){
    stream=new THREE.Group();
    const foods=work.source?.vessel?.foods||[],transfer=['stove-pour','bowl-merge','plate'].includes(id);
    if(transfer&&foods.length){for(const food of foods.slice(0,8)){const piece=foodModel(food,{portion:true});piece.scale.setScalar(.35);stream.add(piece);}}
    if(!transfer||work.source?.vessel?.water>0)for(let i=0;i<12;i++){const drop=part(stream,id==='sprinkle'?'box':'round',0,0,0,.012,id==='sprinkle'?.012:.018,.012,id==='sprinkle'?({oil:'#edc957',soy:'#8d4d27',ketchup:'#f06536',herbs:'#7abd46'}[work.source?.id]||'#ffe3a1'):'#9ad9e7');if(id!=='sprinkle')drop.material=water;}
    root.add(stream);
   }
  }
  const anchor=point(work.station),time=session.elapsed,p=1-work.remaining/work.duration;
  root.position.copy(anchor);root.rotation.y=work.station.yaw+(session.homeFront<0?Math.PI:0);
  const counter=work.station.role==='counter'&&!work.station.worldPosition,stove=work.station.role==='stove';
  if(tool){
   tool.position.set(counter?(['mix','sprinkle','roll','knead','plate'].includes(id)?.45:-.27):stove?(session.selectedBurner===0?-.28:.28):0,.08,0);tool.rotation.set(0,0,0);
   if(id==='cut'||id==='chop'){tool.position.y=.055+Math.abs(Math.sin(p*Math.PI*2))*.16;tool.rotation.z=-.12+Math.sin(p*Math.PI*2)*.2;}
   else if(id==='sprinkle'){tool.position.y=.36;tool.position.x+=Math.sin(time*20)*.03;tool.rotation.z=2.3;}
   else if(id==='roll'||id==='knead'){tool.position.y=.1;tool.position.z=Math.sin(time*5)*.12;tool.rotation.x=time*3;}
   else if(id==='drain'){tool.position.y=.02;}
   else {tool.position.x+=Math.cos(time*9)*.075;tool.position.z=Math.sin(time*9)*.075;tool.position.y=.06;tool.rotation.z=.3;}
  }
  if(prop){prop.position.set(0,.12,0);prop.rotation.set(0,time*.3,0);if(['drain','pour-water','stove-pour','bowl-merge'].includes(id)){prop.position.set(.14,.38,0);prop.rotation.set(0,0,-.8);}animateCookingModel(prop,time);}
  if(stream)stream.children.forEach((drop,i)=>{const phase=(time*2+i/12)%1;drop.position.set((id==='sprinkle'?(counter?.45:stove?(session.selectedBurner===0?-.28:.28):0):0)+Math.sin(i*2.4)*.025,.4-phase*.38,Math.cos(i*2.4)*.025);});
 }
 return {play,update,clear,get busyHand(){return !!event&&['pour-water','stove-pour','bowl-merge','sprinkle','chop','mix','stir','roll','clean','plate'].includes(event.id);}};
}
