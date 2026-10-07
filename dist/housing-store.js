import {HOUSES,cleanHouse,applyHouseOperation} from './housing-data.js';
export class HousingStore{
  constructor(data,save,broadcast){this.data={version:1,houses:HOUSES.map(h=>cleanHouse(data?.houses?.[h.index]))};this.save=save;this.broadcast=broadcast;this.pending=Promise.resolve();}
  snapshots(){return this.data.houses;}
  apply(skin,message){
    const index=HOUSES.findIndex(h=>h.owner===skin);if(index<0||message.index!==index){if(this.data.houses[message.index])this.broadcast({type:'house-state',index:message.index,house:this.data.houses[message.index],requestId:message.requestId,error:'自分のキャラクターの家だけ編集できます'});return;}
    const requestId=typeof message.requestId==='string'?message.requestId.slice(0,40):'';
    this.pending=this.pending.then(async()=>{
      const previous=this.data.houses[index];
      if(message.rev!==previous.rev){this.broadcast({type:'house-state',index,house:previous,requestId,error:'別の端末で編集されました。最新の配置を読み込みました。'});return;}
      const result=applyHouseOperation(previous,message);if(result.error){this.broadcast({type:'house-state',index,house:previous,requestId,error:result.error});return;}
      const snapshot={version:1,houses:this.data.houses.map((h,i)=>i===index?result.house:h)};
      try{await this.save(snapshot);this.data=snapshot;this.broadcast({type:'house-state',index,house:result.house,requestId});}
      catch{this.broadcast({type:'house-state',index,house:previous,requestId,error:'保存できませんでした。配置を元に戻しました。'});}
    });return this.pending;
  }
}
