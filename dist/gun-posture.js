export const PRONE_HEIGHT=.48;
export function proneShape(yaw=0){return {width:.30,depth:.78,height:PRONE_HEIGHT,yaw};}
export function gunHitBox(p){const height=p.prone?PRONE_HEIGHT:p.crouched?1.28:1.8;return {x:p.x,y:p.y+height/2,z:p.z,w:p.prone?.62:.65,h:height,d:p.prone?1.6:.65,yaw:p.yaw||0};}
export function gunDamage(id,charge=0){return id==='katana'?1+Math.min(1,Math.max(0,charge))*4:({rocket:2,machine:.5,sniper:1.5}[id]||1);}
