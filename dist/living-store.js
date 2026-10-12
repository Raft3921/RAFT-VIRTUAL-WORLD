import {changePaintHistory,appendPaint} from './painting-history.js?v=20261012-life88';
import {furnitureAction} from './furniture-actions.js?v=20261012-life88';
import {FURNITURE_BY_ID,houseDescriptor,ROOM} from './housing-data.js?v=20261012-life88';
import {livingKind,livingPose,rhythm,chessStart,chessMove} from './living-shared.js?v=20261012-life88';
// No physics loop: machines advance from server timestamps; clients send intentions.
export class LivingStore{
 constructor(rules,records={},save=async()=>{}){this.rules=rules;this.records=records;this.save=save;this.runs=new Map();this.queue=Promise.resolve();}
 snapshot(){return Object.values(this.records).filter(r=>r.kind!=='carry').map(({strokes,strokeMeta,paintRedo,paintRequests,paintHistoryRequests,...record})=>record);}
 layouts(){if(this.layoutSource!==this.rules.houses.data){this.layoutSource=this.rules.houses.data;this.layoutCache=this.rules.houses.snapshots();}return this.layoutCache;}
 target(entry,m){const p=entry.player,h=houseDescriptor(m.index,this.rules.houses.realms),item=this.layouts()[m.index]?.items.find(i=>i.id===m.itemId),def=item&&FURNITURE_BY_ID.get(item.t);if(!h||!def||p.ragdoll||p.flight||this.rules.duel?.ids.includes(p.id)||this.rules.guns.members.has(p.id))return null;const pose=livingPose(h.index,item);if(Math.abs(p.x-h.x)>ROOM.x||Math.abs(p.z-h.z)>ROOM.z||Math.hypot(p.x-pose.x,p.z-pose.z)>4||Math.abs(p.y+1-pose.y)>3)return null;return {h,item,def,pose,kind:livingKind(def),key:h.index+':'+item.id};}
 receive(entry,m){this.queue=this.queue.then(async()=>{const tracked=typeof m.requestId==='string'&&m.requestId.length<=64&&!['paint','undo','redo'].includes(m.action);entry.livingRequests??=new Set();if(!tracked||!entry.livingRequests.has(m.requestId)){await this.apply(entry,m);if(tracked){entry.livingRequests.add(m.requestId);if(entry.livingRequests.size>64)entry.livingRequests.delete(entry.livingRequests.values().next().value);}}if(tracked)entry.send?.({type:'living-ack',requestId:m.requestId});}).catch(()=>entry.send?.({type:'living-error',playerId:entry.player.id,requestId:m.requestId,message:'生活の状態を保存できませんでした。もう一度操作してください'}));this.rules.onAsyncWork(this.queue);return this.queue;}
 async persist(record,points=null,cue={}){const key=record.index+':'+record.itemId;await this.save(key,record);this.records={...this.records,[key]:record};if(points)this.rules.broadcast({type:'living-paint',index:record.index,itemId:record.itemId,rev:record.rev,points,...cue});else this.rules.broadcast({type:'living-state',record});}

 hand(entry){return this.records['@hand:'+entry.player.profile]||{index:'@hand',itemId:entry.player.profile,kind:'carry',skin:entry.player.skin,rev:0,payload:null};}
 async transfer(entry,record,payload){const hand={...this.hand(entry),payload,rev:this.hand(entry).rev+1},handKey='@hand:'+entry.player.profile,key=record.index+':'+record.itemId;await this.save(key,record,{[handKey]:hand});this.records={...this.records,[key]:record,[handKey]:hand};this.rules.broadcast({type:'living-state',record});this.rules.broadcast({type:'living-hand',playerId:entry.player.id,payload});}
 error(entry,message){entry.send?.({type:'living-error',playerId:entry.player.id,message});}

 advance(run,now){const dt=Math.min(.8,Math.max(0,(now-run.lastAt)/1000));run.lastAt=now;const elapsed=Math.max(0,(now-run.startAt)/1000),effort=now-run.inputAt<800?run.effort:0;
  run.requiredSpeed=run.kind==='bike'?Math.min(6,2+elapsed*.025):Math.min(4.8,1.8+elapsed*.02);
  const desired=effort*(run.kind==='bike'?8:6)*(1-run.fatigue*.32);run.speed+=(desired-run.speed)*(1-Math.exp(-dt*3));
  if(elapsed>3){run.distance+=run.speed*dt;const behind=run.speed<run.requiredSpeed;run.fatigue=Math.max(0,Math.min(1,run.fatigue+dt*(behind?.11:.02)));}
  if(now-run.beatAt>=run.period*1000){run.beatAt+=Math.floor((now-run.beatAt)/(run.period*1000))*run.period*1000;run.period=rhythm(run,now).period;}
  return run.fatigue>=1;
 }
 async finish(id,fallen=false){const run=this.runs.get(id);if(!run)return;this.advance(run,Date.now());const previous=this.records[run.key]||{},records={...(previous.records||{})},owner=run.profile;records[owner]={skin:run.skin,bestCombo:Math.max(records[owner]?.bestCombo||0,run.bestCombo||0),best:Math.max(records[owner]?.best||0,run.distance),total:(records[owner]?.total||0)+Math.max(0,run.distance-(run.checkpointDistance||0))};const record={...previous,index:run.index,itemId:run.itemId,kind:'exercise',records,last:{skin:run.skin,distance:run.distance,at:Date.now()},rev:(previous.rev||0)+1};await this.persist(record);this.runs.delete(id);this.rules.broadcast({type:'living-exercise',playerId:id,ended:true,fallen,distance:run.distance,best:records[owner].best,bestCombo:run.bestCombo||0});}
 remove(id){this.queue=this.queue.then(()=>this.finish(id)).catch(()=>{});return this.queue;}
 async apply(entry,m){const now=Date.now(),id=entry.player.id;if(m.action==='open-room'){const h=houseDescriptor(m.index,this.rules.houses.realms),p=entry.player;if(!h||Math.abs(p.x-h.x)>ROOM.x+2||Math.abs(p.z-h.z)>ROOM.z+2||now-(entry.lastLivingOpen||0)<600)return;entry.lastLivingOpen=now;const message={type:'living-room',playerId:id,index:h.index,hand:this.hand(entry).payload,hands:this.rules.entries().map(peer=>({playerId:peer.player.id,payload:this.hand(peer).payload})),records:Object.values(this.records).filter(r=>String(r.index)===String(h.index))};if(entry.send)entry.send(message);else this.rules.broadcast(message);return;}if(m.action==='exercise-stop'){await this.finish(id);return;}const t=this.target(entry,m);if(!t){await this.finish(id);this.error(entry,'家具へ近づいてから操作してください');return;}const {kind,key,h,item,def}=t,previous=this.records[key]||{index:h.index,itemId:item.id,kind,rev:0};
  if(m.action==='exercise-start'&&kind==='exercise'){for(const [owner,run]of this.runs)if(now-run.inputAt>4000)await this.finish(owner);if([...this.runs.values()].some(r=>r.key===key)){this.error(entry,'ほかの人が運動中です。空くまでお待ちください');return;}await this.finish(id);const run={key,index:h.index,itemId:item.id,kind:def.design,playerId:id,profile:entry.player.profile||'skin:'+entry.player.skin,skin:entry.player.skin,startAt:now,beatAt:now,period:2.6,lastAt:now,inputAt:now,effort:0,distance:0,fatigue:0,speed:0,requiredSpeed:0,combo:0,bestCombo:0,lastJump:0};this.runs.set(id,run);this.rules.broadcast({type:'living-exercise',...run});return;}
  if(['exercise-input','exercise-jump'].includes(m.action)&&kind==='exercise'){const run=this.runs.get(id);if(!run||run.key!==key||m.action==='exercise-input'&&now-(run.packetAt||0)<80)return;if(now-run.inputAt>3000){await this.finish(id);return;}run.packetAt=now;if(this.advance(run,now)){await this.finish(id,true);return;}if(m.action==='exercise-input'){run.effort=Math.max(0,Math.min(1,Number(m.effort)||0));run.inputAt=now;}else if(now-run.lastJump>=500){run.lastJump=now;const r=rhythm(run,now),already=run.scoredBeat===run.beatAt,success=Math.abs(r.phase-.78)<r.window;
    if(!already){run.fatigue=Math.max(0,Math.min(1,run.fatigue+(success?-.22:.1)));run.combo=success?(run.combo||0)+1:0;if(success)run.scoredBeat=run.beatAt;run.bestCombo=Math.max(run.bestCombo||0,run.combo);}
    run.success=already||success;run.feedback=already?'already':success?'success':'miss';run.feedbackAt=now;
   }if(now-(run.savedAt||run.startAt)>5000){const old=this.records[key]||{},owner=run.profile,records={...(old.records||{})};records[owner]={skin:run.skin,bestCombo:Math.max(records[owner]?.bestCombo||0,run.bestCombo||0),best:Math.max(records[owner]?.best||0,run.distance),total:(records[owner]?.total||0)+Math.max(0,run.distance-(run.checkpointDistance||0))};await this.persist({...old,index:h.index,itemId:item.id,kind:'exercise',records,rev:(old.rev||0)+1});run.checkpointDistance=run.distance;run.savedAt=now;}this.rules.broadcast({type:'living-exercise',...run});return;}
  if(kind!=='paint'&&now-(entry.lastLivingAt||0)<100){this.error(entry,'操作が続いています。少し待ってから押してください');return;}entry.lastLivingAt=now;const next={...previous,rev:previous.rev+1,at:now};let changed=false;
  if(kind==='paint'&&['undo','redo'].includes(m.action)){
   if(typeof m.requestId!=='string'||m.requestId.length>64)return;
   const prior=previous.paintHistoryRequests?.find(r=>r.id===m.requestId);
   if(prior){entry.send?.({type:'living-history-ack',playerId:id,requestId:m.requestId,rev:prior.rev});return;}
   const changedHistory=changePaintHistory(previous,entry.player.profile,m.action);
   const result={...(changedHistory||previous),rev:previous.rev+1,at:now,paintHistoryRequests:[...(previous.paintHistoryRequests||[]),{id:m.requestId,rev:previous.rev+1}].slice(-32)};
   await this.persist(result);entry.send?.({type:'living-history-ack',playerId:id,requestId:m.requestId,rev:result.rev});return;
  }
  if(kind==='paint'&&m.action==='paint'&&Array.isArray(m.points)&&m.points.length>0&&m.points.length<=48){
   if(typeof m.requestId!=='string'||m.requestId.length>64||typeof m.gestureId!=='string'||m.gestureId.length>64)return;
   const oldRequest=previous.paintRequests?.find(r=>r.id===m.requestId);
   if(oldRequest){entry.send?.({type:'living-paint-ack',playerId:id,requestId:m.requestId,rev:oldRequest.rev});return;}
   const points=m.points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1));if(points.length!==m.points.length)return;
   for(const point of points)for(let i=0;i<2;i++)point[i]=Math.round(point[i]*1024)/1024;
   const sketch=appendPaint(previous,entry.player.profile,m.gestureId,points);
   if(!sketch){entry.send?.({type:'living-error',playerId:id,requestId:m.requestId,message:'このキャンバスは描画上限です。新しいキャンバスを置いてください'});return;}
   // Clearing this author's redo affects more than the newly appended segment.
   const cleared=sketch.strokes.length!==(previous.strokes||[]).length+1;
   Object.assign(next,sketch,{rev:previous.rev+1,at:now,paintRequests:[...(previous.paintRequests||[]),{id:m.requestId,rev:previous.rev+1}].slice(-128)});
   await this.persist(next,cleared?null:points,{requestId:m.requestId,playerId:id,gestureId:m.gestureId,owner:entry.player.profile});
   entry.send?.({type:'living-paint-ack',playerId:id,requestId:m.requestId,rev:next.rev});return;
  }
  if(kind==='chess'&&m.action==='chess'){if(m.rev!==previous.rev)return;const chess=chessMove(previous.chess||chessStart(),m.from,m.to);if(chess){next.chess=chess;changed=true;}else this.error(entry,'その駒はそこへ動かせません');}
  if(kind==='tv'&&['power','channel'].includes(m.action)){next.enabled=m.action==='power'?!previous.enabled:!!previous.enabled;next.channel=((previous.channel||0)+(m.action==='channel'?Math.sign(m.step||1):0)+8)%8;changed=true;}
  if(kind==='clothes'&&m.action==='use'){
   const carry=this.hand(entry).payload,contents=previous.contents?[...previous.contents]:Array.from({length:Math.min(32,previous.count??3)},()=>({type:'clothes',stage:previous.stage||'dirty',color:previous.color||'#ddd7c6'}));
   if(carry&&carry.type!=='clothes'){this.error(entry,'ここには洗濯物を戻せます');return;}
   if(carry&&contents.length>=32){this.error(entry,'かごがいっぱいです');return;}
   if(!carry&&!contents.length){this.error(entry,'かごは空です');return;}
   const payload=carry?null:contents.shift();if(carry)contents.push(carry);next.contents=contents;next.count=contents.length;next.stage=contents[0]?.stage||'dirty';await this.transfer(entry,next,payload);return;
  }
  if(kind==='coldstorage'&&m.action==='use'){const carry=this.hand(entry).payload;if(carry&&carry.type!=='meal'){this.error(entry,'手元の物を先に置いてください');return;}await this.transfer(entry,next,carry?null:{type:'meal',hot:false,label:'冷凍ごはん'});return;}
  if(kind==='laundry'){
   if(previous.endAt>now&&['open','load'].includes(m.action)){this.error(entry,'運転が終わってから扉を開けてください');return;}
   if(m.action==='open'){next.open=!previous.open;changed=true;}
   if(m.action==='load'){
    if(!previous.open){this.error(entry,'先に扉を開けてください');return;}
    const carry=this.hand(entry).payload;
    if(previous.loaded){if(carry){this.error(entry,'先に手の洗濯物をかごへ戻してください');return;}const payload={...(previous.payload||{type:'clothes',stage:'dirty',color:'#ddd7c6'})};if(previous.endAt&&previous.endAt<=now)payload.stage=def.design==='dryer'?'dry':'washed';next.loaded=false;next.payload=null;next.endAt=next.startAt=0;await this.transfer(entry,next,payload);return;}
    if(carry?.type!=='clothes'){this.error(entry,'洗濯物のかごから服を持ってきてください');return;}
    if(def.design==='dryer'&&carry.stage==='dirty'){this.error(entry,'洗濯機で洗ってから乾燥機へ入れてください');return;}
    next.loaded=true;next.payload=carry;next.endAt=next.startAt=0;await this.transfer(entry,next,null);return;
   }
   if(m.action==='start'){if(!previous.loaded){this.error(entry,'先に洗濯物を入れてください');return;}if(previous.endAt>now)return;next.open=false;next.startAt=now;next.endAt=now+(def.design==='dryer'?30000:45000);changed=true;}
  }
  if(kind==='bath'){
   if(previous.bather&&previous.bathUntil>now&&previous.bather!==id){this.error(entry,'ほかの人が入浴中です');return;}
   if(m.action==='bath-use'){if(!previous.loaded||def.design!=='shower'&&previous.endAt>now){this.error(entry,'お湯が入るまでお待ちください');return;}next.bather=id;next.bathUntil=now+15000;changed=true;}
   if(['bath-stop','bath-finish'].includes(m.action)){if(previous.bather!==id)return;if(m.action==='bath-finish'&&previous.bathUntil>now)return;next.bather=null;next.bathUntil=0;if(m.action==='bath-finish')next.baths=(previous.baths||0)+1;changed=true;}
   if(m.action==='open'){next.open=!previous.open;changed=true;}
   if(m.action==='load'){next.endAt=next.startAt=0;next.loaded=false;next.bather=null;next.bathUntil=0;changed=true;}
   if(m.action==='start'){if(previous.endAt>now){next.endAt=now;changed=true;}else{next.loaded=true;next.open=false;next.startAt=now;next.endAt=now+(def.design==='shower'?60000:20000);changed=true;}}
  }
  if(kind==='sewing'){
   if(previous.endAt>now){this.error(entry,'縫製中です。完成までお待ちください');return;}
   if(m.action==='load'){const carry=this.hand(entry).payload;if(previous.loaded){if(carry){this.error(entry,'手元の物を先に置いてください');return;}const payload={...(previous.payload||{type:'clothes',stage:'dry'})};if(previous.endAt){payload.stage='crafted';next.completed=(previous.completed||0)+1;}next.loaded=false;next.payload=null;next.startAt=next.endAt=0;await this.transfer(entry,next,payload);return;}
    if(carry?.type!=='clothes'||!['dry','crafted'].includes(carry.stage)){this.error(entry,'洗って乾燥させた布を持ってきてください');return;}next.loaded=true;next.payload=carry;next.startAt=next.endAt=0;await this.transfer(entry,next,null);return;}
   if(m.action==='start'){if(!previous.loaded){this.error(entry,'乾いた布を先にセットしてください');return;}if(previous.endAt)return;next.startAt=now;next.endAt=now+15000;next.stitches=(previous.stitches||0)+120;changed=true;}
  }
  if(kind==='microwave'){
   const carry=this.hand(entry).payload;
   if(m.action==='eat'){if(carry?.type!=='meal'||!carry.hot){this.error(entry,'温めた食事を手に持ってください');return;}next.meals=(previous.meals||0)+1;await this.transfer(entry,next,{type:'wrapper',label:'空の容器'});this.rules.broadcast({type:'living-motion',index:h.index,itemId:item.id,playerId:id,kind:'eat',at:now});return;}
   if(previous.endAt>now){this.error(entry,'加熱終了までお待ちください');return;}
   if(m.action==='open'){next.open=!previous.open;changed=true;}
   if(m.action==='load'){if(!previous.open){this.error(entry,'先に扉を開けてください');return;}
    if(previous.loaded){if(carry){this.error(entry,'手元の物を先に置いてください');return;}const payload={...(previous.payload||{type:'meal',label:'冷凍ごはん'}),hot:!!previous.endAt};next.loaded=false;next.payload=null;next.startAt=next.endAt=0;await this.transfer(entry,next,payload);return;}
    if(carry?.type!=='meal'){this.error(entry,'冷蔵庫から冷凍食を持ってきてください');return;}next.loaded=true;next.payload=carry;next.startAt=next.endAt=0;await this.transfer(entry,next,null);return;}
   if(m.action==='start'){if(!previous.loaded){this.error(entry,'先に食品を入れてください');return;}next.open=false;next.startAt=now;next.endAt=now+15000;changed=true;}
  }
  if(kind==='trash'){
   if(m.action==='open'){next.open=!previous.open;changed=true;}
   if(m.action==='load'){const carry=this.hand(entry).payload;if(!previous.open||!carry||(previous.waste||0)>=10){this.error(entry,!previous.open?'先にふたを開けてください':!carry?'捨てる物を手に持ってください':'ごみがいっぱいです。回収してください');return;}next.waste=(previous.waste||0)+1;next.loaded=true;await this.transfer(entry,next,null);return;}
   if(m.action==='empty'){next.loaded=false;next.waste=0;next.open=true;changed=true;}
  }
  if(['basketball','globe','horse','toy','object'].includes(kind)&&m.action==='use'){next.uses=(previous.uses||0)+1;next.phase=(previous.phase||0)+1;if(kind==='basketball'){next.scored=(previous.scored||0)+(Number.isFinite(m.power)&&Math.abs(m.power-.75)<.18?1:0);}if(['horse','toy'].includes(kind))next.enabled=!previous.enabled;changed=true;}
  if(changed){await this.persist(next,kind==='paint'?next.strokes.at(-1):null,{requestId:m.requestId,playerId:id});if(kind==='paint')entry.send?.({type:'living-paint-ack',playerId:id,requestId:m.requestId,rev:next.rev});if(kind==='object'){const action=furnitureAction(def);this.rules.broadcast({type:'furniture-event',index:h.index,itemId:item.id,kind:action.kind,enabled:true,serial:next.rev,playerId:id});}this.rules.broadcast({type:'living-motion',index:h.index,itemId:item.id,playerId:id,kind,at:now});}
 }
}
