import * as THREE from 'three';
import {part} from './cooking-models.js?v=20261011-free-cook76';
import {FURNITURE_COLORS} from './housing-data.js?v=20261011-free-cook76';
import {isIsland} from './kitchen-layout.js?v=20261011-free-cook76';
export function cookingCabinet(station,open,pickable){
 const root=new THREE.Group(),contents=new THREE.Group(),doors=[],w=station.w*.88,h=station.h*.88,d=station.d*.88,paint=FURNITURE_COLORS[station.item.c]||'#d84a42';
 pickable(root,station,'cabinet-body');root.add(contents);
 part(root,'box',0,.045,0,w,.09,d,paint);
 for(const sign of [-1,1])part(root,'box',sign*(w/2-.025),h*.46,0,.05,h*.86,d,paint);
 const top=part(root,'box',0,h*.94,0,w,h*.12,d,'#f4eee2');
 if(!isIsland(station.def))part(root,'box',0,h*.46,-d/2+.022,w,h*.84,.044,paint);
 for(const y of [.16,.48,.73])part(contents,'box',0,h*y,0,w-.1,.018,d-.1,'#d4b486');
 for(const side of isIsland(station.def)?[1,-1]:[1])for(const sign of [-1,1]){
  const door=new THREE.Group();door.position.set(sign*w/2,h*.48,side*d/2);door.userData.sign=sign*side;doors.push(door);root.add(door);
  part(door,'box',-sign*w/4,0,0,w/2-.015,h*.78,.025,'#bd9166');
  part(door,'box',-sign*w*.4,h*.22,side*.024,w*.08,.03,.03,'#354353');pickable(door,station,'storage-door',station.item.id);
  door.rotation.y=door.userData.sign*(open?Math.PI*.48:0);
 }
 contents.visible=open;root.userData.storage={station,doors,contents,angle:open?Math.PI*.48:0};return {root,contents,top,w,h,d};
}
