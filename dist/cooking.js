import * as THREE from 'three';
import {recognizeKitchens} from './kitchen-layout.js?v=20261011-free-cook74';
import {ROOM} from './housing-data.js?v=20261011-free-cook74';
import {INGREDIENTS,FOOD_BY_ID,FOOD_GROUPS,SEASONINGS,CUTS,COOK_METHODS,cleanMeal,describeDish} from './cooking-data.js?v=20261011-free-cook74';
import {createCookingMotion} from './cooking-motion.js?v=20261011-free-cook74';
import {toolModel,seasoningModel} from './cooking-tools.js?v=20261011-free-cook74';
import {fridgeModel} from './cooking-fridge.js?v=20261011-free-cook74';
import {createCookingPlacement} from './cooking-placement.js?v=20261011-free-cook74';
import {part,foodModel,vesselModel,animateCookingModel} from './cooking-models.js?v=20261011-free-cook74';
const toolNames={knife:'包丁',peeler:'ピーラー',grater:'おろし金',whisk:'泡立て器',spatula:'木べら',ladle:'おたま',tongs:'トング',colander:'ざる','rolling-pin':'めん棒',mitt:'ミトン',sponge:'スポンジ'};
const vesselNames={pan:'フライパン',pot:'鍋',bowl:'ボウル',jug:'水差し'},capacity={pan:.8,pot:3,bowl:1.5,jug:1.5};
export function createCooking({scene,camera,get,send,notify,onStart,onEnd,onReposition=point=>get().player.position.copy(point),onMenu=()=>{}}){
 const style=document.createElement('style');style.textContent=`#cookingHUD[hidden],#cookingStart[hidden]{display:none!important}#cookingStart{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:35;padding:12px 20px}#cookingHUD{position:fixed;inset:0;pointer-events:none;z-index:55;color:#eff8de;font-size:14px}#cookingHUD .cook-top,#cookingHUD .cook-tools{pointer-events:auto;background:#142d3cee;border:2px solid #658c96;padding:10px}#cookingHUD .cook-top{position:absolute;top:10px;left:10px;right:10px;display:flex;align-items:center;justify-content:space-between;gap:8px}#cookingHUD .cook-tools{position:absolute;right:10px;bottom:100px;width:min(390px,calc(100vw - 20px));max-height:50vh;overflow:auto;overscroll-behavior:contain}#cookingHUD[data-menu=false] .cook-tools{display:none}#cookingHUD .cook-top{pointer-events:none}#cookingHUD .cook-top button{pointer-events:auto}#cookingHUD .cook-readout{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);width:min(600px,65vw);text-align:center;text-shadow:0 2px 3px #000;background:#142d3cbb;padding:8px;border-radius:6px}#cookingHUD .cook-readout button{pointer-events:auto}#cookingHUD .cook-timer{position:absolute;max-width:260px;padding:6px 9px;background:#142d3cee;border:1px solid #91bfa8;border-radius:5px;white-space:pre-line;text-align:center;transform:translate(-50%,-100%)}#cookingHUD .cook-tools{max-height:65vh}#cookingHUD .cook-progress{accent-color:#bce6bb;height:10px}#cookingHUD .cook-tools header{display:flex;align-items:center;justify-content:space-between;position:sticky;top:-10px;background:#142d3c}#cookingHUD button{font:inherit;color:#eff8de;background:#284c5a;border:1px solid #658c96;padding:9px;margin:3px}#cookingHUD button:disabled{opacity:.4}#cookingHUD button[aria-pressed=true]{background:#497361;border-color:#bce6bb}#cookingHUD .cook-dot{position:absolute;top:50%;left:50%;color:#eff8de}#cookingHUD progress{width:100%}#cookingHUD p{margin:6px 0}#cookingHUD .cook-target{font-size:18px;font-weight:bold}#cookingHUD .cook-section{padding-top:7px;border-top:1px solid #658c9650;margin-top:6px}.cook-log{font-size:12px;color:#bcd4cb}@media(max-width:600px){#cookingHUD .cook-top{font-size:12px}#cookingHUD .cook-tools{width:260px;bottom:105px;font-size:12px}#cookingHUD button{padding:8px}}`;
 style.textContent+=`#cookingHUD{font-size:13px;color:#f4eee0}#cookingHUD .cook-top{right:auto;border:none;border-radius:12px;background:#1e302dd9;font-size:12px;max-width:calc(100vw - 32px)}#cookingHUD .cook-tools{width:min(350px,calc(100vw - 24px));bottom:82px;border:1px solid #a9b7a780;border-radius:16px;background:#1d302bf5;padding:16px;box-shadow:0 12px 44px #0005}#cookingHUD .cook-tools header{top:-16px;background:#1d302b}#cookingHUD button{border-radius:8px;border:1px solid #69827375;background:#354d40;padding:9px 12px;cursor:pointer}#cookingHUD button:hover{background:#496554}#cookingHUD button[aria-pressed=true]{background:#76967b;color:#0f251b}#cookingHUD .cook-section{font-size:12px;color:#bccbbb;line-height:1.6}#cookingHUD .cook-readout{font-size:12px;background:#17241fbb;border-radius:14px;width:max-content;max-width:62vw;padding:7px 16px}#cookingHUD .cook-timer{font-size:11px;background:#192d27d9;border-radius:10px;max-width:230px}#cookingHUD .cook-dot{width:5px;height:5px;background:#eef6e5;border-radius:50%;font-size:0;box-shadow:0 0 4px #000}#cookingHUD[data-menu=true] .cook-readout{display:none}`;document.head.append(style);
 const start=document.createElement('button');start.id='cookingStart';start.hidden=true;start.textContent='自由にクッキングを始める';document.body.append(start);
 const hud=document.createElement('section');hud.id='cookingHUD';hud.hidden=true;hud.dataset.menu='false';hud.innerHTML='<div class="cook-top"><span class="cook-state">家具をクリックして使う</span><span><button data-act="resume">操作へ戻る</button><button data-act="recover">通路へ戻る</button><button data-act="end">終了</button></span></div><span class="cook-dot">＋</span><div class="cook-readout"><p class="cook-carry"></p><p class="cook-prompt"></p><p class="cook-feedback" role="status"></p><p class="cook-food-state"></p><progress class="cook-progress" hidden max="1"></progress><button data-act="put-down" class="cook-place" hidden>置く場所を選ぶ</button><button data-act="cancel-work" hidden>作業を中止</button></div><div class="cook-touch-actions"><button data-act="use">使う</button><button data-act="equipment">設備</button><button data-act="put-down" class="cook-touch-place">置く</button></div><div class="cook-timer" hidden></div><div class="cook-tools"><header><p class="cook-target"></p><button data-act="close">閉じる</button></header><p class="cook-hand"></p><p class="cook-vessels"></p><p class="cook-hint" role="status"></p><div class="cook-actions"></div><p class="cook-log"></p></div>';document.body.append(hud);
 const visuals=new THREE.Group();visuals.name='Free cooking workspace';scene.add(visuals);if(!camera.parent)scene.add(camera);const held=new THREE.Group();held.position.set(.28,-.36,-.8);camera.add(held);held.visible=false;
 let zone=null,session=null,near=null,target=null,menuTarget=null,task=null,lastScan=-Infinity,lastUI=-Infinity,cache=new Map(),status='',lastVisualKey='',targetKey='',knife=null,picked=null,lastStroke=-Infinity,placeMode=false,fridgeAngle=0,fridgeRoot=null;
 const placement=createCookingPlacement({scene,camera,get,modelFor:looseModel,bounds:()=>({...zone.bounds,floor:ROOM.floor})});
 const pickMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
 const pickGeometry=new THREE.BoxGeometry(1,1,1);
 function clearModels(group){group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});group.clear();}
 function looseModel(hand){if(hand.type==='food')return foodModel(hand.food);if(hand.type==='vessel')return vesselModel(session.vessels[hand.id]);if(hand.type==='dish')return vesselModel({...hand.dish.meal,kind:'plate'},{dish:true});if(hand.type==='seasoning')return seasoningModel(hand.id);const tool=toolModel(hand.id);tool.rotation.x=Math.PI/2;return tool;}
 function away(type,id){return session.hand?.type===type&&session.hand.id===id||placement.bodies.some(b=>b.payload.type===type&&b.payload.id===id);}
 function pickArea(model,w,h,d,y=h/2){const mesh=new THREE.Mesh(pickGeometry,pickMaterial);mesh.scale.set(w,h,d);mesh.position.y=y;model.add(mesh);}
 function togglePlacement(){if(!session?.hand||task)return;placeMode=!placeMode;if(!placeMode)placement.hide();closeMenu();status=placeMode?'置きたい平面を狙ってクリック · 緑の枠に置けます':'通常の調理操作に戻りました';drawUI();}
 function releaseHand(ndc){if(!session?.hand||task)return false;const message=placement.release(session.hand,ndc);if(message){status=message;drawUI();return true;}const v=handVessel();if(v){v.location='loose';v.fire=0;v.timer=null;}session.hand=null;placeMode=false;status='手を離しました。置いた物はクリックで再び持てます';renderModels(true);drawUI();return true;}
 function looseStation(body){return {...equipment('counter'),worldPosition:body.p.clone().add(new THREE.Vector3(0,body.shape.height,0))};}
 const motion=createCookingMotion({scene,point:worldPoint});
 const raycaster=new THREE.Raycaster(),upAxis=new THREE.Vector3(0,1,0);
 const operationTimes={wash:4,fill:4,drain:2,clean:4,mix:5,stir:2,plate:2,peel:3,grate:4,knead:5,roll:4};
 const equipment=role=>zone?.stations.find(s=>s.role===role),handVessel=()=>session?.hand?.type==='vessel'?session.vessels[session.hand.id]:null;
 function worldPoint(station){if(station.worldPosition)return station.worldPosition.clone();const h=zone.home;return new THREE.Vector3(h.x+station.x*h.front,ROOM.floor+station.y+station.def.h*.88+.025,h.z+station.z*h.front);}
 function burner(){return Object.values(session.vessels).find(v=>v.location==='stove'&&v.slot===session.selectedBurner);}
 function counterBowl(){return session.vessels.bowl.location==='counter'?session.vessels.bowl:null;}
 function nearbyVessel(){return menuTarget?.role==='stove'?burner():handVessel()||counterBowl();}
 function makeVessel(kind){return {kind,foods:[],seasonings:{},water:0,temperature:20,fire:0,covered:false,mixed:false,mode:kind==='pan'?'fry':'boil',location:kind==='bowl'?'counter':'drawer',slot:0,stirs:0,lastStir:0,cookSeconds:0,timer:null,timerDone:false};}
 function begin(){if(!near)return;zone=near;const entry=safeEntry();if(!entry){notify('通路に体が入る空間がありません。家具の間を広げてください');zone=null;return;}onReposition(entry);session={hand:null,board:[],boardIndex:0,cutMode:'dice',selectedBurner:0,foodGroup:'vegetable',vessels:Object.fromEntries(Object.keys(vesselNames).map(id=>[id,makeVessel(id)])),dishes:(get().character.cookingDishes||[]).filter(d=>d.index===zone.index&&d.kitchenId===zone.id).slice(-4).map(d=>({...d,...describeDish(d.meal)})),elapsed:0,waterOn:false,homeFront:zone.home.front,fridgeOpen:false,foodPage:0,takenDishes:[]};placeMode=false;fridgeAngle=0;near=null;menuTarget=null;task=null;target=null;hud.dataset.menu='false';status='冷蔵庫から好きな食材を取り、まな板やボウルへ運びましょう';start.hidden=true;hud.hidden=false;document.body.dataset.cooking='true';lastVisualKey='';onStart(zone);get().housing.setCookingApplianceHidden(zone.index,equipment('fridge').item.id,true);send({type:'cooking-start',index:zone.index,kitchenId:zone.id,recipe:'free'});renderModels(true);drawUI();}
 function end(){if(!session)return;get().housing?.setCookingApplianceHidden(zone.index,equipment('fridge').item.id,false);placement.clear();placeMode=false;fridgeRoot=null;send({type:'cooking-stop'});session=null;zone=null;target=null;menuTarget=null;task=null;clearModels(held);held.visible=false;clearModels(visuals);motion.clear();hud.hidden=true;document.body.dataset.cooking='false';onEnd();}
 function placeModel(model,station,dx=0,dz=0){const h=zone.home,yaw=station.yaw+(h.front<0?Math.PI:0);model.position.copy(worldPoint(station));model.position.x+=Math.cos(yaw)*dx+Math.sin(yaw)*dz;model.position.z+=-Math.sin(yaw)*dx+Math.cos(yaw)*dz;model.rotation.y=yaw;visuals.add(model);}
 function pickable(model,station,type,id){model.userData.pick={station,type,id};return model;}
 function safeEntry(){
  const state=get(),candidates=[...zone.safeStarts].sort((a,b)=>Math.hypot(a.x-state.player.position.x,a.z-state.player.position.z)-Math.hypot(b.x-state.player.position.x,b.z-state.player.position.z));
  return candidates.find(p=>state.world.canStand(p,state.shape))||null;
 }
 function renderModels(force=false){
  if(!session)return;
  const key=JSON.stringify([session.hand,session.board,session.dishes,session.takenDishes,session.waterOn,session.fridgeOpen,session.foodGroup,session.foodPage,placement.bodies.map(b=>b.id),Object.values(session.vessels).map(v=>({...v,cookSeconds:0,timer:null,temperature:Math.floor(v.temperature/5)*5,water:Math.round(v.water*20)/20,foods:v.foods.map(f=>({...f,progress:Math.floor(f.progress/5)*5,burn:Math.floor(f.burn/10)*10}))}))]);
  if(!force&&key===lastVisualKey)return;lastVisualKey=key;clearModels(visuals);clearModels(held);placement.refresh();held.visible=!!session.hand;
  const counter=equipment('counter'),stove=equipment('stove'),sink=equipment('sink'),fridge=equipment('fridge'),board=new THREE.Group();
  part(board,'box',0,0,0,.65,.028,.4,'#b48b58');for(let i=0;i<7;i++)part(board,'box',-.27+i*.09,.015,0,.002,.001,.37,'#936b43');
  for(let i=0;i<session.board.length;i++){const food=foodModel(session.board[i]);food.position.set((i%2-.5)*.22,.018,(Math.floor(i/2)-.5)*.13);food.scale.setScalar(.8);pickable(food,counter,'board-food',String(i));board.add(food);}
  pickable(board,counter,'board');placeModel(board,counter,-.28,.1);
  const rest=new THREE.Group();part(rest,'box',0,0,0,.16,.023,.12,'#d8c9a9');pickable(rest,counter,'rest');placeModel(rest,counter,.13,.1);
  const supportMeshes=[board.children[0]],tools=Object.keys(toolNames),toolRack=new THREE.Group(),front=counter.d*.44+.13;
  for(const y of [-.54,-.13])supportMeshes.push(part(toolRack,'box',0,y,0,Math.max(1.8,counter.w*.88),.035,.16,'#d3a15e'));
  placeModel(toolRack,counter,0,front);
  for(let i=0;i<tools.length;i++){
   if(away('tool',tools[i]))continue;
   const tool=toolModel(tools[i]);tool.scale.setScalar(.75);pickArea(tool,.22,.4,.14);
   pickable(tool,counter,'tool',tools[i]);placeModel(tool,counter,i<6?(i-2.5)*.25:[-.74,-.35,.2,.58,.8][i-6],front+.025);tool.position.y+=i<6?-.12:-.53;
  }
  const rack=new THREE.Group();supportMeshes.push(part(rack,'box',0,0,0,1.15,.035,.48,'#c38d51'));placeModel(rack,stove,0,stove.d*.44+.26);rack.position.y-=.52;
  const spices=Object.keys(SEASONINGS),spiceShelf=new THREE.Group();
  for(let row=0;row<4;row++)supportMeshes.push(part(spiceShelf,'box',0,.045+row*.11,-row*.15,.45,.025,.14,'#d3a15e'));
  placeModel(spiceShelf,counter,counter.w*.44-.16,counter.d*.32);
  for(let i=0;i<spices.length;i++){
   if(away('seasoning',spices[i]))continue;
   const jar=seasoningModel(spices[i],i);jar.scale.setScalar(1.2);pickArea(jar,.105,.16,.105);
   pickable(jar,counter,'spice',spices[i]);placeModel(jar,counter,counter.w*.44-.16+(i%3-1)*.15,counter.d*.32-Math.floor(i/3)*.15);jar.position.y+=.06+Math.floor(i/3)*.11;
  }
  for(const [id,v]of Object.entries(session.vessels)){
   if(v.location==='loose')continue;
   const model=vesselModel(v);
   if(v.location==='hand'){held.add(model);model.scale.setScalar(.75);continue;}
   pickable(model,v.location==='stove'?stove:counter,'vessel',id);
   if(v.location==='stove'){
    placeModel(model,stove,v.slot===0?-.28:.28,0);
    if(v.kind==='pot'){const knob=new THREE.Group();part(knob,'round',0,0,0,.095,.06,.095,'#35434b');pickable(knob,stove,'lid',id);placeModel(knob,stove,v.slot===0?-.28:.28,0);knob.position.y+=.38;}
   }else {placeModel(model,counter,id==='bowl'?.45:id==='jug'?.65:id==='pan'?-.55:-.15,id==='bowl'?.06:-.38);if(v.location==='drawer'){placeModel(model,stove,id==='pan'?-.38:.26,stove.d*.44+.26);model.position.y-=.5;model.userData.pick.station={...counter,worldPosition:model.position.clone()};}}
  }
  for(let i=0;i<2;i++){const knob=new THREE.Group();part(knob,'disc',0,0,0,.085,.04,.085,'#35434b');part(knob,'box',0,.024,.025,.012,.008,.026,'#f2de9d');pickable(knob,stove,'fire',String(i));placeModel(knob,stove,i===0?-.24:.24,.3);}
  const faucet=new THREE.Group();part(faucet,'disc',0,.22,0,.055,.035,.055,'#b9c8cf');pickable(faucet,sink,'faucet');placeModel(faucet,sink,.18,-.12);
  if(session.hand?.type==='food')held.add(foodModel(session.hand.food));
  if(session.hand?.type==='dish')held.add(looseModel(session.hand));
  if(session.hand?.type==='tool'){const tool=toolModel(session.hand.id);tool.rotation.z=-.6;held.add(tool);}
  if(session.hand?.type==='seasoning')held.add(seasoningModel(session.hand.id));
  if(session.waterOn){const water=new THREE.Group();for(let i=0;i<12;i++){const drop=part(water,'round',0,.3-i*.025,0,.012,.035,.012,'#9ad9e7');drop.userData.effect={kind:'waterfall',i};}placeModel(water,sink);}
  const serving=new THREE.Group();part(serving,'disc',0,.018,0,.55,.027,.55,'#f6f0df');pickable(serving,counter,'serve');placeModel(serving,counter,.46,.34);
  const servingDish=[...session.dishes].reverse().find(d=>!session.takenDishes.includes(d.id));if(servingDish){const model=vesselModel({...servingDish.meal,kind:'plate'},{dish:true});model.scale.setScalar(.8);pickable(model,counter,'dish',servingDish.id);placeModel(model,counter,.46,.34);}
  fridgeRoot=fridgeModel(fridge,session,pickable);placeModel(fridgeRoot,fridge);fridgeRoot.position.y=ROOM.floor+fridge.y;fridgeRoot.userData.door.rotation.y=-fridgeAngle;fridgeRoot.userData.contents.visible=fridgeAngle>.6;placement.setSurfaces(supportMeshes);

 }
 function selectTarget(ndc={x:0,y:0}){
  target=null;picked=null;if(!session)return;camera.updateMatrixWorld(true);raycaster.setFromCamera(ndc,camera);
  let best=3.6;const h=zone.home;
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
   if(hit.distance>3.6)break;let node=hit.object,visible=true;while(node){if(!node.visible)visible=false;node=node.parent;}if(!visible)continue;
   let object=hit.object;while(object&&!object.userData.pick&&!object.userData.body)object=object.parent;
   const body=object?.userData.body,pick=body?{station:looseStation(body),type:body.payload.type==='vessel'?'vessel':'loose',id:body.payload.id,body}:object?.userData.pick;if(!pick||!inReach(pick.station))continue;
   if(get().world.cameraPosition(camera.position,hit.point,.01,pick.body?null:'furniture:'+zone.index+':'+pick.station.item.id).distanceTo(hit.point)>.12)continue;
   picked=pick;target=pick.station;break;
  }
 }

 function inReach(station){return station&&worldPoint(station).distanceTo(get().player.position.clone().add(new THREE.Vector3(0,1,0)))<4.4;}
 function closeMenu(resume=true){const wasOpen=!!menuTarget;menuTarget=null;hud.dataset.menu='false';if(wasOpen)onMenu(false,resume);if(session)drawUI();}

 function merge(source,destination){if(!destination||source===destination||destination.foods.length+source.foods.length>16||destination.water+source.water>capacity[destination.kind]){status='食材または水の量が容器の容量を超えます。先に盛り付けるか湯切りしてください';return false;}destination.foods.push(...source.foods);source.foods=[];for(const [id,n]of Object.entries(source.seasonings)){destination.seasonings[id]=Math.min(8,(destination.seasonings[id]||0)+n);}source.seasonings={};destination.mixed||=source.mixed;destination.kneaded||=source.kneaded;destination.rolled||=source.rolled;source.kneaded=source.rolled=false;const liquid=source.water+destination.water;if(liquid>0)destination.temperature=(source.temperature*source.water+destination.temperature*destination.water)/liquid;destination.water=liquid;source.water=0;return true;}
 function plate(v){if(!v||!v.foods.length)return;const meal=cleanMeal(v),dish=describeDish(meal),id=crypto.randomUUID();session.dishes.push({id,meal,...dish});if(session.dishes.length>4)session.dishes.shift();v.foods=[];v.seasonings={};v.water=0;v.fire=0;v.covered=false;v.mixed=false;v.kneaded=false;v.rolled=false;v.cookSeconds=0;v.timer=null;v.timerDone=false;status='完成：'+dish.name+' · '+dish.quality+'（'+dish.subtitle+'）';send({type:'cooking-finish',index:zone.index,kitchenId:zone.id,recipe:'free',dishId:id,meal});}
 function action(id,completed=false,station=menuTarget,vesselId=null){
  if(id==='end'){end();return;}if(id==='recover'){const entry=safeEntry();if(entry){task=null;onReposition(entry);closeMenu();status='通路の空いている位置へ戻りました';}else notify('家具の間に通路を空けてください');return;}if(id==='close'||id==='resume'){closeMenu();if(id==='resume')onMenu(false,true);return;}
  if(id==='use'){interact();return;}if(id==='equipment'){if(menuTarget)closeMenu();else interact(undefined,true);return;}
  if(id==='put-down'&&session){togglePlacement();return;}
  if(id==='release'&&session){releaseHand();return;}
  if(id==='cancel-work'){task=null;status='作業を中止しました';drawUI();return;}
  if(!session||task&&!completed)return;target=station;if(!inReach(target)){closeMenu(false);status='家具の近くへ移動してください';return;}
  const role=target.role,h=session.hand,v=handVessel(),onStove=role==='stove',onCounter=role==='counter',onSink=role==='sink',active=vesselId?session.vessels[vesselId]:onStove?burner():v||counterBowl();
  if(active?.covered&&['sprinkle','container-add','stove-add','stove-pour','pour-water','stir'].includes(id)){status='先に鍋のふたをクリックして開けてください';drawUI();return;}
  if(!completed&&(id==='cut'||Object.hasOwn(operationTimes,id))){
   const food=session.board[session.boardIndex];
   const valid=id==='cut'?onCounter&&food&&!h:id==='mix'?onCounter&&active?.foods.length:id==='stir'?onStove&&burner()?.foods.length:id==='plate'?onCounter&&active?.foods.length:id==='wash'?onSink&&session.waterOn&&(h?.type==='food'||v?.foods.length):id==='fill'?onSink&&session.waterOn&&v:id==='drain'?onSink&&v?.water>0:id==='clean'?onSink&&session.waterOn&&v&&!v.foods.length:id==='peel'||id==='grate'?onCounter&&food:id==='knead'||id==='roll'?onCounter&&active?.foods.some(f=>f.id==='flour'):false;
   if(!valid)return;
   const duration=id==='cut'?(food.id==='egg'?1.2:session.cutMode==='mince'?7:session.cutMode==='dice'?5:3):id==='fill'?Math.max(.5,(capacity[v.kind]-v.water)*2):operationTimes[id];
   const names={cut:food?.id==='egg'?'卵を割る':CUTS[session.cutMode],wash:'食材を洗う',fill:'水をくむ',drain:'湯切り',clean:'容器を洗う',mix:'混ぜる',stir:'混ぜる／裏返す',plate:'盛り付け',peel:'皮をむく',grate:'すりおろす',knead:'生地をこねる',roll:'生地を伸ばす'};
   task={id,station,vesselId,source:handSnapshot(),duration,remaining:duration,origin:get().player.position.clone(),label:names[id],foodIndex:session.boardIndex,cutMode:session.cutMode};
   status=names[id]+'を開始しました';closeMenu();drawUI();return;
  }

 if(!completed)motion.play(id,target,handSnapshot());
 if(id==='chop'&&onCounter&&session.board.length&&h?.type==='tool'&&h.id==='knife'){if(session.elapsed-lastStroke<.22)return;lastStroke=session.elapsed;const f=session.board[session.boardIndex]||session.board[0],strokes=session.cutMode==='mince'?7:session.cutMode==='dice'?5:3;f.cuts=Math.min(3,(f.cuts||0)+3/strokes);if(f.cuts>=2.999)f.cut=session.cutMode;status=f.cut?FOOD_BY_ID.get(f.id).name+'を'+CUTS[f.cut]+'にしました':'包丁で切っています · '+Math.round(f.cuts/3*100)+'%';}
 else if(id==='container-add'&&h?.type==='food'&&active&&active.foods.length<16){active.foods.push(h.food);session.hand=null;status=FOOD_BY_ID.get(h.food.id).name+'を追加しました · '+active.foods.map(f=>FOOD_BY_ID.get(f.id).name).join(' ＋ ');}
 else if(id==='sprinkle'&&h?.type==='seasoning'&&active){if(session.elapsed-lastStroke<.25)return;lastStroke=session.elapsed;active.seasonings[h.id]=Math.min(8,(active.seasonings[h.id]||0)+1);status=SEASONINGS[h.id]+'を振りかけました · '+active.seasonings[h.id]+'杯';}
 else if(id==='peel'&&onCounter&&session.board.length){session.board[session.boardIndex].peeled=true;status='皮をむきました';}
 else if(id==='grate'&&onCounter&&session.board.length){session.board[session.boardIndex].cut='grate';session.board[session.boardIndex].cuts=3;status='すりおろしました';}
 else if(id==='knead'&&onCounter&&active){active.mixed=true;active.kneaded=true;status='生地をこねました';}
 else if(id==='roll'&&onCounter&&active){active.rolled=true;status='生地を薄く伸ばしました';}
 else if(id==='open-fridge'&&role==='fridge'){session.fridgeOpen=!session.fridgeOpen;status='冷蔵庫の食材をクリックして取り出せます。Eで食材の種類を変更';}
 else if(id.startsWith('group-')&&role==='fridge'){session.foodGroup=id.slice(6);session.foodPage=0;session.fridgeOpen=true;closeMenu();}
 else if(id==='fridge-next'&&role==='fridge'){session.foodPage=(session.foodPage+1)%Math.max(1,Math.ceil(INGREDIENTS.filter(f=>f.group===session.foodGroup).length/8));session.fridgeOpen=true;closeMenu();}
 else if(id.startsWith('take-food-')&&role==='fridge'&&session.fridgeOpen&&fridgeAngle>.6&&!h){const f=FOOD_BY_ID.get(id.slice(10));if(!f)return;session.hand={type:'food',food:{id:f.id,washed:!f.wash,cut:null,cuts:0,progress:0,burn:0,method:'raw'}};status=f.name+'を手に持ちました。好きな作業台へ運んでください';}
 else if(id==='return-food'&&role==='fridge'&&h?.type==='food'){session.hand=null;status='食材を冷蔵庫へ戻しました';}
 else if(id.startsWith('take-vessel-')&&onCounter&&!h){const kind=id.slice(12),item=session.vessels[kind];if(item&&['drawer','counter','loose'].includes(item.location)){const body=placement.bodies.find(b=>b.payload.type==='vessel'&&b.payload.id===kind);if(body)placement.take(body);item.location='hand';session.hand={type:'vessel',id:kind};status=vesselNames[kind]+'を手に持ちました';}}
 else if(id==='board-place'&&onCounter&&h?.type==='food'&&session.board.length<4){session.board.push(h.food);session.boardIndex=session.board.length-1;session.hand=null;status='食材をまな板に置きました';}
 else if(id.startsWith('board-select-')&&onCounter){session.boardIndex=Math.min(session.board.length-1,Number(id.slice(13)));}
 else if(id.startsWith('cut-mode-')&&onCounter){const mode=id.slice(9);if(Object.hasOwn(CUTS,mode))session.cutMode=mode;}
 else if(id==='cut'&&onCounter&&session.board.length){const f=session.board[session.boardIndex]||session.board[0];f.cuts=3;f.cut=session.cutMode;status=f.id==='egg'?'卵を割りました':FOOD_BY_ID.get(f.id).name+'を'+CUTS[session.cutMode]+'にしました';}
 else if(id==='board-pick'&&onCounter&&!h&&session.board.length){const pickIndex=Math.max(0,Math.min(session.board.length-1,session.boardIndex));session.hand={type:'food',food:session.board.splice(pickIndex,1)[0]};session.boardIndex=0;status='まな板の食材を取りました';}
 else if(id==='board-collect'&&onCounter&&v?.kind==='bowl'){const cut=session.board.filter(f=>f.cut);if(v.foods.length+cut.length<=16){v.foods.push(...cut);session.board=session.board.filter(f=>!f.cut);session.boardIndex=0;status='切った食材をボウルに回収しました';}}
 else if(id==='counter-place'&&onCounter&&v){v.location='counter';session.hand=null;status=vesselNames[v.kind]+'を作業台に置きました';}
 else if(id==='bowl-add'&&onCounter&&h?.type==='food'&&counterBowl()?.foods.length<16){counterBowl().foods.push(h.food);session.hand=null;status='食材をボウルに入れました';}
 else if(id==='bowl-merge'&&onCounter&&v&&active&&v!==active){if(merge(v,active))status='ボウルへ材料を移しました';}
 else if(id==='mix'&&onCounter&&active?.foods.length){active.mixed=true;for(const f of active.foods)if(f.method==='raw')f.method='mix';status='材料をボウルで混ぜました';}
 else if(id==='water'&&onSink){session.waterOn=!session.waterOn;status=session.waterOn?'蛇口を開けました':'水を止めました';}
 else if(id==='wash'&&onSink&&session.waterOn){if(h?.type==='food'){h.food.washed=true;status='食材を洗いました';}else if(v){for(const f of v.foods)f.washed=true;status='容器の食材を洗いました';}}
 else if(id==='fill'&&onSink&&session.waterOn&&v){v.water=capacity[v.kind];v.temperature=20;status=vesselNames[v.kind]+'に水をくみました';}
 else if(id==='drain'&&onSink&&v){v.water=0;status='水／ゆで汁を捨てました。食材は容器に残っています';}
 else if(id==='clean'&&onSink&&session.waterOn&&v&&!v.foods.length){v.seasonings={};v.water=0;v.temperature=20;status='容器を洗いました';}
 else if(id.startsWith('timer-')&&onStove&&burner()){const seconds=Number(id.slice(6));if([0,30,60,120,300].includes(seconds)){const item=burner();item.timer=seconds?{remaining:seconds,duration:seconds}:null;item.timerDone=false;if(seconds)item.fire||=2;status=seconds?timeLabel(seconds)+'の加熱タイマーを開始しました。終了時に消火します':'タイマーを解除しました';}}
 else if(id.startsWith('burner-')&&onStove){session.selectedBurner=Number(id.slice(7));}
 else if(id==='stove-place'&&onStove&&v&&['pan','pot'].includes(v.kind)&&!burner()){v.location='stove';v.slot=session.selectedBurner;session.hand=null;status=vesselNames[v.kind]+'をコンロ'+(v.slot+1)+'に置きました';}
 else if(id==='stove-pick'&&onStove&&!h&&burner()){const item=burner();item.fire=0;item.timer=null;item.location='hand';session.hand={type:'vessel',id:item.kind};status=vesselNames[item.kind]+'を持ち上げました。作業台へ運べます';}
 else if(id==='stove-add'&&onStove&&h?.type==='food'&&burner()?.foods.length<16){burner().foods.push(h.food);session.hand=null;status='食材を調理器具へ入れました';}
 else if(id==='stove-pour'&&onStove&&v&&burner()&&v!==burner()){if(merge(v,burner()))status='ボウルの食材を調理器具へ移しました';}
 else if(id==='pour-water'&&onStove&&v?.water>0&&burner()&&v!==burner()){const to=burner(),amount=Math.min(v.water,capacity[to.kind]-to.water);if(amount>0){to.temperature=(to.temperature*to.water+v.temperature*amount)/(to.water+amount);to.water+=amount;v.water-=amount;status='水／お湯を注ぎました';}else status='これ以上水は入りません';}
 else if(id.startsWith('fire-')&&onStove&&burner()){burner().fire=Math.max(0,Math.min(3,Number(id.slice(5))));status=['火を止めました','弱火','中火','強火'][burner().fire];}
 else if(id.startsWith('method-')&&onStove&&burner()){const mode=id.slice(7);if(Object.hasOwn(COOK_METHODS,mode)&&(!(mode==='bake')||target.def.family==='oven')){burner().mode=mode;status=COOK_METHODS[mode]+'で調理します';}}
 else if(id==='cover'&&onStove&&burner()){burner().covered=!burner().covered;status=burner().covered?'ふたを閉めました':'ふたを開けました';}
 else if(id==='stir'&&onStove&&burner()){burner().stirs++;burner().mixed=true;burner().lastStir=session.elapsed;status='ヘラ／おたまで混ぜました';}
 else if(id.startsWith('season-')&&(onCounter||onStove)&&active){const spice=id.slice(7);if(Object.hasOwn(SEASONINGS,spice)){active.seasonings[spice]=Math.min(8,(active.seasonings[spice]||0)+1);status=SEASONINGS[spice]+'を加えました（'+active.seasonings[spice]+'杯）';}}
 else if(id==='plate'&&onCounter){const source=active;plate(source);}
 else if(id==='clear-board'&&onCounter){session.board=[];session.boardIndex=0;status='まな板を片付けました';}
 else if(id==='empty'&&onSink&&v){v.foods=[];v.water=0;v.seasonings={};v.mixed=false;v.cookSeconds=0;v.timer=null;v.timerDone=false;v.kneaded=v.rolled=false;status='容器の中身を片付けました';}
 if(!completed&&(id.startsWith('take-food-')||id.startsWith('take-vessel-')||['board-pick','board-collect','counter-place','stove-pick','board-place','stove-place','stove-add','bowl-add'].includes(id)))closeMenu();
 renderModels(true);drawUI();}
 function timeLabel(seconds){const whole=Math.max(0,Math.ceil(seconds));return Math.floor(whole/60)+'分'+String(whole%60).padStart(2,'0')+'秒';}
 function drawUI(){
  if(!session)return;const h=session.hand,v=handVessel(),station=menuTarget,selected=burner();
  hud.dataset.menu=String(!!station);
  hud.querySelector('.cook-state').textContent=get().mobile?'自由調理 · 左スティックで移動 / ドラッグで視点':'自由調理 · WASD 移動 / クリック 作業 / E 設備 / Q 置く / C しゃがむ';
  hud.querySelector('[data-act=resume]').hidden=!!get().mobile||!!document.pointerLockElement||!!station;
  hud.querySelector('.cook-target').textContent=station?.def.name||'';
  hud.querySelector('.cook-hand').textContent='手：'+heldName();
  hud.querySelector('.cook-vessels').textContent=station?.role==='stove'&&selected?vesselStatus(selected):'';
  hud.querySelector('.cook-hint').textContent=task?task.label+' · '+timeLabel(task.remaining):status;
  updateReadout();
  const entries=[],add=(id,label,on=true,pressed=false)=>{if(on)entries.push({id,label,pressed});},section=label=>entries.push({section:label});
  if(station?.role==='fridge'){
   section('庫内の食材');for(const [id,name]of Object.entries(FOOD_GROUPS))add('group-'+id,name,true,id===session.foodGroup);
   add('open-fridge',session.fridgeOpen?'扉を閉じる':'扉を開ける');
   const pages=Math.ceil(INGREDIENTS.filter(f=>f.group===session.foodGroup).length/8);add('fridge-next','次の棚の食材 · '+(session.foodPage+1)+' / '+pages,pages>1);
   section('扉を開け、庫内の3D食材をクリックして取り出す');if(h?.type==='food')add('return-food','食材を戻す');
  }else if(station?.role==='counter'){
   section('包丁の切り方');for(const [id,name]of Object.entries(CUTS))if(id!=='grate')add('cut-mode-'+id,name,true,id===session.cutMode);
   section('道具や調味料をクリックして持つ → 食材や容器をクリックして使う');
   add('put-down','持っているものを置く',!!h);
   add('plate','盛り付ける',!!v?.foods.length);
   add('clear-board','まな板を片付ける',session.board.length>0&&!h);
  }else if(station?.role==='stove'){
   section('使うコンロ');for(let i=0;i<2;i++)add('burner-'+i,'コンロ '+(i+1),true,i===session.selectedBurner);
   if(selected){
    section('調理方法');for(const id of ['fry','boil','simmer','steam',...(station.def.family==='oven'?['bake']:[])])add('method-'+id,COOK_METHODS[id],true,selected.mode===id);
    section('火加減 · つまみのクリックでも切替');for(let i=0;i<4;i++)add('fire-'+i,['消火','弱火','中火','強火'][i],true,selected.fire===i);
    section('適温から計時 / 終了で消火');for(const n of [30,60,120,300])add('timer-'+n,timeLabel(n));add('timer-0','タイマー解除',!!selected.timer);
    section(selected.foods.map(f=>FOOD_BY_ID.get(f.id).name+' '+(f.burn>35?'焦げ':f.progress>=FOOD_BY_ID.get(f.id).time?'火が通った':'加熱中')).join(' / '));
   }else section('下の棚から鍋かフライパンを持って、コンロへ置いてください');
  }else if(station?.role==='sink'){
   add('water',session.waterOn?'蛇口を閉める':'蛇口を開ける');
   add('wash','食材を洗う',session.waterOn&&(h?.type==='food'||v?.foods.length));
   add('fill','水をくむ',session.waterOn&&!!v);add('drain','ざるで湯切り',!!v&&v.water>0);
   add('clean','スポンジで洗う',session.waterOn&&!!v&&!v.foods.length);add('empty','中身を片付ける',!!v&&!!(v.foods.length||v.water));
  }
  const list=hud.querySelector('.cook-actions'),key=JSON.stringify([entries,!!task]);
  if(list.dataset.buttons!==key){list.dataset.buttons=key;list.replaceChildren();for(const entry of entries){const node=document.createElement(entry.section!==undefined?'p':'button');if(entry.section!==undefined){node.className='cook-section';node.textContent=entry.section;}else{node.textContent=entry.label;node.dataset.act=entry.id;node.disabled=!!task;node.setAttribute('aria-pressed',String(entry.pressed));}list.append(node);}}
  hud.querySelector('.cook-log').textContent=session.dishes.length?'最後の料理：'+session.dishes.at(-1).name:'食材・切り方・火加減・味付けで料理が変わります';
 }
 function heldName(){const h=session.hand;return h?.type==='food'?FOOD_BY_ID.get(h.food.id).name:h?.type==='tool'?toolNames[h.id]:h?.type==='seasoning'?SEASONINGS[h.id]:h?.type==='vessel'?vesselNames[h.id]:'空き';}
 hud.onclick=event=>{const button=event.target.closest('button[data-act]');if(button&&!button.disabled)action(button.dataset.act);};start.onclick=begin;
 function scan(){const s=get(),zones=[];for(const [index,room]of Object.entries(s.housing?.rooms||{})){if(!room.layout)continue;const key=index+':'+room.layout.rev;let result=cache.get(key);if(!result){result=recognizeKitchens(index,room.layout);cache.set(key,result);if(cache.size>100)cache.delete(cache.keys().next().value);}zones.push(...result.zones);}near=s.connected&&s.inStudio&&!s.paused&&!s.ragdoll&&!s.seated&&!s.sleeping&&!s.inBattle?zones.find(z=>z.allowed(s.player.position)&&Math.abs(s.player.position.y-ROOM.floor)<.8):null;start.hidden=!near;}
 function vesselStatus(v){
  const wet=v.water>.01,waiting=['boil','simmer','steam'].includes(v.mode)&&(!wet||v.mode==='steam'&&!v.covered);
  return vesselNames[v.kind]+' · '+Math.round(v.temperature)+'℃ · '+COOK_METHODS[v.mode]+' '+timeLabel(v.cookSeconds)+(v.timer?'\n残り '+timeLabel(v.timer.remaining)+(waiting?'（水・ふたを確認）':v.temperature<92&&wet?'（沸騰待ち）':''):v.timerDone?'\nタイマー終了・消火済み':'')+' · 水 '+v.water.toFixed(1)+'L';
 }
 function foodState(food,v){const f=FOOD_BY_ID.get(food.id),done=food.progress>=f.time,burnt=food.burn>35;return f.name+'：'+(burnt?'焦げています':done?'火が通った':food.progress>0?'加熱中 '+Math.min(99,Math.round(food.progress/f.time*100))+'%':v.location==='stove'&&v.fire?'温度上昇待ち':'未加熱');}
 function updateReadout(){
  const h=session.hand,v=handVessel();hud.querySelector('.cook-carry').textContent='手：'+(h?.type==='tool'?toolNames[h.id]:h?.type==='seasoning'?SEASONINGS[h.id]:h?.type==='food'?FOOD_BY_ID.get(h.food.id).name:v?vesselNames[v.kind]:h?.type==='dish'?'料理の皿':'空き')+(h&&!placeMode?' · Q／右クリックで好きな場所に置く':'' );
  hud.querySelector('.cook-prompt').textContent=task?task.label+' · 残り '+timeLabel(task.remaining):placeMode?directHint():menuTarget?'操作を選び、閉じると移動に戻ります':target?directHint():status;
  const placeButton=hud.querySelector('.cook-place');placeButton.hidden=!h||!!task;placeButton.textContent=placeMode?'置くのをやめる':'置く場所を選ぶ';
  const touchPlace=hud.querySelector('.cook-touch-place');touchPlace.disabled=!h||!!task;touchPlace.textContent=placeMode?'取消':'置く';
  hud.querySelector('.cook-feedback').textContent=status;
  const inspected=picked?.type==='vessel'?session.vessels[picked.id]:v||Object.values(session.vessels).find(item=>item.location==='stove'&&item.foods.length);
  hud.querySelector('.cook-food-state').textContent=inspected?.foods.length?inspected.foods.map(food=>foodState(food,inspected)).join(' / '):'';
  hud.querySelector('[data-act=use]').textContent=placeMode?'ここに置く':h?.type==='food'&&picked?.type==='vessel'?'食材を追加':h?.type==='seasoning'&&picked?.type==='vessel'?'ふりかける':h?.type==='tool'&&h.id==='knife'&&['board','board-food'].includes(picked?.type)?'切る':'使う';
  const progress=hud.querySelector('.cook-progress');progress.hidden=!task;progress.value=task?1-task.remaining/task.duration:0;hud.querySelector('[data-act=cancel-work]').hidden=!task;
  const tag=hud.querySelector('.cook-timer'),vessels=Object.values(session.vessels).filter(v=>v.location==='stove');
  const point=worldPoint(equipment('stove'));point.y+=1.15;point.project(camera);tag.hidden=!vessels.length||point.z>1||point.z< -1||Math.abs(point.x)>1||Math.abs(point.y)>1;
  if(!tag.hidden){tag.style.left=(point.x*.5+.5)*100+'%';tag.style.top=(.5-point.y*.5)*100+'%';tag.textContent=vessels.map(vesselStatus).join('\n');}
 }
 function heat(dt){
  for(const v of Object.values(session.vessels)){
   if(v.location!=='stove'||!v.fire){v.temperature=Math.max(20,v.temperature-dt*1.4);continue;}
   const wet=v.water>.01,max=wet?100:v.mode==='bake'?190:70+v.fire*55;
   v.temperature+=Math.sign(max-v.temperature)*Math.min(Math.abs(max-v.temperature),dt*v.fire*(v.covered?1.35:1)*5/(.5+v.water));
   if(wet&&v.temperature>=99&&!v.covered)v.water=Math.max(0,v.water-dt*.002*v.fire);
   let method=v.mode;if(wet&&method==='fry')method=v.fire===1?'simmer':'boil';
   const enabled=(method==='boil'||method==='simmer')?wet&&v.temperature>=99:method==='steam'?wet&&v.covered&&v.temperature>=99:v.temperature>=75;
   const step=enabled?Math.min(dt,v.timer?.remaining??dt):0;
   if(enabled&&v.foods.length)v.cookSeconds+=step;
   for(const f of v.foods){
    if(!step)continue;f.method=method;
    const cutRate=f.cut==='mince'?1.25:f.cut?1.12:1;
    f.progress=Math.min(180,f.progress+step*cutRate*(method==='simmer'?.35:method==='steam'?.65:method==='bake'?.6:method==='boil'?.6:1));
    if(!wet&&f.progress>FOOD_BY_ID.get(f.id).time*1.6&&v.temperature>135)f.burn=Math.min(100,f.burn+step*(v.temperature-130)*.08*(session.elapsed-v.lastStir<5?.3:1)*(v.seasonings.oil?.65:1));
   }
   if(v.timer&&enabled){v.timer.remaining=Math.max(0,v.timer.remaining-step);if(v.timer.remaining===0){v.fire=0;v.timer=null;v.timerDone=true;status=vesselNames[v.kind]+'のタイマー終了。火を止めました';notify(status);}}
  }
 }
 function advanceWork(dt){
  if(!task)return;if(!inReach(task.station)||get().player.position.distanceTo(task.origin)>.9){task=null;status='作業台から離れたため手作業を中止しました';return;}
  task.remaining=Math.max(0,task.remaining-dt);
  if(task.id==='cut'&&knife){knife.position.y=.04+Math.abs(Math.sin(session.elapsed*12))*.12;knife.rotation.z=Math.sin(session.elapsed*12)*.2;}
  if(task.id==='fill'&&handVessel()){const v=handVessel();v.water=Math.min(capacity[v.kind],v.water+dt*.5);v.temperature=20;}
  if(task.remaining===0){const finished=task;task=null;session.boardIndex=finished.foodIndex;session.cutMode=finished.cutMode;action(finished.id,true,finished.station,finished.vesselId);if(knife){knife.position.y=.03;knife.rotation.z=0;}}
 }
 function update(dt,now){
  const s=get();if(!session){if(now-lastScan>500){lastScan=now;scan();}return;}
  const room=s.housing?.rooms[zone.index];if(!s.connected||!s.inStudio||s.ragdoll||s.inBattle||!room||room.layout.rev!==zone.rev){notify('キッチンの状態が変わったため調理を終了しました');end();return;}
  session.elapsed+=dt;placement.update(dt);fridgeAngle=THREE.MathUtils.damp(fridgeAngle,session.fridgeOpen?Math.PI*.61:0,8,dt);if(fridgeRoot){fridgeRoot.userData.door.rotation.y=-fridgeAngle;fridgeRoot.userData.contents.visible=fridgeAngle>.6;}if(placeMode&&session.hand&&!menuTarget)placement.aim(session.hand);else placement.hide();heat(dt);advanceWork(dt);animateCookingModel(visuals,session.elapsed);animateCookingModel(held,session.elapsed);animateCookingModel(placement.root,session.elapsed);motion.update(session,task,dt);held.visible=!!session.hand&&!task&&!motion.busyHand;if(!task&&knife){knife.position.y=.03;knife.rotation.z=0;}
  if(menuTarget&&!inReach(menuTarget))closeMenu(false);
  if(now-lastUI<100)return;lastUI=now;selectTarget();renderModels();drawUI();
 }
 function handSnapshot(){const h=session?.hand;if(!h)return null;return h.type==='vessel'?{...h,vessel:JSON.parse(JSON.stringify(session.vessels[h.id]))}:JSON.parse(JSON.stringify(h));}
 function directHint(){
  if(placeMode)return placement.valid?'クリックでこの場所に置く · Q／右クリックで取消':'近くの空いている平面を狙ってください';
  const h=session.hand,p=picked;
  if(p?.type==='vessel'){const v=session.vessels[p.id];if(h?.type==='food')return v.covered?'ふたを開けてから食材を追加':FOOD_BY_ID.get(h.food.id).name+'を追加 · '+v.foods.length+'/16品';if(h?.type==='vessel')return '容器の食材・水・調味料を移して混ぜる';if(!h)return vesselNames[p.id]+'を持つ · 別の食材を持ってここへ追加できます';}
  if(h?.type==='tool'&&h.id==='knife'&&['board','board-food'].includes(p?.type)){const food=session.board[p.type==='board-food'?Number(p.id):session.boardIndex];return food?.cut?'切り終わりました · 道具置きへ包丁を戻し、ボウルで回収':'クリックで一振り · '+(food?Math.round((food.cuts||0)/3*100):0)+'%';}
  if(h?.type==='seasoning'&&p?.type==='vessel')return SEASONINGS[h.id]+'を振りかける · 現在 '+(session.vessels[p.id].seasonings[h.id]||0)+'杯';
  if(h?.type==='vessel'&&h.id==='bowl'&&['board','board-food'].includes(p?.type))return 'クリックで切った食材を回収';
  if(p?.type==='tool'||p?.type==='spice'||p?.type==='ingredient')return pickLabel()+' · クリックで持つ';
  return pickLabel()+' · クリックで使う／Eで設定';
 }
 function pickLabel(){if(picked?.type==='loose'){const h=picked.body.payload;return h.type==='food'?FOOD_BY_ID.get(h.food.id).name:h.type==='tool'?toolNames[h.id]:h.type==='seasoning'?SEASONINGS[h.id]:'料理の皿';}if(!picked)return target?.def.name||'';return picked.type==='tool'?toolNames[picked.id]:picked.type==='spice'?SEASONINGS[picked.id]:picked.type==='vessel'?vesselNames[picked.id]:picked.type==='ingredient'?FOOD_BY_ID.get(picked.id).name:picked.type==='board'||picked.type==='board-food'?'まな板':picked.type==='fire'?'火力つまみ':picked.type==='lid'?'鍋のふた':picked.type==='faucet'?'蛇口':picked.type==='rest'?'道具置き':picked.type==='serve'?'盛り付け皿':target.def.name;}
 function directUse(ndc){
  const p=picked,h=session.hand,role=target.role,run=id=>action(id,false,target,p?.type==='vessel'?p.id:null);
  if(task)return true;
  if(p?.type==='loose'){if(!h){session.hand=placement.take(p.body);status='置いた物を手に持ちました';}else status='先に持っているものを置いてください';}
  else if(p?.type==='tool'||p?.type==='spice'){
   const type=p.type==='tool'?'tool':'seasoning';
   if(h?.type===type&&h.id===p.id){session.hand=null;status='元の場所に戻しました';}
   else if(!h){session.hand={type,id:p.id};status=pickLabel()+'を手に持ちました';}
   else {status='持っているものを作業台へ置いてください';}
  }else if(p?.type==='ingredient'){if(!h)run('take-food-'+p.id);else status='先に持っている食材を置いてください';}
  else if(p?.type==='rest'){if(h?.type==='tool'||h?.type==='seasoning'){session.hand=null;placeMode=false;status='道具棚へ戻しました';}else if(h)run('put-down');else status='ここに道具や調味料を戻せます';}
  else if(p?.type==='faucet')run('water');
  else if(p?.type==='fire'){session.selectedBurner=Number(p.id);run('fire-'+(((burner()?.fire||0)+1)%4));}
  else if(p?.type==='lid'){const v=session.vessels[p.id];session.selectedBurner=v.slot;run('cover');}
  else if(p?.type==='serve'||p?.type==='dish'){if(handVessel())run('plate');else if(p.type==='dish'&&!h){const dish=session.dishes.find(d=>d.id===p.id);if(dish){session.takenDishes.push(dish.id);session.hand={type:'dish',dish};status='料理の皿を持ちました。好きな場所に置けます';}}else status='盛り付ける容器を持って皿をクリックしてください';}
  else if(p?.type==='vessel'){
   const v=session.vessels[p.id];if(v.location==='stove')session.selectedBurner=v.slot;
   if(h?.type==='seasoning'){const previous=menuTarget;menuTarget=target;run('sprinkle');menuTarget=previous;}
   else if(h?.type==='tool'){
    if(session.elapsed-lastStroke<.25)return true;lastStroke=session.elapsed;
    if(['whisk','spatula','ladle','tongs'].includes(h.id)){if(v.covered){status='先にふたを開けてください';drawUI();return true;}motion.play(v.location==='stove'?'stir':'mix',target,handSnapshot());v.stirs++;v.lastStir=session.elapsed;v.mixStrokes=(v.mixStrokes||0)+1;if(v.mixStrokes>=3){v.mixed=true;for(const f of v.foods)if(f.method==='raw')f.method='mix';}status='混ぜています · '+Math.min(3,v.mixStrokes)+'/3';}
    else if(h.id==='mitt'){session.hand=null;run(v.location==='stove'?'stove-pick':'take-vessel-'+p.id);}
    else if(h.id==='colander'){status='鍋を持ってシンクへ運ぶと、ざるで湯切りできます';}
    else if(h.id==='rolling-pin'){if(!v.foods.some(f=>f.id==='flour'))status='小麦粉を混ぜた生地をボウルに用意してください';else{v.rollStrokes=(v.rollStrokes||0)+1;v.rolled=v.rollStrokes>=3;v.kneaded=true;v.mixed=true;motion.play('roll',target,handSnapshot());status='生地を伸ばしています · '+Math.min(3,v.rollStrokes)+'/3';}}
    else status='この道具はまな板またはシンクで使えます';
   }else if(h?.type==='food')run('container-add');
   else if(handVessel()){if(v.covered){status='先にふたを開けてください';}else run(v.location==='stove'?(handVessel().foods.length?'stove-pour':'pour-water'):'bowl-merge');}
   else run(v.location==='stove'?'stove-pick':'take-vessel-'+p.id);
  }else if(p?.type==='board'||p?.type==='board-food'){
   if(p.type==='board-food')session.boardIndex=Number(p.id);
   if(h?.type==='food')run('board-place');
   else if(h?.type==='tool'){if(h.id==='knife')run('chop');else if(h.id==='peeler')run('peel');else if(h.id==='grater')run('grate');else {session.hand=null;status='道具を作業台へ戻しました';}}
   else if(handVessel()?.kind==='bowl')run('board-collect');
   else if(h){run('put-down');}else if(p.type==='board-food')run('board-pick');
  }else if(role==='fridge')run('open-fridge');
  else if(role==='sink'){if(h?.type==='tool'&&h.id==='sponge'){session.waterOn=true;motion.play('clean',target,handSnapshot());status='シンクをスポンジで洗いました';}else if(h?.type==='food'){session.waterOn=true;run('wash');}else if(handVessel()){session.waterOn=true;run(handVessel().water>0&&handVessel().foods.length?'drain':'fill');}else run('water');}
  else if(role==='counter'){
   if(h)return releaseHand(ndc);else return false;
  }else if(role==='stove'&&handVessel())run('stove-place');
  else return false;
  renderModels(true);drawUI();return true;
 }
 function interact(ndc,settings=false){
  if(!session||menuTarget)return false;selectTarget(ndc);
  if(placeMode&&!settings)return releaseHand(ndc);
  if(!target&&session.hand&&!settings)return releaseHand(ndc);
  if(!target){status='使いたい食材・道具・家具に照準を合わせてください';return false;}
  if(!settings&&directUse(ndc))return true;
  menuTarget=target;onMenu(true,false);drawUI();return true;
 }

 return {get active(){return !!session;},get choosing(){return !!menuTarget;},update,end,interact,closeMenu,alternate(){if(session?.hand)togglePlacement();else interact(undefined,true);},constrain(position,previous){if(!session)return;const b=zone.bounds;for(const [axis,min,max]of [['x',b.minX,b.maxX],['z',b.minZ,b.maxZ]]){const before=Math.max(min-previous[axis],0,previous[axis]-max),after=Math.max(min-position[axis],0,position[axis]-max);if(after>before+.001)position[axis]=previous[axis];}},receive(message){if(message.playerId!==get().selfId)return false;if(message.type==='cooking-result'){status=message.error||'完成した料理「'+message.name+'」をサーバーに保存しました';if(session&&message.error&&message.fatal){notify(message.error);end();}else if(session)drawUI();return true;}return false;},key(event){if(!session)return false;if(event.code==='Escape'){event.preventDefault();placeMode=false;placement.hide();closeMenu(false);return true;}if(event.code==='KeyE'&&!event.repeat&&!/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)){event.preventDefault();if(menuTarget)closeMenu();else interact(undefined,true);return true;}if(event.code==='KeyQ'&&!event.repeat&&!/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)){event.preventDefault();togglePlacement();return true;}return false;}};
}
