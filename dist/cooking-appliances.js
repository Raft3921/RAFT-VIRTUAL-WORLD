import * as THREE from 'three';
import {part} from './cooking-models.js?v=20261011-free-cook76';
export function cookingAppliance(station,state,pickable){
 const root=new THREE.Group(),door=new THREE.Group(),inside=new THREE.Group(),w=station.w*.88,h=station.h*.88,d=station.d*.88;
 pickable(root,station,'appliance-body');root.add(inside);inside.visible=!!state.open;
 part(root,'box',0,.025,0,w,.05,d,'#efe6d3');part(root,'box',0,h-.025,0,w,.05,d,'#d8e3d8');part(root,'box',0,h/2,-d/2,w,h,.04,'#c7d0c8');
 for(const sign of [-1,1])part(root,'box',sign*(w/2-.02),h/2,0,.04,h,d,'#ddd4c0');
 const tray=part(inside,'box',0,.065,0,w-.09,.025,d-.08,'#b5b8af');
 door.position.set(-w/2,h/2,d/2);root.add(door);door.rotation.y=state.open?-Math.PI*.55:0;
 part(door,'box',w/2,0,0,w,h,.035,'#334644');part(door,'box',w/2,0,.02,w*.68,h*.62,.018,state.remaining?'#bd9c58':'#8da89b');part(door,'box',w*.89,0,.06,.025,h*.5,.045,'#f0d6a7');pickable(door,station,'appliance-door');
 const button=part(root,'box',w*.42,h*.78,d/2+.015,.065,.045,.035,state.remaining?'#e9aa48':state.done?'#8fc077':'#a9b9ac');pickable(button,station,'appliance-button');
 return {root,inside,tray,w,h,d};
}
export function cookingToolStand(station,pickable){const root=new THREE.Group();part(root,'box',0,.04,0,station.w*.88,.08,station.d*.88,'#bb8854');part(root,'box',0,.1,-station.d*.3,station.w*.88,.12,.04,'#a7764a');pickable(root,station,'tool-store');return root;}
