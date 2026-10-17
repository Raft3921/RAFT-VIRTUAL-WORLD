// Minecraft and the supplied JEM both have 4x4 px soles. JEM legs have
// a shorter stride; imprint dimensions always describe the actual model.
export const FOOTPRINT_LIFETIME=60000,FOOTPRINT_LIMIT=4096;
export function footProfile(skin){return {width:.25,length:.25,spacing:.25,stride:skin===7?.30:.675};}
export class FootprintStore{
 constructor(rules){this.rules=rules;this.marks=[];this.tracks=new Map();this.sequence=0;}
 snapshot(now=Date.now()){this.marks=this.marks.filter(m=>now-m.born<FOOTPRINT_LIFETIME);return this.marks;}
 remove(id){this.tracks.delete(id);}
 clearArena(){const removed=this.marks.filter(m=>!m.realm&&m.x>120&&m.x<244&&m.z>-140&&m.z<-44).map(m=>m.id);if(!removed.length)return;const ids=new Set(removed);this.marks=this.marks.filter(m=>!ids.has(m.id));this.tracks.clear();this.rules.broadcast({type:'footprints-clear',ids:removed});}
 step(p,now=Date.now()){
  const previous=this.tracks.get(p.id),track={x:p.x,y:p.y,z:p.z,realm:p.mirrorRealm||null,teleport:p.gunTeleportSerial,at:now,distance:previous?.distance||0,side:previous?.side||0,last:previous?.last||0};this.tracks.set(p.id,track);
  const canWalk=p.grounded!==false&&!p.flight&&!p.ragdoll&&!p.seated&&!p.sleeping&&!p.prone&&!p.sliding&&!p.mantling&&!p.gunEliminated;
  const distance=previous?Math.hypot(p.x-previous.x,p.z-previous.z):0;
  if(!previous||!canWalk||previous.realm!==track.realm||previous.teleport!==track.teleport||now-previous.at>1000||distance>2||Math.abs(p.y-previous.y)>.4){track.distance=0;return;}
  if(distance<.001)return;
  const profile=footProfile(p.skin);track.distance+=distance;
  if(track.distance<profile.stride||now-track.last<150)return;
  track.distance%=profile.stride;track.last=now;track.side=1-track.side;
  const offset=(track.side?1:-1)*profile.spacing*.5,yaw=p.yaw||0;
  const point={x:p.x+Math.cos(yaw)*offset,y:p.y,z:p.z-Math.sin(yaw)*offset};
  const floor=this.rules.movementWorld?.floorAt(point,p.y+.20);if(floor&&Math.abs(floor.y-p.y)>.24)return;
  const mark={id:++this.sequence,playerId:p.id,skin:p.skin,side:track.side,x:point.x,y:floor?.y??p.y,z:point.z,yaw,born:now,realm:track.realm};
  if(floor?.body?.ramp){const body=floor.body,slope=(body.ramp.front-body.ramp.back)/body.d,rotation=body.rotation||0;mark.nx=-Math.sin(rotation)*slope;mark.nz=-Math.cos(rotation)*slope;}
  this.snapshot(now);this.marks.push(mark);if(this.marks.length>FOOTPRINT_LIMIT)this.marks.shift();this.rules.broadcast({type:'footprints',marks:[mark]});
 }
}
