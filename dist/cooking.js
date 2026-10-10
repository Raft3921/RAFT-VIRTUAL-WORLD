import * as THREE from 'three';
import {recognizeKitchens} from './kitchen-layout.js?v=20261010-free-cook71';
import {ROOM} from './housing-data.js?v=20261010-free-cook71';
import {INGREDIENTS,FOOD_BY_ID,FOOD_GROUPS,SEASONINGS,CUTS,COOK_METHODS,cleanMeal,describeDish} from './cooking-data.js?v=20261010-free-cook71';
import {part,foodModel,vesselModel} from './cooking-models.js?v=20261010-free-cook71';
const vesselNames={pan:'フライパン',pot:'鍋',bowl:'ボウル',jug:'水差し'},capacity={pan:.8,pot:3,bowl:1.5,jug:1.5};
export function createCooking({scene,camera,get,send,notify,onStart,onEnd,onMenu=()=>{}}){
 const style=document.createElement('style');style.textContent=`#cookingHUD[hidden],#cookingStart[hidden]{display:none!important}#cookingStart{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:35;padding:12px 20px}#cookingHUD{position:fixed;inset:0;pointer-events:none;z-index:55;color:#eff8de;font-size:14px}#cookingHUD .cook-top,#cookingHUD .cook-tools{pointer-events:auto;background:#142d3cee;border:2px solid #658c96;padding:10px}#cookingHUD .cook-top{position:absolute;top:10px;left:10px;right:10px;display:flex;align-items:center;justify-content:space-between;gap:8px}#cookingHUD .cook-tools{position:absolute;right:10px;bottom:100px;width:min(390px,calc(100vw - 20px));max-height:50vh;overflow:auto;overscroll-behavior:contain}#cookingHUD[data-menu=false] .cook-tools{display:none}#cookingHUD .cook-top{pointer-events:none}#cookingHUD .cook-top button{pointer-events:auto}#cookingHUD .cook-readout{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);width:min(600px,65vw);text-align:center;text-shadow:0 2px 3px #000;background:#142d3cbb;padding:8px;border-radius:6px}#cookingHUD .cook-readout button{pointer-events:auto}#cookingHUD .cook-timer{position:absolute;max-width:260px;padding:6px 9px;background:#142d3cee;border:1px solid #91bfa8;border-radius:5px;white-space:pre-line;text-align:center;transform:translate(-50%,-100%)}#cookingHUD .cook-tools{max-height:65vh}#cookingHUD .cook-progress{accent-color:#bce6bb;height:10px}#cookingHUD .cook-tools header{display:flex;align-items:center;justify-content:space-between;position:sticky;top:-10px;background:#142d3c}#cookingHUD button{font:inherit;color:#eff8de;background:#284c5a;border:1px solid #658c96;padding:9px;margin:3px}#cookingHUD button:disabled{opacity:.4}#cookingHUD button[aria-pressed=true]{background:#497361;border-color:#bce6bb}#cookingHUD .cook-dot{position:absolute;top:50%;left:50%;color:#eff8de}#cookingHUD progress{width:100%}#cookingHUD p{margin:6px 0}#cookingHUD .cook-target{font-size:18px;font-weight:bold}#cookingHUD .cook-section{padding-top:7px;border-top:1px solid #658c9650;margin-top:6px}.cook-log{font-size:12px;color:#bcd4cb}@media(max-width:600px){#cookingHUD .cook-top{font-size:12px}#cookingHUD .cook-tools{width:260px;bottom:105px;font-size:12px}#cookingHUD button{padding:8px}}`;document.head.append(style);
 const start=document.createElement('button');start.id='cookingStart';start.hidden=true;start.textContent='自由にクッキングを始める';document.body.append(start);
 const hud=document.createElement('section');hud.id='cookingHUD';hud.hidden=true;hud.dataset.menu='false';hud.innerHTML='<div class="cook-top"><span class="cook-state">家具をクリックして使う</span><span><button data-act="resume">操作へ戻る</button><button data-act="end">調理を終了</button></span></div><span class="cook-dot">＋</span><div class="cook-readout"><p class="cook-carry"></p><p class="cook-prompt"></p><progress class="cook-progress" hidden max="1"></progress><button data-act="cancel-work" hidden>作業を中止</button></div><div class="cook-timer" hidden></div><div class="cook-tools"><header><p class="cook-target"></p><button data-act="close">閉じる</button></header><p class="cook-hand"></p><p class="cook-vessels"></p><p class="cook-hint" role="status"></p><div class="cook-actions"></div><p class="cook-log"></p></div>';document.body.append(hud);
 const visuals=new THREE.Group();visuals.name='Free cooking workspace';scene.add(visuals);if(!camera.parent)scene.add(camera);const held=new THREE.Group();held.position.set(.28,-.36,-.8);camera.add(held);held.visible=false;
 let zone=null,session=null,near=null,target=null,menuTarget=null,task=null,lastScan=-Infinity,lastUI=-Infinity,cache=new Map(),status='',lastVisualKey='',targetKey='',knife=null;
 const raycaster=new THREE.Raycaster(),upAxis=new THREE.Vector3(0,1,0);
 const operationTimes={wash:4,fill:4,drain:2,clean:4,mix:5,stir:2,plate:2};
 const equipment=role=>zone?.stations.find(s=>s.role===role),handVessel=()=>session?.hand?.type==='vessel'?session.vessels[session.hand.id]:null;
 function worldPoint(station){const h=zone.home;return new THREE.Vector3(h.x+station.x*h.front,ROOM.floor+station.y+station.def.h*.88+.025,h.z+station.z*h.front);}
 function burner(){return Object.values(session.vessels).find(v=>v.location==='stove'&&v.slot===session.selectedBurner);}
 function counterBowl(){return session.vessels.bowl.location==='counter'?session.vessels.bowl:null;}
 function nearbyVessel(){return menuTarget?.role==='stove'?burner():handVessel()||counterBowl();}
 function makeVessel(kind){return {kind,foods:[],seasonings:{},water:0,temperature:20,fire:0,covered:false,mixed:false,mode:kind==='pan'?'fry':'boil',location:kind==='bowl'?'counter':'drawer',slot:0,stirs:0,lastStir:0,cookSeconds:0,timer:null,timerDone:false};}
 function begin(){if(!near)return;zone=near;session={hand:null,board:[],boardIndex:0,cutMode:'dice',selectedBurner:0,foodGroup:'vegetable',vessels:Object.fromEntries(Object.keys(vesselNames).map(id=>[id,makeVessel(id)])),dishes:(get().character.cookingDishes||[]).filter(d=>d.index===zone.index&&d.kitchenId===zone.id).slice(-4).map(d=>({...d,...describeDish(d.meal)})),elapsed:0,waterOn:false};near=null;menuTarget=null;task=null;target=null;hud.dataset.menu='false';status='冷蔵庫から好きな食材を取り、まな板やボウルへ運びましょう';start.hidden=true;hud.hidden=false;lastVisualKey='';onStart(zone);send({type:'cooking-start',index:zone.index,kitchenId:zone.id,recipe:'free'});renderModels(true);drawUI();}
 function end(){if(!session)return;send({type:'cooking-stop'});session=null;zone=null;target=null;menuTarget=null;task=null;held.clear();held.visible=false;visuals.clear();hud.hidden=true;onEnd();}
 function placeModel(model,station,dx=0,dz=0){const h=zone.home,yaw=station.yaw+(h.front<0?Math.PI:0);model.position.copy(worldPoint(station));model.position.x+=Math.cos(yaw)*dx+Math.sin(yaw)*dz;model.position.z+=-Math.sin(yaw)*dx+Math.cos(yaw)*dz;model.rotation.y=yaw;visuals.add(model);}
 function renderModels(force=false){if(!session)return;const key=JSON.stringify([session.hand,session.board,session.dishes,session.waterOn,Object.values(session.vessels).map(v=>({...v,cookSeconds:Math.floor(v.cookSeconds),timer:v.timer?{remaining:Math.ceil(v.timer.remaining),duration:v.timer.duration}:null,temperature:Math.floor(v.temperature/10)*10,foods:v.foods.map(f=>({...f,progress:Math.floor(f.progress/8)*8,burn:Math.floor(f.burn/10)*10}))}))]);if(!force&&key===lastVisualKey)return;lastVisualKey=key;visuals.clear();held.clear();held.visible=!!session.hand;const counter=equipment('counter'),stove=equipment('stove'),sink=equipment('sink'),board=new THREE.Group();part(board,'box',0,0,0,.68,.035,.42,'#bd9166');knife=new THREE.Group();knife.position.set(.23,.03,-.15);part(knife,'box',0,0,0,.22,.02,.035,'#a9b8bf');part(knife,'box',.15,0,0,.1,.03,.045,'#354353');board.add(knife);for(let i=0;i<session.board.length;i++){const food=foodModel(session.board[i]);food.position.set((i%2-.5)*.2,.025,(Math.floor(i/2)-.5)*.12);food.scale.setScalar(.7);board.add(food);}placeModel(board,counter,-.28,0);
 for(const [id,v]of Object.entries(session.vessels)){if(v.location==='drawer')continue;const model=vesselModel(v);if(v.location==='hand'){held.add(model);model.scale.setScalar(.75);continue;}if(v.location==='stove'){placeModel(model,stove,v.slot===0?-.28:.28,0);if(v.fire){const flame=new THREE.Group();for(let i=0;i<4;i++)part(flame,'cone',(i%2-.5)*.17,-.02,(Math.floor(i/2)-.5)*.17,.05,.09,.05,'#e6a655');placeModel(flame,stove,v.slot===0?-.28:.28,0);}if(v.temperature>=90&&v.water>.05){const steam=new THREE.Group();for(let i=0;i<4;i++)part(steam,'round',(i%2-.5)*.1,.4+i*.12,0,.065,.08,.06,'#dbe4df');placeModel(steam,stove,v.slot===0?-.28:.28,0);}}else if(v.location==='sink')placeModel(model,sink);else placeModel(model,counter,id==='bowl'?.42:id==='jug'?.65:-.52,0);}
 if(session.hand?.type==='food'){const model=foodModel(session.hand.food);model.scale.setScalar(.9);held.add(model);}if(session.waterOn){const water=new THREE.Group();part(water,'disc',0,.04,0,.027,.42,.027,'#79cbd9');placeModel(water,sink);}for(let i=0;i<session.dishes.length;i++)placeModel(vesselModel({...session.dishes[i].meal,kind:'plate'},{dish:true}),counter,(i%2-.5)*.52,-.26+Math.floor(i/2)*.25);}
 function selectTarget(ndc={x:0,y:0}){
  target=null;if(!session)return;camera.updateMatrixWorld(true);raycaster.setFromCamera(ndc,camera);
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
 }
 function inReach(station){return station&&worldPoint(station).distanceTo(get().player.position.clone().add(new THREE.Vector3(0,1,0)))<4.4;}
 function closeMenu(resume=true){menuTarget=null;hud.dataset.menu='false';onMenu(false,resume);if(session)drawUI();}

 function merge(source,destination){if(!destination||source===destination||destination.foods.length+source.foods.length>16||destination.water+source.water>capacity[destination.kind]){status='食材または水の量が容器の容量を超えます。先に盛り付けるか湯切りしてください';return false;}destination.foods.push(...source.foods);source.foods=[];for(const [id,n]of Object.entries(source.seasonings)){destination.seasonings[id]=Math.min(8,(destination.seasonings[id]||0)+n);}source.seasonings={};destination.mixed||=source.mixed;const liquid=source.water+destination.water;if(liquid>0)destination.temperature=(source.temperature*source.water+destination.temperature*destination.water)/liquid;destination.water=liquid;source.water=0;return true;}
 function plate(v){if(!v||!v.foods.length)return;const meal=cleanMeal(v),dish=describeDish(meal),id=crypto.randomUUID();session.dishes.push({id,meal,...dish});if(session.dishes.length>4)session.dishes.shift();v.foods=[];v.seasonings={};v.water=0;v.fire=0;v.covered=false;v.mixed=false;v.cookSeconds=0;v.timer=null;v.timerDone=false;status='完成：'+dish.name+' · '+dish.quality+'（'+dish.subtitle+'）';send({type:'cooking-finish',index:zone.index,kitchenId:zone.id,recipe:'free',dishId:id,meal});}
 function action(id,completed=false,station=menuTarget){
  if(id==='end'){end();return;}if(id==='close'||id==='resume'){closeMenu();return;}
  if(id==='cancel-work'){task=null;status='作業を中止しました';drawUI();return;}
  if(!session||task&&!completed)return;target=station;if(!inReach(target)){closeMenu(false);status='家具の近くへ移動してください';return;}
  const role=target.role,h=session.hand,v=handVessel(),onStove=role==='stove',onCounter=role==='counter',onSink=role==='sink',active=onStove?burner():v||counterBowl();
  if(!completed&&(id==='cut'||Object.hasOwn(operationTimes,id))){
   const food=session.board[session.boardIndex];
   const valid=id==='cut'?onCounter&&food&&!h:id==='mix'?onCounter&&active?.foods.length:id==='stir'?onStove&&burner()?.foods.length:id==='plate'?onCounter&&active?.foods.length:id==='wash'?onSink&&session.waterOn&&(h?.type==='food'||v?.foods.length):id==='fill'?onSink&&session.waterOn&&v:id==='drain'?onSink&&v?.water>0:id==='clean'?onSink&&session.waterOn&&v&&!v.foods.length:false;
   if(!valid)return;
   const duration=id==='cut'?(food.id==='egg'?1.2:session.cutMode==='mince'?7:session.cutMode==='dice'?5:3):id==='fill'?Math.max(.5,(capacity[v.kind]-v.water)*2):operationTimes[id];
   const names={cut:food?.id==='egg'?'卵を割る':CUTS[session.cutMode],wash:'食材を洗う',fill:'水をくむ',drain:'湯切り',clean:'容器を洗う',mix:'混ぜる',stir:'混ぜる／裏返す',plate:'盛り付け'};
   task={id,station,duration,remaining:duration,origin:get().player.position.clone(),label:names[id],foodIndex:session.boardIndex,cutMode:session.cutMode};
   status=names[id]+'を開始しました';closeMenu();drawUI();return;
  }

 if(id.startsWith('group-')&&role==='fridge'){session.foodGroup=id.slice(6);}
 else if(id.startsWith('take-food-')&&role==='fridge'&&!h){const f=FOOD_BY_ID.get(id.slice(10));if(!f)return;session.hand={type:'food',food:{id:f.id,washed:!f.wash,cut:null,cuts:0,progress:0,burn:0,method:'raw'}};status=f.name+'を手に持ちました。好きな作業台へ運んでください';}
 else if(id==='return-food'&&role==='fridge'&&h?.type==='food'){session.hand=null;status='食材を冷蔵庫へ戻しました';}
 else if(id.startsWith('take-vessel-')&&onCounter&&!h){const kind=id.slice(12),item=session.vessels[kind];if(item&&['drawer','counter'].includes(item.location)){item.location='hand';session.hand={type:'vessel',id:kind};status=vesselNames[kind]+'を手に持ちました';}}
 else if(id==='board-place'&&onCounter&&h?.type==='food'&&session.board.length<4){session.board.push(h.food);session.boardIndex=session.board.length-1;session.hand=null;status='食材をまな板に置きました';}
 else if(id.startsWith('board-select-')&&onCounter){session.boardIndex=Math.min(session.board.length-1,Number(id.slice(13)));}
 else if(id.startsWith('cut-mode-')&&onCounter){const mode=id.slice(9);if(Object.hasOwn(CUTS,mode))session.cutMode=mode;}
 else if(id==='cut'&&onCounter&&session.board.length){const f=session.board[session.boardIndex]||session.board[0];f.cuts=3;f.cut=session.cutMode;status=f.id==='egg'?'卵を割りました':FOOD_BY_ID.get(f.id).name+'を'+CUTS[session.cutMode]+'にしました';}
 else if(id==='board-pick'&&onCounter&&!h&&session.board.length){const pickIndex=Math.max(0,Math.min(session.board.length-1,session.boardIndex));session.hand={type:'food',food:session.board.splice(pickIndex,1)[0]};session.boardIndex=0;status='まな板の食材を取りました';}
 else if(id==='board-collect'&&onCounter&&v?.kind==='bowl'){const cut=session.board.filter(f=>f.cut);if(v.foods.length+cut.length<=16){v.foods.push(...cut);session.board=session.board.filter(f=>!f.cut);session.boardIndex=0;status='切った食材をボウルに回収しました';}}
 else if(id==='counter-place'&&onCounter&&v){v.location='counter';session.hand=null;status=vesselNames[v.kind]+'を作業台に置きました';}
 else if(id==='bowl-add'&&onCounter&&h?.type==='food'&&counterBowl()?.foods.length<16){counterBowl().foods.push(h.food);session.hand=null;status='食材をボウルに入れました';}
 else if(id==='bowl-merge'&&onCounter&&v&&counterBowl()&&v!==counterBowl()){if(merge(v,counterBowl()))status='ボウルへ材料を移しました';}
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
 else if(id==='plate'&&onCounter){const source=v||counterBowl();plate(source);}
 else if(id==='clear-board'&&onCounter){session.board=[];session.boardIndex=0;status='まな板を片付けました';}
 else if(id==='empty'&&onSink&&v){v.foods=[];v.water=0;v.seasonings={};v.mixed=false;v.cookSeconds=0;v.timer=null;v.timerDone=false;status='容器の中身を片付けました';}
 if(!completed&&(id.startsWith('take-food-')||id.startsWith('take-vessel-')||['board-pick','board-collect','counter-place','stove-pick','board-place','stove-place','stove-add','bowl-add'].includes(id)))closeMenu();
 renderModels(true);drawUI();}
 function timeLabel(seconds){const whole=Math.max(0,Math.ceil(seconds));return Math.floor(whole/60)+'分'+String(whole%60).padStart(2,'0')+'秒';}
 function drawUI(){if(!session)return;const h=session.hand,v=handVessel(),active=nearbyVessel(),selected=burner(),station=menuTarget;hud.dataset.menu=String(!!station);hud.querySelector('.cook-state').textContent='自由調理 · WASDで移動 · マウスで視点 · クリック／Eで設備';hud.querySelector('[data-act=resume]').hidden=!!document.pointerLockElement||!!menuTarget;hud.querySelector('.cook-target').textContent=station?.def.name||'照準を合わせて家具をクリック';hud.querySelector('.cook-hand').textContent='手：'+(h?.type==='food'?FOOD_BY_ID.get(h.food.id).name+(h.food.cut?'（'+CUTS[h.food.cut]+'）':''):v?vesselNames[v.kind]+'（食材'+v.foods.length+'・水'+v.water.toFixed(1)+'L）':'空いています');hud.querySelector('.cook-vessels').textContent=Object.values(session.vessels).filter(v=>v.location==='stove').map(v=>vesselNames[v.kind]+'：'+Math.round(v.temperature)+'℃／'+(v.water>0?(v.temperature>=99?'沸騰中':'水を加熱中'):COOK_METHODS[v.mode])+'／'+timeLabel(v.cookSeconds)+'／食材'+v.foods.length).join('　');hud.querySelector('.cook-hint').textContent=(task?'完了まで '+timeLabel(task.remaining):status)+(selected?.fire&&['boil','simmer','steam'].includes(selected.mode)&&selected.water<=.01?' · 鍋に水を入れてください':selected?.fire&&selected.mode==='steam'&&!selected.covered?' · 蒸すにはふたを閉めてください':'');updateReadout();const buttons=[],add=(id,label,enabled=true,pressed=false)=>buttons.push({id,label,enabled:enabled&&!task,pressed}),section=label=>buttons.push({section:label});
 if(station){const role=station.role;if(role==='fridge'){section('食材を選ぶ');for(const [id,name]of Object.entries(FOOD_GROUPS))add('group-'+id,name,true,id===session.foodGroup);section(FOOD_GROUPS[session.foodGroup]);for(const f of INGREDIENTS.filter(f=>f.group===session.foodGroup))add('take-food-'+f.id,f.name,!h);if(h?.type==='food')add('return-food','冷蔵庫へ戻す');}
 if(role==='counter'){section('器具と作業台');for(const [id,name]of Object.entries(vesselNames))add('take-vessel-'+id,name+'を持つ',!h&&['drawer','counter'].includes(session.vessels[id].location));add('counter-place','持っている容器を置く',!!v);add('board-place','食材をまな板に置く',h?.type==='food'&&session.board.length<4);for(let i=0;i<session.board.length;i++)add('board-select-'+i,FOOD_BY_ID.get(session.board[i].id).name,true,i===session.boardIndex);for(const [id,name]of Object.entries(CUTS))add('cut-mode-'+id,name,true,id===session.cutMode);add('cut',session.board[session.boardIndex]?.id==='egg'?'卵を割る · 1.2秒':'包丁で切る · '+(session.cutMode==='mince'?7:session.cutMode==='dice'?5:3)+'秒',session.board.length>0&&!h);add('board-pick','選んだ食材を取る',!h&&session.board.length>0);add('board-collect','切った食材をボウルに回収',v?.kind==='bowl'&&session.board.some(f=>f.cut));add('bowl-add','作業台のボウルへ入れる',h?.type==='food'&&!!counterBowl());add('bowl-merge','作業台のボウルへ食材を移す',!!v&&!!counterBowl()&&v!==counterBowl());add('mix','材料を混ぜる · 5秒',!!active?.foods.length);add('plate','お皿へ盛り付ける',!!(v||counterBowl())?.foods.length);add('clear-board','まな板の食材を片付ける',session.board.length>0);}
 if(role==='sink'){section('水・洗浄・湯切り');add('water',session.waterOn?'蛇口を閉める':'蛇口を開ける');add('wash','手持ちの食材を洗う · 4秒',session.waterOn&&(h?.type==='food'||!!v?.foods.length));add('fill','容器に水をくむ',session.waterOn&&!!v);add('drain','湯切り／水を捨てる',!!v&&v.water>0);add('clean','空の容器を洗う',session.waterOn&&!!v&&!v.foods.length);add('empty','中身を片付ける',!!v&&!!(v.foods.length||v.water));}
 if(role==='stove'){section('コンロを選ぶ');for(let i=0;i<2;i++)add('burner-'+i,'コンロ '+(i+1),true,i===session.selectedBurner);add('stove-place','フライパン／鍋を置く',!!v&&['pan','pot'].includes(v.kind)&&!selected);add('stove-pick','器具を持って運ぶ',!h&&!!selected);add('stove-add','手持ちの食材を入れる',h?.type==='food'&&!!selected);add('stove-pour','ボウルの食材を移す',!!v&&v!==selected&&!!v.foods.length&&!!selected);add('pour-water','水差し／容器から水を注ぐ',!!v&&v!==selected&&v.water>0&&!!selected);section(selected?vesselStatus(selected):'火加減と調理');for(let i=0;i<4;i++)add('fire-'+i,['消火','弱火','中火','強火'][i],!!selected,selected?.fire===i);for(const id of ['fry','boil','simmer','steam',...(station.def.family==='oven'?['bake']:[])])add('method-'+id,COOK_METHODS[id],!!selected,selected?.mode===id);section('加熱タイマー · 適温からカウント／終了時消火');for(const seconds of [30,60,120,300])add('timer-'+seconds,timeLabel(seconds),!!selected);add('timer-0','タイマー解除',!!selected?.timer);add('cover',selected?.covered?'ふたを開ける':'ふたを閉める',!!selected&&selected.kind==='pot');add('stir','混ぜる／裏返す · 2秒',!!selected?.foods.length);}
 if(['counter','stove'].includes(role)&&active){section('調味料を加える');for(const [id,name]of Object.entries(SEASONINGS))add('season-'+id,name,true);}}
  if(station&&active?.foods.length){section('食材の火の通り');for(const food of active.foods)section(FOOD_BY_ID.get(food.id).name+' · '+(food.burn>35?'焦げ':food.progress>=FOOD_BY_ID.get(food.id).time?'火が通った':food.method==='raw'||food.method==='mix'?'未加熱':Math.round(food.progress/Math.max(1,FOOD_BY_ID.get(food.id).time)*100)+'%'));}const list=hud.querySelector('.cook-actions'),key=JSON.stringify(buttons);if(list.dataset.buttons!==key){list.dataset.buttons=key;list.replaceChildren();for(const entry of buttons){if(entry.section){const title=document.createElement('p');title.className='cook-section';title.textContent=entry.section;list.append(title);continue;}const button=document.createElement('button');button.dataset.act=entry.id;button.textContent=entry.label;button.disabled=!entry.enabled;button.setAttribute('aria-pressed',String(entry.pressed));list.append(button);}}
 hud.querySelector('.cook-log').textContent=session.dishes.map(d=>d.name+'：'+d.quality).join(' ／ ')||'レシピ選択はありません。組み合わせた食材と調理方法から料理が決まります。';}
 hud.onclick=event=>{const button=event.target.closest('button[data-act]');if(button&&!button.disabled)action(button.dataset.act);};start.onclick=begin;
 function scan(){const s=get(),zones=[];for(const [index,room]of Object.entries(s.housing?.rooms||{})){if(!room.layout)continue;const key=index+':'+room.layout.rev;let result=cache.get(key);if(!result){result=recognizeKitchens(index,room.layout);cache.set(key,result);if(cache.size>100)cache.delete(cache.keys().next().value);}zones.push(...result.zones);}near=s.connected&&s.inStudio&&!s.paused&&!s.ragdoll&&!s.seated&&!s.sleeping&&!s.inBattle?zones.find(z=>z.allowed(s.player.position)&&Math.abs(s.player.position.y-ROOM.floor)<.8):null;start.hidden=!near;}
 function vesselStatus(v){
  const wet=v.water>.01,waiting=['boil','simmer','steam'].includes(v.mode)&&(!wet||v.mode==='steam'&&!v.covered);
  return vesselNames[v.kind]+' · '+Math.round(v.temperature)+'℃ · '+COOK_METHODS[v.mode]+' '+timeLabel(v.cookSeconds)+(v.timer?'\n残り '+timeLabel(v.timer.remaining)+(waiting?'（水・ふたを確認）':v.temperature<92&&wet?'（沸騰待ち）':''):v.timerDone?'\nタイマー終了・消火済み':'')+' · 水 '+v.water.toFixed(1)+'L';
 }
 function updateReadout(){
  const h=session.hand,v=handVessel();hud.querySelector('.cook-carry').textContent='手：'+(h?.type==='food'?FOOD_BY_ID.get(h.food.id).name:v?vesselNames[v.kind]:'空き');
  hud.querySelector('.cook-prompt').textContent=task?task.label+' · 残り '+timeLabel(task.remaining):menuTarget?'操作を選び、閉じると移動に戻ります':target?target.def.name+' · クリック／Eで使う':status;
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
  if(task.remaining===0){const finished=task;task=null;session.boardIndex=finished.foodIndex;session.cutMode=finished.cutMode;action(finished.id,true,finished.station);if(knife){knife.position.y=.03;knife.rotation.z=0;}}
 }
 function update(dt,now){
  const s=get();if(!session){if(now-lastScan>500){lastScan=now;scan();}return;}
  const room=s.housing?.rooms[zone.index];if(!s.connected||!s.inStudio||s.ragdoll||s.inBattle||!room||room.layout.rev!==zone.rev){notify('キッチンの状態が変わったため調理を終了しました');end();return;}
  session.elapsed+=dt;heat(dt);advanceWork(dt);if(!task&&knife){knife.position.y=.03;knife.rotation.z=0;}
  if(menuTarget&&!inReach(menuTarget))closeMenu(false);
  if(now-lastUI<100)return;lastUI=now;selectTarget();renderModels();drawUI();
 }
 function interact(ndc){
  if(!session||menuTarget)return false;selectTarget(ndc);
  if(!target){status='使いたい家具に近づいて照準を合わせてください';return false;}
  menuTarget=target;onMenu(true,false);drawUI();return true;
 }
 return {get active(){return !!session;},get choosing(){return !!menuTarget;},update,end,interact,closeMenu,constrain(position,previous){if(!session)return;const b=zone.bounds;if(position.x<b.minX||position.x>b.maxX)position.x=previous.x;if(position.z<b.minZ||position.z>b.maxZ)position.z=previous.z;},receive(message){if(message.playerId!==get().selfId)return false;if(message.type==='cooking-result'){status=message.error||'完成した料理「'+message.name+'」をサーバーに保存しました';if(session&&message.error&&message.fatal){notify(message.error);end();}else if(session)drawUI();return true;}return false;},key(event){if(!session)return false;if(event.code==='Escape'){event.preventDefault();closeMenu(false);return true;}if(event.code==='KeyE'&&!event.repeat&&!/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)){event.preventDefault();if(menuTarget)closeMenu();else interact();return true;}return false;}};
}
