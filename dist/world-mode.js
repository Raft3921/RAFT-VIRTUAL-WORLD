import {GUN_ENTRY} from './gun-layout.js';
// An open staging area outside the combat boundary, facing its entrance.
export const COMBAT_SPAWN=Object.freeze({x:GUN_ENTRY.x-6,y:.12,z:GUN_ENTRY.z+3,yaw:Math.PI/2,mirrorRealm:null});
export const COMBAT_MENU=Object.freeze({x:GUN_ENTRY.x-3,z:GUN_ENTRY.z+6});
export function combatSpawn(slot=0){return {...COMBAT_SPAWN,z:COMBAT_SPAWN.z+(slot%5-2)*.65};}
export function combatArea(p){return !p.mirrorRealm&&p.x>=98&&p.x<=246&&p.z>=-142&&p.z<=-42;}
export async function loadWorldMode(endpoint,fallback=false){
 try{const url=new URL(endpoint);url.protocol=url.protocol==='wss:'?'https:':'http:';url.pathname='/world-mode';url.search='';const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('mode unavailable');const data=await response.json();return data.combatOnly===true;}catch{return fallback;}
}
