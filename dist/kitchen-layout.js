import {FURNITURE_BY_ID,furniturePose,ROOM,houseDescriptor} from './housing-data.js?v=20261011-free-cook72';
export function kitchenRole(f){if(!f)return null;if(f.family==='kitchen')return 'counter';if(f.family==='sink')return 'sink';if(f.family==='fridge'||f.id==='mini-fridge')return 'fridge';if(['stove','oven'].includes(f.family))return 'stove';return null;}
export function recognizeKitchens(index,layout){
  const home=houseDescriptor(index);if(!home||!layout)return {zones:[],reason:'設備を置いてキッチンを作れます'};
  const all=layout.items.map(item=>({item,def:FURNITURE_BY_ID.get(item.t),...furniturePose(item)})),stations=all.filter(s=>kitchenRole(s.def)).map(s=>({...s,role:kitchenRole(s.def)}));
  const missing=['counter','sink','fridge','stove'].filter(role=>!stations.some(s=>s.role===role)),labels={counter:'カウンター／アイランド',sink:'シンク',fridge:'冷蔵庫',stove:'コンロ／オーブン'};
  if(missing.length)return {zones:[],reason:'キッチンに必要：'+missing.map(r=>labels[r]).join('・')};
  const walkable=(x,z)=>Math.abs(x)<ROOM.x-.4&&Math.abs(z)<ROOM.z-.4&&!all.some(s=>{if(s.def.solid===false||['mirror','wall-mirror'].includes(s.def.family)||s.y>2.2||s.centerY-s.h/2>2.2||s.h<.06)return false;const dx=x-s.x,dz=z-s.z,c=Math.cos(s.yaw),n=Math.sin(s.yaw);return Math.abs(c*dx-n*dz)<s.w*.44+.33&&Math.abs(n*dx+c*dz)<s.d*.44+.33;});
  const step=.35,key=(x,z)=>Math.round(x/step)+','+Math.round(z/step),zones=[];
  for(const counter of stations.filter(s=>s.role==='counter')){
    const cluster=[counter,...['sink','fridge','stove'].map(role=>stations.filter(s=>s.role===role&&Math.hypot(s.x-counter.x,s.z-counter.z)<=5).sort((a,b)=>Math.hypot(a.x-counter.x,a.z-counter.z)-Math.hypot(b.x-counter.x,b.z-counter.z))[0])];if(cluster.some(s=>!s))continue;
    const accesses=cluster.map(s=>({x:s.x+Math.sin(s.yaw)*(s.d*.44+.65),z:s.z+Math.cos(s.yaw)*(s.d*.44+.65)}));if(accesses.some(p=>!walkable(p.x,p.z)))continue;
    const minX=Math.max(-ROOM.x+.4,Math.min(...cluster.map(s=>s.x-s.w/2))-1.4),maxX=Math.min(ROOM.x-.4,Math.max(...cluster.map(s=>s.x+s.w/2))+1.4),minZ=Math.max(-ROOM.z+.4,Math.min(...cluster.map(s=>s.z-s.d/2))-1.4),maxZ=Math.min(ROOM.z-.4,Math.max(...cluster.map(s=>s.z+s.d/2))+1.4);
    const start=accesses[0],queue=[[Math.round(start.x/step),Math.round(start.z/step)]],cells=new Set();
    for(let i=0;i<queue.length&&i<8000;i++){const [gx,gz]=queue[i],x=gx*step,z=gz*step,k=gx+','+gz;if(cells.has(k)||x<minX||x>maxX||z<minZ||z>maxZ||!walkable(x,z))continue;cells.add(k);queue.push([gx+1,gz],[gx-1,gz],[gx,gz+1],[gx,gz-1]);}
    if(!accesses.every(p=>cells.has(key(p.x,p.z))))continue;
    // The flood fill certifies access; it must not snap physical movement to
    // grid cells. Furniture/wall collision is handled by the world's mover.
    const bounds={minX:Math.min(home.x+minX*home.front,home.x+maxX*home.front),maxX:Math.max(home.x+minX*home.front,home.x+maxX*home.front),minZ:Math.min(home.z+minZ*home.front,home.z+maxZ*home.front),maxZ:Math.max(home.z+minZ*home.front,home.z+maxZ*home.front)};
    const safeStarts=[...cells].map(cell=>{const [gx,gz]=cell.split(',').map(Number);return {x:home.x+gx*step*home.front,y:ROOM.floor+.025,z:home.z+gz*step*home.front};});
    zones.push({index:home.index,id:counter.item.id,rev:layout.rev,home,stations:cluster,bounds,safeStarts,start:{x:home.x+start.x*home.front,y:ROOM.floor+.025,z:home.z+start.z*home.front},allowed:p=>p.x>=bounds.minX&&p.x<=bounds.maxX&&p.z>=bounds.minZ&&p.z<=bounds.maxZ&&Math.abs(p.y-ROOM.floor)<1.2});
  }
  return {zones,reason:zones.length?'キッチン認定済み · 近づくとクッキングを開始':'設備を5m以内にまとめ、各設備の正面と通路を空けてください'};
}
