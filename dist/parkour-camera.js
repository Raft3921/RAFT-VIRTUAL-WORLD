import {isParkourFlip} from './player-parkour.js?v=20261017-turn130';
import {parkourPose} from './parkour-pose.js?v=20261017-turn130';
// Keep unwrapped full-turn angles: quaternion shortest-path interpolation would
// turn a 360/720 degree action into a partial turn or no turn at all.
export function createParkourCamera(){
 let spin=null,seen=null,teleport=null;
 return {reset(){spin=null;seen=null;teleport=null;},update(state,dt){
  const epoch=state.gunTeleportSerial||0;if(teleport!==epoch){spin=null;seen=null;teleport=epoch;}
  const key=(state.parkourKind||'')+':'+(state.parkourSerial||0);
  if(isParkourFlip(state.parkourKind)&&key!==seen){seen=key;spin={kind:state.parkourKind,age:state.parkourAge||0,duration:Math.max(.01,state.parkourDuration||.64),side:state.wallSide||1};}
  else if(spin){spin.age=Math.min(spin.duration,Math.max(spin.age+Math.max(0,dt),key===seen?state.parkourAge||0:0));}
  if(spin){const pose=parkourPose({parkourKind:spin.kind,parkourAge:spin.age,parkourDuration:spin.duration,wallSide:spin.side});if(spin.age>=spin.duration)spin=null;return pose;}
  return parkourPose({...state,yaw:0});
 }};
}
