export const PIANO_MELODY=[0,4,0,-5,4,7,4,0,4,7,4,0,4,7,0];
export function cleanCycle(value={},now=Date.now()){
  value=value&&typeof value==='object'?value:{};
  const duration=Number(value.duration),epoch=Number(value.epoch),phase=Number(value.phase);
  return {enabled:value.enabled!==false,duration:Number.isFinite(duration)?Math.max(60,Math.min(7200,duration)):600,epoch:Number.isFinite(epoch)?epoch:now,phase:Number.isFinite(phase)?((phase%1)+1)%1:.5};
}
export function dayPhase(cycle,now){if(!cycle.enabled)return .5;return ((cycle.phase+(now-cycle.epoch)/(cycle.duration*1000))%1+1)%1;}
export function clockLabel(phase){const minutes=Math.floor(phase*1440)%1440;return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
