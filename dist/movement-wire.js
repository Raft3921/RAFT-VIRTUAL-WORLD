// Ordered input rows keep retransmitted movement batches small. Positions are
// never encoded here: the server computes them, including all combat inertia.
export const MOVEMENT_BATCH=48,MOVEMENT_BACKLOG=360;
const bit=(input,key,value)=>input[key]===true?value:0;
export function encodeMovement(input){
 const s=input.shape||{},standing=input.standingShape||s;
 const flags=bit(input,'jump',1)|bit(input,'prone',2)|bit(input,'pump',4)|bit(input,'combat',8)|bit(input,'sprint',16)|bit(input,'aiming',32)|bit(input,'crouched',64)|bit(input,'proneIntent',128);
 return [input.seq,input.dt,input.vx,input.vz,flags,input.lookYaw||0,input.lookPitch||0,input.wishX||0,input.wishZ||0,s.width??.32,s.height??1.9,s.depth??.32,s.yaw||0,s.offset||0,standing.width??.32,standing.height??1.9,standing.depth??.32,input.launch||0];
}
export function decodeMovement(row,encoding){
 if(encoding!==1)return row&&typeof row==='object'&&!Array.isArray(row)?row:null;
 if(!Array.isArray(row)||row.length!==18||!row.every(Number.isFinite))return null;
 const [seq,dt,vx,vz,flags,lookYaw,lookPitch,wishX,wishZ,width,height,depth,yaw,offset,sw,sh,sd,launch]=row;
 if(!Number.isInteger(flags)||flags<0||flags>255)return null;
 return {seq,dt,vx,vz,lookYaw,lookPitch,wishX,wishZ,launch,jump:!!(flags&1),prone:!!(flags&2),pump:!!(flags&4),combat:!!(flags&8),sprint:!!(flags&16),aiming:!!(flags&32),crouched:!!(flags&64),proneIntent:!!(flags&128),shape:{width,height,depth,yaw,offset},standingShape:{width:sw,height:sh,depth:sd,yaw:lookYaw}};
}
// Preserve limits for other messages; a bounded input backlog has its own cap.
export function validRoomMessage(message,length){
 if(!message||typeof message!=='object'||Array.isArray(message))return false;
 if(message.type==='cooking-save'||message.type==='kitchen-edit')return length<=131072;
 return length<=(message.type==='state'?65536:8192);
}
