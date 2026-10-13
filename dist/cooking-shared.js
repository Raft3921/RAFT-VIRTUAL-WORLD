import {cleanKitchenState,cleanCarry} from './cooking-state.js?v=20261013-life89';
export const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
export const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
export const kitchenIdentity=(index,id)=>String(index)+'/'+id;
// Independent counters, containers and objects have independent edit versions.
// Heating changes do not invalidate an unrelated person's preparation work.
export function kitchenResources(state,hands={}){
 const out={fridge:{open:state.fridgeOpen,group:state.foodGroup,page:state.foodPage},water:state.waterOn,plate:state.plateStationId};
 for(const [field,prefix]of [['worktops','board'],['vessels','vessel'],['storageOpen','door'],['itemHomes','home'],['appliances','appliance']])for(const [id,value]of Object.entries(state[field]||{}))out[prefix+':'+id]=copy(value);
 for(const field of ['dishes','loose'])for(const value of state[field]||[])out[(field==='dishes'?'dish':'loose')+':'+value.id]=copy(value);
 for(const [id,hand]of Object.entries(hands))out['hand:'+id]=copy(hand);
 return out;
}
export function resourcesToKitchen(resources,base){
 const state={...base,worktops:{},vessels:{},storageOpen:{},itemHomes:{},appliances:{},dishes:[],loose:[],hand:null,takenDishes:[]},hands={};
 for(const [key,value]of Object.entries(resources)){
  if(value==null)continue;const split=key.indexOf(':'),kind=key.slice(0,split),id=key.slice(split+1);
  const field={board:'worktops',vessel:'vessels',door:'storageOpen',home:'itemHomes',appliance:'appliances'}[kind];
  if(field)state[field][id]=copy(value);else if(kind==='dish')state.dishes.push(copy(value));else if(kind==='loose')state.loose.push(copy(value));else if(kind==='hand')hands[id]=cleanCarry(value);
 }
 state.fridgeOpen=resources.fridge?.open===true;state.foodGroup=resources.fridge?.group||'vegetable';state.foodPage=resources.fridge?.page||0;state.waterOn=resources.water===true;state.plateStationId=resources.plate||'';
 for(const h of [...Object.values(hands),...state.loose.map(b=>b.payload)])if(h?.type==='dish')state.takenDishes.push(h.dish.id);
 return {state:cleanKitchenState(state),hands};
}
// Apply only the player's actual edits; keep server heat/physics that advanced
// while the request was in transit.
export function mergeKitchenEdit(before,after,current){
 if(same(before,after))return copy(current);
 if(Array.isArray(after))return after.map((value,i)=>mergeKitchenEdit(before?.[i],value,current?.[i]));
 if(after&&typeof after==='object')return Object.fromEntries(Object.entries(after).map(([key,value])=>[key,mergeKitchenEdit(before?.[key],value,current?.[key])]));
 return copy(after);
}
