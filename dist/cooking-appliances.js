import * as THREE from 'three';
import {part} from './cooking-models.js?v=20261013-life89b';
import {cookingLabel} from './cooking-labels.js?v=20261013-life89b';
export function cookingAppliance(station,state,pickable){
 const root=new THREE.Group(),door=new THREE.Group(),inside=new THREE.Group(),w=station.w*.88,h=station.h*.88,d=station.d*.88;
 pickable(root,station,'appliance-body');root.add(inside);inside.visible=!!state.open;
 part(root,'box',0,.025,0,w,.05,d,'#efe6d3');part(root,'box',0,h-.025,0,w,.05,d,'#d8e3d8');part(root,'box',0,h/2,-d/2,w,h,.04,'#c7d0c8');
 for(const sign of [-1,1])part(root,'box',sign*(w/2-.02),h/2,0,.04,h,d,'#ddd4c0');
 const tray=part(inside,'box',0,.065,0,w-.09,.025,d-.08,'#b5b8af');
 door.position.set(-w/2,h/2,d/2);root.add(door);door.rotation.y=state.open?-Math.PI*.55:0;
 part(door,'box',w/2,0,0,w,h,.035,'#334644');part(door,'box',w/2,0,.02,w*.68,h*.62,.018,state.remaining?'#bd9c58':'#8da89b');part(door,'box',w*.89,0,.06,.025,h*.5,.045,'#f0d6a7');pickable(door,station,'appliance-door');
 const button=part(root,'box',w*.38,h*.8,d/2+.07,w*.18,h*.14,.05,state.remaining?'#e9aa48':state.done?'#8fc077':'#a9b9ac');pickable(button,station,'appliance-button');const buttonLabel=cookingLabel(state.remaining?'停止':'開始',w*.18,h*.12);buttonLabel.position.z=.026;button.add(buttonLabel);
 const dial=part(root,'box',w*.38,h*.59,d/2+.07,w*.18,h*.13,.05,'#a8794e');pickable(dial,station,'appliance-dial');const seconds=state.duration||60,dialLabel=cookingLabel(seconds<60?seconds+'秒':seconds/60+'分',w*.18,h*.11);dialLabel.position.z=.026;dial.add(dialLabel);
 const screen=cookingLabel(state.remaining?'運転中':state.done?'できあがり':'扉 → 容器 → 開始',w*.7,h*.12);screen.position.set(0,h*.99,d/2+.05);root.add(screen);
 return {root,inside,tray,w,h,d};
}
export function cookingToolStand(station,pickable){const root=new THREE.Group();part(root,'box',0,.04,0,station.w*.88,.08,station.d*.88,'#bb8854');part(root,'box',0,.1,-station.d*.3,station.w*.88,.12,.04,'#a7764a');pickable(root,station,'tool-store');return root;}
