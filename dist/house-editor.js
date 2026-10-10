import * as THREE from 'three';
import {HOUSES,houseDescriptor,replaceMirrorRealms,registerMirrorRealm,MIRROR_REALMS,ROOM,GRID,HEIGHT_GRID,MAX_FURNITURE,FURNITURE,FURNITURE_BY_ID,FURNITURE_COLORS,FINISHES,emptyHouse,cleanHouse,furniturePose,pairFurniture,placementError,findPlacement,applyHouseOperation,mirrorPassageError} from './housing-data.js';
import {furnitureThumbnail,furnitureParts} from './furniture-models.js';
import {furnitureGeometry} from './furniture-geometry.js';

export function createHouseEditor({scene,camera,canvas,world,view,getSkin,getPlayer,isConnected,send,onOpen,onClose,notify}){
  const $=id=>document.getElementById(id),panel=$('houseEditor'),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),intersection=new THREE.Vector3(),plane=new THREE.Plane(),normal=new THREE.Vector3();
  let index=-1,selectedId=null,draft=null,category='floor',wall='back',color=10,mode='move',drag=null,pending=null,azimuth=.62,elevation=.74,radius=27,viewportKey='',clock=0,nearBoard=null,undoItem=null,pinch=null;
  const pointers=new Map(),pan=new THREE.Vector2();let connectedBefore=isConnected(),touchLayout=false,currentPane='browse';
  const touchTools=document.createElement('nav');touchTools.id='houseTouchTools';touchTools.setAttribute('aria-label','配置とカメラの操作');touchTools.innerHTML='<button data-touch-mode="move">家具を動かす</button><button data-touch-mode="orbit">視点回転</button><button id="houseTouchTop">真上</button><button id="houseTouchFit">全体</button>';panel.querySelector('.house-editor-body').before(touchTools);
  const touchHint=document.createElement('p');touchHint.id='houseTouchHint';touchHint.textContent='家具をドラッグして移動 · 2本指で拡大・視点移動';touchTools.after(touchHint);
  const touchOptions=document.createElement('details');touchOptions.id='houseTouchOptions';const summary=document.createElement('summary');summary.textContent='色・配置済みの家具を選ぶ';touchOptions.append(summary);const editPane=panel.querySelector('[data-house-panel="edit"]');editPane.prepend(touchOptions);for(const id of ['housePlaced','houseColor','houseWallRow'])touchOptions.append(id==='houseWallRow'?$(id):$(id).closest('label'));
  function syncTouchLayout(){const next=innerWidth<=1366&&(navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches);const changed=next!==touchLayout;touchLayout=next;panel.dataset.touch=String(next);panel.dataset.pane=currentPane;const v=window.visualViewport;panel.style.setProperty('--house-visible-height',(v?.height||innerHeight)+'px');panel.style.setProperty('--house-keyboard-bottom',Math.max(0,innerHeight-(v?.height||innerHeight)-(v?.offsetTop||0))+'px');if(changed&&index!==-1){catalogue();viewportKey='';}}
  addEventListener('resize',syncTouchLayout);window.visualViewport?.addEventListener('resize',syncTouchLayout);window.visualViewport?.addEventListener('scroll',syncTouchLayout);syncTouchLayout();
  for(const button of touchTools.querySelectorAll('[data-touch-mode]'))button.onclick=()=>{mode=button.dataset.touchMode;drawSelection();};$('houseTouchTop').onclick=()=>fitCamera(true);$('houseTouchFit').onclick=()=>fitCamera();

  // Placement text belongs in the reserved controls area, never over the model.
  panel.querySelector('.house-editor-footer').prepend($('housePlacementHUD'));
  let layouts=Object.fromEntries(HOUSES.slice(0,8).map(h=>[h.index,emptyHouse()]));try{const cached=JSON.parse(localStorage.getItem('raft-house-layouts')||'{}');for(const [key,slot]of Object.entries(cached.$realms||{}).sort((a,b)=>a[1]-b[1]))registerMirrorRealm(key,slot);for(const [key,value]of Object.entries(cached))if(houseDescriptor(key))layouts[key]=cleanHouse(value);}catch{}
  for(const [key,layout]of Object.entries(layouts))view.apply(key,layout);
  const gizmo=new THREE.Group();gizmo.name='Grid furniture placement gizmo';gizmo.visible=false;scene.add(gizmo);
  const pickMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false}),pickGeometry=new THREE.SphereGeometry(.26,6,4);
  const handles=[];for(const [axis,direction,hex]of [['x',new THREE.Vector3(1,0,0),0xef6a61],['y',new THREE.Vector3(0,1,0),0x91e09c],['z',new THREE.Vector3(0,0,1),0x77bdff]]){const arrow=new THREE.ArrowHelper(direction,new THREE.Vector3(),1.6,hex,.32,.2);arrow.traverse(o=>{o.userData.axis=axis;if(o.material){o.material.depthTest=false;o.material.depthWrite=false;}o.renderOrder=100;});const pick=new THREE.Mesh(pickGeometry,pickMaterial);pick.position.copy(direction).multiplyScalar(1.45);pick.userData.axis=axis;gizmo.add(arrow,pick);handles.push({axis,arrow,pick});}
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.065,6,32),new THREE.MeshBasicMaterial({color:'#ffd566',depthTest:false,depthWrite:false,side:THREE.DoubleSide}));ring.renderOrder=100;ring.userData.axis='rotate';gizmo.add(ring);
  const ringPick=new THREE.Mesh(new THREE.TorusGeometry(1.25,.19,6,32),pickMaterial);ringPick.userData.axis='rotate';gizmo.add(ringPick);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:'#8af2b5',depthTest:false}));outline.renderOrder=99;outline.visible=false;scene.add(outline);
  const gridVertices=[];for(let i=-29;i<=29;i++)gridVertices.push(i*GRID,0,-ROOM.z,i*GRID,0,ROOM.z);for(let i=-27;i<=27;i++)gridVertices.push(-ROOM.x,0,i*GRID,ROOM.x,0,i*GRID);const gridGeometry=new THREE.BufferGeometry();gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gridVertices,3));const grid=new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:'#81cfc8',transparent:true,opacity:.3,depthWrite:false}));grid.visible=false;scene.add(grid);
  const previewGeometry=new THREE.BoxGeometry(1,1,1),ghost=new THREE.Group(),ghostMaterials=new Map();ghost.visible=false;scene.add(ghost);
  const footprint=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#83efb9',transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}));footprint.visible=false;scene.add(footprint);
  const effect=new THREE.InstancedMesh(previewGeometry,new THREE.MeshBasicMaterial({color:'#baffd2',transparent:true,opacity:0,depthWrite:false}),24);effect.visible=false;effect.frustumCulled=false;scene.add(effect);
  const effectOrigin=new THREE.Vector3(),effectTransform=new THREE.Object3D();let effectTime=1,effectRemoving=false;
  const active=()=>index!==-1,item=()=>draft||layouts[index]?.items.find(i=>i.id===selectedId),localToWorld=(x,y,z)=>{const h=HOUSES[index];return new THREE.Vector3(h.x+x*h.front,ROOM.floor+y,h.z+z*h.front);};
  const setStatus=(text,error=false)=>{$('houseSaveStatus').textContent=text;$('houseSaveStatus').dataset.error=String(error);};
  function showPane(name){currentPane=name;panel.dataset.pane=name;panel.dataset.folded='false';$('houseFold').textContent=touchLayout?'部屋を広く':'縮小';viewportKey='';for(const button of panel.querySelectorAll('[data-house-pane]'))button.setAttribute('aria-selected',String(button.dataset.housePane===name));for(const section of panel.querySelectorAll('[data-house-panel]')){section.hidden=section.dataset.housePanel!==name;if(!section.hidden)section.scrollTop=0;}}
  const cache=()=>{try{localStorage.setItem('raft-house-layouts',JSON.stringify({...layouts,$realms:Object.fromEntries(MIRROR_REALMS)}));}catch{}};
  function cast(e){const rect=canvas.getBoundingClientRect();if(document.pointerLockElement===canvas)ndc.set(0,0);else ndc.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));camera.updateMatrixWorld();world.group.updateMatrixWorld(true);ray.setFromCamera(ndc,camera);ray.params.Line.threshold=.12;}
  function buildGhost(){ghost.clear();if(!draft){ghost.visible=false;return;}for(const part of furnitureParts(draft)){if(!ghostMaterials.has(part.c))ghostMaterials.set(part.c,new THREE.MeshStandardMaterial({color:part.c,transparent:true,opacity:.65,roughness:.85,depthWrite:false}));const mesh=new THREE.Mesh(furnitureGeometry(part.shape)||previewGeometry,ghostMaterials.get(part.c));mesh.userData.baseColor=part.c;mesh.position.set(part.x,part.y,part.z);mesh.rotation.set(part.rx||0,part.ry||0,part.rz||0);mesh.scale.set(part.w,part.h,part.d);ghost.add(mesh);}ghost.visible=true;}
  function drawSelection(candidate=item(),error=null){
    const visible=active()&&!!candidate;outline.visible=footprint.visible=visible;gizmo.visible=visible&&!['orbit','pan'].includes(mode);$('housePlacementHUD').hidden=!visible;$('houseDraftActions').hidden=!draft;if($('houseAddMore'))$('houseAddMore').hidden=!!draft;$('houseSelection').hidden=!visible;$('houseEmptySelection').hidden=visible;$('houseWallRow').hidden=true;
    for(const button of touchTools.querySelectorAll('[data-touch-mode]'))button.setAttribute('aria-pressed',String(mode===button.dataset.touchMode));
    for(const [id,value]of [['houseMoveMode','move'],['houseRotateMode','rotate'],['houseCameraOrbit','orbit'],['houseCameraPan','pan']])$(id).setAttribute('aria-pressed',String(mode===value));
    if(!candidate||!active())return;error??=placementError(candidate,layouts[index].items);
    const f=FURNITURE_BY_ID.get(candidate.t),p=furniturePose(candidate),h=HOUSES[index];const centre=localToWorld(p.x,p.centerY,p.z);
    outline.position.copy(centre);outline.rotation.set(0,p.yaw+(h.front<0?Math.PI:0),0);outline.scale.set(p.w+.035,p.h+.035,p.d+.035);outline.material.color.set(error?'#ff685f':'#8af2b5');gizmo.position.copy(centre);
    footprint.position.set(centre.x,ROOM.floor+.02,centre.z);footprint.rotation.set(-Math.PI/2,0,-p.yaw-(h.front<0?Math.PI:0));footprint.scale.set(p.w+.06,p.d+.06,1);footprint.material.color.copy(outline.material.color);
    if(draft){ghost.position.copy(localToWorld(p.x,p.y,p.z));ghost.rotation.set(0,p.yaw+(h.front<0?Math.PI:0),p.roll);for(const mesh of ghost.children)mesh.material.color.set(error?'#fc7a73':mesh.userData.baseColor);}
    const status=error||(!isConnected()?'接続待ち · 保存できません':pending?'保存中…':draft?'配置できます':'選択中 · ドラッグで移動');
    $('housePlacementState').textContent=status;$('housePlacementState').dataset.valid=String(!error&&isConnected());$('housePlacementHUD').dataset.valid=String(!error&&isConnected());$('housePlacementLabel').textContent=f.name+(candidate.pair?' · '+(FURNITURE_BY_ID.get(layouts[index].items.find(i=>i.id===candidate.pair)?.t)?.name||'机')+'とペア':'')+' · '+status;$('housePlacementCoords').textContent=`X ${(candidate.x*GRID).toFixed(2)} / Z ${(candidate.z*GRID).toFixed(2)} m`;$('houseConfirm').disabled=!!error||!!pending||!isConnected();
    $('houseDelete').textContent=draft?'プレビューを取消':'選択した家具を撤去';$('houseDuplicate').disabled=!!draft||!!pending;
    const sideWall=f.mount==='wall'&&(candidate.wall==='left'||candidate.wall==='right');for(const handle of handles)handle.arrow.visible=handle.pick.visible=mode==='move'&&(f.mount==='wall'?handle.axis==='y'||handle.axis===(sideWall?'z':'x'):f.allowHeight||handle.axis!=='y');
    ring.visible=ringPick.visible=mode==='rotate';ring.rotation.set(f.mount==='wall'?0:-Math.PI/2,sideWall?Math.PI/2:0,0);ringPick.rotation.copy(ring.rotation);
    $('houseSelectedName').textContent=f.name;$('houseX').value=(candidate.x*GRID).toFixed(2);$('houseY').value=(f.mount==='wall'?candidate.y*GRID:f.allowHeight?(candidate.y||0)*HEIGHT_GRID:f.mount==='ceiling'?ROOM.height:0).toFixed(2);$('houseZ').value=(candidate.z*GRID).toFixed(2);$('houseY').disabled=f.mount!=='wall'&&!f.allowHeight;$('houseY').step=String(f.allowHeight?HEIGHT_GRID:GRID);$('houseX').disabled=sideWall;$('houseZ').disabled=f.mount==='wall'&&!sideWall;$('houseWall').value=candidate.wall||wall;$('houseColor').value=String(candidate.c);
    color=candidate.c;if(candidate.wall)wall=candidate.wall;$('houseWallRow').hidden=f.mount!=='wall';
    $('houseSelection').hidden=false;
  }
  function refresh(){
    const layout=layouts[index];if(!layout)return;$('houseCount').textContent=`${layout.items.length} / ${MAX_FURNITURE} · グリッド25cm`;
    const list=$('housePlaced');list.replaceChildren(new Option(draft?'配置中の家具を編集中':'家具を選択',''));for(const object of layout.items)list.add(new Option(FURNITURE_BY_ID.get(object.t).name+' · '+object.id.slice(-4),object.id));list.value=selectedId||'';
    for(const key of Object.keys(FINISHES))$('houseFinish-'+key).value=layout.finish[key];$('houseUndo').disabled=!undoItem||!!pending;$('houseDelete').disabled=!!pending;drawSelection();
  }
  function commit(op){
    if(!active()||pending)return false;if(!isConnected()){setStatus('サーバーに接続してから編集してください',true);return false;}
    const previous=layouts[index],result=applyHouseOperation(previous,op);if(result.error){setStatus(result.error,true);notify(result.error);drawSelection(item());return false;}
    const h=houseDescriptor(index),passageError=h.realm&&mirrorPassageError(result.house,layouts[h.sourceIndex]);if(passageError&&op.action!=='delete'){setStatus(passageError,true);notify(passageError);return false;}
    const affected=op.item||previous.items.find(i=>i.id===op.id);
    const requestId='h'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);pending={index,requestId,previous,affected,removing:op.action==='delete',at:clock};layouts[index]=result.house;view.apply(index,result.house);refresh();setStatus('サーバーに保存中…');
    try{send({type:'housing-op',index,rev:previous.rev,requestId,...op});}catch{disconnected();notify('接続が切れました。配置を元に戻しました');return false;}return true;
  }
  function add(def){if(pending)return;if(houseDescriptor(index)?.realm&&['mirror','wall-mirror'].includes(def.family)){notify('鏡世界には鏡を設置できません');return;}if(layouts[index].items.length>=MAX_FURNITURE){notify('家具は64個までです');return;}draft=findPlacement(def,layouts[index].items,color,wall)||{id:'f'+Date.now().toString(36),t:def.id,x:0,z:0,y:def.mount==='wall'?9:0,r:0,c:color,...(['bed','canopy'].includes(def.family)?{v:2}:{}),...(def.mount==='wall'?{wall}:{})};selectedId=null;mode='move';buildGhost();refresh();showPane('edit');if(touchLayout)fitCamera();setStatus(touchLayout?'部屋の置きたい場所をタップ → 「ここに置く」で確定':'マウスで配置先を選ぶ → Enter / 「ここに置く」で確定');}
  function modify(next){if(pending)return;next=pairFurniture(next,layouts[index].items);if(draft){draft={...next};buildGhost();drawSelection();return;}if(!commit({action:'move',item:next}))refresh();}
  let cataloguePage=0,searchTimer=null;
  function catalogue(){
    const list=$('houseCatalogue'),term=$('houseFurnitureSearch').value.trim().normalize('NFKC').toLowerCase(),section=$('houseFurnitureSection').value;
    const definitions=FURNITURE.filter(f=>!(houseDescriptor(index)?.realm&&['mirror','wall-mirror'].includes(f.family))&&f.mount===category&&(!section||(f.section||'従来の家具')===section)&&(!term||(f.name+' '+f.id+' '+(f.section||'')).normalize('NFKC').toLowerCase().includes(term))),pageSize=touchLayout&&Math.min(innerWidth,innerHeight)<600?12:24,pages=Math.max(1,Math.ceil(definitions.length/pageSize));
    cataloguePage=Math.max(0,Math.min(pages-1,cataloguePage));list.replaceChildren();
    for(const def of definitions.slice(cataloguePage*pageSize,(cataloguePage+1)*pageSize)){const button=document.createElement('button');button.className='furniture-card';button.title=def.name;button.setAttribute('aria-label',def.name+'を選んで配置');button.innerHTML=furnitureThumbnail(def,color);const label=document.createElement('span');label.textContent=def.name;button.append(label);button.onclick=()=>add(def);list.append(button);}
    if(!definitions.length&&category!=='materials'){const empty=document.createElement('p');empty.className='help';empty.textContent='条件に合う家具がありません';list.append(empty);}
    $('houseCataloguePage').textContent=definitions.length+'種類 · '+(cataloguePage+1)+' / '+pages;
    $('houseCataloguePrev').disabled=cataloguePage===0;$('houseCatalogueNext').disabled=cataloguePage>=pages-1;
    $('houseCatalogueTools').hidden=$('houseCataloguePages').hidden=false;list.hidden=false;list.scrollTop=0;
  }
  function rotate(delta){const selected=item();if(!selected)return;if(selected.pair){notify('机とペアの椅子は、少し離すと自由に回転できます');return;}const f=FURNITURE_BY_ID.get(selected.t);modify({...selected,r:(selected.r+delta+(f.mount==='wall'?4:8))%(f.mount==='wall'?4:8)});}
  function close(){if(!active())return;if(drag&&!drag.orbit&&!draft)view.preview(index,drag.original);drag=null;pointers.clear();pinch=null;touchOptions.open=!touchLayout;view.setEditing(index,false);index=-1;selectedId=null;draft=null;panel.hidden=true;document.body.dataset.houseEditing='false';gizmo.visible=outline.visible=grid.visible=ghost.visible=footprint.visible=false;$('housePlacementHUD').hidden=true;camera.clearViewOffset();viewportKey='';onClose();}
  function open(houseIndex){
    const h=houseDescriptor(houseIndex);if(!h||h.owner!==getSkin()){notify('自分のメンバーカラーの家だけ編集できます');return;}if(active())close();syncTouchLayout();touchOptions.open=!touchLayout;index=h.index;layouts[index]??=emptyHouse();view.apply(index,layouts[index]);selectedId=null;draft=null;undoItem=null;color=h.sourceIndex??h.index;mode='move';pan.set(0,0);onOpen();panel.hidden=false;panel.dataset.folded='false';$('houseFold').textContent=touchLayout?'部屋を広く':'縮小';$('homeEditPrompt').hidden=true;document.body.dataset.houseEditing='true';$('houseTitle').textContent=$('selectedName').textContent+(h.realm?'の家 · 鏡世界':'の家');$('houseColor').value=String(color);view.setEditing(index,true);grid.position.set(h.x,ROOM.floor+.012,h.z);grid.visible=true;category='floor';for(const b of panel.querySelectorAll('[data-house-tab]'))b.setAttribute('aria-selected',String(b.dataset.houseTab==='floor'));catalogue();refresh();showPane('browse');setStatus(isConnected()?'家具を選んでプレビュー · 確定すると自動保存':'サーバー接続待ち · プレビューはできます',!isConnected());fitCamera();
  }
  function boardReachable(board){const player=getPlayer();if(!player||Math.hypot(player.x-board.x,player.z-board.z)>7)return false;const eye=new THREE.Vector3(player.x,player.y+1.45,player.z),point=board.label.position;return world.cameraPosition(eye,point,.025,board.boardId).distanceTo(point)<.14;}
  function clickBoard(e){return false;}
  function gesture(){const p=[...pointers.values()];return {distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2};}
  function panCamera(dx,dy){const scale=radius*.0018;pan.x=Math.max(-6,Math.min(6,pan.x-(Math.cos(azimuth)*dx+Math.sin(azimuth)*dy)*scale));pan.y=Math.max(-6,Math.min(6,pan.y+HOUSES[index].front*(Math.sin(azimuth)*dx-Math.cos(azimuth)*dy)*scale));}
  function pointDraft(e){if(!draft||mode!=='move'||pending)return false;cast(e);const f=FURNITURE_BY_ID.get(draft.t),pose=furniturePose(draft),h=HOUSES[index],centre=localToWorld(pose.x,pose.centerY,pose.z),yaw=pose.yaw+(h.front<0?Math.PI:0);normal.set(f.mount==='wall'?Math.sin(yaw):0,f.mount==='wall'?0:1,f.mount==='wall'?Math.cos(yaw):0);plane.setFromNormalAndCoplanarPoint(normal,centre);if(!ray.ray.intersectPlane(plane,intersection))return false;const next={...draft};if(f.mount!=='wall'||!['left','right'].includes(next.wall))next.x=Math.round((intersection.x-h.x)*h.front/GRID);if(f.mount!=='wall'||['left','right'].includes(next.wall))next.z=Math.round((intersection.z-h.z)*h.front/GRID);if(f.mount==='wall')next.y+=Math.round((intersection.y-centre.y)/GRID);if(Math.abs(next.x)>ROOM.x/GRID+2||Math.abs(next.z)>ROOM.z/GRID+2)return false;draft=pairFurniture(next,layouts[index].items);drawSelection();return true;}
  function beginDrag(e){
    if(!active())return false;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
    if(pointers.size>1){if(drag&&!drag.orbit){if(draft)draft={...drag.original};else view.preview(index,drag.original);}drag=null;pinch=gesture();drawSelection();return true;}if(drag)return true;cast(e);
    if(e.button===2||mode==='orbit'||mode==='pan'){drag={orbit:true,pan:mode==='pan'||e.shiftKey,x:e.clientX,y:e.clientY,pointerId:e.pointerId};return true;}
    gizmo.updateMatrixWorld(true);
    const hits=gizmo.visible?ray.intersectObject(gizmo,true).filter(h=>h.object.visible&&h.object.parent?.visible):[],axis=hits[0]?.object.userData.axis;
    if(!axis&&draft&&mode==='move'&&ray.intersectObject(ghost,true).length===0){pointDraft(e);return true;}
    if(!axis&&!draft){const id=view.pick(ray,index);if(!id){drag={orbit:true,pan:e.shiftKey,x:e.clientX,y:e.clientY,pointerId:e.pointerId};return true;}selectedId=id;refresh();showPane('edit');if(touchLayout){fitCamera();return true;}}
    if(pending)return true;const selected=item();if(!selected)return true;const f=FURNITURE_BY_ID.get(selected.t),p=furniturePose(selected),sideWall=f.mount==='wall'&&(selected.wall==='left'||selected.wall==='right'),centre=localToWorld(p.x,p.centerY,p.z),chosen=axis||'plane';
    const worldYaw=p.yaw+(HOUSES[index].front<0?Math.PI:0);normal.set(f.mount==='wall'?Math.sin(worldYaw):0,f.mount==='wall'?0:1,f.mount==='wall'?Math.cos(worldYaw):0);
    if(chosen!=='rotate'&&chosen!=='plane'){const vector=new THREE.Vector3(chosen==='x'?1:0,chosen==='y'?1:0,chosen==='z'?1:0);camera.getWorldDirection(normal);normal.addScaledVector(vector,-normal.dot(vector)).normalize();}
    plane.setFromNormalAndCoplanarPoint(normal,centre);if(!ray.ray.intersectPlane(plane,intersection))return true;
    drag={original:{...selected},candidate:{...selected},start:intersection.clone(),centre,axis:chosen,error:'',sideWall,pointerId:e.pointerId,tapRotate:false,screenX:e.clientX,screenY:e.clientY,pressedAt:performance.now(),moved:false};canvas.setPointerCapture(e.pointerId);return true;
  }
  function moveDrag(e){
    if(!active())return false;if(!pointers.has(e.pointerId)){if(e.pointerType==='mouse'&&draft&&mode==='move')pointDraft(e);return true;}e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1){const next=gesture();if(pinch){radius=Math.max(12,Math.min(65,radius*pinch.distance/Math.max(12,next.distance)));panCamera(next.x-pinch.x,next.y-pinch.y);}pinch=next;return true;}if(!drag||drag.pointerId!==e.pointerId)return true;
    if(drag.orbit){if(drag.pan)panCamera(e.clientX-drag.x,e.clientY-drag.y);else{azimuth-=(e.clientX-drag.x)*.008;elevation=Math.max(.28,Math.min(1.48,elevation+(e.clientY-drag.y)*.006));}drag.x=e.clientX;drag.y=e.clientY;return true;}
    if(Math.hypot(e.clientX-drag.screenX,e.clientY-drag.screenY)>(touchLayout?12:8))drag.moved=true;if(touchLayout&&!drag.moved)return true;
    cast(e);if(!ray.ray.intersectPlane(plane,intersection))return true;const next={...drag.original},delta=intersection.clone().sub(drag.start),h=HOUSES[index],f=FURNITURE_BY_ID.get(next.t);
    if(drag.axis==='rotate'){const a=drag.start.clone().sub(drag.centre),b=intersection.clone().sub(drag.centre),angle=Math.atan2(normal.dot(a.clone().cross(b)),a.dot(b)),count=f.mount==='wall'?4:8;next.r=((next.r+Math.round(angle/(Math.PI*2/count)))%count+count)%count;}
    else{if(drag.axis==='x'||drag.axis==='plane'&&!(f.mount==='wall'&&drag.sideWall))next.x+=Math.round(delta.x*h.front/GRID);if(drag.axis==='z'||drag.axis==='plane'&&(f.mount!=='wall'||drag.sideWall))next.z+=Math.round(delta.z*h.front/GRID);if((f.mount==='wall'||f.allowHeight)&&(drag.axis==='y'||f.mount==='wall'&&drag.axis==='plane'))next.y+=Math.round(delta.y/(f.allowHeight?HEIGHT_GRID:GRID));}
    if(next.x===drag.candidate.x&&next.y===drag.candidate.y&&next.z===drag.candidate.z&&next.r===drag.candidate.r)return true;
    delete next.pair;Object.assign(next,pairFurniture(next,layouts[index].items));drag.candidate=next;drag.error=placementError(next,layouts[index].items);if(draft)draft={...next};else view.preview(index,next);drawSelection(next,drag.error);setStatus(drag.error||(draft?'「ここに置く」で確定':'離すと保存 · 25cmグリッド'),!!drag.error);return true;
  }
  function endDrag(e,cancel=false){
    if(!active())return false;pointers.delete(e.pointerId);if(pinch){if(pointers.size<2)pinch=null;drag=null;return true;}if(drag&&drag.pointerId!==e.pointerId)return true;if(drag&&!drag.orbit){const {original,candidate,error}=drag,tap=!cancel&&drag.tapRotate&&!drag.moved&&Math.hypot(e.clientX-drag.screenX,e.clientY-drag.screenY)<8&&performance.now()-drag.pressedAt<600;drag=null;if(draft){if(cancel)draft={...original};if(tap)rotate(1);else drawSelection();}else if(cancel||error){view.preview(index,original);drawSelection(original);if(error)notify(error);}else if(JSON.stringify(original)!==JSON.stringify(candidate)){if(!commit({action:'move',item:candidate})){view.preview(index,original);drawSelection(original);}}else if(tap)rotate(1);}drag=null;return true;
  }
  function receive(message){
    for(const [key,slot]of Object.entries(message.realms||{}).sort((a,b)=>a[1]-b[1]))registerMirrorRealm(key,slot);
    const h=houseDescriptor(message.index);if(!h)return;const i=h.index;layouts[i]??=emptyHouse();
    const record=cleanHouse(message.house);if(record.rev<layouts[i].rev&&pending?.requestId!==message.requestId)return;
    const completed=pending?.requestId===message.requestId?pending:null;layouts[i]=record;view.apply(i,record);cache();if(completed)pending=null;
    if(completed&&!message.error&&index===i&&completed.affected){if(completed.removing)undoItem={...completed.affected};const p=furniturePose(completed.affected);effectOrigin.copy(localToWorld(p.x,p.centerY,p.z));effectTime=0;effectRemoving=completed.removing;effect.material.color.set(effectRemoving?'#ffc394':'#baffd2');effect.visible=true;}
    if(index===i){if(drag&&!drag.orbit)drag=null;refresh();setStatus(message.error||'サーバーに保存済み',!!message.error);if(message.error)notify(message.error);}
  }
  function hydrate(records){if(active())close();pending=null;undoItem=null;view.resetMirrorRooms();replaceMirrorRealms(records?.$realms);layouts={};for(const key of new Set([...HOUSES.slice(0,8).map(h=>String(h.index)),...Object.keys(records||{})]))if(houseDescriptor(key)){layouts[key]=cleanHouse(records?.[key]);view.apply(key,layouts[key]);}cache();}
  function disconnected(){if(pending){const {index:i,previous}=pending;layouts[i]=previous;view.apply(i,previous);pending=null;cache();}if(active()){refresh();setStatus('接続が切れました。再接続後に編集してください',true);}}
  function viewport(){const rect=panel.getBoundingClientRect(),bottom=touchLayout&&currentPane!=='browse'&&innerHeight>=innerWidth||rect.width>innerWidth*.8&&rect.top>innerHeight*.3;return {width:bottom?innerWidth:Math.max(160,rect.left-8),height:bottom?Math.max(160,rect.top-8):innerHeight};}
  function fitCamera(top=false){azimuth=.62;elevation=top?1.48:.74;pan.set(0,0);const a=viewport(),tan=Math.tan(THREE.MathUtils.degToRad(50)/2),w=Math.cos(azimuth)*ROOM.x+Math.sin(azimuth)*ROOM.z,h=(Math.sin(azimuth)*ROOM.x+Math.cos(azimuth)*ROOM.z)*Math.sin(elevation)+ROOM.height*.4*Math.cos(elevation);radius=Math.max(16,Math.min(65,Math.max(w/(tan*innerWidth/innerHeight*a.width/innerWidth),h/(tan*a.height/innerHeight))+4));viewportKey='';}
  function updateCamera(dt){
    if(!active())return;const h=HOUSES[index],a=viewport(),key=innerWidth+','+innerHeight+','+a.width+','+a.height;if(key!==viewportKey){camera.setViewOffset(innerWidth,innerHeight,(innerWidth-a.width)/2,(innerHeight-a.height)/2,innerWidth,innerHeight);viewportKey=key;}gizmo.scale.setScalar(Math.max(1,radius/24)*(touchLayout?1.55:innerWidth<720?1.35:1));camera.fov=50;camera.updateProjectionMatrix();const target=new THREE.Vector3(h.x+pan.x,1.65,h.z+pan.y),desired=new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation)*radius,Math.sin(elevation)*radius,h.front*Math.cos(azimuth)*Math.cos(elevation)*radius).add(target);camera.position.lerp(desired,1-Math.exp(-dt*14));camera.lookAt(target);camera.updateMatrixWorld();view.setEditing(index,true,camera.position);
  }
  function update(dt,canOpen=false){clock+=dt;if(!active()){nearBoard=canOpen?Object.values(HOUSES).filter(h=>h&&h.owner===getSkin()).map(h=>({houseIndex:h.index,x:h.x,z:h.z+h.front*7.8})).find(h=>{const p=getPlayer();return p&&Math.hypot(p.x-h.x,p.z-h.z)<3&&Math.abs(p.y-.22)<3;}):null;$('homeEditPrompt').hidden=true;if(nearBoard)$('homeEditPrompt').firstChild.textContent=houseDescriptor(nearBoard.houseIndex)?.realm?'⌂ 鏡世界の自分の家を編集 ':'⌂ 自分の家を編集 ';}
    if(effectTime<.7){effectTime+=dt;const fade=Math.max(0,1-effectTime/.7);effect.material.opacity=fade;for(let n=0;n<24;n++){const angle=n*2.39996,r=.3+effectTime*(1+n%4*.3);effectTransform.position.set(effectOrigin.x+Math.cos(angle)*r,effectOrigin.y+(effectRemoving?-1:1)*effectTime*1.5+n%3*.12,effectOrigin.z+Math.sin(angle)*r);effectTransform.rotation.set(effectTime*3,angle,effectTime*2);effectTransform.scale.setScalar(.11*fade);effectTransform.updateMatrix();effect.setMatrixAt(n,effectTransform.matrix);}effect.instanceMatrix.needsUpdate=true;effect.visible=fade>0;}
    if(pending&&clock-pending.at>12){disconnected();notify('保存の応答がありません。再接続後に配置を確認してください',6000);}
    const connected=isConnected();if(connected!==connectedBefore){connectedBefore=connected;if(active())drawSelection();}
    if(footprint.visible)footprint.material.opacity=.15+Math.sin(clock*4)*.035;
  }
  for(const button of panel.querySelectorAll('[data-house-pane]'))button.onclick=()=>showPane(button.dataset.housePane);
  for(const button of panel.querySelectorAll('[data-house-tab]'))button.onclick=()=>{category=button.dataset.houseTab;cataloguePage=0;for(const b of panel.querySelectorAll('[data-house-tab]'))b.setAttribute('aria-selected',String(b===button));catalogue();};
  for(const section of [...new Set(FURNITURE.map(f=>f.section||'従来の家具'))])$('houseFurnitureSection').add(new Option(section,section));
  $('houseFurnitureSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();if(touchLayout)panel.querySelector('.house-editor-body').scrollTop=$('houseCatalogue').offsetTop-panel.querySelector('.house-browse-pane').offsetTop;}});
  $('houseFurnitureSearch').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{cataloguePage=0;catalogue();},120);};
  $('houseFurnitureSection').onchange=()=>{cataloguePage=0;catalogue();};
  $('houseCataloguePrev').onclick=()=>{cataloguePage--;catalogue();};$('houseCatalogueNext').onclick=()=>{cataloguePage++;catalogue();};
  for(const key of Object.keys(FINISHES)){const select=$('houseFinish-'+key);for(const [id,label]of FINISHES[key])select.add(new Option(label,id));select.onchange=()=>{if(!commit({action:'finish',surface:key,value:select.value}))refresh();};}
  for(let c=0;c<FURNITURE_COLORS.length;c++)$('houseColor').add(new Option(['赤','緑','水色','オレンジ','灰色','紫','黄色','茶色','白','黒','ナチュラル','青灰'][c],String(c)));
  $('houseColor').onchange = event => {
    color = Number(event.target.value);
    const selected = item();
    if (selected) {
      modify({ ...selected, c:color });
      return;
    }
    catalogue();
  };
  $('houseWall').onchange=e=>{wall=e.target.value;const selected=item();if(selected&&FURNITURE_BY_ID.get(selected.t).mount==='wall')modify({...selected,wall});};
  $('housePlaced').onchange=e=>{draft=null;ghost.visible=false;selectedId=e.target.value||null;mode='move';refresh();};$('closeHouseEditor').onclick=close;
  $('houseMoveMode').onclick=()=>{mode='move';drawSelection();};$('houseRotateMode').onclick=()=>{mode='rotate';drawSelection();};$('houseRotateLeft').onclick=()=>rotate(-1);$('houseRotateRight').onclick=()=>rotate(1);
  const addMore=document.createElement('button');addMore.id='houseAddMore';addMore.textContent='＋ 次の家具を選ぶ';panel.querySelector('.house-editor-footer').append(addMore);addMore.onclick=()=>{if(draft)return;showPane('browse');};
  const cancelDraft=()=>{draft=null;ghost.visible=false;refresh();showPane('browse');};
  $('houseConfirm').onclick=()=>{if(!draft)return;const candidate={...draft};draft=null;ghost.visible=false;selectedId=candidate.id;if(!commit({action:'add',item:candidate})){draft=candidate;selectedId=null;buildGhost();refresh();}};
  $('houseCancelDraft').onclick=cancelDraft;
  $('houseDelete').onclick=()=>{if(draft){cancelDraft();return;}const selected=item();if(selected&&commit({action:'delete',id:selected.id})){selectedId=null;refresh();}};
  $('houseUndo').onclick=()=>{if(undoItem){const restored={...undoItem};if(commit({action:'add',item:restored})){undoItem=null;draft=null;ghost.visible=false;selectedId=restored.id;refresh();}}};
  $('houseDuplicate').onclick=()=>{const selected=item();if(selected){color=selected.c;wall=selected.wall||wall;add(FURNITURE_BY_ID.get(selected.t));}};
  for(const [name,axis]of [['houseX','x'],['houseY','y'],['houseZ','z']])$(name).onchange=e=>{const selected=item(),value=Number(e.target.value);if(selected&&Number.isFinite(value))modify({...selected,[axis]:Math.round(value/(axis==='y'&&FURNITURE_BY_ID.get(selected.t).allowHeight?HEIGHT_GRID:GRID))});};
  for(const button of panel.querySelectorAll('[data-house-nudge]'))button.onclick=()=>{const selected=item();if(!selected)return;const f=FURNITURE_BY_ID.get(selected.t),side=f.mount==='wall'&&['left','right'].includes(selected.wall),direction=button.dataset.houseNudge,axis=['left','right'].includes(direction)?side?'z':'x':f.mount==='wall'?'y':'z',sign=['left','back'].includes(direction)?-1:1;modify({...selected,[axis]:selected[axis]+sign});};
  $('homeEditPrompt').onclick=()=>{if(nearBoard)open(nearBoard.houseIndex);};
  $('houseCameraOrbit').onclick=()=>{mode='orbit';drawSelection();};$('houseCameraPan').onclick=()=>{mode='pan';drawSelection();};$('houseCameraFit').onclick=()=>fitCamera();$('houseCameraTop').onclick=()=>fitCamera(true);
  $('houseFold').onclick=()=>{panel.dataset.folded=String(panel.dataset.folded!=='true');$('houseFold').textContent=panel.dataset.folded==='true'?(touchLayout?'操作を開く':'展開'):(touchLayout?'部屋を広く':'縮小');viewportKey='';};
  $('houseZoomIn').onclick=()=>{radius=Math.max(12,radius-3);};$('houseZoomOut').onclick=()=>{radius=Math.min(65,radius+3);};
  return {get interaction(){return nearBoard?{...nearBoard,y:2.5,label:'家をカスタマイズ',action:()=>open(nearBoard.houseIndex)}:null;},get active(){return active();},open,close,clickBoard,pointerDown:beginDrag,pointerMove:moveDrag,pointerUp:endDrag,receive,hydrate,disconnected,updateCamera,update,wheel(e){if(!active())return false;e.preventDefault();radius=Math.max(12,Math.min(65,radius+e.deltaY*.018));return true;},key(e){if(!active())return false;if(e.ctrlKey||e.metaKey)return false;if(e.code==='Escape'){e.preventDefault();if(draft)cancelDraft();else close();return true;}if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return true;e.preventDefault();if(e.code==='KeyG'){mode='move';drawSelection();}else if(e.code==='KeyV'){mode='orbit';drawSelection();}else if(e.code==='KeyT')fitCamera(true);else if(e.code==='KeyR')rotate(e.shiftKey?-1:1);else if(e.code==='Delete'||e.code==='Backspace')$('houseDelete').click();else if(e.code==='Enter'&&draft)$('houseConfirm').click();return true;}};
}
