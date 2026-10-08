import * as THREE from 'three';
import {HOUSES,ROOM,GRID,MAX_FURNITURE,FURNITURE,FURNITURE_BY_ID,FURNITURE_COLORS,FINISHES,emptyHouse,cleanHouse,furniturePose,placementError,findPlacement,applyHouseOperation} from './housing-data.js';
import {furnitureThumbnail} from './furniture-models.js';

export function createHouseEditor({scene,camera,canvas,world,view,getSkin,getPlayer,isConnected,send,onOpen,onClose,notify}){
  const $=id=>document.getElementById(id),panel=$('houseEditor'),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),intersection=new THREE.Vector3(),plane=new THREE.Plane(),normal=new THREE.Vector3();
  let index=-1,selectedId=null,category='floor',wall='back',color=10,mode='move',drag=null,pending=null,azimuth=.62,elevation=.61,radius=27,viewportKey='';
  let layouts=HOUSES.map(()=>emptyHouse());try{const cached=JSON.parse(localStorage.getItem('raft-house-layouts')||'[]');layouts=layouts.map((h,i)=>cleanHouse(cached[i]));}catch{}
  for(const h of HOUSES)view.apply(h.index,layouts[h.index]);
  const gizmo=new THREE.Group();gizmo.name='Grid furniture placement gizmo';gizmo.visible=false;scene.add(gizmo);
  const pickMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false}),pickGeometry=new THREE.SphereGeometry(.26,6,4);
  const handles=[];for(const [axis,direction,hex]of [['x',new THREE.Vector3(1,0,0),0xef6a61],['y',new THREE.Vector3(0,1,0),0x91e09c],['z',new THREE.Vector3(0,0,1),0x77bdff]]){const arrow=new THREE.ArrowHelper(direction,new THREE.Vector3(),1.6,hex,.32,.2);arrow.traverse(o=>{o.userData.axis=axis;if(o.material){o.material.depthTest=false;o.material.depthWrite=false;}o.renderOrder=100;});const pick=new THREE.Mesh(pickGeometry,pickMaterial);pick.position.copy(direction).multiplyScalar(1.45);pick.userData.axis=axis;arrow.add(pick);gizmo.add(arrow);handles.push({axis,arrow});}
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.065,6,32),new THREE.MeshBasicMaterial({color:'#ffd566',depthTest:false,depthWrite:false,side:THREE.DoubleSide}));ring.renderOrder=100;ring.userData.axis='rotate';gizmo.add(ring);
  const ringPick=new THREE.Mesh(new THREE.TorusGeometry(1.25,.19,6,32),pickMaterial);ringPick.userData.axis='rotate';gizmo.add(ringPick);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:'#8af2b5',depthTest:false}));outline.renderOrder=99;outline.visible=false;scene.add(outline);
  const gridVertices=[];for(let i=-29;i<=29;i++)gridVertices.push(i*GRID,0,-ROOM.z,i*GRID,0,ROOM.z);for(let i=-27;i<=27;i++)gridVertices.push(-ROOM.x,0,i*GRID,ROOM.x,0,i*GRID);const gridGeometry=new THREE.BufferGeometry();gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gridVertices,3));const grid=new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:'#81cfc8',transparent:true,opacity:.3,depthWrite:false}));grid.visible=false;scene.add(grid);
  const active=()=>index>=0,item=()=>layouts[index]?.items.find(i=>i.id===selectedId),localToWorld=(x,y,z)=>{const h=HOUSES[index];return new THREE.Vector3(h.x+x*h.front,ROOM.floor+y,h.z+z*h.front);};
  const setStatus=(text,error=false)=>{$('houseSaveStatus').textContent=text;$('houseSaveStatus').dataset.error=String(error);};
  const cache=()=>{try{localStorage.setItem('raft-house-layouts',JSON.stringify(layouts));}catch{}};
  function cast(e){const rect=canvas.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));camera.updateMatrixWorld();ray.setFromCamera(ndc,camera);ray.params.Line.threshold=.12;}
  function drawSelection(candidate=item(),error=''){
    outline.visible=gizmo.visible=active()&&!!candidate;if(!candidate)return;const f=FURNITURE_BY_ID.get(candidate.t),p=furniturePose(candidate),h=HOUSES[index];const centre=localToWorld(p.x,p.centerY,p.z);
    outline.position.copy(centre);outline.rotation.set(0,p.yaw+(h.front<0?Math.PI:0),0);outline.scale.set(p.w+.035,p.h+.035,p.d+.035);outline.material.color.set(error?'#ff685f':'#8af2b5');gizmo.position.copy(centre);
    const sideWall=f.mount==='wall'&&(candidate.wall==='left'||candidate.wall==='right');for(const handle of handles)handle.arrow.visible=mode==='move'&&(f.mount==='wall'?handle.axis==='y'||handle.axis===(sideWall?'z':'x'):handle.axis!=='y');
    ring.visible=ringPick.visible=mode==='rotate';ring.rotation.set(f.mount==='wall'?0:-Math.PI/2,sideWall?Math.PI/2:0,0);ringPick.rotation.copy(ring.rotation);
    $('houseSelectedName').textContent=f.name;$('houseX').value=(candidate.x*GRID).toFixed(2);$('houseY').value=(f.mount==='wall'?candidate.y*GRID:f.mount==='ceiling'?ROOM.height:0).toFixed(2);$('houseZ').value=(candidate.z*GRID).toFixed(2);$('houseY').disabled=f.mount!=='wall';$('houseX').disabled=sideWall;$('houseZ').disabled=f.mount==='wall'&&!sideWall;$('houseWall').value=candidate.wall||wall;$('houseColor').value=String(candidate.c);
    color=candidate.c;if(candidate.wall)wall=candidate.wall;
    $('houseSelection').hidden=false;
  }
  function refresh(){
    const layout=layouts[index];if(!layout)return;$('houseCount').textContent=`${layout.items.length} / ${MAX_FURNITURE} · グリッド25cm`;
    const list=$('housePlaced');list.replaceChildren(new Option('家具を選択',''));for(const object of layout.items)list.add(new Option(FURNITURE_BY_ID.get(object.t).name+' · '+object.id.slice(-4),object.id));list.value=selectedId||'';
    for(const key of Object.keys(FINISHES))$('houseFinish-'+key).value=layout.finish[key];$('houseSelection').hidden=!item();drawSelection();
  }
  function commit(op){
    if(!active()||pending)return false;if(!isConnected()){setStatus('サーバーに接続してから編集してください',true);return false;}
    const previous=layouts[index],result=applyHouseOperation(previous,op);if(result.error){setStatus(result.error,true);notify(result.error);drawSelection(item());return false;}
    const requestId='h'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);pending={index,requestId,previous};layouts[index]=result.house;view.apply(index,result.house);refresh();setStatus('サーバーに保存中…');send({type:'housing-op',index,rev:previous.rev,requestId,...op});return true;
  }
  function add(def){if(pending)return;const next=findPlacement(def,layouts[index].items,color,wall);if(!next){notify('配置できる空きスペースがありません');return;}const previous=selectedId;selectedId=next.id;if(!commit({action:'add',item:next}))selectedId=previous;refresh();}
  function catalogue(){const list=$('houseCatalogue');list.replaceChildren();for(const def of FURNITURE.filter(f=>f.mount===category)){const button=document.createElement('button');button.className='furniture-card';button.title=def.name;button.innerHTML=furnitureThumbnail(def,color);const label=document.createElement('span');label.textContent=def.name;button.append(label);button.onclick=()=>add(def);list.append(button);}$('houseMaterials').hidden=category!=='materials';list.hidden=category==='materials';$('houseWallRow').hidden=category!=='wall';}
  function rotate(delta){const selected=item();if(!selected)return;const f=FURNITURE_BY_ID.get(selected.t);commit({action:'move',item:{...selected,r:(selected.r+delta+(f.mount==='wall'?4:8))%(f.mount==='wall'?4:8)}});}
  function close(){if(!active())return;if(drag){view.preview(index,drag.original);drag=null;}view.setEditing(index,false);index=-1;selectedId=null;panel.hidden=true;document.body.dataset.houseEditing='false';gizmo.visible=outline.visible=grid.visible=false;camera.clearViewOffset();viewportKey='';onClose();}
  function open(houseIndex){
    const h=HOUSES[houseIndex];if(h.owner!==getSkin()){notify('自分のメンバーカラーの家だけ編集できます');return;}if(active())close();index=houseIndex;selectedId=null;color=h.index;azimuth=.62;elevation=.61;radius=innerWidth<600?34:27;onOpen();panel.hidden=false;document.body.dataset.houseEditing='true';$('houseTitle').textContent=$('selectedName').textContent+' · HOME DESIGN';$('houseColor').value=String(color);view.setEditing(index,true);grid.position.set(h.x,ROOM.floor+.012,h.z);grid.visible=true;category='floor';for(const b of panel.querySelectorAll('[data-house-tab]'))b.setAttribute('aria-selected',String(b.dataset.houseTab==='floor'));catalogue();refresh();setStatus(isConnected()?'家具を選んで配置 · 変更は自動保存':'サーバー接続が必要です',!isConnected());viewportKey='';
  }
  function clickBoard(e){
    if(active())return false;cast(e);const boards=world.boards.filter(b=>b.kind==='house'&&b.label.visible),hit=ray.intersectObjects(boards.map(b=>b.label),false)[0];if(!hit)return false;const board=boards.find(b=>b.label===hit.object),player=getPlayer();
    if(!player||Math.hypot(player.x-board.x,player.z-board.z)>6)return false;if(world.cameraPosition(camera.position,hit.point,.025).distanceTo(hit.point)>.12)return false;e.preventDefault();open(board.houseIndex);return true;
  }
  function beginDrag(e){
    if(!active())return false;e.preventDefault();if(drag)return true;cast(e);
    if(e.button===2){drag={orbit:true,x:e.clientX,y:e.clientY,pointerId:e.pointerId};canvas.setPointerCapture(e.pointerId);return true;}
    const hits=gizmo.visible?ray.intersectObject(gizmo,true).filter(h=>h.object.visible&&h.object.parent?.visible):[],axis=hits[0]?.object.userData.axis;
    if(!axis){const id=view.pick(ray,index);if(!id){drag={orbit:true,x:e.clientX,y:e.clientY,pointerId:e.pointerId};canvas.setPointerCapture(e.pointerId);return true;}selectedId=id;refresh();}
    if(pending)return true;const selected=item();if(!selected)return true;const f=FURNITURE_BY_ID.get(selected.t),p=furniturePose(selected),sideWall=f.mount==='wall'&&(selected.wall==='left'||selected.wall==='right'),centre=localToWorld(p.x,p.centerY,p.z),chosen=axis||'plane';
    const worldYaw=p.yaw+(HOUSES[index].front<0?Math.PI:0);normal.set(f.mount==='wall'?Math.sin(worldYaw):0,f.mount==='wall'?0:1,f.mount==='wall'?Math.cos(worldYaw):0);
    if(chosen!=='rotate'&&chosen!=='plane'){const vector=new THREE.Vector3(chosen==='x'?1:0,chosen==='y'?1:0,chosen==='z'?1:0);camera.getWorldDirection(normal);normal.addScaledVector(vector,-normal.dot(vector)).normalize();}
    plane.setFromNormalAndCoplanarPoint(normal,centre);if(!ray.ray.intersectPlane(plane,intersection))return true;
    drag={original:{...selected},candidate:{...selected},start:intersection.clone(),centre,axis:chosen,error:'',sideWall,pointerId:e.pointerId};canvas.setPointerCapture(e.pointerId);return true;
  }
  function moveDrag(e){
    if(!active())return false;if(!drag||drag.pointerId!==e.pointerId)return true;e.preventDefault();if(drag.orbit){azimuth=Math.max(.15,Math.min(1.35,azimuth-(e.clientX-drag.x)*.008));elevation=Math.max(.28,Math.min(1.15,elevation+(e.clientY-drag.y)*.006));drag.x=e.clientX;drag.y=e.clientY;return true;}
    cast(e);if(!ray.ray.intersectPlane(plane,intersection))return true;const next={...drag.original},delta=intersection.clone().sub(drag.start),h=HOUSES[index],f=FURNITURE_BY_ID.get(next.t);
    if(drag.axis==='rotate'){const a=drag.start.clone().sub(drag.centre),b=intersection.clone().sub(drag.centre),angle=Math.atan2(normal.dot(a.clone().cross(b)),a.dot(b)),count=f.mount==='wall'?4:8;next.r=((next.r+Math.round(angle/(Math.PI*2/count)))%count+count)%count;}
    else{if(drag.axis==='x'||drag.axis==='plane'&&!(f.mount==='wall'&&drag.sideWall))next.x+=Math.round(delta.x*h.front/GRID);if(drag.axis==='z'||drag.axis==='plane'&&(f.mount!=='wall'||drag.sideWall))next.z+=Math.round(delta.z*h.front/GRID);if(f.mount==='wall'&&(drag.axis==='y'||drag.axis==='plane'))next.y+=Math.round(delta.y/GRID);}
    if(next.x===drag.candidate.x&&next.y===drag.candidate.y&&next.z===drag.candidate.z&&next.r===drag.candidate.r)return true;
    drag.candidate=next;drag.error=placementError(next,layouts[index].items);view.preview(index,next);drawSelection(next,drag.error);setStatus(drag.error||'離すと保存 · 25cmグリッド',!!drag.error);return true;
  }
  function endDrag(e,cancel=false){
    if(!active())return false;if(drag&&drag.pointerId!==e.pointerId)return true;if(drag&&!drag.orbit){const {original,candidate,error}=drag;drag=null;if(cancel||error){view.preview(index,original);drawSelection(original);if(error)notify(error);}else if(JSON.stringify(original)!==JSON.stringify(candidate)){if(!commit({action:'move',item:candidate})){view.preview(index,original);drawSelection(original);}}}drag=null;return true;
  }
  function receive(message){
    const i=Number(message.index);if(!Number.isInteger(i)||i<0||i>=layouts.length)return;
    const record=cleanHouse(message.house);if(record.rev<layouts[i].rev&&pending?.requestId!==message.requestId)return;
    layouts[i]=record;view.apply(i,record);cache();if(pending?.requestId===message.requestId)pending=null;
    if(index===i){if(drag&&!drag.orbit)drag=null;refresh();setStatus(message.error||'サーバーに保存済み',!!message.error);if(message.error)notify(message.error);}
  }
  function hydrate(records){for(let i=0;i<layouts.length;i++){layouts[i]=cleanHouse(records?.[i]);view.apply(i,layouts[i]);}cache();if(active())refresh();}
  function disconnected(){if(pending){const {index:i,previous}=pending;layouts[i]=previous;view.apply(i,previous);pending=null;cache();}if(active()){refresh();setStatus('接続が切れました。再接続後に編集してください',true);}}
  function updateCamera(dt){
    if(!active())return;const h=HOUSES[index],width=panel.getBoundingClientRect().width,key=innerWidth+','+innerHeight+','+width;if(key!==viewportKey){camera.setViewOffset(innerWidth,innerHeight,width/2,0,innerWidth,innerHeight);viewportKey=key;}gizmo.scale.setScalar(Math.max(1,radius/22)*(innerWidth<600?1.65:1));camera.fov=45;camera.updateProjectionMatrix();const target=new THREE.Vector3(h.x,1.8,h.z),desired=new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation)*radius,Math.sin(elevation)*radius,h.front*Math.cos(azimuth)*Math.cos(elevation)*radius).add(target);camera.position.lerp(desired,1-Math.exp(-dt*12));camera.lookAt(target);
  }
  for(const button of panel.querySelectorAll('[data-house-tab]'))button.onclick=()=>{category=button.dataset.houseTab;for(const b of panel.querySelectorAll('[data-house-tab]'))b.setAttribute('aria-selected',String(b===button));catalogue();};
  for(const key of Object.keys(FINISHES)){const select=$('houseFinish-'+key);for(const [id,label]of FINISHES[key])select.add(new Option(label,id));select.onchange=()=>{if(!commit({action:'finish',surface:key,value:select.value}))refresh();};}
  for(let c=0;c<FURNITURE_COLORS.length;c++)$('houseColor').add(new Option(['赤','緑','水色','オレンジ','灰色','紫','黄色','茶色','白','黒','ナチュラル','青灰'][c],String(c)));
  $('houseColor').onchange = event => {
    color = Number(event.target.value);
    const selected = item();
    if (selected) {
      const saved = commit({ action:'move', item:{ ...selected, c:color } });
      if (!saved) refresh();
      return;
    }
    catalogue();
  };
  $('houseWall').onchange=e=>{wall=e.target.value;const selected=item();if(selected&&FURNITURE_BY_ID.get(selected.t).mount==='wall'){if(!commit({action:'move',item:{...selected,wall}}))refresh();}};
  $('housePlaced').onchange=e=>{selectedId=e.target.value||null;refresh();};$('closeHouseEditor').onclick=close;
  $('houseMoveMode').onclick=()=>{mode='move';drawSelection();};$('houseRotateMode').onclick=()=>{mode='rotate';drawSelection();};$('houseRotateLeft').onclick=()=>rotate(-1);$('houseRotateRight').onclick=()=>rotate(1);
  $('houseDelete').onclick=()=>{const selected=item();if(selected&&commit({action:'delete',id:selected.id})){selectedId=null;refresh();}};
  $('houseDuplicate').onclick=()=>{const selected=item();if(selected){color=selected.c;wall=selected.wall||wall;add(FURNITURE_BY_ID.get(selected.t));}};
  for(const [name,axis]of [['houseX','x'],['houseY','y'],['houseZ','z']])$(name).onchange=e=>{const selected=item(),value=Number(e.target.value);if(selected&&Number.isFinite(value)){if(!commit({action:'move',item:{...selected,[axis]:Math.round(value/GRID)}}))refresh();}};
  $('houseZoomIn').onclick=()=>{radius=Math.max(12,radius-2);};$('houseZoomOut').onclick=()=>{radius=Math.min(45,radius+2);};
  return {get active(){return active();},open,close,clickBoard,pointerDown:beginDrag,pointerMove:moveDrag,pointerUp:endDrag,receive,hydrate,disconnected,updateCamera,wheel(e){if(!active())return false;e.preventDefault();radius=Math.max(12,Math.min(45,radius+e.deltaY*.018));return true;},key(e){if(!active())return false;if(e.ctrlKey||e.metaKey)return false;if(e.code==='Escape'){e.preventDefault();close();return true;}if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return true;e.preventDefault();if(e.code==='KeyR')rotate(e.shiftKey?-1:1);else if(e.code==='Delete'||e.code==='Backspace')$('houseDelete').click();return true;}};
}
