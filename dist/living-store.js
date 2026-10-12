import {furnitureAction} from './furniture-actions.js?v=20261012-life83';
import {FURNITURE_BY_ID,houseDescriptor,ROOM} from './housing-data.js?v=20261012-life83';
import {livingKind,livingPose,rhythm,chessStart,chessMove} from './living-shared.js?v=20261012-life83';
// No physics loop: machines advance from server timestamps; clients send intentions.
export class LivingStore{
 constructor(rules,records={},save=async()=>{}){this.rules=rules;this.records=records;this.save=save;this.runs=new Map();this.queue=Promise.resolve();}
 snapshot(){return Object.values(this.records).filter(r=>r.kind!=='carry').map(({strokes,paintRequests,...record})=>record);}
 layouts(){if(this.layoutSource!==this.rules.houses.data){this.layoutSource=this.rules.houses.data;this.layoutCache=this.rules.houses.snapshots();}return this.layoutCache;}
 target(entry,m){const p=entry.player,h=houseDescriptor(m.index,this.rules.houses.realms),item=this.layouts()[m.index]?.items.find(i=>i.id===m.itemId),def=item&&FURNITURE_BY_ID.get(item.t);if(!h||!def||p.ragdoll||p.flight||this.rules.duel?.ids.includes(p.id)||this.rules.guns.members.has(p.id))return null;const pose=livingPose(h.index,item);if(Math.abs(p.x-h.x)>ROOM.x||Math.abs(p.z-h.z)>ROOM.z||Math.hypot(p.x-pose.x,p.z-pose.z)>4||Math.abs(p.y+1-pose.y)>3)return null;return {h,item,def,pose,kind:livingKind(def),key:h.index+':'+item.id};}
 receive(entry,m){this.queue=this.queue.then(()=>this.apply(entry,m)).catch(()=>this.rules.broadcast({type:'living-error',playerId:entry.player.id,requestId:m.requestId,message:'生活の状態を保存できませんでした。もう一度操作してください'}));this.rules.onAsyncWork(this.queue);return this.queue;}
 async persist(record,points=null,cue={}){const key=record.index+':'+record.itemId;await this.save(key,record);this.records={...this.records,[key]:record};if(points)this.rules.broadcast({type:'living-paint',index:record.index,itemId:record.itemId,rev:record.rev,points,...cue});else this.rules.broadcast({type:'living-state',record});}

 hand(entry){return this.records['@hand:'+entry.player.profile]||{index:'@hand',itemId:entry.player.profile,kind:'carry',skin:entry.player.skin,rev:0,payload:null};}
 async transfer(entry,record,payload){const hand={...this.hand(entry),payload,rev:this.hand(entry).rev+1},handKey='@hand:'+entry.player.profile,key=record.index+':'+record.itemId;await this.save(key,record,{[handKey]:hand});this.records={...this.records,[key]:record,[handKey]:hand};this.rules.broadcast({type:'living-state',record});this.rules.broadcast({type:'living-hand',playerId:entry.player.id,payload});}
 error(entry,message){entry.send?.({type:'living-error',playerId:entry.player.id,message});}

 advance(run,now){const dt=Math.min(1,Math.max(0,(now-run.lastAt)/1000));run.lastAt=now;const elapsed=(now-run.startAt)/1000,required=Math.min(1.05,.35+elapsed*.003),effort=now-run.inputAt<800?run.effort:0;run.speed=Math.max(0,run.kind==='bike'?effort*7:effort*4);run.distance+=run.speed*dt;run.fatigue=Math.max(0,Math.min(1,run.fatigue+dt*(effort<required?.14:.015)));if(now-run.beatAt>run.period*1000){run.beatAt+=Math.floor((now-run.beatAt)/(run.period*1000))*run.period*1000;run.period=rhythm(run,now).period;}return run.fatigue>=1;}
 async finish(id,fallen=false){const run=this.runs.get(id);if(!run)return;this.advance(run,Date.now());const previous=this.records[run.key]||{},records={...(previous.records||{})},owner=run.profile;records[owner]={skin:run.skin,best:Math.max(records[owner]?.best||0,run.distance),total:(records[owner]?.total||0)+Math.max(0,run.distance-(run.checkpointDistance||0))};const record={...previous,index:run.index,itemId:run.itemId,kind:'exercise',records,last:{skin:run.skin,distance:run.distance,at:Date.now()},rev:(previous.rev||0)+1};await this.persist(record);this.runs.delete(id);this.rules.broadcast({type:'living-exercise',playerId:id,ended:true,fallen,distance:run.distance});}
 remove(id){this.queue=this.queue.then(()=>this.finish(id)).catch(()=>{});return this.queue;}
 async apply(entry,m){const now=Date.now(),id=entry.player.id;if(m.action==='open-room'){const h=houseDescriptor(m.index,this.rules.houses.realms),p=entry.player;if(!h||Math.abs(p.x-h.x)>ROOM.x+2||Math.abs(p.z-h.z)>ROOM.z+2||now-(entry.lastLivingOpen||0)<600)return;entry.lastLivingOpen=now;const message={type:'living-room',playerId:id,index:h.index,hand:this.hand(entry).payload,hands:this.rules.entries().map(peer=>({playerId:peer.player.id,payload:this.hand(peer).payload})),records:Object.values(this.records).filter(r=>String(r.index)===String(h.index))};if(entry.send)entry.send(message);else this.rules.broadcast(message);return;}if(m.action==='exercise-stop'){await this.finish(id);return;}const t=this.target(entry,m);if(!t){await this.finish(id);return;}const {kind,key,h,item,def}=t,previous=this.records[key]||{index:h.index,itemId:item.id,kind,rev:0};
  if(m.action==='exercise-start'&&kind==='exercise'){for(const [owner,run]of this.runs)if(now-run.inputAt>4000)await this.finish(owner);if([...this.runs.values()].some(r=>r.key===key))return;await this.finish(id);const run={key,index:h.index,itemId:item.id,kind:def.design,playerId:id,profile:entry.player.profile||'skin:'+entry.player.skin,skin:entry.player.skin,startAt:now,beatAt:now,period:2.6,lastAt:now,inputAt:now,effort:0,distance:0,fatigue:0,speed:0,lastJump:0};this.runs.set(id,run);this.rules.broadcast({type:'living-exercise',...run});return;}
  if(['exercise-input','exercise-jump'].includes(m.action)&&kind==='exercise'){const run=this.runs.get(id);if(!run||run.key!==key||m.action==='exercise-input'&&now-(run.packetAt||0)<80)return;run.packetAt=now;if(this.advance(run,now)){await this.finish(id,true);return;}if(m.action==='exercise-input'){run.effort=Math.max(0,Math.min(1,Number(m.effort)||0));run.inputAt=now;}else if(now-run.lastJump>run.period*600){run.lastJump=now;const r=rhythm(run,now),success=Math.abs(r.phase-.78)<r.window;run.fatigue=Math.max(0,Math.min(1,run.fatigue+(success?-.22:.1)));run.success=success;}if(now-(run.savedAt||run.startAt)>5000){const old=this.records[key]||{},owner=run.profile,records={...(old.records||{})};records[owner]={skin:run.skin,best:Math.max(records[owner]?.best||0,run.distance),total:(records[owner]?.total||0)+Math.max(0,run.distance-(run.checkpointDistance||0))};await this.persist({...old,index:h.index,itemId:item.id,kind:'exercise',records,rev:(old.rev||0)+1});run.checkpointDistance=run.distance;run.savedAt=now;}this.rules.broadcast({type:'living-exercise',...run});return;}
  if(kind!=='paint'&&now-(entry.lastLivingAt||0)<100)return;entry.lastLivingAt=now;const next={...previous,rev:previous.rev+1,at:now};let changed=false;
  if(kind==='paint'&&m.action==='paint'&&Array.isArray(m.points)&&m.points.length>0&&m.points.length<=48){if(typeof m.requestId!=='string'||m.requestId.length>64)return;const oldRequest=previous.paintRequests?.find(r=>r.id===m.requestId);if(oldRequest){entry.send?.({type:'living-paint-ack',playerId:id,requestId:m.requestId,rev:oldRequest.rev});return;}const points=m.points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1));if(points.length!==m.points.length)return;for(const point of points)for(let i=0;i<2;i++)point[i]=Math.round(point[i]*1024)/1024;const strokes=previous.strokes||[];if(strokes.reduce((n,s)=>n+s.length,0)+points.length>3000){this.rules.broadcast({type:'living-error',playerId:id,requestId:m.requestId,message:'このキャンバスは描画上限です。新しいキャンバスを置いてください'});return;}next.strokes=[...strokes,points];next.paintRequests=[...(previous.paintRequests||[]),{id:m.requestId,rev:next.rev}].slice(-128);changed=true;}
  if(kind==='chess'&&m.action==='chess'){if(m.rev!==previous.rev)return;const chess=chessMove(previous.chess||chessStart(),m.from,m.to);if(chess){next.chess=chess;changed=true;}}
  if(kind==='tv'&&['power','channel'].includes(m.action)){next.enabled=m.action==='power'?!previous.enabled:!!previous.enabled;next.channel=((previous.channel||0)+(m.action==='channel'?Math.sign(m.step||1):0)+8)%8;changed=true;}
  if(kind==='clothes'&&m.action==='use'){
   const carry=this.hand(entry).payload,count=previous.count??3;
   if(carry&&carry.type!=='clothes'){this.error(entry,'手に持っている物を先に置いてください');return;}
   if(!carry&&count<1){this.error(entry,'かごに洗濯物がありません');return;}
   next.count=count+(carry?1:-1);next.stage=carry?.stage||previous.stage||'dirty';
   await this.transfer(entry,next,carry?null:{type:'clothes',stage:previous.stage||'dirty',color:previous.color||'#ddd7c6'});return;
  }
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
   if(m.action==='open'){next.open=!previous.open;changed=true;}
   if(m.action==='load'){next.endAt=next.startAt=0;next.loaded=false;changed=true;}
   if(m.action==='start'){if(previous.endAt>now)return;next.loaded=true;next.open=false;next.startAt=now;next.endAt=now+(def.design==='shower'?60000:20000);changed=true;}
  }
  if(kind==='microwave'){
   if(previous.endAt>now&&m.action!=='start'){this.error(entry,'加熱終了までお待ちください');return;}
   if(m.action==='open'){next.open=!previous.open;changed=true;}
   if(m.action==='load'&&previous.open){next.loaded=!previous.loaded;next.endAt=next.startAt=0;changed=true;}
   if(m.action==='start'&&previous.loaded&&!(previous.endAt>now)){next.open=false;next.startAt=now;next.endAt=now+15000;changed=true;}
  }
  if(kind==='trash'){
   if(m.action==='open'){next.open=!previous.open;changed=true;}
   if(m.action==='load'&&previous.open){next.waste=(previous.waste||0)+1;next.loaded=true;const carry=this.hand(entry).payload;if(carry){await this.transfer(entry,next,null);return;}changed=true;}
   if(m.action==='empty'){next.loaded=false;next.waste=0;next.open=true;changed=true;}
  }
  if(['sewing','basketball','globe','horse','toy','object'].includes(kind)&&m.action==='use'){next.uses=(previous.uses||0)+1;next.phase=(previous.phase||0)+1;if(kind==='basketball'){next.scored=(previous.scored||0)+(Number.isFinite(m.power)&&Math.abs(m.power-.75)<.18?1:0);}if(kind==='sewing')next.stitches=(previous.stitches||0)+12;changed=true;}
  if(changed){await this.persist(next,kind==='paint'?next.strokes.at(-1):null,{requestId:m.requestId,playerId:id});if(kind==='paint')entry.send?.({type:'living-paint-ack',playerId:id,requestId:m.requestId,rev:next.rev});if(kind==='object'){const action=furnitureAction(def);this.rules.broadcast({type:'furniture-event',index:h.index,itemId:item.id,kind:action.kind,enabled:true,serial:next.rev,playerId:id});}this.rules.broadcast({type:'living-motion',index:h.index,itemId:item.id,playerId:id,kind,at:now});}
 }
}
