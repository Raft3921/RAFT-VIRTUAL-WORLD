import * as THREE from 'three';
import {HOUSES,mirrorRealm} from './housing-data.js?v=20261011-free-cook72';
import {ARENA,COURSE} from './world-layout.js?v=20261011-free-cook72';
import {GUN_ZONE} from './gun-layout.js?v=20261011-free-cook72';

export function createPlazaMap({world,names,skinURL,makeFace,getPlayers,getSelfId,getPlayer,isConnected,onOpen,onClose}){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
  const group=new THREE.Group();group.name='Plaza live world map';group.position.set(0,0,-28);world.group.add(group);
  const frameMat=new THREE.MeshStandardMaterial({color:'#344c57',roughness:.9}),geo=new THREE.BoxGeometry(1,1,1);
  for(const [x,y,w,h]of [[-4.25,2.7,.16,5.7],[4.25,2.7,.16,5.7],[0,.35,8.6,.18],[0,5.05,8.6,.18]]){const mesh=new THREE.Mesh(geo,frameMat);mesh.position.set(x,y,0);mesh.scale.set(w,h,.22);group.add(mesh);}
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(8.4,4.55),new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide}));screen.position.set(0,2.7,-.13);screen.rotation.y=Math.PI;group.add(screen);
  const boardId='plaza-live-map';world.setHouseBodies(boardId,[{x:0,y:2.7,z:-28,w:8.6,h:5.4,d:.24,boardId}]);
  world.boards.push({boardId,kind:'map',x:0,y:2.7,z:-28,label:screen,pick:screen});
  const style=document.createElement('style');style.textContent=`#plazaMap[hidden]{display:none!important}#plazaMap{position:fixed;inset:0;z-index:130;background:#07111cdd;display:flex;align-items:center;justify-content:center;padding:14px;font-family:DotGothic16,monospace}#plazaMap .map-window{width:min(1200px,100%);max-height:100%;overflow:auto;box-sizing:border-box;background:#142d3c;border:3px solid #7dccbd;outline:3px solid #102330;box-shadow:8px 8px 0 #07111c,inset 0 0 0 3px #274958;padding:14px;color:#eff8de}#plazaMap header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 0 10px;border-bottom:2px solid #537681}#plazaMap h2{font-size:20px;margin:0;letter-spacing:.06em}#plazaMap button{padding:10px 18px;color:#eff8de;background:#213f50;border:2px solid #658c96;box-shadow:inset 2px 2px #ffffff12,inset -2px -2px #0005;font:inherit;letter-spacing:.04em}#plazaMap button:hover{background:#31566a;border-color:#b9e7db}#plazaMap button:active{transform:translate(2px,2px)}#plazaMap canvas{width:100%;height:auto;display:block;margin-top:10px;image-rendering:pixelated;image-rendering:crisp-edges;border:2px solid #3d6870;background:#102a36}#plazaMap p{margin:8px 0;font-size:13px;line-height:1.7;color:#c6ddd4}#plazaMap .map-accessible{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}@media(max-width:640px){#plazaMap{padding:8px}#plazaMap .map-window{padding:10px;border-width:2px;outline-width:2px;box-shadow:4px 4px 0 #07111c}#plazaMap h2{font-size:14px}#plazaMap button{padding:8px 10px;font-size:12px}#plazaMap p{font-size:11px}}`;document.head.append(style);
  const panel=document.createElement('section');panel.id='plazaMap';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','プラザの全体マップ');
  panel.innerHTML='<div class="map-window"><header><h2>全体マップ・入室中のプレイヤー</h2><button type="button">閉じる</button></header><p>水色の枠：現世　黒い枠：鏡世界　★：自分　位置は随時更新</p><canvas width="1200" height="800" aria-label="各プレイヤーの現在地"></canvas><p class="map-accessible" aria-live="polite"></p></div>';document.body.append(panel);
  const display=panel.querySelector('canvas'),displayCtx=display.getContext('2d'),faces=new Map();let lastDraw=-Infinity,previousSummary='';
  const bounds={minX:-215,maxX:255,minZ:-155,maxZ:275},area={x:25,y:112,w:815,h:650};
  const project=(x,z)=>({x:area.x+(x-bounds.minX)/(bounds.maxX-bounds.minX)*area.w,y:area.y+(z-bounds.minZ)/(bounds.maxZ-bounds.minZ)*area.h});
  function face(skin){if(!faces.has(skin)){const holder=document.createElement('span');makeFace(skinURL(skin),holder);faces.set(skin,holder);}return faces.get(skin).querySelector('canvas');}
  const pixel=4,snap=value=>Math.round(value/pixel)*pixel;
  function text(value,x,y,size=20,color='#eff8de'){ctx.fillStyle=color;ctx.font=`${size}px DotGothic16,monospace`;ctx.fillText(value,snap(x),snap(y));}
  function block(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(snap(x),snap(y),Math.max(pixel,snap(w)),Math.max(pixel,snap(h)));}
  function frame(x,y,w,h,color='#8caaa1'){block(x,y,w,pixel,color);block(x,y+h-pixel,w,pixel,color);block(x,y,pixel,h,color);block(x+w-pixel,y,pixel,h,color);}
  function rectangle(x,z,w,d,color,label){const p=project(x-w/2,z-d/2),q=project(x+w/2,z+d/2),left=snap(p.x),top=snap(p.y),width=Math.max(pixel,snap(q.x-p.x)),height=Math.max(pixel,snap(q.y-p.y));block(left+pixel,top+pixel,width-pixel*2,height-pixel*2,color);frame(left,top,width,height,'#203b42');frame(left+pixel,top+pixel,width-pixel*2,height-pixel*2,'#9ab5a4');if(label)text(label,left+8,top+20,14,'#f0f4d8');}
  function normalized(p){if(!p.mirrorRealm)return {...p,mappedX:p.x,mappedZ:p.z};const realm=mirrorRealm(p.mirrorRealm);return {...p,mappedX:p.x-(realm?.x??2000),mappedZ:(realm?.z??2000)-p.z};}
  function placeName(p){if(p.mirrorRealm)return HOUSES.slice(0,8).find(h=>Math.abs(p.mappedX-h.x)<9&&Math.abs(p.mappedZ-h.z)<9)?'鏡世界の家':'鏡世界の住宅街';const h=HOUSES.find(h=>Math.abs(p.x-h.x)<9&&Math.abs(p.z-h.z)<9);if(h)return h.guest?'ゲストの家 '+(h.index-7):(names[h.owner]||'メンバー')+'の家';if(p.x>GUN_ZONE.minX&&p.x<GUN_ZONE.maxX&&p.z>GUN_ZONE.minZ&&p.z<GUN_ZONE.maxZ)return '銃撃戦エリア';if(Math.hypot(p.x-ARENA.x,p.z-ARENA.z)<ARENA.radius+4)return 'コロシアム';if(p.x>=COURSE.minX&&p.x<=COURSE.maxX&&p.z>=COURSE.minZ&&p.z<=COURSE.maxZ)return 'アスレチック';if(Math.abs(p.x)<12&&Math.abs(p.z)<10)return 'スタジオ';if(Math.abs(p.x)<25&&p.z>=-85&&p.z<=-28)return 'プラザ';return '現世の広場・通路';}
  function draw(){
    const players=getPlayers().filter(p=>[p.x,p.z].every(Number.isFinite)).map(normalized).sort((a,b)=>a.id.localeCompare(b.id));ctx.imageSmoothingEnabled=false;block(0,0,1200,800,'#102a36');frame(12,12,1176,776,'#507987');frame(20,20,1160,760,'#234452');
    block(28,28,804,60,'#1b4050');block(32,32,8,52,'#9de4ca');text('RAFT WORLD / 全体マップ',52,58,28);text('水色枠：現世　黒枠：鏡世界　★：自分',52,80,16,'#b5d6ce');
    block(area.x,area.y,area.w,area.h,'#355448');frame(area.x,area.y,area.w,area.h,'#9cc8b7');for(let x=area.x+pixel*3;x<area.x+area.w;x+=pixel*8)block(x,area.y+pixel*3,pixel,pixel,'#5b7966');for(let y=area.y+pixel*3;y<area.y+area.h;y+=pixel*8)block(area.x+pixel*3,y,pixel,pixel,'#5b7966');rectangle(0,62,105,10,'#a99f8c');rectangle(16,-22,6,110,'#a99f8c');rectangle(64,-92,116,10,'#a99f8c');rectangle(0,-66,54,6,'#a99f8c');rectangle(-79,65,7,72,'#a99f8c');
    rectangle(0,-42,42,28,'#71867b','プラザ');rectangle(0,0,22,18,'#96b5b0','スタジオ');rectangle(ARENA.x,ARENA.z,46,46,'#9b7160','コロシアム');rectangle(GUN_ZONE.x,GUN_ZONE.z,GUN_ZONE.width,GUN_ZONE.depth,'#a28c62','銃撃戦');rectangle(COURSE.x,181,135,158,'#657e98','アスレチック');
    for(const h of HOUSES){rectangle(h.x,h.z,16,15,h.color);const p=project(h.x,h.z+13);text(h.guest?'ゲスト '+(h.index-7):names[h.owner],p.x-16,p.y,12);}
    text('北 ↑',area.x+10,area.y+27,18);text('顔は現世の同じ場所へ換算して表示',area.x+10,788,16,'#b5d6ce');
    text('入室中 '+players.length+'人',865,136,25);text(isConnected()?'● 接続中':'接続待ち',865,168,16,'#b5d6ce');const occupied=[],summary=[];
    for(let i=0;i<players.length;i++){
      const p=players[i],own=p.id===getSelfId(),name=names[p.skin]||'ゲスト',where=placeName(p),point=project(p.mappedX,p.mappedZ);let x=THREE.MathUtils.clamp(point.x,area.x+20,area.x+area.w-20),y=THREE.MathUtils.clamp(point.y,area.y+20,area.y+area.h-20);
      const anchor={x,y};for(let attempt=0;attempt<40&&occupied.some(other=>Math.hypot(other.x-x,other.y-y)<36);attempt++){const angle=attempt*2.399,radius=20+attempt*2;x=THREE.MathUtils.clamp(anchor.x+Math.cos(angle)*radius,area.x+20,area.x+area.w-20);y=THREE.MathUtils.clamp(anchor.y+Math.sin(angle)*radius,area.y+20,area.y+area.h-20);}occupied.push({x,y});
      const icon=face(p.skin),border=p.mirrorRealm?'#07090d':'#77e3d4';ctx.strokeStyle='#e8f3dd';ctx.lineWidth=pixel;ctx.beginPath();ctx.moveTo(snap(anchor.x),snap(anchor.y));ctx.lineTo(snap(x),snap(y));ctx.stroke();
      function iconAt(cx,cy,size){cx=snap(cx);cy=snap(cy);block(cx-size/2-8,cy-size/2-8,size+16,size+16,'#102530');block(cx-size/2-4,cy-size/2-4,size+8,size+8,border);block(cx-size/2,cy-size/2,size,size,'#526e74');if(icon)ctx.drawImage(icon,cx-size/2,cy-size/2,size,size);}
      iconAt(x,y,28);if(own)text('★',x+15,y-13,20,'#ffe298');text(name,x-16,y+31,12);
      const rowY=205+i*61;iconAt(886,rowY,30);text(name+(own?' ★':''),914,rowY-5,18);text((p.mirrorRealm?'鏡世界 · ':'現世 · ')+where.replace(/^鏡世界の/,''),914,rowY+18,13,'#b5d6ce');summary.push(name+(own?'（自分）':'')+'：'+where);
    }
    const next=summary.join(' / ')||'接続中のプレイヤーはいません';if(next!==previousSummary){panel.querySelector('.map-accessible').textContent=next;display.setAttribute('aria-label',next);previousSummary=next;}texture.needsUpdate=true;if(!panel.hidden)displayCtx.drawImage(canvas,0,0);
  }
  function close(){if(panel.hidden)return;panel.hidden=true;onClose();}panel.querySelector('button').onclick=close;
  return {get active(){return !panel.hidden;},open(){onOpen();panel.hidden=false;draw();panel.querySelector('button').focus();},close,update(now){const player=getPlayer();if(now-lastDraw<250||panel.hidden&&(!player||Math.hypot(player.x,player.z+28)>50))return;lastDraw=now;draw();},key(event){if(panel.hidden)return false;if(event.code==='Escape'){event.preventDefault();close();}return true;}};
}
