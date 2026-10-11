import {FURNITURE_BY_ID,furniturePose,ROOM,houseDescriptor} from './housing-data.js?v=20261011-free-cook76';
export const isIsland=f=>f?.id==='island'||f?.design==='island';
export function kitchenRole(f){if(!f)return null;if(f.family==='kitchen')return 'counter';if(f.family==='sink')return 'sink';if(f.family==='fridge'||f.id==='mini-fridge')return 'fridge';if(['stove','oven'].includes(f.family))return 'stove';if(f.id==='cutting-board')return 'board';if(['knife-block','cooking-knife','dish-rack','pot-rack-wall'].includes(f.id))return 'storage';if(['microwave','rice-cooker','kettle','blender','stand-mixer','toaster','dishwasher'].includes(f.id))return 'appliance';return null;}
export const kitchenKey=stations=>JSON.stringify(stations.map(s=>s.item).sort((a,b)=>a.id.localeCompare(b.id)));
export function recognizeKitchens(index,layout){
 const home=houseDescriptor(index);if(!home||!layout)return {zones:[],reason:'設備を置いてキッチンを作れます'};
 const all=layout.items.map(item=>({item,def:FURNITURE_BY_ID.get(item.t),...furniturePose(item)})),stations=all.filter(s=>kitchenRole(s.def)).map(s=>({...s,role:kitchenRole(s.def)}));
 const counters=stations.filter(s=>s.role==='counter'&&!isIsland(s.def)),islands=stations.filter(s=>isIsland(s.def));
 const missing=['sink','fridge','stove'].filter(role=>!stations.some(s=>s.role===role)).map(role=>({sink:'シンク',fridge:'冷蔵庫',stove:'コンロ／オーブン'}[role]));
 if(counters.length<3)missing.push('カウンター3台以上（現在'+counters.length+'台）');if(!islands.length)missing.push('アイランドキッチン1台以上');
 if(missing.length)return {zones:[],reason:'キッチンに必要：'+missing.join('・')};
 const walkable=(x,z)=>Math.abs(x)<ROOM.x-.4&&Math.abs(z)<ROOM.z-.4&&!all.some(s=>{if(s.def.solid===false||['mirror','wall-mirror'].includes(s.def.family)||s.y>2.2||s.centerY-s.h/2>2.2||s.h<.06)return false;const dx=x-s.x,dz=z-s.z,c=Math.cos(s.yaw),n=Math.sin(s.yaw);return Math.abs(c*dx-n*dz)<s.w*.44+.31&&Math.abs(n*dx+c*dz)<s.d*.44+.31;});
 const step=.25,key=(x,z)=>Math.round(x/step)+','+Math.round(z/step),zones=[],remaining=new Set(stations);
 while(remaining.size){
  const seed=remaining.values().next().value,cluster=[seed];remaining.delete(seed);
  for(let i=0;i<cluster.length;i++)for(const s of remaining)if(Math.hypot(s.x-cluster[i].x,s.z-cluster[i].z)<=5){cluster.push(s);remaining.delete(s);}
  cluster.sort((a,b)=>a.item.id.localeCompare(b.item.id));
  if(cluster.filter(s=>s.role==='counter'&&!isIsland(s.def)).length<3||!cluster.some(s=>isIsland(s.def))||['sink','fridge','stove'].some(role=>!cluster.some(s=>s.role===role)))continue;
  const extent=(s,axis)=>Math.abs(Math.cos(s.yaw))*s[axis==='x'?'w':'d']/2+Math.abs(Math.sin(s.yaw))*s[axis==='x'?'d':'w']/2;
  const minX=Math.max(-ROOM.x+.4,Math.min(...cluster.map(s=>s.x-extent(s,'x')))-1.35),maxX=Math.min(ROOM.x-.4,Math.max(...cluster.map(s=>s.x+extent(s,'x')))+1.35),minZ=Math.max(-ROOM.z+.4,Math.min(...cluster.map(s=>s.z-extent(s,'z')))-1.35),maxZ=Math.min(ROOM.z-.4,Math.max(...cluster.map(s=>s.z+extent(s,'z')))+1.35);
  const accesses=cluster.filter(s=>['counter','sink','fridge','stove'].includes(s.role)).map(s=>{const candidates=[],sides=s.role==='counter'?[1,-1]:[1];for(const side of sides)for(const clearance of [.38,.5,.65,.85])for(const offset of [0,-.3,.3]){const dx=offset*s.w,dz=side*(s.d*.44+clearance);candidates.push({x:s.x+Math.cos(s.yaw)*dx+Math.sin(s.yaw)*dz,z:s.z-Math.sin(s.yaw)*dx+Math.cos(s.yaw)*dz});}return candidates.filter(p=>walkable(Math.round(p.x/step)*step,Math.round(p.z/step)*step));});
  if(accesses.some(list=>!list.length))continue;
  let cells=null,start=null;
  for(const candidate of accesses[0]){
   const reached=new Set(),queue=[[Math.round(candidate.x/step),Math.round(candidate.z/step)]];
   for(let i=0;i<queue.length&&i<16000;i++){const [gx,gz]=queue[i],x=gx*step,z=gz*step,k=gx+','+gz;if(reached.has(k)||x<minX||x>maxX||z<minZ||z>maxZ||!walkable(x,z))continue;reached.add(k);queue.push([gx+1,gz],[gx-1,gz],[gx,gz+1],[gx,gz-1]);}
   if(accesses.every(list=>list.some(p=>reached.has(key(p.x,p.z))))){cells=reached;start=candidate;break;}
  }
  if(!cells)continue;
  const bounds={minX:Math.min(home.x+minX*home.front,home.x+maxX*home.front),maxX:Math.max(home.x+minX*home.front,home.x+maxX*home.front),minZ:Math.min(home.z+minZ*home.front,home.z+maxZ*home.front),maxZ:Math.max(home.z+minZ*home.front,home.z+maxZ*home.front)};
  const worktops=cluster.filter(s=>s.role==='counter'||s.role==='board'),primary=worktops.find(s=>s.role==='counter'&&!isIsland(s.def));
  zones.push({index:home.index,id:primary.item.id,key:kitchenKey(cluster),rev:layout.rev,home,stations:cluster,worktops,bounds,safeStarts:[...cells].map(cell=>{const [gx,gz]=cell.split(',').map(Number);return {x:home.x+gx*step*home.front,y:ROOM.floor+.025,z:home.z+gz*step*home.front};}),start:{x:home.x+start.x*home.front,y:ROOM.floor+.025,z:home.z+start.z*home.front},allowed:p=>p.x>=bounds.minX&&p.x<=bounds.maxX&&p.z>=bounds.minZ&&p.z<=bounds.maxZ&&Math.abs(p.y-ROOM.floor)<1.2});
 }
 return {zones,reason:zones.length?'キッチン認定済み · カウンター3台以上＋アイランド1台以上':'設備をつながる距離にまとめ、カウンターの間と設備の正面に通路を空けてください'};
}
