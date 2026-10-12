import * as THREE from 'three';
import {copy,same,kitchenIdentity,kitchenResources} from './cooking-shared.js?v=20261012-life88';
import {cookingAppliance,cookingToolStand} from './cooking-appliances.js?v=20261012-life88';
import {tableForObject} from './dining.js?v=20261012-life88';
import {cookingLabel} from './cooking-labels.js?v=20261012-life88';
import {cookingCabinet} from './cooking-storage.js?v=20261012-life88';
import {cleanKitchenState,dishRating} from './cooking-state.js?v=20261012-life88';
import {recognizeKitchens,pinKitchenBoard} from './kitchen-layout.js?v=20261012-life88';
import {ROOM,FURNITURE_BY_ID,furniturePose} from './housing-data.js?v=20261012-life88';
import {INGREDIENTS,fridgeFoods,FOOD_BY_ID,FOOD_GROUPS,SEASONINGS,CUTS,COOK_METHODS,cleanMeal,describeDish} from './cooking-data.js?v=20261012-life88';
import {createCookingMotion} from './cooking-motion.js?v=20261012-life88';
import {toolModel,seasoningModel} from './cooking-tools.js?v=20261012-life88';
import {fridgeModel} from './cooking-fridge.js?v=20261012-life88';
import {createCookingPlacement} from './cooking-placement.js?v=20261012-life88';
import {part,foodModel,vesselModel,animateCookingModel} from './cooking-models.js?v=20261012-life88';
const toolNames={knife:'包丁',peeler:'ピーラー',grater:'おろし金',whisk:'泡立て器',spatula:'木べら',ladle:'おたま',tongs:'トング',colander:'ざる','rolling-pin':'めん棒',mitt:'ミトン',sponge:'スポンジ',board:'まな板',plate:'空のお皿'};
const vesselNames={pan:'フライパン',pot:'鍋',bowl:'ボウル',jug:'水差し'},capacity={pan:.8,pot:3,bowl:1.5,jug:1.5};
export function createCooking({scene,camera,get,send,notify,onStart,onEnd,onReposition=point=>get().player.position.copy(point),onMenu=()=>{},onPrecisionChange=()=>{}}){
 const style=document.createElement('style');style.textContent=`
 #cookingHUD[hidden],#cookingStart[hidden]{display:none!important}#cookingStart{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:35;padding:12px 20px}
 #cookingHUD{position:fixed;inset:0;pointer-events:none;z-index:55;color:#f4eee0;font-size:13px}
 #cookingHUD .cook-top{position:absolute;top:10px;left:10px;max-width:calc(100vw - 20px);display:flex;align-items:center;gap:8px;background:#1e302ddd;border-radius:12px;padding:8px 12px;font-size:12px}
 #cookingHUD button{pointer-events:auto;font:inherit;color:#eff8de;background:#354d40;border:1px solid #69827375;border-radius:8px;padding:9px 12px;min-height:42px;cursor:pointer}
 #cookingHUD button:disabled{opacity:.45}#cookingHUD button[hidden]{display:none}
 #cookingHUD .cook-readout{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);max-width:62vw;width:max-content;text-align:center;background:#17241fcc;border-radius:14px;padding:8px 16px}
 #cookingHUD p{margin:5px 0}#cookingHUD .cook-feedback{color:#f4dba2;font-size:11px}
 #cookingHUD .cook-dot{position:absolute;left:50%;top:50%;width:6px;height:6px;transform:translate(-50%,-50%);border:1px solid #244134;border-radius:50%;background:#eef6e5;box-shadow:0 0 4px #000}
 #cookingHUD .cook-timer{position:absolute;max-width:250px;padding:7px 10px;white-space:pre-line;text-align:center;transform:translate(-50%,-100%);font-size:11px;background:#192d27e6;border:1px solid #91bfa8;border-radius:10px}
 #cookingHUD progress{width:100%;height:8px;accent-color:#bce6bb}#cookingHUD .cook-food-state{color:#c8e5af;font-size:11px;max-height:70px;overflow:auto;pointer-events:auto}
 @media(max-width:600px){#cookingHUD .cook-top{font-size:11px;padding:6px;gap:4px}#cookingHUD .cook-top button{padding:7px}#cookingHUD .cook-readout{max-width:60vw;bottom:100px;font-size:12px;padding:6px 10px}}`;document.head.append(style);
 const start=document.createElement('button');start.id='cookingStart';start.hidden=true;start.textContent='自由にクッキングを始める';document.body.append(start);
 const hud=document.createElement('section');hud.id='cookingHUD';hud.hidden=true;hud.dataset.menu='false';hud.innerHTML='<div class="cook-top"><span class="cook-state"></span><button data-act="resume">操作へ戻る</button><button data-act="recover">通路へ戻る</button><button data-act="end">調理終了</button></div><span class="cook-dot"></span><div class="cook-readout"><p class="cook-carry"></p><p class="cook-prompt"></p><p class="cook-feedback" role="status"></p><p class="cook-food-state"></p><progress class="cook-progress" hidden max="1"></progress><button data-act="cancel-work" hidden>作業を中止</button></div><div class="cook-touch-actions"><button data-act="use">使う</button><button data-act="put-down" class="cook-touch-place">置く</button></div><div class="cook-timer" hidden></div>';document.body.append(hud);
 const visuals=new THREE.Group();visuals.name='Free cooking workspace';scene.add(visuals);if(!camera.parent)scene.add(camera);const held=new THREE.Group();held.position.set(.28,-.36,-.8);camera.add(held);held.visible=false;
 let zone=null,session=null,near=null,target=null,menuTarget=null,task=null,lastScan=-Infinity,lastUI=-Infinity,cache=new Map(),status='',lastVisualKey='',targetKey='',knife=null,picked=null,lastStroke=-Infinity,placeMode=false,fridgeAngle=0,fridgeRoot=null,running=false,storageRoots=[],lastSave=0,eating=null,wasConnected=false;
 let servingPhase=false,precisionWas=false,mealSeatKey='',mealSeatAt=0,autoMealKey='';
 const precisionMode=()=>!!(!running&&session&&(servingPhase||session.hand));
 function syncPrecision(){const current=precisionMode();if(current!==precisionWas){precisionWas=current;onPrecisionChange(current);}hud.hidden=!(running||current);document.body.dataset.handsOn=String(running||current);}
 const shared=new Map();let authoritative=null,pending=null,transactionDepth=0,transactionCue=null;
 const remoteMotions=new Map(),eatingPlayers=new Map();const remoteMotion=id=>{if(!remoteMotions.has(id))remoteMotions.set(id,createCookingMotion({scene,point:worldPoint}));return remoteMotions.get(id);};
 const remoteHeld=new THREE.Group();remoteHeld.name='Shared cooking hands';scene.add(remoteHeld);
 const carryHUD=document.createElement('div');carryHUD.className='cook-carry-world';carryHUD.hidden=true;carryHUD.innerHTML='<span></span><button>皿を置く</button>';document.body.append(carryHUD);carryHUD.querySelector('button').onclick=()=>{placeMode=!placeMode;};
 const ratingHUD=document.createElement('div');ratingHUD.className='cook-rating';ratingHUD.hidden=true;document.body.append(ratingHUD);
 function useCounter(station){if(['counter','board','sink'].includes(station?.role)&&!station.worldPosition&&session.worktops[station.item.id])session.activeCounterId=station.item.id;}
 function bindWorktops(){Object.defineProperties(session,{board:{get(){return this.worktops[this.activeCounterId].foods;},set(value){this.worktops[this.activeCounterId].foods=value;}},boardIndex:{get(){return this.worktops[this.activeCounterId].index;},set(value){this.worktops[this.activeCounterId].index=value;}}});}
 function storageItemStation(id){return zone.stations.find(s=>s.item.id===id)||equipment('counter');}
 function hideAppliances(hidden){for(const station of zone.stations.filter(s=>['counter','board','appliance','storage'].includes(s.role)||s===equipment('fridge')))get().housing?.setCookingApplianceHidden(zone.index,station.item.id,hidden);}
 function savedState(){return cleanKitchenState(shared.get(kitchenIdentity(zone.index,zone.id))?.state);}
 function requestKitchen(){if(get().connected&&zone)send({type:'kitchen-open',index:zone.index,kitchenId:zone.id});}
 function saveWorkspace(){lastSave=session?.elapsed||0;}
 function resourceSnapshot(){const state=cleanKitchenState({...session,index:zone.index,kitchenId:zone.id,key:zone.key,loose:placement.bodies.map(b=>({id:b.id,payload:b.payload,position:{x:b.p.x,y:b.p.y,z:b.p.z},shape:b.shape,velocity:b.velocity.y,tableId:b.tableId}))});return kitchenResources(state,{...(authoritative?.hands||{}),[get().selfId]:session.hand});}
 function transact(work,cue=null){
  if(transactionDepth){if(cue)transactionCue=cue;return work();}if(!session)return work();
  if(!get().connected||!authoritative||pending){status=!get().connected?'接続が戻るまで調理操作を待ってください':pending?'操作をサーバーに保存中です':'共有キッチンを読み込んでいます';drawUI();return true;}
  const before=resourceSnapshot();transactionDepth++;transactionCue=cue;
  try{return work();}finally{transactionDepth--;const after=resourceSnapshot(),changes=[];for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(!same(before[key],after[key]))changes.push({key,version:authoritative.versions[key]||0,before:before[key]??null,after:after[key]??null});
   syncPrecision();if(changes.length){const requestId=crypto.randomUUID();pending={requestId,at:performance.now()};send({type:'kitchen-edit',index:zone.index,kitchenId:zone.id,requestId,changes,cue:transactionCue});}transactionCue=null;
  }
 }
 function applyShared(record){
  if(!session||!record?.state)return;authoritative=copy(record);const state=cleanKitchenState(record.state),first=zone.worktops[0].item.id,local={activeCounterId:session.activeCounterId,cutMode:session.cutMode,selectedBurner:session.selectedBurner,activeStoveId:session.activeStoveId,ownerSkin:get().skin};
  const oldTask=task&&JSON.stringify(['counter','board','sink'].includes(task.station?.role)?session.worktops[task.station.item.id]?.foods:null);
  Object.assign(session,state,local);pinKitchenBoard(session,zone);for(const s of zone.worktops)session.worktops[s.item.id]??={foods:[],index:0,boardVisible:false};if(!session.worktops[session.activeCounterId])session.activeCounterId=first;session.homeFront=zone.home.front;session.hands=record.hands||{};session.hand=copy(record.hands?.[get().selfId]||null);
  if(task&&(task.guards?.some(g=>(record.versions[g.key]||0)!==g.version)||task.source?.type!==session.hand?.type||task.source?.id!==session.hand?.id||oldTask!==JSON.stringify(['counter','board','sink'].includes(task.station?.role)?session.worktops[task.station.item.id]?.foods:null))){task=null;status='作業中の食材をほかの人が使ったため、手作業を中止しました';}
  if(!session.hand)placeMode=false;placement.sync(state.loose);lastVisualKey='';renderModels(true);drawUI();syncPrecision();
 }
 function createSession(){const saved=savedState(),first=zone.boardStationId;session={hand:null,worktops:Object.fromEntries(zone.worktops.map((s,i)=>[s.item.id,{foods:[],index:0,boardVisible:s.item.id===zone.boardStationId}])),activeCounterId:first,cutMode:'dice',selectedBurner:0,activeStoveId:zone.stations.find(s=>s.role==='stove')?.item.id,foodGroup:'all',vessels:Object.fromEntries(Object.keys(vesselNames).map(id=>[id,makeVessel(id)])),dishes:[],takenDishes:[],elapsed:0,waterOn:false,homeFront:zone.home.front,fridgeOpen:false,foodPage:0,plateStationId:'',storageOpen:{},itemHomes:{},appliances:{},hands:{},ownerSkin:get().skin};if(saved){const worktops=session.worktops;Object.assign(session,saved);session.worktops=Object.fromEntries(zone.worktops.map(s=>[s.item.id,saved.worktops[s.item.id]||worktops[s.item.id]]));session.activeCounterId=session.worktops[saved.activeCounterId]?saved.activeCounterId:first;session.homeFront=zone.home.front;session.ownerSkin=get().skin;}pinKitchenBoard(session,zone);bindWorktops();authoritative=shared.get(kitchenIdentity(zone.index,zone.id))||null;session.hands=authoritative?.hands||{};session.hand=copy(session.hands[get().selfId]||null);placement.restore(saved?.loose||[]);hideAppliances(true);fridgeAngle=session.fridgeOpen?Math.PI*.61:0;lastVisualKey='';renderModels(true);}
 function disposeWorkspace(){if(zone)hideAppliances(false);placement.clear();clearModels(visuals);clearModels(held);session=null;zone=null;servingPhase=false;eating=null;mealSeatKey=autoMealKey='';syncPrecision();held.visible=false;carryHUD.hidden=true;document.body.dataset.carryingMeal='false';clearModels(diningVisual);clearModels(remoteHeld);for(const motion of remoteMotions.values())motion.clear();remoteMotions.clear();eatingPlayers.clear();authoritative=null;pending=null;}

 const placement=createCookingPlacement({scene,camera,get,modelFor:looseModel,bounds:()=>({...(!running?{minX:zone.home.x-ROOM.x+.15,maxX:zone.home.x+ROOM.x-.15,minZ:zone.home.z-ROOM.z+.15,maxZ:zone.home.z+ROOM.z-.15}:zone.bounds),floor:ROOM.floor})});
 const pickMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
 const pickGeometry=new THREE.BoxGeometry(1,1,1);
 function clearModels(group){group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});group.clear();}
 function looseModel(hand){if(hand.type==='food')return foodModel(hand.food);if(hand.type==='vessel')return vesselModel(session.vessels[hand.id]);if(hand.type==='dish')return vesselModel({...hand.dish.meal,kind:'plate'},{dish:true});if(hand.type==='seasoning')return seasoningModel(hand.id);const tool=toolModel(hand.id);tool.rotation.x=Math.PI/2;return tool;}
 function away(type,id){return Object.values(session.hands||{}).some(h=>h?.type===type&&h.id===id)||session.hand?.type===type&&session.hand.id===id||placement.bodies.some(b=>b.payload.type===type&&b.payload.id===id);}
 function pickArea(model,w,h,d,y=h/2){const mesh=new THREE.Mesh(pickGeometry,pickMaterial);mesh.scale.set(w,h,d);mesh.position.y=y;model.add(mesh);}
 function togglePlacement(){if(!session?.hand||task)return;placeMode=!placeMode;if(!placeMode)placement.hide();status=placeMode?'置きたい平面を狙ってクリック · 緑の枠に置けます':'通常の調理操作に戻りました';drawUI();}
 function releaseHand(ndc){return transact(()=>releaseHandLocal(ndc));}
 function releaseHandLocal(ndc){if(!session?.hand||task)return false;const message=placement.release(session.hand,ndc);if(message){status=message;drawUI();return true;}const body=placement.bodies.at(-1);if(body){const table=tableAt(body.p);body.tableId=table?.item.id||'';}const v=handVessel();if(v){v.location='loose';v.fire=0;v.timer=null;}session.hand=null;servingPhase=false;placeMode=false;status='手を離しました。置いた物はクリックで再び持てます';renderModels(true);drawUI();return true;}
 function looseStation(body){return {...equipment('counter'),worldPosition:body.p.clone().add(new THREE.Vector3(0,body.shape.height,0))};}
 const diningVisual=new THREE.Group();diningVisual.name='Meal at dining table';scene.add(diningVisual);
 const motion=createCookingMotion({scene,point:worldPoint});
 const raycaster=new THREE.Raycaster(),upAxis=new THREE.Vector3(0,1,0);
 const operationTimes={wash:4,fill:4,drain:2,clean:4,mix:5,stir:2,plate:2,peel:3,grate:4,knead:5,roll:4};
 const equipment=role=>role==='stove'?(zone?.stations.find(s=>s.role==='stove'&&s.item.id===session?.activeStoveId)||zone?.stations.find(s=>s.role==='stove')):role==='counter'?(zone?.worktops.find(s=>s.item.id===session?.activeCounterId)||zone?.worktops[0]):zone?.stations.find(s=>s.role===role),handVessel=()=>session?.hand?.type==='vessel'?session.vessels[session.hand.id]:null;
 function worldPoint(station){if(station.worldPosition)return station.worldPosition.clone();const h=zone.home;return new THREE.Vector3(h.x+station.x*h.front,ROOM.floor+station.y+station.def.h*.88+.025,h.z+station.z*h.front);}
 function burner(){return Object.values(session.vessels).find(v=>v.location==='stove'&&(!v.counterId||v.counterId===equipment('stove')?.item.id)&&v.slot===session.selectedBurner);}
 function counterBowl(){return session.vessels.bowl.location==='counter'&&session.vessels.bowl.counterId===session.activeCounterId?session.vessels.bowl:null;}
 function nearbyVessel(){return menuTarget?.role==='stove'?burner():handVessel()||counterBowl();}
 function makeVessel(kind){return {kind,foods:[],seasonings:{},water:0,temperature:20,fire:0,covered:false,mixed:false,mode:kind==='pan'?'fry':'boil',location:'drawer',slot:0,stirs:0,lastStir:0,cookSeconds:0,timer:null,timerDone:false};}
 function begin(){if(!near||get().cameraMode!=='first')return;const candidate=near;if(session&&(String(zone.index)!==String(candidate.index)||zone.id!==candidate.id||session.ownerSkin!==get().skin)){saveWorkspace();disposeWorkspace();}zone=candidate;const entry=safeEntry();if(!entry){notify('通路に体が入る空間がありません。家具の間を広げてください');return;}if(get().cameraMode!=='first')onReposition(entry);if(!session)createSession();requestKitchen();running=true;servingPhase=false;syncPrecision();near=null;menuTarget=null;task=null;target=null;placeMode=false;hud.dataset.menu='false';status='まな板はカウンターの上にあります。収納から皿・道具を取り、冷蔵庫の食材を運べます';start.hidden=true;hud.hidden=false;carryHUD.hidden=true;document.body.dataset.cooking='true';onStart(zone);wasConnected=get().connected;send({type:'cooking-start',index:zone.index,kitchenId:zone.id,recipe:'free'});renderModels(true);drawUI();}
 function end(){if(!running){servingPhase=false;placeMode=false;placement.hide();syncPrecision();return;}send({type:'kitchen-work',index:zone.index,kitchenId:zone.id,cancel:true});saveWorkspace(true);send({type:'cooking-stop'});running=false;target=null;menuTarget=null;task=null;placeMode=false;placement.hide();motion.clear();hud.hidden=true;document.body.dataset.cooking='false';syncPrecision();onEnd();start.hidden=true;}
 function placeModel(model,station,dx=0,dz=0){const h=zone.home,yaw=station.yaw+(h.front<0?Math.PI:0);model.position.copy(worldPoint(station));model.position.x+=Math.cos(yaw)*dx+Math.sin(yaw)*dz;model.position.z+=-Math.sin(yaw)*dx+Math.cos(yaw)*dz;model.rotation.y=yaw;visuals.add(model);}
 function pickable(model,station,type,id){model.userData.pick={station,type,id};return model;}
 function safeEntry(){
  const state=get(),candidates=[...zone.safeStarts].sort((a,b)=>Math.hypot(a.x-state.player.position.x,a.z-state.player.position.z)-Math.hypot(b.x-state.player.position.x,b.z-state.player.position.z));
  return candidates.find(p=>state.world.canStand(p,state.shape))||null;
 }
 function renderModels(force=false){
  if(!session)return;
  const key=JSON.stringify([session.hand,session.cutMode,session.worktops,session.storageOpen,session.plateStationId,session.dishes,session.takenDishes,session.hands,session.itemHomes,session.appliances,session.waterOn,session.fridgeOpen,session.foodGroup,session.foodPage,placement.bodies.map(b=>b.id),Object.values(session.vessels).map(v=>({...v,cookSeconds:0,timer:null,temperature:Math.floor(v.temperature/5)*5,water:Math.round(v.water*20)/20,foods:v.foods.map(f=>({...f,progress:Math.floor(f.progress/5)*5,burn:Math.floor(f.burn/10)*10}))}))]);
  if(!force&&key===lastVisualKey)return;lastVisualKey=key;clearModels(visuals);clearModels(held);placement.refresh();clearModels(remoteHeld);held.visible=!!session.hand;
  const counter=equipment('counter'),stove=equipment('stove'),sink=equipment('sink'),fridge=equipment('fridge'),supportMeshes=[];storageRoots=[];
  const tools=Object.keys(toolNames).filter(id=>id!=='board'),spices=Object.keys(SEASONINGS),drawerFor=(type,id)=>{const list=type==='tool'?tools:type==='seasoning'?spices:Object.keys(vesselNames);return zone.stations.find(s=>s.item.id===session.itemHomes[type+':'+id])||(type==='tool'&&id==='knife'?zone.stations.find(s=>['knife-block','cooking-knife'].includes(s.def.id)):type==='vessel'&&['pan','pot'].includes(id)?zone.stations.find(s=>s.def.id==='pot-rack-wall'):null)||zone.stations.filter(s=>s.role==='counter')[list.indexOf(id)%zone.stations.filter(s=>s.role==='counter').length];};
  for(const [n,station] of zone.worktops.entries()){
   if(station.role!=='sink'){const cabinet=cookingCabinet(station,!!session.storageOpen[station.item.id],pickable);if(station.role==='board'){cabinet.root.visible=false;}placeModel(cabinet.root,station);cabinet.root.position.y=ROOM.floor+station.y;storageRoots.push(cabinet.root);if(station.role==='counter')supportMeshes.push(cabinet.top);pickable(cabinet.top,station,'worktop');
   for(const [i,id]of tools.filter(id=>drawerFor('tool',id)===station).entries()){if(away('tool',id))continue;const tool=toolModel(id);tool.scale.setScalar(.65);if(id!=='colander')tool.rotation.x=Math.PI/2;tool.position.set((i-1)*Math.min(.42,cabinet.w/4),cabinet.h*.75,.03);pickArea(tool,.25,.2,.3);pickable(tool,station,'tool',id);cabinet.contents.add(tool);}
   for(const [i,id]of spices.filter(id=>drawerFor('seasoning',id)===station).entries()){if(away('seasoning',id))continue;const jar=seasoningModel(id);jar.position.set((i-1)*Math.min(.3,cabinet.w/4),cabinet.h*.5,cabinet.d*.16);pickArea(jar,.12,.16,.12);pickable(jar,station,'spice',id);cabinet.contents.add(jar);}
   }
   const work=session.worktops[station.item.id],prepStation=station;
   if(work.boardVisible||work.foods.length){
    const board=new THREE.Group();if(work.boardVisible){part(board,'box',0,0,0,.65,.028,.4,'#b48b58');for(let i=0;i<7;i++)part(board,'box',-.27+i*.09,.015,0,.002,.001,.37,'#936b43');}
    for(let i=0;i<work.foods.length;i++){const food=foodModel(work.foods[i]);food.position.set((i%2-.5)*.22,.018,(Math.floor(i/2)-.5)*.13);food.scale.setScalar(.8);pickable(food,prepStation,'board-food',String(i));board.add(food);}
    for(const [i,mode]of (work.boardVisible?['dice','slice','mince']:[]).entries()){const marking=cookingLabel((session.cutMode===mode?'● ':'')+CUTS[mode],.2,.065);marking.rotation.x=-Math.PI/2;marking.position.set((i-1)*.215,.018,-.19);pickable(marking,prepStation,'cut-style',mode);board.add(marking);}if(work.boardVisible)pickable(board,prepStation,'board');placeModel(board,prepStation);if(work.boardVisible)supportMeshes.push(board.children[0]);
   }
   if(session.plateStationId===station.item.id){const plate=new THREE.Group();part(plate,'disc',0,.018,0,.55,.027,.55,'#f6f0df');pickable(plate,station,'serve');placeModel(plate,station);}
   const dishes=session.dishes.filter(d=>d.counterId===station.item.id&&!d.eaten&&!session.takenDishes.includes(d.id));
   for(const [i,dish]of dishes.entries()){const model=vesselModel({...dish.meal,kind:'plate'},{dish:true});model.scale.setScalar(.9);pickable(model,station,'dish',dish.id);placeModel(model,station,dishes.length===1?0:(i%3-1)*.58,Math.floor(i/3)*.45);}
  }
  for(const [id,v]of Object.entries(session.vessels)){
   if(v.location==='loose'||v.location==='appliance')continue;const model=vesselModel(v);
   if(v.location==='hand'){if(session.hand?.type==='vessel'&&session.hand.id===id){held.add(model);model.scale.setScalar(.75);}continue;}
   if(v.location==='drawer'){const station=drawerFor('vessel',id),cabinet=storageRoots.find(root=>root.userData.storage.station===station);pickable(model,station,'vessel',id);if(cabinet){model.position.set(0,station.h*.88*.18,0);cabinet.userData.storage.contents.add(model);}else placeModel(model,station,0,0);continue;}
   const station=v.location==='stove'?(zone.stations.find(s=>s.item.id===v.counterId)||stove):storageItemStation(v.counterId);pickable(model,station,'vessel',id);placeModel(model,station,v.location==='stove'?(v.slot===0?-.28:.28):0,0);
   if(v.location==='stove'&&v.kind==='pot'){const knob=new THREE.Group();part(knob,'round',0,0,0,.095,.06,.095,'#35434b');pickable(knob,station,'lid',id);placeModel(knob,station,v.slot===0?-.28:.28,0);knob.position.y+=.38;}
  }
  for(const station of zone.stations.filter(s=>s.role==='storage')){
   const stand=cookingToolStand(station,pickable);placeModel(stand,station);stand.position.y=ROOM.floor+station.y;
   for(const [i,id]of tools.filter(id=>drawerFor('tool',id)===station).entries()){if(away('tool',id))continue;const model=toolModel(id);model.scale.setScalar(.7);model.position.set((i%3-1)*.16,.11,0);pickable(model,station,'tool',id);stand.add(model);}
   for(const [i,id]of spices.filter(id=>drawerFor('seasoning',id)===station).entries()){if(away('seasoning',id))continue;const model=seasoningModel(id);model.position.set((i%3-1)*.15,.09,0);pickable(model,station,'spice',id);stand.add(model);}
  }
  for(const station of zone.stations.filter(s=>s.role==='appliance')){
   const a=session.appliances[station.item.id]||{},appliance=cookingAppliance(station,a,pickable);placeModel(appliance.root,station);appliance.root.position.y=ROOM.floor+station.y;supportMeshes.push(appliance.tray);
   if(a.vesselId){const v=session.vessels[a.vesselId];if(v?.location==='appliance'){const model=vesselModel(v);model.scale.setScalar(Math.min(.65,appliance.w/.65));model.position.y=.08;pickable(model,station,'vessel',v.kind);appliance.inside.add(model);}}
  }
  for(const [id,hand]of Object.entries(session.hands||{})){if(id===get().selfId||!hand)continue;const model=looseModel(hand);model.scale.setScalar(.65);model.userData.playerId=id;remoteHeld.add(model);}
  for(const stove of zone.stations.filter(s=>s.role==='stove'))for(let i=0;i<2;i++){
   const dx=i===0?-.28:.28,v=Object.values(session.vessels).find(v=>v.location==='stove'&&(!v.counterId||v.counterId===stove.item.id)&&v.slot===i);
   if(!v){const burner=new THREE.Group();part(burner,'box',0,.006,0,.32,.012,.32,'#243530');pickable(burner,stove,'burner',String(i));placeModel(burner,stove,dx,0);}
   const knob=new THREE.Group();part(knob,'disc',0,0,0,.11,.045,.11,'#35434b');part(knob,'box',0,.025,.025,.012,.008,.026,'#f2de9d');pickArea(knob,.14,.08,.14,0);pickable(knob,stove,'fire',String(i));placeModel(knob,stove,dx,.3);
   const fireLabel=cookingLabel(['消火','弱火','中火','強火'][v?.fire||0],.2,.07);fireLabel.rotation.x=-Math.PI/2;fireLabel.position.set(0,.03,0);knob.add(fireLabel);
   const timer=new THREE.Group();part(timer,'box',0,0,0,.23,.065,.025,'#8b7454');const seconds=v?.timer?.duration||0,label=cookingLabel(seconds?seconds<60?seconds+'秒':seconds/60+'分':'タイマーOFF',.23,.065);label.position.z=.014;timer.add(label);pickable(timer,stove,'stove-timer',String(i));placeModel(timer,stove,dx,stove.d*.44+.022);timer.position.y-=.13;
   const modes=['fry','boil','simmer','steam',...(stove.def.family==='oven'?['bake']:[])];
   for(const [n,mode]of modes.entries()){const button=new THREE.Group();part(button,'box',0,0,0,.21,.066,.024,v?.mode===mode?'#897b47':'#36483b');const text=cookingLabel({fry:'炒める',boil:'ゆでる',simmer:'煮る',steam:'蒸す',bake:'焼く'}[mode],.21,.066);text.position.z=.014;button.add(text);pickable(button,stove,'stove-mode',i+':'+mode);placeModel(button,stove,dx+(n%2-.5)*.23,stove.d*.44+.022);button.position.y-=.23+Math.floor(n/2)*.075;}
  }

  const faucet=new THREE.Group();part(faucet,'disc',0,.22,0,.055,.035,.055,'#b9c8cf');pickable(faucet,sink,'faucet');placeModel(faucet,sink,.18,-.12);
  if(session.hand?.type==='food')held.add(foodModel(session.hand.food));
  if(session.hand?.type==='dish')held.add(looseModel(session.hand));
  if(session.hand?.type==='tool'){const tool=toolModel(session.hand.id);tool.rotation.z=-.6;held.add(tool);}
  if(session.hand?.type==='seasoning')held.add(seasoningModel(session.hand.id));
  if(session.hand&&get().avatar?.createFirstPersonHand){const hand=get().avatar.createFirstPersonHand();hand.rotation.y=Math.PI;hand.position.set(0,.1,.08);held.add(hand);}
  if(session.waterOn){const water=new THREE.Group();for(let i=0;i<12;i++){const drop=part(water,'round',0,.3-i*.025,0,.012,.035,.012,'#9ad9e7');drop.userData.effect={kind:'waterfall',i};}placeModel(water,sink);}
  fridgeRoot=fridgeModel(fridge,session,pickable);placeModel(fridgeRoot,fridge);fridgeRoot.position.y=ROOM.floor+fridge.y;fridgeRoot.userData.door.rotation.y=-fridgeAngle;fridgeRoot.userData.contents.visible=fridgeAngle>.6;placement.setSurfaces(supportMeshes);

 }
 function selectTarget(ndc={x:0,y:0}){
  target=null;picked=null;if(!session)return;camera.updateMatrixWorld(true);raycaster.setFromCamera(ndc,camera);
  let best=3.6;const range=best,h=zone.home;
  for(const station of zone.stations){
   const yaw=station.yaw+(h.front<0?Math.PI:0),center=new THREE.Vector3(h.x+station.x*h.front,ROOM.floor+station.centerY,h.z+station.z*h.front);
   const local=raycaster.ray.clone();local.origin.sub(center).applyAxisAngle(upAxis,-yaw);local.direction.applyAxisAngle(upAxis,-yaw);
   const box=new THREE.Box3(new THREE.Vector3(-station.w/2,-station.h/2,-station.d/2),new THREE.Vector3(station.w/2,station.h/2+.4,station.d/2));
   const hit=local.intersectBox(box,new THREE.Vector3());if(!hit)continue;
   hit.applyAxisAngle(upAxis,yaw).add(center);const distance=hit.distanceTo(camera.position);if(distance>best)continue;
   if(get().world.cameraPosition(camera.position,hit,.01,'furniture:'+zone.index+':'+station.item.id).distanceTo(hit)>.1)continue;
   target=station;best=distance;
  }
  visuals.updateMatrixWorld(true);placement.root.updateMatrixWorld(true);
  for(const hit of raycaster.intersectObjects([visuals,placement.root],true)){
   if(hit.distance>range)break;let node=hit.object,visible=true;while(node){if(!node.visible)visible=false;node=node.parent;}if(!visible)continue;
   let object=hit.object;while(object&&!object.userData.pick&&!object.userData.body)object=object.parent;
   const body=object?.userData.body,pick=body?{station:looseStation(body),type:body.payload.type==='vessel'?'vessel':'loose',id:body.payload.id,body}:object?.userData.pick;if(!pick||!inReach(pick.station))continue;
   if(get().world.cameraPosition(camera.position,hit.point,.01,pick.body?null:'furniture:'+zone.index+':'+pick.station.item.id).distanceTo(hit.point)>.12)continue;
   picked=pick;target=pick.station;break;
  }
 }

 function inReach(station){return station&&worldPoint(station).distanceTo(get().player.position.clone().add(new THREE.Vector3(0,1,0)))<4.4;}
 function closeMenu(){menuTarget=null;}

 function merge(source,destination){if(!destination||source===destination||destination.foods.length+source.foods.length>16||destination.water+source.water>capacity[destination.kind]){status='食材または水の量が容器の容量を超えます。先に盛り付けるか湯切りしてください';return false;}destination.foods.push(...source.foods);source.foods=[];for(const [id,n]of Object.entries(source.seasonings)){destination.seasonings[id]=Math.min(8,(destination.seasonings[id]||0)+n);}source.seasonings={};destination.mixed||=source.mixed;destination.kneaded||=source.kneaded;destination.rolled||=source.rolled;source.kneaded=source.rolled=false;const liquid=source.water+destination.water;if(liquid>0)destination.temperature=(source.temperature*source.water+destination.temperature*destination.water)/liquid;destination.water=liquid;source.water=0;return true;}
 function plate(v,station){if(!v||!v.foods.length||!station||session.plateStationId!==station.item.id)return;if(session.dishes.filter(d=>!d.eaten).length>=24){status='料理の皿が24枚あります。食卓の料理を食べてから次を盛り付けてください';return;}session.dishes=session.dishes.filter(d=>!d.eaten);const meal=cleanMeal(v),dish=describeDish(meal),id=crypto.randomUUID();session.dishes.push({id,meal,...dish,counterId:station.item.id});session.plateStationId='';if(session.hand?.type==='vessel'&&session.vessels[session.hand.id]===v){session.hand=null;v.location='drawer';}v.foods=[];v.seasonings={};v.water=0;v.fire=0;v.covered=false;v.mixed=false;v.kneaded=false;v.rolled=false;v.cookSeconds=0;v.timer=null;v.timerDone=false;status='完成：'+dish.name+' · '+dish.quality+'（'+dish.subtitle+'）';renderModels(true);servingPhase=true;end();notify('盛り付けました。皿をクリックして持ち、机に並べてから、椅子に座って食べられます',5000);}
 function action(id,completed=false,station=menuTarget,vesselId=null){if(['end','recover','close','resume','use','equipment','put-down','cancel-work'].includes(id))return actionLocal(id,completed,station,vesselId);return transact(()=>actionLocal(id,completed,station,vesselId),{id,stationId:station?.item.id,source:handSnapshot()});}
 function actionLocal(id,completed=false,station=menuTarget,vesselId=null){
  if(id==='end'){end();return;}if(id==='recover'){const entry=safeEntry();if(entry){task=null;onReposition(entry);closeMenu();status='通路の空いている位置へ戻りました';}else notify('家具の間に通路を空けてください');return;}if(id==='close'||id==='resume'){closeMenu();if(id==='resume')onMenu(false,true);return;}
  if(id==='use'){interact();return;}
  if(id==='put-down'&&session){if(session.hand?.type==='tool'&&['board','plate'].includes(session.hand.id)&&target?.role==='counter'&&picked?.type==='worktop')interact();else releaseHand();return;}
  if(id==='release'&&session){releaseHand();return;}
  if(id==='cancel-work'){send({type:'kitchen-work',index:zone.index,kitchenId:zone.id,cancel:true});task=null;status='作業を中止しました';drawUI();return;}
  if(!session||task&&!completed)return;useCounter(station);if(station?.role==='stove')session.activeStoveId=station.item.id;target=station;if(!inReach(target)){closeMenu(false);status='家具の近くへ移動してください';return;}
  const role=target.role,h=session.hand,v=handVessel(),onStove=role==='stove',onCounter=role==='counter'||role==='board'||role==='sink'&&target.item.id===zone.boardStationId,onSink=role==='sink',active=vesselId?session.vessels[vesselId]:onStove?burner():v||counterBowl();
  if(active?.covered&&['sprinkle','container-add','stove-add','stove-pour','pour-water','stir'].includes(id)){status='先に鍋のふたをクリックして開けてください';drawUI();return;}
  if(!completed&&(id==='cut'||Object.hasOwn(operationTimes,id))){
   const food=session.board[session.boardIndex];
   const valid=id==='cut'?onCounter&&food&&!h:id==='mix'?onCounter&&active?.foods.length:id==='stir'?onStove&&burner()?.foods.length:id==='plate'?onCounter&&active?.foods.length:id==='wash'?onSink&&session.waterOn&&(h?.type==='food'||v?.foods.length):id==='fill'?onSink&&session.waterOn&&v:id==='drain'?onSink&&v?.water>0:id==='clean'?onSink&&session.waterOn&&v&&!v.foods.length:id==='peel'||id==='grate'?onCounter&&food:id==='knead'||id==='roll'?onCounter&&active?.foods.some(f=>f.id==='flour'):false;
   if(!valid)return;
   const duration=id==='cut'?(food.id==='egg'?1.2:session.cutMode==='mince'?7:session.cutMode==='dice'?5:3):id==='fill'?Math.max(.5,(capacity[v.kind]-v.water)*2):operationTimes[id];
   const names={cut:food?.id==='egg'?'卵を割る':CUTS[session.cutMode],wash:'食材を洗う',fill:'水をくむ',drain:'湯切り',clean:'容器を洗う',mix:'混ぜる',stir:'混ぜる／裏返す',plate:'盛り付け',peel:'皮をむく',grate:'すりおろす',knead:'生地をこねる',roll:'生地を伸ばす'};
   task={id,station,vesselId,source:handSnapshot(),duration,remaining:duration,origin:get().player.position.clone(),label:names[id],foodIndex:session.boardIndex,cutMode:session.cutMode,guards:[...new Set([onCounter?'board:'+target.item.id:null,active?'vessel:'+active.kind:null,h?'hand:'+get().selfId:null].filter(Boolean))].map(key=>({key,version:authoritative?.versions[key]||0}))};
   send({type:'kitchen-work',index:zone.index,kitchenId:zone.id,id,stationId:station.item.id,duration,source:handSnapshot()});status=names[id]+'を開始しました';closeMenu();drawUI();return;
  }

 if(!completed)motion.play(id,target,handSnapshot());
 if(role==='appliance'&&id.startsWith('appliance-')){
  const a=session.appliances[target.item.id]??={open:false,remaining:0,duration:0,vesselId:'',done:false},kind=target.def.id;
  if(id==='appliance-open'&&!a.remaining)a.open=!a.open;
  else if(id==='appliance-load'&&v&&a.open&&!a.vesselId){if(kind==='microwave'&&['pan','pot'].includes(v.kind)){status='レンジには金属の鍋を入れられません。ボウルに移してください';}else {a.vesselId=v.kind;v.location='appliance';v.counterId=target.item.id;v.fire=0;v.timer=null;session.hand=null;status='容器を中に入れました';}}
  else if(id==='appliance-take'&&!h&&a.vesselId&&a.open&&!a.remaining){const item=session.vessels[a.vesselId];session.hand={type:'vessel',id:a.vesselId};item.location='hand';a.vesselId='';status='容器を取り出しました';}
  else if(id==='appliance-duration'&&!a.remaining){const times=[30,60,120,300];a.duration=times[(times.indexOf(a.duration||60)+1)%times.length];status='運転時間：'+timeLabel(a.duration);}
  else if(id==='appliance-stop'){a.remaining=0;a.done=false;status='運転を止めました';}
  else if(id.startsWith('appliance-run-')&&a.vesselId&&!a.open){const item=session.vessels[a.vesselId],seconds=Number(id.slice(14));if(![30,60,120,300].includes(seconds))return;
   if(kind==='rice-cooker'&&(!item.foods.some(f=>f.id==='rice')||item.water<.2))status='炊飯には米と水を入れた容器を使ってください';else if(kind==='dishwasher'&&item.foods.length)status='食材を取り出してから容器を洗ってください';else if(kind==='kettle'&&!item.water)status='水を入れた水差しを使ってください';else {a.remaining=a.duration=seconds;a.done=false;item.mode=['blender','stand-mixer'].includes(kind)?'mix':kind==='toaster'?'bake':'steam';status=target.def.name+'を開始 · '+timeLabel(seconds);}
  }else status='扉を開けて容器を入れ、閉めてから開始してください';
 }
 else if(id==='storage-return'&&role==='storage'&&h&&['tool','seasoning','vessel'].includes(h.type)){
  if(h.type==='vessel'){v.location='drawer';v.counterId=target.item.id;}session.itemHomes[h.type+':'+h.id]=target.item.id;session.hand=null;status=target.def.name+'に保管しました';
 }
 else if(id==='storage'&&onCounter){session.storageOpen[target.item.id]=!session.storageOpen[target.item.id];status=session.storageOpen[target.item.id]?'収納の道具・調味料・容器をクリックして取れます':'収納を閉めました';}
 else if(id==='show-board'){pinKitchenBoard(session,zone);if(h?.type==='tool'&&h.id==='board')session.hand=null;status='まな板はカウンターの上に固定されています';}
 else if(id==='show-plate'&&onCounter){const work=session.worktops[target.item.id];if(work.foods.length||session.dishes.some(d=>d.counterId===target.item.id&&!d.eaten&&!session.takenDishes.includes(d.id))||Object.values(session.vessels).some(v=>v.location==='counter'&&v.counterId===target.item.id)){status='食材や容器のない別のカウンターに皿を出してください';}else {work.boardVisible=false;session.plateStationId=target.item.id;if(h?.type==='tool'&&h.id==='plate')session.hand=null;status='盛り付け皿を出しました。調理した容器を持って皿をクリックしてください';}}
 else if(id==='chop'&&onCounter&&session.board.length&&h?.type==='tool'&&h.id==='knife'){if(performance.now()/1000-lastStroke<.22)return;lastStroke=performance.now()/1000;const f=session.board[session.boardIndex]||session.board[0],strokes=session.cutMode==='mince'?7:session.cutMode==='dice'?5:3;f.cuts=Math.min(3,(f.cuts||0)+3/strokes);if(f.cuts>=2.999)f.cut=session.cutMode;status=f.cut?FOOD_BY_ID.get(f.id).name+'を'+CUTS[f.cut]+'にしました':'包丁で切っています · '+Math.round(f.cuts/3*100)+'%';}
 else if(id==='container-add'&&h?.type==='food'&&active&&active.foods.length<16){active.foods.push(h.food);session.hand=null;status=FOOD_BY_ID.get(h.food.id).name+'を追加しました · '+active.foods.map(f=>FOOD_BY_ID.get(f.id).name).join(' ＋ ');}
 else if(id==='sprinkle'&&h?.type==='seasoning'&&active){if(performance.now()/1000-lastStroke<.25)return;lastStroke=performance.now()/1000;active.seasonings[h.id]=Math.min(8,(active.seasonings[h.id]||0)+1);status=SEASONINGS[h.id]+'を振りかけました · '+active.seasonings[h.id]+'杯';}
 else if(id==='peel'&&onCounter&&session.board.length){session.board[session.boardIndex].peeled=true;status='皮をむきました';}
 else if(id==='grate'&&onCounter&&session.board.length){session.board[session.boardIndex].cut='grate';session.board[session.boardIndex].cuts=3;status='すりおろしました';}
 else if(id==='knead'&&onCounter&&active){active.mixed=true;active.kneaded=true;status='生地をこねました';}
 else if(id==='roll'&&onCounter&&active){active.rolled=true;status='生地を薄く伸ばしました';}
 else if(id==='open-fridge'&&role==='fridge'){session.fridgeOpen=!session.fridgeOpen;status='冷蔵庫の食材をクリックして取り出せます。Eで食材の種類を変更';}
 else if(id.startsWith('group-')&&role==='fridge'){session.foodGroup=id.slice(6);session.foodPage=0;session.fridgeOpen=true;closeMenu();}
 else if(id==='fridge-next'&&role==='fridge'){session.foodPage=(session.foodPage+1)%Math.max(1,Math.ceil(fridgeFoods(session.foodGroup).length/8));session.fridgeOpen=true;closeMenu();}
 else if(id.startsWith('take-food-')&&role==='fridge'&&session.fridgeOpen&&fridgeAngle>.6&&!h){const f=FOOD_BY_ID.get(id.slice(10));if(!f)return;session.hand={type:'food',food:{id:f.id,washed:!f.wash,cut:null,cuts:0,progress:0,burn:0,method:'raw'}};status=f.name+'を手に持ちました。好きな作業台へ運んでください';}
 else if(id==='return-food'&&role==='fridge'&&h?.type==='food'){session.hand=null;status='食材を冷蔵庫へ戻しました';}
 else if(id.startsWith('take-vessel-')&&(onCounter||role==='storage'||role==='appliance')&&!h){const kind=id.slice(12),item=session.vessels[kind];if(item&&['drawer','counter','loose'].includes(item.location)){const body=placement.bodies.find(b=>b.payload.type==='vessel'&&b.payload.id===kind);if(body)placement.take(body);item.location='hand';session.hand={type:'vessel',id:kind};status=vesselNames[kind]+'を手に持ちました';}}
 else if(id==='board-place'&&onCounter&&h?.type==='food'&&session.board.length<4){session.board.push(h.food);session.boardIndex=session.board.length-1;session.hand=null;status='食材をまな板に置きました';}
 else if(id.startsWith('board-select-')&&onCounter){session.boardIndex=Math.min(session.board.length-1,Number(id.slice(13)));}
 else if(id.startsWith('cut-mode-')&&onCounter){const mode=id.slice(9);if(Object.hasOwn(CUTS,mode)){session.cutMode=mode;status='切り方：'+CUTS[mode];}}
 else if(id==='cut'&&onCounter&&session.board.length){const f=session.board[session.boardIndex]||session.board[0];f.cuts=3;f.cut=session.cutMode;status=f.id==='egg'?'卵を割りました':FOOD_BY_ID.get(f.id).name+'を'+CUTS[session.cutMode]+'にしました';}
 else if(id==='board-pick'&&onCounter&&!h&&session.board.length){const pickIndex=Math.max(0,Math.min(session.board.length-1,session.boardIndex));session.hand={type:'food',food:session.board.splice(pickIndex,1)[0]};session.boardIndex=0;status='まな板の食材を取りました';}
 else if(id==='board-collect'&&onCounter&&v?.kind==='bowl'){const cut=session.board.filter(f=>f.cut);if(v.foods.length+cut.length<=16){v.foods.push(...cut);session.board=session.board.filter(f=>!f.cut);session.boardIndex=0;status='切った食材をボウルに回収しました';}}
 else if(id==='counter-place'&&onCounter&&v){v.location='counter';v.counterId=target.item.id;session.hand=null;status=vesselNames[v.kind]+'を作業台に置きました';}
 else if(id==='bowl-add'&&onCounter&&h?.type==='food'&&counterBowl()?.foods.length<16){counterBowl().foods.push(h.food);session.hand=null;status='食材をボウルに入れました';}
 else if(id==='bowl-merge'&&v&&active&&v!==active){if(merge(v,active))status='ボウルへ材料を移しました';}
 else if(id==='mix'&&onCounter&&active?.foods.length){active.mixed=true;for(const f of active.foods)if(f.method==='raw')f.method='mix';status='材料をボウルで混ぜました';}
 else if(id==='water'&&onSink){session.waterOn=!session.waterOn;status=session.waterOn?'蛇口を開けました':'水を止めました';}
 else if(id==='wash'&&onSink&&session.waterOn){if(h?.type==='food'){h.food.washed=true;status='食材を洗いました';}else if(v){for(const f of v.foods)f.washed=true;status='容器の食材を洗いました';}}
 else if(id==='fill'&&onSink&&session.waterOn&&v){v.water=capacity[v.kind];v.temperature=20;status=vesselNames[v.kind]+'に水をくみました';}
 else if(id==='drain'&&onSink&&v){v.water=0;status='水／ゆで汁を捨てました。食材は容器に残っています';}
 else if(id==='clean'&&onSink&&session.waterOn&&v&&!v.foods.length){v.seasonings={};v.water=0;v.temperature=20;status='容器を洗いました';}
 else if(id.startsWith('timer-')&&onStove&&burner()){const seconds=Number(id.slice(6));if([0,30,60,120,300].includes(seconds)){const item=burner();item.timer=seconds?{remaining:seconds,duration:seconds}:null;item.timerDone=false;if(seconds)item.fire||=2;status=seconds?timeLabel(seconds)+'の加熱タイマーを開始しました。終了時に消火します':'タイマーを解除しました';}}
 else if(id.startsWith('burner-')&&onStove){session.selectedBurner=Number(id.slice(7));}
 else if(id==='stove-place'&&onStove&&v&&['pan','pot'].includes(v.kind)&&!burner()){v.location='stove';v.counterId=target.item.id;v.slot=session.selectedBurner;session.hand=null;status=vesselNames[v.kind]+'をコンロ'+(v.slot+1)+'に置きました';}
 else if(id==='stove-pick'&&onStove&&!h&&burner()){const item=burner();item.fire=0;item.timer=null;item.location='hand';session.hand={type:'vessel',id:item.kind};status=vesselNames[item.kind]+'を持ち上げました。作業台へ運べます';}
 else if(id==='stove-add'&&onStove&&h?.type==='food'&&burner()?.foods.length<16){burner().foods.push(h.food);session.hand=null;status='食材を調理器具へ入れました';}
 else if(id==='stove-pour'&&onStove&&v&&burner()&&v!==burner()){if(merge(v,burner()))status='ボウルの食材を調理器具へ移しました';}
 else if(id==='pour-water'&&onStove&&v?.water>0&&burner()&&v!==burner()){const to=burner(),amount=Math.min(v.water,capacity[to.kind]-to.water);if(amount>0){to.temperature=(to.temperature*to.water+v.temperature*amount)/(to.water+amount);to.water+=amount;v.water-=amount;status='水／お湯を注ぎました';}else status='これ以上水は入りません';}
 else if(id.startsWith('fire-')&&onStove&&burner()){burner().fire=Math.max(0,Math.min(3,Number(id.slice(5))));status=['火を止めました','弱火','中火','強火'][burner().fire];}
 else if(id.startsWith('method-')&&onStove&&burner()){const mode=id.slice(7);if(Object.hasOwn(COOK_METHODS,mode)&&(!(mode==='bake')||target.def.family==='oven')){burner().mode=mode;status=COOK_METHODS[mode]+'で調理します';}}
 else if(id==='cover'&&onStove&&burner()){burner().covered=!burner().covered;status=burner().covered?'ふたを閉めました':'ふたを開けました';}
 else if(id==='stir'&&onStove&&burner()){burner().stirs++;burner().mixed=true;burner().lastStir=session.elapsed;status='ヘラ／おたまで混ぜました';}
 else if(id.startsWith('season-')&&(onCounter||onStove)&&active){const spice=id.slice(7);if(Object.hasOwn(SEASONINGS,spice)){active.seasonings[spice]=Math.min(8,(active.seasonings[spice]||0)+1);status=SEASONINGS[spice]+'を加えました（'+active.seasonings[spice]+'杯）';}}
 else if(id==='plate'&&onCounter){const source=active;plate(source,target);}
 else if(id==='clear-board'&&onCounter){session.board=[];session.boardIndex=0;status='まな板を片付けました';}
 else if(id==='empty'&&onSink&&v){v.foods=[];v.water=0;v.seasonings={};v.mixed=false;v.cookSeconds=0;v.timer=null;v.timerDone=false;v.kneaded=v.rolled=false;status='容器の中身を片付けました';}
 if(!completed&&(id.startsWith('take-food-')||id.startsWith('take-vessel-')||['board-pick','board-collect','counter-place','stove-pick','board-place','stove-place','stove-add','bowl-add'].includes(id)))closeMenu();
 if(!running)return;renderModels(true);drawUI();}
 function timeLabel(seconds){const whole=Math.max(0,Math.ceil(seconds));return Math.floor(whole/60)+'分'+String(whole%60).padStart(2,'0')+'秒';}
 function drawUI(){
  if(!session||!(running||precisionMode()))return;
  hud.querySelector('.cook-state').textContent=get().mobile?'取る → 運ぶ → 使う · ドラッグで視点':'左クリック：取る／使う／置く · Shift：しゃがむ · E：使う';
  hud.querySelector('[data-act=resume]').hidden=!!get().mobile||!!document.pointerLockElement;
  hud.querySelector('[data-act=recover]').hidden=!running;
  const endButton=hud.querySelector('[data-act=end]');endButton.hidden=!running&&!!session.hand;endButton.textContent=running?'調理終了':'配膳を終える';
  updateReadout();
 }
 function heldName(){const h=session.hand;return h?.type==='food'?FOOD_BY_ID.get(h.food.id).name:h?.type==='tool'?toolNames[h.id]:h?.type==='seasoning'?SEASONINGS[h.id]:h?.type==='vessel'?vesselNames[h.id]:'空き';}
 hud.onclick=event=>{const button=event.target.closest('button[data-act]');if(button&&!button.disabled)action(button.dataset.act);};start.onclick=begin;
 function scan(){const s=get(),zones=[];let hint='';for(const [index,room]of Object.entries(s.housing?.rooms||{})){if(!room.layout||!s.player||Math.abs(s.player.position.x-room.group.position.x)>ROOM.x+3||Math.abs(s.player.position.z-room.group.position.z)>ROOM.z+3)continue;const key=index+':'+JSON.stringify(room.layout.items);let result=cache.get(key);if(!result){result=recognizeKitchens(index,room.layout);cache.set(key,result);if(cache.size>100)cache.delete(cache.keys().next().value);}zones.push(...result.zones);if(s.player&&Math.abs(s.player.position.x-room.group.position.x)<ROOM.x&&Math.abs(s.player.position.z-room.group.position.z)<ROOM.z&&room.layout.items.some(i=>i.t==='kitchen'||i.t==='island'))hint=result.reason;}near=s.cameraMode==='first'&&s.connected&&s.inStudio&&!s.paused&&!s.ragdoll&&!s.seated&&!s.sleeping&&!s.inBattle?zones.find(z=>z.allowed(s.player.position)&&Math.abs(s.player.position.y-ROOM.floor)<.8):null;start.hidden=true;}
 function vesselStatus(v){
  const wet=v.water>.01,waiting=['boil','simmer','steam'].includes(v.mode)&&(!wet||v.mode==='steam'&&!v.covered);
  return vesselNames[v.kind]+' · '+Math.round(v.temperature)+'℃ · '+COOK_METHODS[v.mode]+' '+timeLabel(v.cookSeconds)+(v.timer?'\n残り '+timeLabel(v.timer.remaining)+(waiting?'（水・ふたを確認）':v.temperature<92&&wet?'（沸騰待ち）':''):v.timerDone?'\nタイマー終了・消火済み':'')+' · 水 '+v.water.toFixed(1)+'L';
 }
 function foodState(food,v){const f=FOOD_BY_ID.get(food.id),done=food.progress>=f.time,burnt=food.burn>35;return f.name+'：'+(burnt?'焦げています':done?'火が通った':food.progress>0?'加熱中 '+Math.min(99,Math.round(food.progress/f.time*100))+'%':v.location==='stove'&&v.fire?'温度上昇待ち':'未加熱');}
 function updateReadout(){
  const h=session.hand,v=handVessel();hud.querySelector('.cook-carry').textContent='手：'+(h?.type==='tool'?toolNames[h.id]:h?.type==='seasoning'?SEASONINGS[h.id]:h?.type==='food'?FOOD_BY_ID.get(h.food.id).name:v?vesselNames[v.kind]:h?.type==='dish'?'料理の皿':'空き')+(h?' · 平面を見てクリックで置く':'' );
  hud.querySelector('.cook-prompt').textContent=task?task.label+' · 残り '+timeLabel(task.remaining):target||h?directHint():status;
  const touchPlace=hud.querySelector('.cook-touch-place');touchPlace.disabled=!h||!!task||!!pending;touchPlace.textContent='ここに置く';
  hud.querySelector('.cook-feedback').textContent=status;
  const inspected=picked?.type==='vessel'?session.vessels[picked.id]:v||Object.values(session.vessels).find(item=>item.location==='stove'&&item.foods.length);
  hud.querySelector('.cook-food-state').textContent=inspected?.foods.length?inspected.foods.map(food=>foodState(food,inspected)).join(' / '):'';
  hud.querySelector('[data-act=use]').textContent=placementIntent()?'ここに置く':h?.type==='food'&&picked?.type==='vessel'?'食材を追加':h?.type==='seasoning'&&picked?.type==='vessel'?'ふりかける':h?.type==='tool'&&h.id==='knife'&&['board','board-food'].includes(picked?.type)?'切る':'使う';
  const progress=hud.querySelector('.cook-progress');progress.hidden=!task;progress.value=task?1-task.remaining/task.duration:0;hud.querySelector('[data-act=cancel-work]').hidden=!task;
  const tag=hud.querySelector('.cook-timer'),vessels=Object.values(session.vessels).filter(v=>v.location==='stove');
  const point=worldPoint(equipment('stove'));point.y+=1.15;point.project(camera);tag.hidden=!vessels.length||point.z>1||point.z< -1||Math.abs(point.x)>1||Math.abs(point.y)>1;
  if(!tag.hidden){tag.style.left=(point.x*.5+.5)*100+'%';tag.style.top=(.5-point.y*.5)*100+'%';tag.textContent=vessels.map(vesselStatus).join('\n');}
 }
 function advanceWork(dt){
  if(!task)return;if(!inReach(task.station)||get().player.position.distanceTo(task.origin)>.9){task=null;send({type:'kitchen-work',index:zone.index,kitchenId:zone.id,cancel:true});status='作業台から離れたため手作業を中止しました';return;}
  task.remaining=Math.max(0,task.remaining-dt);
  if(task.id==='cut'&&knife){knife.position.y=.04+Math.abs(Math.sin(session.elapsed*12))*.12;knife.rotation.z=Math.sin(session.elapsed*12)*.2;}
  if(task.remaining===0&&!pending&&get().connected){const finished=task;task=null;send({type:'kitchen-work',index:zone.index,kitchenId:zone.id,cancel:true});useCounter(finished.station);session.boardIndex=finished.foodIndex;session.cutMode=finished.cutMode;action(finished.id,true,finished.station,finished.vesselId);if(knife){knife.position.y=.03;knife.rotation.z=0;}}
 }
 function worldInteraction(ndc){const state=get();if(!session||running||state.cameraMode!=='first'||state.paused||!state.inStudio||state.ragdoll||state.inBattle)return false;if(session.hand?.type==='dish')return releaseHand(ndc);selectTarget(ndc);if(state.seated&&!session.hand&&picked?.type==='loose'&&picked.body.payload.type==='dish'){const meal=tableMeal(picked.body.payload.dish.id);if(meal){startEating(meal);return true;}}if(!target){if(session.hand)return releaseHand(ndc);return false;}if(!inReach(target))return false;useCounter(target);if(target.role==='stove')session.activeStoveId=target.item.id;return directUse(ndc);}
 function showRating(rating){ratingHUD.textContent=rating.name+'\n'+'★'.repeat(rating.stars)+'☆'.repeat(5-rating.stars)+'\n'+rating.label;ratingHUD.hidden=false;setTimeout(()=>{ratingHUD.hidden=true;},8000);}
 function tableAt(point,preferredId=''){return tableForObject(get().housing.rooms[zone.index]?.layout,zone.home,point,preferredId);}
 function tableMeal(preferredId=eating?.id){
  const state=get(),table=!running&&state.seated?state.housing.diningTableForSeat(state.seat):null;
  if(!table||!session||session.hand||String(table.index)!==String(zone.index))return null;
  const candidates=placement.bodies.filter(b=>b.payload.type==='dish'&&!session.dishes.find(d=>d.id===b.payload.dish.id)?.eaten&&!eatingPlayers.has(b.payload.dish.id)&&tableAt(b.p,b.tableId)?.itemId===table.itemId).sort((a,b)=>a.p.distanceToSquared(state.player.position)-b.p.distanceToSquared(state.player.position));
  const body=preferredId?candidates.find(b=>b.payload.dish.id===preferredId):candidates[0];return body?{table,body}:null;
 }
 function startEating(meal=tableMeal()){
  const state=get();if(!meal||pending||eating||!state.connected||state.paused)return false;
  servingPhase=false;syncPrecision();eating={id:meal.body.payload.dish.id,elapsed:0,sent:true,requestedAt:performance.now(),acknowledged:false};
  send({type:'cooking-eat',index:zone.index,kitchenId:zone.id,dishId:eating.id,tableId:meal.table.itemId});return true;
 }
 function eatAtTable(dt,now){
  const state=get(),seat=state.seat,key=!running&&state.seated&&seat?String(seat.houseIndex)+':'+(seat.itemId||seat.x+':'+seat.z):'';
  if(key!==mealSeatKey){mealSeatKey=key;mealSeatAt=now;autoMealKey='';}
  if(eating){
   const meal=tableMeal(eating.id);
   if(!state.inStudio||state.ragdoll||!meal){if(state.connected)send({type:'cooking-eat-cancel'});eating=null;return;}
   if(!state.connected){eating=null;return;}
   if(!eating.acknowledged&&now-eating.requestedAt>8000){eating=null;notify('食事を開始できませんでした。Eキー／食べるで再度お試しください');return;}
   if(eating.acknowledged)eating.elapsed+=dt;return;
  }
  const meal=tableMeal(),automatic=meal&&key+':'+meal.body.payload.dish.id;
  if(key&&meal&&!autoMealKey&&now-mealSeatAt>400&&startEating(meal))autoMealKey=automatic;
 }
 carryHUD.querySelector('button').onclick=()=>{startEating();};
 function update(dt,now){
  const state=get();
  if(session&&session.ownerSkin!==state.skin){if(running)end();disposeWorkspace();}
  if(!running&&now-lastScan>250){lastScan=now;scan();const display=near||[...shared.values()].map(r=>recognizeKitchens(r.state.index,state.housing.rooms[r.state.index]?.layout).zones.find(z=>z.id===r.state.kitchenId)).find(z=>z&&Math.abs(state.player.position.x-z.home.x)<ROOM.x&&Math.abs(state.player.position.z-z.home.z)<ROOM.z&&state.housing.rooms[z.index]?.group.visible);if(display&&(!session||String(zone.index)!==String(display.index)||zone.id!==display.id)&&!session?.hand){if(session)disposeWorkspace();zone=display;createSession();requestKitchen();}}
  if(!session)return;
  if(state.player&&zone&&!session.hand&&!running&&!precisionMode()&&(Math.abs(state.player.position.x-zone.home.x)>ROOM.x+4||Math.abs(state.player.position.z-zone.home.z)>ROOM.z+4)){disposeWorkspace();return;}
  const room=state.housing?.rooms[zone.index];
  if(room&&room.layout.rev!==zone.rev){const next=recognizeKitchens(zone.index,room.layout).zones.find(z=>z.id===zone.id);if(next?.key===zone.key)zone=next;else {if(running){notify('キッチン設備の配置が変わりました。調理の途中状態を保存して戻ります');end();}if(next){hideAppliances(false);zone=next;for(const station of zone.worktops)session.worktops[station.item.id]||={foods:[],index:0,boardVisible:false};if(!zone.worktops.some(s=>s.item.id===session.activeCounterId))session.activeCounterId=zone.worktops[0].item.id;pinKitchenBoard(session,zone);hideAppliances(true);lastVisualKey='';}else {saveWorkspace(true);disposeWorkspace();return;}}}
  if(running&&(!state.inStudio||state.ragdoll||state.inBattle||state.cameraMode!=='first')){end();}
  if(!state.connected){if(task)task=null;pending=null;authoritative=null;}
  if(state.connected&&!wasConnected){pending=null;authoritative=null;requestKitchen();if(running)send({type:'cooking-start',index:zone.index,kitchenId:zone.id,recipe:'free'});}
  if(pending&&now-pending.at>8000){pending=null;authoritative=null;task=null;requestKitchen();status='操作の返事を待っています。共有状態を読み直します';}
  wasConnected=state.connected;
  session.elapsed+=dt;fridgeAngle=THREE.MathUtils.damp(fridgeAngle,session.fridgeOpen?Math.PI*.61:0,8,dt);
  if(fridgeRoot){fridgeRoot.userData.door.rotation.y=-fridgeAngle;fridgeRoot.userData.contents.visible=fridgeAngle>.6;}
  for(const root of storageRoots){const storage=root.userData.storage;storage.angle=THREE.MathUtils.damp(storage.angle,session.storageOpen[storage.station.item.id]?Math.PI*.48:0,9,dt);for(const door of storage.doors)door.rotation.y=door.userData.sign*storage.angle;storage.contents.visible=storage.angle>.65;}
  if(session.hand&&!task&&(placeMode||placementIntent()))placement.aim(session.hand);else placement.hide();
  if(running||precisionMode())advanceWork(dt);animateCookingModel(visuals,session.elapsed);animateCookingModel(held,session.elapsed);animateCookingModel(placement.root,session.elapsed);motion.update(session,task,dt);for(const remote of remoteMotions.values())remote.update(session,null,dt);eatAtTable(dt,now);
  for(const model of remoteHeld.children){const peer=get().peers?.find(p=>p.id===model.userData.playerId);model.visible=!!peer;if(peer){model.position.copy(peer.root.position).add(new THREE.Vector3(Math.sin(peer.root.rotation.y)*.65,1.05,Math.cos(peer.root.rotation.y)*.65));model.rotation.y=peer.root.rotation.y;}}animateCookingModel(remoteHeld,session.elapsed);remoteHeld.visible=state.inStudio&&!!room?.group.visible;
  held.visible=!!session.hand&&!task&&!motion.busyHand&&!eating&&(running||precisionMode());
  visuals.visible=placement.root.visible=state.inStudio&&!!room?.group.visible;
  syncPrecision();document.body.dataset.carryingMeal=String(!running&&session.hand?.type==='dish');carryHUD.hidden=running||precisionMode()||!state.inStudio||!eating&&!tableMeal();
  if(!carryHUD.hidden)carryHUD.querySelector('span').textContent=eating?(eating.acknowledged?'食事中… '+Math.min(4,Math.floor(eating.elapsed))+'/4秒':'食事の開始をサーバーに確認中…'):placeMode?'平面を狙ってクリックで皿を置く':session.hand?.type==='dish'?session.hand.dish.name+' · Q／皿を置く → 机に並べる':tableMeal()?.body.payload.dish.name+' · E／クリック／タップで食べる';
  if(!carryHUD.hidden){const button=carryHUD.querySelector('button');button.textContent=session.hand?.type==='dish'?(placeMode?'置くのをやめる':'皿を置く'):eating?'食事中…':'食べる（E）';button.disabled=!!pending||!!eating||!state.connected;}
  if(running&&menuTarget&&!inReach(menuTarget))closeMenu(false);
  if(now-lastUI<100)return;lastUI=now;renderModels();if(running||precisionMode()){selectTarget();drawUI();}
 }
 addEventListener('pagehide',()=>saveWorkspace(true));
 function handSnapshot(){const h=session?.hand;if(!h)return null;return h.type==='vessel'?{...h,vessel:JSON.parse(JSON.stringify(session.vessels[h.id]))}:JSON.parse(JSON.stringify(h));}
 function placementIntent(){if(!session?.hand||task)return false;if(session.hand.type==='dish')return true;const p=picked,h=session.hand;if(!target)return true;if(['ingredient','fridge-group','fridge-next','tool','spice','storage-door','cabinet-body','tool-store','vessel','board','board-food','serve','fire','lid','faucet','burner','stove-mode','stove-timer','cut-style','appliance-button','appliance-dial','appliance-door','appliance-body'].includes(p?.type))return false;if(target.role==='sink'||target.role==='fridge'||target.role==='appliance'||target.role==='stove'&&handVessel())return false;if(['board','plate'].includes(h.id)&&h.type==='tool'&&target.role==='counter')return false;return true;}
 function hintCarryBoard(){const h=session?.hand;return h?.type==='tool'&&['board','plate'].includes(h.id)&&target?.role==='counter'&&picked?.type==='worktop'?toolNames[h.id]+'をこのカウンターに置く':null;}
 function directHint(){
  const control=picked;if(control?.type==='cut-style')return CUTS[control.id]+'に切り方を変える';if(control?.type==='stove-mode')return COOK_METHODS[control.id.split(':')[1]]+'に切り替える';if(control?.type==='stove-timer')return 'タイマーを回す：OFF → 30秒 → 1分 → 2分 → 5分';if(control?.type==='appliance-dial')return '時間のつまみを回す';if(control?.type==='appliance-button')return session.appliances[target.item.id]?.remaining?'運転を止める':'ボタンを押して運転開始';if(control?.type==='burner'&&handVessel())return 'ここに'+vesselNames[handVessel().kind]+'を置く';if(hintCarryBoard())return hintCarryBoard();
  if(picked?.type==='fridge-group')return FOOD_GROUPS[picked.id]+'の棚を開く';if(picked?.type==='fridge-next')return '次の棚の食材を見る';if(target?.role==='fridge'&&session.fridgeOpen)return '庫内の食材を取る · 上の札で肉・魚・米などの棚を選ぶ';
  if(session.hand?.type==='dish'||placeMode||placementIntent())return placement.valid?'左クリック／タップでここに置く':'近くの空いている平面を狙ってください';
  const h=session.hand,p=picked;
  if(p?.type==='vessel'){const v=session.vessels[p.id];if(h?.type==='food')return v.covered?'ふたを開けてから食材を追加':FOOD_BY_ID.get(h.food.id).name+'を追加 · '+v.foods.length+'/16品';if(h?.type==='vessel')return '容器の食材・水・調味料を移して混ぜる';if(!h)return vesselNames[p.id]+'を持つ · 食材を持ってクリックで追加';}
  if(h?.type==='tool'&&h.id==='knife'&&['board','board-food'].includes(p?.type)){const food=session.board[p.type==='board-food'?Number(p.id):session.boardIndex];return food?.cut?'切り終わりました · 道具置きへ包丁を戻し、ボウルで回収':'クリックで一振り · '+(food?Math.round((food.cuts||0)/3*100):0)+'%';}
  if(h?.type==='seasoning'&&p?.type==='vessel')return SEASONINGS[h.id]+'を振りかける · 現在 '+(session.vessels[p.id].seasonings[h.id]||0)+'杯';
  if(h?.type==='vessel'&&h.id==='bowl'&&['board','board-food'].includes(p?.type))return 'クリックで切った食材を回収';
  if(p?.type==='tool'||p?.type==='spice'||p?.type==='ingredient')return pickLabel()+' · クリックで持つ';
  return pickLabel()+' · クリックで使う';
 }
 function pickLabel(){if(picked?.type==='loose'){const h=picked.body.payload;return h.type==='food'?FOOD_BY_ID.get(h.food.id).name:h.type==='tool'?toolNames[h.id]:h.type==='seasoning'?SEASONINGS[h.id]:'料理の皿';}if(!picked)return target?.def.name||'';return picked.type==='tool'?toolNames[picked.id]:picked.type==='spice'?SEASONINGS[picked.id]:picked.type==='vessel'?vesselNames[picked.id]:picked.type==='ingredient'?FOOD_BY_ID.get(picked.id).name:picked.type==='board'||picked.type==='board-food'?'まな板':picked.type==='fire'?'火力つまみ':picked.type==='lid'?'鍋のふた':picked.type==='faucet'?'蛇口':picked.type==='rest'?'道具置き':picked.type==='serve'?'盛り付け皿':target.def.name;}
 function directUse(ndc){return transact(()=>directUseLocal(ndc),{id:picked?.type==='board'?'chop':picked?.type,stationId:target?.item.id,source:handSnapshot()});}
 function directUseLocal(ndc){
  const p=picked,h=session.hand,role=target.role,run=id=>action(id,false,target,p?.type==='vessel'?p.id:null);
  if(h?.type==='dish')return releaseHand(ndc);
  if(task)return true;
  if(p?.type==='fridge-group')run('group-'+p.id);
  else if(p?.type==='fridge-next')run('fridge-next');
  else if(p?.type==='appliance-button'){const a=session.appliances[target.item.id]||{};run(a.remaining?'appliance-stop':'appliance-run-'+(a.duration||60));}
  else if(p?.type==='appliance-dial')run('appliance-duration');
  else if(role==='appliance'&&p?.type!=='vessel'){if(handVessel()&&session.appliances[target.item.id]?.open)run('appliance-load');else run('appliance-open');}
  else if(p?.type==='tool-store'){if(h)run('storage-return');else status='棚に見えている道具をクリックして取れます';}
  else if(p?.type==='storage-door'||p?.type==='cabinet-body'){if(h?.type==='tool'||h?.type==='seasoning'){session.itemHomes[h.type+':'+h.id]=target.item.id;session.hand=null;status='収納へ戻しました';}else run('storage');}
  else if(p?.type==='loose'){if(!h){session.hand=placement.take(p.body);status='置いた物を手に持ちました';}else status='先に持っているものを置いてください';}
  else if(p?.type==='tool'||p?.type==='spice'){
   const type=p.type==='tool'?'tool':'seasoning';
   if(h?.type===type&&h.id===p.id){session.hand=null;status='収納へ戻しました';}
   else if(!h){session.hand={type,id:p.id};status=pickLabel()+'を手に持ちました';}
   else {status='持っているものを作業台へ置いてください';}
  }else if(p?.type==='ingredient'){if(!h)run('take-food-'+p.id);else status='先に持っている食材を置いてください';}
  else if(p?.type==='rest'){if(h?.type==='tool'||h?.type==='seasoning'){session.hand=null;placeMode=false;status='道具棚へ戻しました';}else if(h)run('put-down');else status='ここに道具や調味料を戻せます';}
  else if(p?.type==='faucet')run('water');
  else if(p?.type==='cut-style'){run('cut-mode-'+p.id);}
  else if(p?.type==='stove-mode'){session.selectedBurner=Number(p.id.split(':')[0]);run('method-'+p.id.split(':')[1]);}
  else if(p?.type==='stove-timer'){session.selectedBurner=Number(p.id);const item=burner(),times=[0,30,60,120,300],seconds=times[(times.indexOf(item?.timer?.duration||0)+1)%times.length];run('timer-'+seconds);}
  else if(p?.type==='burner'){session.selectedBurner=Number(p.id);if(handVessel())run('stove-place');else if(burner()&&!h)run('stove-pick');else status='鍋やフライパンを持って、このコンロに置けます';}
  else if(p?.type==='fire'){session.selectedBurner=Number(p.id);run('fire-'+(((burner()?.fire||0)+1)%4));}
  else if(p?.type==='lid'){const v=session.vessels[p.id];session.selectedBurner=v.slot;run('cover');}
  else if(p?.type==='serve'||p?.type==='dish'){if(p.type==='serve'&&!h){session.plateStationId='';session.hand={type:'tool',id:'plate'};status='空の皿を手に持ちました';}else if(handVessel())run('plate');else if(p.type==='dish'&&!h){const dish=session.dishes.find(d=>d.id===p.id);if(dish&&!dish.eaten&&!eatingPlayers.has(dish.id)){session.takenDishes.push(dish.id);session.hand={type:'dish',dish};status='料理の皿を持ちました。好きな場所に置けます';}}else status='盛り付ける容器を持って皿をクリックしてください';}
  else if(p?.type==='vessel'){
   const v=session.vessels[p.id];if(v.location==='stove')session.selectedBurner=v.slot;
   if(h?.type==='seasoning'){const previous=menuTarget;menuTarget=target;run('sprinkle');menuTarget=previous;}
   else if(h?.type==='tool'){
    if(performance.now()/1000-lastStroke<.25)return true;lastStroke=performance.now()/1000;
    if(['whisk','spatula','ladle','tongs'].includes(h.id)){if(v.covered){status='先にふたを開けてください';drawUI();return true;}motion.play(v.location==='stove'?'stir':'mix',target,handSnapshot());v.stirs++;v.lastStir=session.elapsed;v.mixStrokes=(v.mixStrokes||0)+1;if(v.mixStrokes>=3){v.mixed=true;for(const f of v.foods)if(f.method==='raw')f.method='mix';}status='混ぜています · '+Math.min(3,v.mixStrokes)+'/3';}
    else if(h.id==='mitt'){session.hand=null;run(v.location==='stove'?'stove-pick':v.location==='appliance'?'appliance-take':'take-vessel-'+p.id);}
    else if(h.id==='colander'){status='鍋を持ってシンクへ運ぶと、ざるで湯切りできます';}
    else if(h.id==='rolling-pin'){if(!v.foods.some(f=>f.id==='flour'))status='小麦粉を混ぜた生地をボウルに用意してください';else{v.rollStrokes=(v.rollStrokes||0)+1;v.rolled=v.rollStrokes>=3;v.kneaded=true;v.mixed=true;motion.play('roll',target,handSnapshot());status='生地を伸ばしています · '+Math.min(3,v.rollStrokes)+'/3';}}
    else status='この道具はまな板またはシンクで使えます';
   }else if(h?.type==='food')run('container-add');
   else if(handVessel()){if(v.covered){status='先にふたを開けてください';}else run(v.location==='stove'?(handVessel().foods.length?'stove-pour':'pour-water'):'bowl-merge');}
   else run(v.location==='stove'?'stove-pick':v.location==='appliance'?'appliance-take':'take-vessel-'+p.id);
  }else if(p?.type==='board'||p?.type==='board-food'){
   if(p.type==='board-food')session.boardIndex=Number(p.id);
   if(h?.type==='food')run('board-place');
   else if(h?.type==='tool'){if(h.id==='knife')run('chop');else if(h.id==='peeler')run('peel');else if(h.id==='grater')run('grate');else return releaseHand(ndc);}
   else if(handVessel()?.kind==='bowl')run('board-collect');
   else if(h)return releaseHand(ndc);else if(p.type==='board-food')run('board-pick');else status='まな板はカウンター上に固定されています。食材を持って置き、包丁で切れます';
  }else if(role==='fridge'){if(h?.type==='food')run('return-food');else run('open-fridge');}
  else if(role==='sink'){if(h?.type==='tool'&&h.id==='sponge'){session.waterOn=true;motion.play('clean',target,handSnapshot());status='シンクをスポンジで洗いました';}else if(h?.type==='food'){session.waterOn=true;run('wash');}else if(handVessel()){session.waterOn=true;run(handVessel().water>0&&handVessel().foods.length?'drain':'fill');}else run('water');}
  else if(role==='counter'||role==='board'){
   if(h?.type==='tool'&&h.id==='board')run('show-board');else if(h?.type==='tool'&&h.id==='plate')run('show-plate');else if(h)return releaseHand(ndc);else status='収納の取っ手をクリックして、道具やお皿を取り出せます';
  }else if(role==='stove'&&handVessel())run('stove-place');
  else return false;
  renderModels(true);drawUI();return true;
 }
 function interact(ndc){
  const state=get();if(!session||state.paused||!state.inStudio||state.ragdoll||state.inBattle)return false;
  selectTarget(ndc);useCounter(target);if(target?.role==='stove')session.activeStoveId=target.item.id;
  if(session.hand?.type==='dish'||placeMode||!target&&session.hand)return releaseHand(ndc);
  if(!target){status='取るものや使う場所に照準を合わせてください';drawUI();return false;}
  const used=directUse(ndc);if(!used){status='扉・食材・道具・つまみを直接クリックしてください';drawUI();}return used;
 }

 return {get eating(){return eating;},hydrate(records){shared.clear();for(const record of records||[])if(record.state)shared.set(kitchenIdentity(record.state.index,record.state.kitchenId),record);if(session){const record=shared.get(kitchenIdentity(zone.index,zone.id));pending=null;if(record)applyShared(record);else {authoritative=null;requestKitchen();}}},playerBusy(id){return [...shared.values()].some(r=>!!r.hands?.[id]);},get active(){return running;},get precision(){return precisionMode();},get handsOn(){return running||precisionMode();},get blocked(){const state=get();return state.cameraMode!=='first'||state.paused||!state.inStudio||state.ragdoll||state.inBattle;},get carryingMeal(){return !running&&session?.hand?.type==='dish';},get choosing(){return false;},update,end,interact,worldInteraction,closeMenu,alternate(){if(placeMode){placeMode=false;placement.hide();}else if(task)action('cancel-work');},constrain(position,previous){if(!running)return;const b=zone.bounds;for(const [axis,min,max]of [['x',b.minX,b.maxX],['z',b.minZ,b.maxZ]]){const before=Math.max(min-previous[axis],0,previous[axis]-max),after=Math.max(min-position[axis],0,position[axis]-max);if(after>before+.001)position[axis]=previous[axis];}},receive(message){
  if(message.type==='kitchen-state'){const id=message.state?kitchenIdentity(message.state.index,message.state.kitchenId):kitchenIdentity(message.index,message.kitchenId),old=shared.get(id);if(message.state&&(!old||message.rev>=old.rev))shared.set(id,copy(message));
   if(session&&id===kitchenIdentity(zone.index,zone.id)){const own=message.playerId===get().selfId,ack=own&&pending?.requestId===message.requestId;if(ack||own&&message.error)pending=null;if(!pending&&message.state)applyShared(shared.get(id));if(own&&message.error){notify(message.error);status=message.error;task=null;}
    if(!own&&message.cue?.stationId){const station=zone.stations.find(s=>s.item.id===message.cue.stationId);if(station)remoteMotion(message.playerId).play(message.cue.id,station,message.cue.source);}
   }return true;
  }
  if(message.type==='kitchen-work'){if(message.playerId!==get().selfId&&session&&String(message.index)===String(zone.index)&&message.kitchenId===zone.id){const station=zone.stations.find(s=>s.item.id===message.stationId);if(message.cancel)remoteMotions.get(message.playerId)?.clear();else if(station)remoteMotion(message.playerId).play(message.id,station,message.source,message.duration);}return true;}
  if(message.type==='cooking-eating'){if(message.playerId!==get().selfId)eatingPlayers.set(message.dishId,message.playerId);if(message.playerId===get().selfId)eating={id:message.dishId,elapsed:Math.max(0,Math.min(4,(Date.now()-message.at)/1000)),sent:true,acknowledged:true};return true;}
  if(message.type==='cooking-eaten')eatingPlayers.delete(message.dishId);if(message.type==='player-left'){for(const [id,player]of eatingPlayers)if(player===message.id)eatingPlayers.delete(id);remoteMotions.get(message.id)?.clear();remoteMotions.delete(message.id);return false;}
  if(message.playerId!==get().selfId)return false;
  if(message.type==='cooking-eaten'){eating=null;if(message.error)notify(message.error);else showRating(message.rating);return true;}
  if(message.type==='cooking-result'){status=message.error||'料理をサーバーに保存しました';if(running&&message.error&&message.fatal){notify(message.error);end();}else if(session)drawUI();return true;}return false;
 },key(event){if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return false;if(!running&&!precisionMode()&&event.code==='KeyE'&&!event.repeat&&!get().paused&&tableMeal()){event.preventDefault();startEating();return true;}if(!(running||precisionMode()))return false;if(event.code==='Escape'){if(task)action('cancel-work');placeMode=false;placement.hide();return false;}if(event.code==='KeyE'&&!event.repeat){event.preventDefault();interact();return true;}if(event.code==='KeyQ'&&!event.repeat&&session?.hand){event.preventDefault();releaseHand();return true;}return false;}};

}
