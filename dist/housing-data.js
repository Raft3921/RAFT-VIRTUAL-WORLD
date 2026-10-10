import {EXPANDED_FURNITURE} from './furniture-catalogue.js?v=20261010-plaza-map67';
export const GRID=.25,HEIGHT_GRID=.05,MAX_FURNITURE=64,ROOM={x:7.4,z:6.9,height:5.25,floor:.245};
export const OWNER_SKINS=[3,5,6,2,4,1,0,7];
export const HOUSE_COLORS=['#d84a42','#52a96d','#48b8d4','#e88a38','#87929a','#9a70c5','#e4c84d','#9a6748'];
export const FURNITURE_COLORS=[...HOUSE_COLORS,'#f4eee2','#354353','#bd9166','#8fbac9'];
export const HOUSES=OWNER_SKINS.map((owner,index)=>({index,owner,x:-39+(index%4)*26,z:index<4?45:80,front:index<4?1:-1,color:HOUSE_COLORS[index]}));
HOUSES.push(...[-20,20].map((x,i)=>({index:8+i,owner:8,x,z:-77,front:1,color:'#f4eee2',guest:true})));
// All member mirrors share the same residential world.
export function mirrorRealmKey(){return 'm|0|shared';}
export const MIRROR_REALMS=new Map([[mirrorRealmKey(),0]]);
export function mirrorRealm(key,realms=MIRROR_REALMS){
  const match=typeof key==='string'&&/^m\|([0-7])\|([-a-z0-9_]{1,32})$/.exec(key);if(!match)return null;
  const slot=realms.get(key);if(slot===undefined)return null;
  return {key,source:Number(match[1]),id:match[2],slot,x:2000+(slot%32)*180,z:2000+Math.floor(slot/32)*160};
}
export function registerMirrorRealm(key,slot=MIRROR_REALMS.size){
  if(key!==mirrorRealmKey())return null;slot=0;
  if(!MIRROR_REALMS.has(key)){if([...MIRROR_REALMS.values()].includes(slot))return null;MIRROR_REALMS.set(key,slot);}
  const realm=mirrorRealm(key);if(!realm)return null;
  for(const source of HOUSES.slice(0,8)){const index=`${key}|${source.index}`;HOUSES[index]??={...source,index,sourceIndex:source.index,realm:key,x:realm.x+source.x,z:realm.z-source.z,front:-source.front};}
  return realm;
}
export function houseDescriptor(index,realms=MIRROR_REALMS){
  if((typeof index==='number'&&Number.isInteger(index)||typeof index==='string'&&/^[0-9]$/.test(index))&&Number(index)>=0&&Number(index)<10)return HOUSES[Number(index)];
  if(realms===MIRROR_REALMS&&Object.hasOwn(HOUSES,index)&&HOUSES[index]?.realm)return HOUSES[index];
  if(typeof index==='string'){const end=index.lastIndexOf('|'),key=index.slice(0,end),target=index.slice(end+1);const realm=mirrorRealm(key,realms);if(/^[0-7]$/.test(target)&&realm){const source=HOUSES[Number(target)];const home={...source,index,sourceIndex:source.index,realm:key,x:realm.x+source.x,z:realm.z-source.z,front:-source.front};if(realms===MIRROR_REALMS)HOUSES[index]=home;return home;}}
  return null;
}
export function replaceMirrorRealms(records){MIRROR_REALMS.clear();MIRROR_REALMS.set(mirrorRealmKey(),0);for(const key of Object.keys(HOUSES))if(HOUSES[key].realm)delete HOUSES[key];for(const [key,slot]of Object.entries(records||{}).sort((a,b)=>a[1]-b[1]))registerMirrorRealm(key,slot);}
export const allHouses=()=>Object.values(HOUSES);
export function mirrorHouseKey(realm,index){return `${realm}|${index}`;}
export const memberColor=skin=>HOUSES.slice(0,8).find(h=>h.owner===skin)?.color||'#eeeeee';
const item=(id,name,family,w,h,d,mount='floor',extra={})=>({id,name,family,w,h,d,mount,...extra});
export const FURNITURE=[
  item('chair','木の椅子','chair',.8,1.2,.8,'floor',{seat:.57}),item('armchair','アームチェア','sofa',1.1,1.1,1,'floor',{seat:.52}),item('sofa','2人掛けソファ','sofa',2.4,1.2,1.1,'floor',{seat:.56}),item('long-sofa','ワイドソファ','sofa',3.2,1.2,1.1,'floor',{seat:.56}),
  item('stool','丸いスツール','stool',.65,.65,.65,'floor',{seat:.65}),item('bench','ベンチ','bench',2,.8,.75,'floor',{seat:.8}),
  item('table','ダイニングテーブル','table',2.4,1.05,1.3),item('low-table','ローテーブル','table',1.6,.55,1),item('side-table','サイドテーブル','table',.7,.7,.7),item('desk','ワークデスク','desk',1.8,1.05,.9),
  item('single-bed','シングルベッド','bed',1.5,1,3),item('double-bed','ダブルベッド','bed',2.3,1,3),item('canopy-bed','天蓋付きベッド','canopy',2.3,2.8,3),
  item('bookshelf','本棚','bookshelf',1.6,2.3,.55),item('wardrobe','クローゼット','wardrobe',1.6,2.4,.75),item('dresser','チェスト','dresser',1.5,1.2,.65),item('cabinet','ガラスキャビネット','cabinet',1.4,2,.65),item('crate','木箱','crate',.8,.8,.8),
  item('kitchen','キッチンカウンター','kitchen',2.4,1.05,.85),item('island','アイランドキッチン','kitchen',2,1.05,1.1),item('sink','流し台','sink',1.3,1.05,.8),item('fridge','冷蔵庫','fridge',.9,2.1,.8),item('oven','オーブン','oven',.9,1,.8),
  item('tv-stand','テレビ台','tv',1.8,1.6,.55),item('computer','パソコンデスク','computer',1.8,1.7,.85),item('piano','ピアノ','piano',1.7,1.35,.8),item('record-player','レコード台','record',.9,1.1,.7),
  item('plant','観葉植物','plant',.7,1.3,.7),item('tall-plant','大きな観葉植物','plant',1.1,2.3,1.1),item('bonsai','盆栽の飾り台','bonsai',1.1,1.1,.8),item('aquarium','アクアリウム','aquarium',1.5,1.4,.7),
  item('floor-lamp','フロアライト','lamp',.7,2,.7),item('coat-stand','コート掛け','coat',.7,1.9,.7),item('mirror','姿見','mirror',.9,2,.4),item('pet-bed','ペットベッド','pet',1,.3,.8),
  item('rug','ラグ','rug',2.4,.025,1.7,'floor',{solid:false}),item('large-rug','大きなカーペット','rug',4,.025,3,'floor',{solid:false}),item('runner','細長いカーペット','rug',1.2,.025,3.6,'floor',{solid:false}),
  item('painting','額縁アート','frame',1.4,1,.09,'wall'),item('poster','ポスター','poster',.8,1.2,.035,'wall'),item('wall-mirror','壁掛けミラー','wall-mirror',.9,1.3,.08,'wall'),item('clock','壁掛け時計','clock',.65,.65,.14,'wall'),
  item('wall-shelf','壁掛け棚','wall-shelf',1.5,.6,.42,'wall'),item('wall-cabinet','吊り戸棚','wall-cabinet',1.3,.85,.48,'wall'),item('pegboard','ツールボード','pegboard',1.4,1,.14,'wall'),item('sconce','ウォールライト','sconce',.4,.55,.28,'wall'),item('aircon','エアコン','aircon',1.3,.4,.28,'wall'),
  item('pendant','ペンダントライト','pendant',.8,1.1,.8,'ceiling'),item('chandelier','シャンデリア','chandelier',1.6,1.2,1.6,'ceiling'),item('ceiling-fan','シーリングファン','fan',1.8,.55,1.8,'ceiling'),item('ceiling-light','シーリングライト','ceiling-light',1,.18,1,'ceiling'),item('light-bar','吊り下げバーライト','light-bar',1.8,.7,.35,'ceiling'),
  item('wall-vent','換気グリル','vent',.9,.65,.18,'wall'),item('wall-planter','壁掛けプランター','wall-planter',1.1,.9,.5,'wall'),item('curtain','カーテン','curtain',2,1.8,.3,'wall'),item('wall-speaker','壁掛けスピーカー','wall-speaker',.45,.7,.3,'wall'),item('wide-art','ワイドアート','frame',2.2,.9,.1,'wall'),item('wall-bookshelf','ウォールブックシェルフ','wall-shelf',2.2,.7,.45,'wall'),
  item('hanging-plant','吊り下げグリーン','hanging-plant',.85,1.2,.85,'ceiling'),item('mobile','カラフルモビール','mobile',1.4,1,1.4,'ceiling'),item('projector','天吊りプロジェクター','projector',.65,.65,.65,'ceiling'),item('double-pendant','ワイドペンダント','light-bar',2.3,1,.5,'ceiling'),
  ...EXPANDED_FURNITURE,
];
export const FURNITURE_BY_ID=new Map(FURNITURE.map(f=>[f.id,f]));
export function furnitureDefinition(value){const f=FURNITURE_BY_ID.get(value.t);return value.v===1&&['bed','canopy'].includes(f?.family)?{...f,w:f.id==='single-bed'?1.3:f.w,d:f.family==='canopy'?2.3:2.2}:f;}
export const FINISHES={
  floor:[['white','ホワイト','#f4eee2'],['wood','板張り','#bd9166'],['light-wood','明るい木','#dfc69e'],['dark-wood','濃い木','#775842'],['tile','タイル','#e1e6df'],['checker','チェック','#b1c6c4'],['carpet','カーペット','#92b4b2']],
  wallpaper:[['white','ホワイト','#f4eee2'],['mint','ミント','#b2d6c0'],['pink','さくら','#e1b8c7'],['blue','ブルー','#a7c9df'],['stripe','ストライプ','#d5d0bc'],['brick','レンガ','#b9826a'],['night','ナイト','#46546a']],
  ceiling:[['white','ホワイト','#f4eee2'],['wood','ウッド','#d8bd96'],['slate','グレー','#919ca2'],['blue','空色','#aecedd']],
};
export const emptyHouse=()=>({rev:0,items:[],finish:{floor:'wood',wallpaper:'white',ceiling:'white'}});
const snap=v=>Number.isInteger(v)&&Math.abs(v)<=64;
export function cleanFurniture(value){
  const def=FURNITURE_BY_ID.get(value?.t);if(!def||typeof value.id!=='string'||!/^[-a-z0-9_]{1,32}$/.test(value.id)||!snap(value.x)||!snap(value.z))return null;
  const r=Number(value.r),c=Number(value.c),y=Number(value.y||0),wall=['back','front','left','right'].includes(value.wall)?value.wall:'back';
  if(!Number.isInteger(r)||r<0||r>=(def.mount==='wall'?4:8)||!Number.isInteger(c)||c<0||c>=FURNITURE_COLORS.length||!snap(y))return null;
  return {...(value.linkedMirror===true?{linkedMirror:true}:{}),id:value.id,t:def.id,x:value.x,z:value.z,y:def.mount==='wall'||def.allowHeight?y:0,r,c,...(['bed','canopy'].includes(def.family)?{v:value.v===2?2:1}:{}),...(def.mount==='wall'?{wall}:{}),...(def.seat&&typeof value.pair==='string'&&/^[-a-z0-9_]{1,32}$/.test(value.pair)?{pair:value.pair}:{})};
}
export function furniturePose(item){
  const f=furnitureDefinition(item);let x=item.x*GRID,z=item.z*GRID,y=0,yaw=item.r*Math.PI/4,roll=0,w=f.w,h=f.h,d=f.d;
  if(f.mount==='floor'&&f.allowHeight)y=(item.y||0)*HEIGHT_GRID;
  if(f.mount==='ceiling')y=ROOM.height;
  if(f.mount==='wall'){
    roll=item.r*Math.PI/2;y=item.y*GRID;yaw={back:0,front:Math.PI,left:Math.PI/2,right:-Math.PI/2}[item.wall];
    if(item.wall==='back')z=-ROOM.z+d/2;if(item.wall==='front')z=ROOM.z-d/2;if(item.wall==='left')x=-ROOM.x+d/2;if(item.wall==='right')x=ROOM.x-d/2;
    if(item.r%2)[w,h]=[h,w];
  }
  return {x,y,z,yaw,roll,w,h,d,centerY:f.mount==='floor'?y+h/2:f.mount==='ceiling'?ROOM.height-h/2:y};
}
function intersects(a,b){
  if(Math.abs(a.centerY-b.centerY)>=(a.h+b.h)/2-.015)return false;
  const dx=b.x-a.x,dz=b.z-a.z;
  for(const angle of [a.yaw,a.yaw+Math.PI/2,b.yaw,b.yaw+Math.PI/2]){
    const nx=Math.cos(angle),nz=Math.sin(angle),extent=o=>Math.abs(nx*Math.cos(o.yaw)-nz*Math.sin(o.yaw))*o.w/2+Math.abs(nx*Math.sin(o.yaw)+nz*Math.cos(o.yaw))*o.d/2;
    if(Math.abs(dx*nx+dz*nz)>=extent(a)+extent(b)-.015)return false;
  }return true;
}
export function placementError(item,items){
  const f=FURNITURE_BY_ID.get(item.t),p=furniturePose(item),ex=Math.abs(Math.cos(p.yaw))*p.w/2+Math.abs(Math.sin(p.yaw))*p.d/2,ez=Math.abs(Math.sin(p.yaw))*p.w/2+Math.abs(Math.cos(p.yaw))*p.d/2;
  if(Math.abs(p.x)+ex>ROOM.x+.002||Math.abs(p.z)+ez>ROOM.z+.002||p.centerY-p.h/2<-.002||p.centerY+p.h/2>ROOM.height+.002)return '部屋の外には配置できません';
  if(f.mount==='floor'&&f.solid!==false&&p.z+ez>4.8&&Math.abs(p.x)<2.55+ex)return '玄関の通路を空けてください';
  if(f.mount==='wall'&&item.wall==='front'&&Math.abs(p.x)-ex<2.3&&p.centerY-p.h/2<3.81)return '玄関の開口部には設置できません';
  for(const other of items){if(other.id===item.id)continue;const g=FURNITURE_BY_ID.get(other.t),q=furniturePose(other);if(f.solid===false||g.solid===false){if(f.solid!==g.solid)continue;}
    // Small tabletop objects may rest on the rendered top rather than the
    // deliberately conservative full-height placement envelope of a desk.
    if(f.allowHeight&&['table','desk','computer'].includes(g.family)&&p.y>=q.y+g.h*(g.family==='computer'?.555:.88)-.026)continue;
    if(intersects(p,q))return 'ほかの家具と重なっています';}
  return '';
}
// Return passages belong to the realm, so furniture must keep their landing
// and approach clear even though the passages are not editable furniture.
export function mirrorPassageError(layout,source){
  const portals=(source?.items||[]).filter(item=>['mirror','wall-mirror'].includes(FURNITURE_BY_ID.get(item.t)?.family)).map(item=>{const p=furniturePose(item),yaw=-p.yaw;return {x:-p.x+Math.sin(yaw)*.65,z:p.z+Math.cos(yaw)*.65,centerY:1.5,w:Math.max(1.4,p.w),h:3,d:1.6,yaw};});
  if(!portals.length)portals.push({x:0,z:-ROOM.z+.8,centerY:1.5,w:1.8,h:3,d:1.6,yaw:0});
  for(const item of layout.items){if(['mirror','wall-mirror'].includes(FURNITURE_BY_ID.get(item.t)?.family)||FURNITURE_BY_ID.get(item.t)?.solid===false)continue;const pose=furniturePose(item);if(portals.some(portal=>intersects(pose,portal)))return '現世に戻る鏡の前を空けてください';}
  return '';
}
// Pair only at the closest legal grid step: one more step toward the table
// must overlap that table, not merely another obstacle. Distant chairs retain
// their independent position and rotation.
export function pairFurniture(item,items){
  const f=FURNITURE_BY_ID.get(item.t);if(!f?.seat||f.mount!=='floor')return item;
  const next={...item};delete next.pair;
  let table=null,best=Infinity;
  for(const other of items){
    const g=FURNITURE_BY_ID.get(other.t);if(other.id===item.id||!['table','desk','computer'].includes(g?.family))continue;
    const distance=Math.hypot(other.x-item.x,other.z-item.z)*GRID;if(distance<=.01||distance>=best||distance>(Math.hypot(f.w,f.d)+Math.hypot(g.w,g.d))/2+Math.SQRT2*GRID)continue;
    const r=((Math.round(Math.atan2(other.x-item.x,other.z-item.z)/(Math.PI/4))%8)+8)%8,aligned={...next,r};
    if(placementError(aligned,items))continue;
    const inward={...aligned,x:aligned.x+Math.round(Math.sin(r*Math.PI/4)),z:aligned.z+Math.round(Math.cos(r*Math.PI/4))};
    if(!intersects(furniturePose(inward),furniturePose(other)))continue;
    best=distance;table=other;next.r=r;
  }
  if(table)next.pair=table.id;
  return next;
}
export function cleanHouse(value){
  const house=emptyHouse(),rev=Number(value?.rev);house.rev=Number.isSafeInteger(rev)&&rev>=0?rev:0;
  for(const key of Object.keys(FINISHES))if(FINISHES[key].some(f=>f[0]===value?.finish?.[key]))house.finish[key]=value.finish[key];
  for(const raw of (Array.isArray(value?.items)?value.items:[]).slice(0,MAX_FURNITURE*2)){const item=cleanFurniture(raw);if(item&&!house.items.some(i=>i.id===item.id)&&(item.linkedMirror&&isMirror(item)||house.items.filter(i=>!i.linkedMirror).length<MAX_FURNITURE&&!placementError(item,house.items)))house.items.push(item);}
  // Expand old beds without deleting saved furniture. Prefer the same position,
  // otherwise the nearest free grid cell; packed rooms retain the legacy bed.
  for(let i=0;i<house.items.length;i++){const old=house.items[i];if(old.v!==1)continue;let replacement=null;for(let radius=0;radius<=12&&!replacement;radius++)for(let dx=-radius;dx<=radius&&!replacement;dx++)for(let dz=-radius;dz<=radius;dz++){if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;const candidate={...old,v:2,x:old.x+dx,z:old.z+dz};if(snap(candidate.x)&&snap(candidate.z)&&!placementError(candidate,house.items)){replacement=candidate;break;}}if(replacement)house.items[i]=replacement;}
  // Migrate existing chairs without moving or deleting any other furniture.
  // Never rotate a wide seat through a wall or another saved object.
  for(let i=0;i<house.items.length;i++){const paired=pairFurniture(house.items[i],house.items);if(!placementError(paired,house.items))house.items[i]=paired;else{const unpaired={...house.items[i]};delete unpaired.pair;house.items[i]=unpaired;}}
  return house;
}
export function applyHouseOperation(house,op){
  const next={rev:house.rev+1,items:house.items.map(i=>({...i})),finish:{...house.finish}};
  if(op.action==='finish'){if(!FINISHES[op.surface]?.some(f=>f[0]===op.value))return {error:'内装設定が不正です'};next.finish[op.surface]=op.value;}
  else if(op.action==='delete'){const index=next.items.findIndex(i=>i.id===op.id);if(index<0)return {error:'家具が見つかりません'};next.items.splice(index,1);}
  else if(op.action==='add'||op.action==='move'){
    const raw=cleanFurniture(op.item);if(!raw)return {error:'家具設定が不正です'};const item=pairFurniture(raw,next.items),index=next.items.findIndex(i=>i.id===item.id);
    if(op.action==='add'&&(index>=0||next.items.filter(i=>!i.linkedMirror).length>=MAX_FURNITURE))return {error:'家具は64個まで配置できます'};
    if(op.action==='move'&&(index<0||next.items[index].t!==item.t))return {error:'家具が見つかりません'};
    const error=placementError(item,next.items);if(error)return {error};if(index<0)next.items.push(item);else next.items[index]=item;
  }else return {error:'編集操作が不正です'};
  return {house:cleanHouse(next)};
}
export function findPlacement(def,items,color=10,wall='back'){
  if(def.allowHeight)for(const table of items){const g=FURNITURE_BY_ID.get(table.t);if(!['table','desk','computer'].includes(g.family))continue;const p=furniturePose(table),candidate={id:'f'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),t:def.id,x:table.x,z:table.z,y:Math.round((p.y+g.h*(g.family==='computer'?.555:.88))/HEIGHT_GRID),r:table.r,c:color};if(!placementError(candidate,items))return candidate;}
  for(let radius=0;radius<28;radius+=2)for(let x=-radius;x<=radius;x+=2)for(let z=-radius;z<=radius;z+=2){if(radius&&Math.max(Math.abs(x),Math.abs(z))!==radius)continue;const candidate=pairFurniture({id:'f'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),t:def.id,x,z,y:def.mount==='wall'?9:0,r:0,c:color,...(['bed','canopy'].includes(def.family)?{v:2}:{}),...(def.mount==='wall'?{wall}:{})},items);if(!placementError(candidate,items))return candidate;}
  return null;
}

export const isMirror=item=>['mirror','wall-mirror'].includes(FURNITURE_BY_ID.get(item?.t)?.family);
export function reflectedMirror(item){return {...item,linkedMirror:true,x:-item.x,r:(item.wall?(4-item.r)%4:(8-item.r)%8),...(item.wall?{wall:({left:'right',right:'left'})[item.wall]||item.wall}:{})};}
