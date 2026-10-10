import * as THREE from 'three';
import {part,foodModel} from './cooking-models.js?v=20261011-free-cook73';
import {INGREDIENTS} from './cooking-data.js?v=20261011-free-cook73';

export function fridgeModel(station,session,pickable){
 const root=new THREE.Group(),door=new THREE.Group(),w=station.w*.88,h=station.h*.88,d=station.d*.88;pickable(root,station,'fridge-body');
 const p=(x,y,z,ww,hh,dd,color)=>part(root,'box',x,y,z,ww,hh,dd,color);
 p(0,h/2,-d/2+.025,w,h,.05,'#d7e6dd');
 for(const x of [-1,1])p(x*(w/2-.025),h/2,0,.05,h,d,'#fff0d9');
 p(0,.035,0,w,.07,d,'#d7e6dd');p(0,h-.035,0,w,.07,d,'#fff0d9');
 const foods=INGREDIENTS.filter(f=>f.group===session.foodGroup),page=Math.min(session.foodPage||0,Math.max(0,Math.ceil(foods.length/8)-1)),scale=Math.min(.72,w/1.15,h/1.35);
 const contents=new THREE.Group();root.add(contents);
 for(let row=0;row<2;row++){
  const shelf=part(contents,'box',0,h*(.16+row*.4),0,w-.1,.018,d-.1,'#b9ded8');
  pickable(shelf,station,'fridge-shelf');
 }
 foods.slice(page*8,page*8+8).forEach((f,i)=>{
  const model=foodModel({id:f.id,method:'raw',progress:0,burn:0});model.scale.setScalar(scale);model.position.set((i%4-1.5)*(w-.13)/4,h*(.16+Math.floor(i/4)*.4)+.012,d*.12);pickable(model,station,'ingredient',f.id);contents.add(model);
 });
 // The door pivots around the left edge, revealing food within the cabinet.
 door.position.set(-w/2,0,d/2);root.add(door);
 part(door,'box',w/2,h/2,0,w,h,.065,'#fbefd9');
 part(door,'box',w/2,h*.72,.039,w*.9,.012,.008,'#b7cfbf');
 part(door,'box',w-.07,h*.53,.075,.032,h*.24,.045,'#a87343');
 part(door,'box',w/2,h*.9,.038,w*.27,.04,.012,'#88bdb0');
 pickable(door,station,'fridge-door');root.userData.door=door;root.userData.contents=contents;
 return root;
}
