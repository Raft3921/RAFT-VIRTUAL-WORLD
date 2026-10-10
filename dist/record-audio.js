import {houseDescriptor,ROOM,furniturePose,FURNITURE_BY_ID} from './housing-data.js?v=20261010-cooking68';

// One lazily fetched music stream, even when several record machines are on.
export function createRecordAudio(getLayout){
  const audio=new Audio(new URL('./audio/afternoon.mp3',import.meta.url).href);audio.preload='none';audio.loop=true;
  const records=new Map();let current=null,wanted=false,blocked=false,priming=false,lastUpdate=0,clock=()=>Date.now();
  // Call on the actual record-strike gesture, not its delayed attack impact.
  // Safari needs a gesture before an asynchronously shared play event arrives.
  function prepare(){if(!audio.paused||priming)return;priming=true;audio.volume=0;audio.play().then(()=>{priming=false;blocked=false;if(!wanted)audio.pause();}).catch(()=>{priming=false;blocked=true;});}
  function start(){if(!wanted||!current)return;const duration=audio.duration;if(Number.isFinite(duration)&&duration>0){const elapsed=Math.max(0,(clock()-current.startedAt)/1000)%duration;if(Math.abs(audio.currentTime-elapsed)>1)try{audio.currentTime=elapsed;}catch{}}audio.play().then(()=>{blocked=false;}).catch(()=>{blocked=true;});}
  function unlock(){if(wanted&&audio.paused){blocked=false;start();}}
  for(const event of ['pointerdown','pointerup','keydown','keyup'])window.addEventListener(event,unlock,{passive:true});audio.addEventListener('loadedmetadata',()=>{if(wanted)start();});
  function receive(message){const key=message.index+':'+message.itemId;if(message.playing)records.set(key,{...message,key});else records.delete(key);if(current?.key===key&&!message.playing){wanted=false;audio.pause();current=null;}}
  function hydrate(states=[]){records.clear();for(const record of states)receive(record);if(current&&!records.has(current.key)){audio.pause();current=null;wanted=false;}}
  function update(time,listener,serverClock){if(serverClock)clock=serverClock;if(time-lastUpdate<.15)return;lastUpdate=time;let nearest=null,best=26;
    if(listener)for(const record of records.values()){const h=houseDescriptor(record.index),item=getLayout(record.index)?.items.find(i=>i.id===record.itemId&&FURNITURE_BY_ID.get(i.t)?.family==='record');if(!h||!item)continue;const p=furniturePose(item),distance=Math.hypot(listener.x-h.x-p.x*h.front,listener.y-ROOM.floor-.8,listener.z-h.z-p.z*h.front);if(distance<best){best=distance;nearest=record;}}
    wanted=!!nearest;if(!nearest){if(!priming)audio.pause();current=null;return;}const changed=current?.key!==nearest.key||current?.startedAt!==nearest.startedAt;current=nearest;audio.volume=.45*Math.pow(1-best/26,2);if(changed){blocked=false;start();}else if(audio.paused&&!blocked&&!priming)start();
  }
  function toggle(index,itemId){const key=index+':'+itemId;receive({index,itemId,playing:!records.has(key),startedAt:clock()});}
  return {receive,hydrate,update,toggle,prepare,isPlaying:(index,id)=>records.has(index+':'+id),clear(){records.clear();wanted=false;current=null;audio.pause();}};
}
