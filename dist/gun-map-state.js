import {gunCollision} from './gun-collision.js?v=20261017-authority122';
export const GUN_PROP_DEFS=gunCollision('sand').props;
export function cleanGunTraces(value,map='sand'){
 const defs=gunCollision(map).props;
 const traces=[];for(const v of Array.isArray(value)?value:[]){if(!defs.has(v?.id)||traces.some(t=>t.id===v.id))continue;
  traces.push({id:v.id,mode:['open','broken','cut'].includes(v.mode)?v.mode:'broken',at:Number.isFinite(v.at)?v.at:0,normal:Array.isArray(v.normal)&&v.normal.length===3&&v.normal.every(Number.isFinite)?v.normal.map(n=>Math.max(-1,Math.min(1,n))):[.65,.75,0]});
 }return traces;
}
