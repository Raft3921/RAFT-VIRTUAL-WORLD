import {HOUSES,mirrorRealmKey,houseDescriptor,emptyHouse,cleanHouse,applyHouseOperation,mirrorPassageError,isMirror,reflectedMirror} from './housing-data.js?v=20261010-free-cook71';
export class HousingStore{
  constructor(data,save,broadcast){
    this.save=save;this.broadcast=broadcast;this.pending=Promise.resolve();this.realms=new Map([[mirrorRealmKey(),0]]);
    const houses={};for(const h of HOUSES){houses[h.index]=cleanHouse(data?.houses?.[h.index]);for(const item of houses[h.index].items)delete item.linkedMirror;if(h.guest&&!data?.houses?.[h.index])houses[h.index].finish={floor:'white',wallpaper:'white',ceiling:'white'};}
    // Keep the old rooms in the saved archive; choose the most recently edited
    // room for each owner when first migrating to the shared world.
    this.legacyMirrorHouses=data?.legacyMirrorHouses||Object.fromEntries(Object.entries(data?.houses||{}).filter(([key])=>key.startsWith('m|')&&!key.startsWith(mirrorRealmKey()+'|')));
    for(const h of HOUSES.slice(0,8)){const key=mirrorRealmKey()+'|'+h.index;const candidates=Object.entries(data?.houses||{}).filter(([k])=>k.startsWith('m|')&&k.endsWith('|'+h.index)).map(([,v])=>v).sort((a,b)=>(b.rev||0)-(a.rev||0));const room=cleanHouse(data?.houses?.[key]||candidates[0]);room.items=room.items.filter(i=>!isMirror(i));houses[key]=room;}
    this.data={version:3,houses};
  }
  snapshots(){const houses={...this.data.houses};for(const h of HOUSES.slice(0,8)){const key=mirrorRealmKey()+'|'+h.index,room=houses[key];houses[key]={...room,items:[...room.items,...houses[h.index].items.filter(isMirror).map(reflectedMirror)]};}return {...houses,$realms:Object.fromEntries(this.realms)};}
  apply(skin,message){
    const h=houseDescriptor(message.index,this.realms);if(!h||h.owner!==skin){this.broadcast({type:'house-state',index:message.index,house:this.snapshots()[message.index],requestId:message.requestId,error:'自分のキャラクターの家だけ編集できます'});return;}
    this.pending=this.pending.then(async()=>{
      const index=h.index,previous=this.snapshots()[index],reply=error=>this.broadcast({type:'house-state',index,house:this.snapshots()[index],requestId:message.requestId,error,realms:Object.fromEntries(this.realms)});
      if(message.rev!==previous.rev){reply('別の端末で編集されました。最新の配置を読み込みました。');return;}
      const linked=h.realm&&this.data.houses[h.sourceIndex].items.find(i=>i.id===message.id&&isMirror(i));
      if(h.realm&&((message.item&&isMirror(message.item))||linked&&message.action!=='delete')){reply('共有の鏡は選択して削除できます。移動・追加は現世で行ってください');return;}
      if(message.item?.linkedMirror){reply('共有の鏡は現世で編集してください');return;}
      const target=linked?h.sourceIndex:index,base=this.data.houses[target],op=linked?{action:'delete',id:linked.id}:message,result=applyHouseOperation(base,op);
      if(result.error){reply(result.error);return;}
      const error=h.realm&&!linked&&mirrorPassageError(result.house,this.data.houses[h.sourceIndex]);if(error&&message.action!=='delete'){reply(error);return;}
      const next={...this.data.houses,[target]:result.house},sourceChanged=!houseDescriptor(target,this.realms).realm&&Number(target)<8;
      const mirrorIndex=mirrorRealmKey()+'|'+target;if(sourceChanged)next[mirrorIndex]={...next[mirrorIndex],rev:next[mirrorIndex].rev+1};
      try{await this.save({version:3,houses:{...next,$realms:Object.fromEntries(this.realms)},legacyMirrorHouses:this.legacyMirrorHouses});this.data={version:3,houses:next};
        if(target!==index)this.broadcast({type:'house-state',index:target,house:this.snapshots()[target]});
        if(sourceChanged&&mirrorIndex!==index)this.broadcast({type:'house-state',index:mirrorIndex,house:this.snapshots()[mirrorIndex]});reply();
      }catch{reply('保存できませんでした。配置を元に戻しました。');}
    });return this.pending;
  }
}
