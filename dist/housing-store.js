import {HOUSES,mirrorRealmKey,houseDescriptor,emptyHouse,cleanHouse,applyHouseOperation,mirrorPassageError,FURNITURE_BY_ID} from './housing-data.js';
export class HousingStore{
  constructor(data,save,broadcast){
    this.data={version:2,houses:Object.fromEntries(HOUSES.slice(0,8).map(h=>[h.index,cleanHouse(data?.houses?.[h.index])]))};this.save=save;this.broadcast=broadcast;this.pending=Promise.resolve();this.realms=new Map();
    for(const [key,slot]of Object.entries(data?.houses?.$realms||{}).sort((a,b)=>a[1]-b[1]))if(/^m\|[0-7]\|[-a-z0-9_]{1,32}$/.test(key)&&Number.isInteger(slot)&&slot>=0&&slot<4096&&!this.realms.has(key)&&![...this.realms.values()].includes(slot))this.realms.set(key,slot);
    this.registerSources();
    for(const [key,value]of Object.entries(data?.houses||{}))if(typeof key==='string'&&key.startsWith('m|')&&houseDescriptor(key,this.realms))this.data.houses[key]=cleanHouse(value);
  }
  registerRealm(key){if(this.realms.has(key)||this.realms.size>=4096)return;let slot=0;const used=new Set(this.realms.values());while(used.has(slot))slot++;this.realms.set(key,slot);}
  registerSources(){for(const h of HOUSES.slice(0,8))for(const item of this.data.houses[h.index].items)if(['mirror','wall-mirror'].includes(FURNITURE_BY_ID.get(item.t)?.family))this.registerRealm(mirrorRealmKey(h.index,item.id));}
  snapshots(){return {...this.data.houses,$realms:Object.fromEntries(this.realms)};}
  apply(skin,message){
    const h=houseDescriptor(message.index,this.realms),index=h?.index;
    if(!h||h.owner!==skin){const house=this.data.houses[message.index];if(house)this.broadcast({type:'house-state',index:message.index,house,requestId:message.requestId,error:'自分のキャラクターの家だけ編集できます'});return;}
    const requestId=typeof message.requestId==='string'?message.requestId.slice(0,40):'';
    this.pending=this.pending.then(async()=>{
      const previous=this.data.houses[index]||emptyHouse();
      const reply=(house,error)=>this.broadcast({type:'house-state',index,house,requestId,error,realms:Object.fromEntries(this.realms)});
      if(message.rev!==previous.rev){reply(previous,'別の端末で編集されました。最新の配置を読み込みました。');return;}
      const result=applyHouseOperation(previous,message);if(result.error){reply(previous,result.error);return;}
      const passageError=h.realm&&mirrorPassageError(result.house,this.data.houses[h.sourceIndex]);if(passageError&&message.action!=='delete'){reply(previous,passageError);return;}
      const next={...this.data.houses,[index]:result.house};
      if(!h.realm)for(const item of result.house.items)if(['mirror','wall-mirror'].includes(FURNITURE_BY_ID.get(item.t)?.family))this.registerRealm(mirrorRealmKey(index,item.id));
      const snapshot={version:2,houses:{...next,$realms:Object.fromEntries(this.realms)}};
      try{await this.save(snapshot);this.data={version:2,houses:next};reply(result.house);}
      catch{reply(previous,'保存できませんでした。配置を元に戻しました。');}
    });return this.pending;
  }
}
