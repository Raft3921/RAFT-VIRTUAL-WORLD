// Bind actions to physical standard-Gamepad positions; render device-specific names.
export function gamepadStick(x=0,y=0,deadzone=.14,curve=1,outer=.96){
 x=Number.isFinite(x)?x:0;y=Number.isFinite(y)?y:0;
 const length=Math.hypot(x,y);if(length<=deadzone)return {x:0,y:0};
 const amount=Math.pow(Math.min(1,(length-deadzone)/Math.max(.01,outer-deadzone)),curve);
 return {x:x/length*amount,y:y/length*amount};
}
const DEFAULT={attack:7,aim:6,jump:0,crouch:1,reload:2,interact:3,sprint:10,prone:11,menu:9,map:8,camera:12,chat:13,previous:4,next:5};
const ACTION_NAMES={attack:'射撃・近接攻撃',aim:'銃を構える・拡大',jump:'ジャンプ・這い上がり',crouch:'しゃがむ',reload:'リロード',interact:'使う',sprint:'ダッシュ',prone:'匍匐',menu:'メニュー',map:'地図',camera:'視点切替',chat:'チャット',previous:'前の観戦対象・飛行降下',next:'次の観戦対象・飛行上昇'};
const LABELS={nintendo:['B','A','Y','X','L','R','ZL','ZR','−','＋','L3','R3','十字↑','十字↓','十字←','十字→','HOME'],playstation:['×','○','□','△','L1','R1','L2','R2','SHARE','OPTIONS','L3','R3','十字↑','十字↓','十字←','十字→','PS'],xbox:['A','B','X','Y','LB','RB','LT','RT','Back','Start','LS','RS','十字↑','十字↓','十字←','十字→','Guide']};
export function createGamepadControls({get,action,look,release}){
 const read=(key,fallback)=>{try{return localStorage.getItem('vrs-pad-'+key)??fallback;}catch{return fallback;}};
 const save=(key,value)=>{try{localStorage.setItem('vrs-pad-'+key,String(value));}catch{}};
 const number=(key,fallback,min,max)=>{const n=Number(read(key,fallback));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
 const choice=(key,fallback,values)=>{const value=read(key,fallback);return values.includes(value)?value:fallback;};
 const settings={sensitivity:number('sensitivity',1,.2,3),vertical:number('vertical',.8,.3,1.5),aim:number('aim',.35,.1,1),deadzone:number('deadzone',.14,.05,.4),lookDeadzone:number('lookDeadzone',.12,.03,.4),confirm:choice('confirm','auto',['auto','south','east']),curve:choice('curve','precision',['precision','linear','soft']),aimMode:choice('aimMode','hold',['hold','toggle']),sprintMode:choice('sprintMode','toggle',['toggle','hold','auto']),smoothing:number('smoothing',.035,0,.12),invert:read('invert','false')==='true',layout:choice('layout','auto',['auto','nintendo','playstation','xbox']),raw:read('raw','false')==='true'};
 let bindings={...DEFAULT};try{const saved=JSON.parse(read('bindings','null'));if(saved&&Object.keys(DEFAULT).every(k=>Number.isInteger(saved[k])&&saved[k]>=0&&saved[k]<32)&&new Set(Object.keys(DEFAULT).map(k=>saved[k])).size===Object.keys(DEFAULT).length)bindings=Object.fromEntries(Object.keys(DEFAULT).map(k=>[k,saved[k]]));}catch{}
 const panel=document.createElement('div');panel.className='gamepad-settings';
 panel.innerHTML=`<h3>コントローラー</h3><p id="gamepadStatus" role="status"></p><p class="help">接続後にボタンを押してください。Nintendo・PlayStation・Xboxの表示を自動選択します。</p>
 <label>ボタン表示<select data-pad="layout"><option value="auto">自動</option><option value="nintendo">Nintendo</option><option value="playstation">PlayStation</option><option value="xbox">Xbox / その他</option></select></label>
 <label>メニューの決定ボタン<select data-pad="confirm"><option value="auto">自動（Nintendoは右、その他は下）</option><option value="south">下のボタンで決定</option><option value="east">右のボタンで決定</option></select></label>
 <div class="pad-preset"><button type="button" data-preset="standard">標準配置</button><button type="button" data-preset="tactical">タクティカル配置</button></div><p class="help">タクティカル配置は右スティック押込でしゃがみ、右のフェイスボタンで匍匐。視点から指を離さず姿勢を変えられます。</p>
 <label>視点感度<output data-pad-out="sensitivity"></output><input data-pad="sensitivity" type="range" min=".2" max="3" step=".05"></label>
 <label>縦方向の感度<output data-pad-out="vertical"></output><input data-pad="vertical" type="range" min=".3" max="1.5" step=".05"></label>
 <label>照準中の感度<output data-pad-out="aim"></output><input data-pad="aim" type="range" min=".1" max="1" step=".05"></label>
 <label>移動スティックの遊び<output data-pad-out="deadzone"></output><input data-pad="deadzone" type="range" min=".05" max=".4" step=".01"></label>
 <label>視点スティックの遊び<output data-pad-out="lookDeadzone"></output><input data-pad="lookDeadzone" type="range" min=".03" max=".4" step=".01"></label>
 <label>視点の応答<select data-pad="curve"><option value="precision">精密：小さな入力を細かく</option><option value="linear">リニア：傾きに比例</option><option value="soft">穏やか：中心付近をさらに細かく</option></select></label>
 <label>視点のなめらかさ<output data-pad-out="smoothing"></output><input data-pad="smoothing" type="range" min="0" max=".12" step=".005"></label>
 <label>照準操作<select data-pad="aimMode"><option value="hold">押している間</option><option value="toggle">押すたびに切替</option></select></label>
 <label>ダッシュ操作<select data-pad="sprintMode"><option value="toggle">押して開始・スティックを戻して解除</option><option value="hold">押している間</option><option value="auto">大きく前へ倒すと自動</option></select></label>
 <label><input data-pad="invert" type="checkbox">視点の上下を反転</label><label><input data-pad="raw" type="checkbox">未認識パッドを標準配置として使用</label>
 <details><summary>ボタンの割り当て</summary><p class="help">変更したい操作を選び、使うボタンを一度押してください。重複時は元の割り当てと交換します。メニューの決定・戻るは上の「決定ボタン」で選べます。</p><p class="pad-binding-message" role="status"></p><div class="pad-bindings"></div><button type="button" class="pad-bind-cancel" hidden>割り当てをキャンセル</button></details>
 <details><summary>入力の状態を見る</summary><p class="help">手を離しても値が動く場合は、対応するスティックの遊びを増やしてください。</p><pre class="pad-monitor"></pre></details>
 <p class="help">メニュー：十字キー・左スティックで選択、左右で設定変更、右スティック上下でスクロール。SwitchのDNSブラウザーとPS4本体の動作は未確認です。入力APIや3D描画に非対応のブラウザーでは利用できません。</p>`;
 document.querySelector('[data-world-panel="controls"]').prepend(panel);
 const status=panel.querySelector('#gamepadStatus'),hint=document.createElement('div');hint.id='gamepadHint';hint.hidden=true;document.body.append(hint);
 const lobbyStatus=document.createElement('p');lobbyStatus.className='help';document.querySelector('#lobby .lobby-panel').append(lobbyStatus);
 const help=document.createElement('p');help.className='help';document.getElementById('controlHelp').after(help);
 const quick=document.createElement('button');quick.textContent='コントローラー設定';document.getElementById('controlHelp').before(quick);quick.onclick=()=>action('settings');
 const bindingMessage=panel.querySelector('.pad-binding-message'),cancelBinding=panel.querySelector('.pad-bind-cancel'),monitor=panel.querySelector('.pad-monitor');
 let index=null,identity='',buttons=[],physical=[],latches=[],needsLatch=true,context='',repeatAt=0,repeatDir='',active=false,sprinting=false,aiming=false,focused=true;
 let move={x:0,y:0},loadout='',display='xbox',rate={x:0,y:0},generation=0,bindingTarget=null,bindingDeadline=0,uiAt=0,menuRoot=null,triggerActive=false;
 const bindingButtons=new Map();
 const setText=(el,text)=>{if(el.textContent!==text)el.textContent=text;};
 const name=i=>LABELS[display][i]||'ボタン '+i;
 function reset(){move={x:0,y:0};rate={x:0,y:0};sprinting=aiming=triggerActive=false;needsLatch=true;generation++;hint.hidden=true;release();}
 function cancelCapture(message=''){bindingTarget=null;cancelBinding.hidden=true;bindingMessage.textContent=message;reset();}
 function saveBindings(){save('bindings',JSON.stringify(bindings));refreshBindings();reset();}
 function refreshBindings(){for(const [key,button]of bindingButtons)setText(button,ACTION_NAMES[key]+'：'+name(bindings[key]));}
 for(const key of Object.keys(DEFAULT)){
  const button=document.createElement('button');button.type='button';button.onclick=()=>{reset();bindingTarget=key;bindingDeadline=performance.now()+10000;cancelBinding.hidden=false;bindingMessage.textContent=ACTION_NAMES[key]+'に使うボタンを押してください（10秒以内）';};
  bindingButtons.set(key,button);panel.querySelector('.pad-bindings').append(button);
 }
 cancelBinding.onclick=()=>cancelCapture('割り当てをキャンセルしました');
 for(const button of panel.querySelectorAll('[data-preset]'))button.onclick=()=>{bindings={...DEFAULT};if(button.dataset.preset==='tactical'){bindings.crouch=11;bindings.prone=1;}cancelCapture();saveBindings();bindingMessage.textContent='配置を変更しました';};
 for(const input of panel.querySelectorAll('[data-pad]')){
  const key=input.dataset.pad;input[input.type==='checkbox'?'checked':'value']=settings[key];
  const refresh=()=>{const output=panel.querySelector(`[data-pad-out="${key}"]`);if(output)setText(output,key==='smoothing'?Math.round(settings[key]*1000)+' ms':/deadzone/i.test(key)?Math.round(settings[key]*100)+'%':Number(settings[key]).toFixed(2)+'×');};refresh();
  const apply=()=>{const value=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;if(settings[key]===value)return;settings[key]=value;save(key,value);refresh();if(['aimMode','sprintMode','raw'].includes(key))reset();};
  input.addEventListener('input',apply);input.addEventListener('change',apply);
 }
 refreshBindings();
 const visible=el=>!el.disabled&&!el.closest('[hidden],[inert]')&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
 function uiItems(){
  const roots=[...document.querySelectorAll('#lobby,#menu,#master,#worldMenu,.experience-panel,[role="dialog"],#worldChat,#plazaMap,#worldGuide')].filter(visible);
  // Prefer the frontmost modal even when focus still belongs to the panel beneath it.
  roots.sort((a,b)=>(parseFloat(getComputedStyle(a).zIndex)||0)-(parseFloat(getComputedStyle(b).zIndex)||0));
  const root=roots.at(-1)||document.body;menuRoot=root;
  return [...root.querySelectorAll('button,a[href],input,select,textarea,summary')].filter(el=>visible(el)&&el.tabIndex!==-1&&!el.closest('#hud,#economyHud,#gamepadHint'));
 }
 function focusItem(item){item?.focus({preventScroll:true});item?.scrollIntoView({block:'nearest',inline:'nearest'});}
 function navigate(dir,sequential=false){
  const items=uiItems();if(!items.length)return;const item=document.activeElement,at=items.indexOf(item),step=dir==='right'||dir==='down'?1:-1;
  if(!sequential&&(dir==='left'||dir==='right')&&at>=0){
   if(item.tagName==='SELECT'){
    let next=item.selectedIndex+step;while(item.options[next]?.disabled)next+=step;
    if(next>=0&&next<item.options.length){item.selectedIndex=next;item.dispatchEvent(new Event('change',{bubbles:true}));}return;
   }
   if(item.tagName==='INPUT'&&['range','number'].includes(item.type)){
    const unit=Number(item.step)||1,value=Number(item.value)||0,min=item.min===''?-Infinity:Number(item.min),max=item.max===''?Infinity:Number(item.max);
    item.value=String(Math.max(min,Math.min(max,Number((value+step*unit).toFixed(5)))));item.dispatchEvent(new Event('input',{bubbles:true}));item.dispatchEvent(new Event('change',{bubbles:true}));return;
   }
  }
  if(at<0){focusItem(items[0]);return;}
  if(!sequential){
   const r=item.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,horizontal=dir==='left'||dir==='right';let best=null,score=Infinity;
   for(const candidate of items){if(candidate===item)continue;const c=candidate.getBoundingClientRect(),dx=c.left+c.width/2-x,dy=c.top+c.height/2-y,forward=(horizontal?dx:dy)*step,side=Math.abs(horizontal?dy:dx);if(forward<4)continue;const value=forward+side*2.5;if(value<score){best=candidate;score=value;}}
   if(best){focusItem(best);return;}
   return;
  }
  focusItem(items[(at+step+items.length)%items.length]);
 }
 function poll(){
  try{const getter=typeof navigator.getGamepads==='function'?navigator.getGamepads:navigator.webkitGetGamepads;return {supported:typeof getter==='function',pads:getter?Array.from(getter.call(navigator)||[]):[],error:false};}catch{return {supported:true,pads:[],error:true};}
 }
 function sample(pad){return Array.from(pad.buttons||[],(button,i)=>{const value=typeof button==='number'?button:button?.value||0;return button?.pressed===true||value>(i===6||i===7?(physical[i] ? .12 : .25):(physical[i] ? .25 : .45));});}
 function switchToPointer(){if(active){reset();active=false;document.body.dataset.gamepad='false';hint.hidden=true;}}
 function update(dt,now){
  const s=get(),result=poll(),candidates=result.pads.filter(p=>p&&p.connected!==false);
  let pad=candidates.find(p=>p.index===index);
  const used=candidates.find(p=>Array.from(p.buttons||[]).some(b=>typeof b==='number'?b>.5:b?.pressed||b?.value>.5)||Array.from(p.axes||[]).some(a=>Math.abs(a)>.6));
  if(used&&(!pad||!active))pad=used;else pad??=candidates[0];
  const next=pad?pad.index+':'+pad.id:'';
  if(identity!==next){reset();identity=next;index=pad?.index??null;buttons=physical=[];latches=[];active=false;}
  const detected=/nintendo|joy-con|switch|pro controller|057e/i.test(pad?.id||'')?'nintendo':/playstation|dualshock|dualsense|wireless controller|054c/i.test(pad?.id||'')?'playstation':'xbox';
  const nextDisplay=settings.layout==='auto'?detected:settings.layout;if(display!==nextDisplay){display=nextDisplay;refreshBindings();}
  const usable=!!pad&&(pad.mapping==='standard'||settings.raw),mode=s.cinematic?'cinematic':s.menu?'menu':s.spectator?'spectator':s.enabled?'play':'blocked';
  if(loadout!==(s.weapon||'')){reset();loadout=s.weapon||'';}
  if(mode!==context){reset();context=mode;repeatDir='';menuRoot=null;if(bindingTarget)cancelCapture();}
  if(now>=uiAt){
   uiAt=now+150;
   const label=!result.supported?'このブラウザーは入力APIに非対応です':result.error?'入力APIへのアクセスが制限されています。HTTPSで開いてください':!pad?'未検出 · 接続してボタンを押してください':!usable?'配置を認識できません。必要なら「未認識パッドを標準配置として使用」を選択':`接続中：${pad.id}`;
   setText(status,label);setText(lobbyStatus,'コントローラー：'+label);
   const description=`左スティック：移動 / 右：視点 / ${name(bindings.attack)}：射撃 / ${name(bindings.aim)}：構え・拡大 / ${name(bindings.jump)}：ジャンプ / ${name(bindings.crouch)}：しゃがむ / ${name(bindings.reload)}：リロード / ${name(bindings.interact)}：使う / ${name(bindings.sprint)}：ダッシュ / ${name(bindings.prone)}：匍匐 / ${name(bindings.menu)}：メニュー`;
   setText(help,description);
   const confirm=settings.confirm==='east'||settings.confirm==='auto'&&display==='nintendo'?1:0,back=1-confirm;
   setText(hint,mode==='menu'?`${name(confirm)} 決定 · ${name(back)} 戻る · 十字 選択 · 左右 設定変更 · 右スティック スクロール`:`${name(bindings.attack)} 射撃 · ${name(bindings.aim)} 照準 · ${name(bindings.jump)} ジャンプ · ${name(bindings.reload)} 装填 · ${name(bindings.interact)} 使う · ${name(bindings.menu)} メニュー`);
   if(visible(monitor))setText(monitor,!pad?'コントローラー未検出':`配置：${pad.mapping||'未認識'}\n軸：${Array.from(pad.axes||[]).map((a,i)=>i+': '+Number(a).toFixed(2)).join(' / ')}\n押しているボタン：${Array.from(pad.buttons||[]).map((b,i)=>(typeof b==='number'?b>.25:b?.pressed||b?.value>.25)?i+' ('+name(i)+')':null).filter(Boolean).join(', ')||'なし'}`);
  }
  if(!usable||document.hidden||!focused){if(active)reset();active=false;document.body.dataset.gamepad='false';hint.hidden=true;return;}
  physical=sample(pad);
  // Quarantine only buttons held across transitions. Sticks resume without a full neutral reset.
  if(needsLatch){latches=physical.map(Boolean);buttons=physical.map(()=>false);needsLatch=false;}
  const current=physical.map((down,i)=>{if(!down)latches[i]=false;return down&&!latches[i];});
  const left=gamepadStick(pad.axes?.[0],pad.axes?.[1],settings.deadzone),rawRight=gamepadStick(pad.axes?.[2],pad.axes?.[3],settings.lookDeadzone,1);
  const right=gamepadStick(pad.axes?.[2],pad.axes?.[3],settings.lookDeadzone,settings.curve==='linear'?1:settings.curve==='soft'?2.2:1.65);
  const edge=i=>!!current[i]&&!buttons[i],down=key=>!!current[bindings[key]],tap=key=>edge(bindings[key]);
  if(current.some(Boolean)||left.x||left.y||right.x||right.y)active=true;
  if(!active){buttons=current;return;}
  document.body.dataset.gamepad='true';hint.hidden=s.clean||!['play','menu'].includes(mode);
  if(bindingTarget){
   if(now>bindingDeadline)cancelCapture('時間切れになりました。もう一度操作を選んでください');
   else{const chosen=current.findIndex((_,i)=>i<32&&edge(i));if(chosen>=0){const key=bindingTarget,old=bindings[key],other=Object.keys(bindings).find(k=>k!==key&&bindings[k]===chosen);bindings[key]=chosen;if(other)bindings[other]=old;cancelCapture(ACTION_NAMES[key]+'を '+name(chosen)+' に変更しました');saveBindings();}}
   buttons=current;return;
  }
  const serial=generation;
  if(mode==='cinematic'){if(tap('menu'))action('skip');}
  else if(mode==='spectator'){if(tap('menu'))action('menu');else{if(tap('previous'))action('spectate',-1);if(tap('next'))action('spectate',1);}}
  else if(mode==='menu'){
   const items=uiItems();if(!items.includes(document.activeElement))focusItem(items[0]);
   const dir=current[12]||left.y<-.55?'up':current[13]||left.y>.55?'down':current[14]||left.x<-.55?'left':current[15]||left.x>.55?'right':'';
   if(dir&&(dir!==repeatDir||now>=repeatAt)){navigate(dir);repeatAt=now+(dir===repeatDir?110:340);}repeatDir=dir;
   if(Math.abs(rawRight.y)>.15){const item=document.activeElement;let scroll=item?.parentElement;while(scroll&&scroll!==menuRoot&&!(scroll.scrollHeight>scroll.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(scroll).overflowY)))scroll=scroll.parentElement;const target=scroll||menuRoot;if(target)target.scrollTop+=rawRight.y*650*dt;}
   const confirm=settings.confirm==='east'||settings.confirm==='auto'&&display==='nintendo'?1:0,back=1-confirm;
   if(edge(back)||(tap('menu')&&bindings.menu!==confirm))action('back');
   else if(edge(confirm)){const item=document.activeElement;if(item?.matches('button,a,summary,input[type="checkbox"],input[type="radio"]'))item.click();else item?.focus();}
   if(generation===serial){if(edge(4))navigate('up',true);if(edge(5))navigate('down',true);}
  }else if(mode==='play'){
   if(tap('menu')){action('menu');buttons=current;return;}
   move=left;
   if(settings.aimMode==='toggle'){if(tap('aim'))aiming=!aiming;}else aiming=down('aim');
   aiming=!!s.weapon&&aiming;action('aim',aiming);
   const scale=(aiming?settings.aim:1)*settings.sensitivity,blend=settings.smoothing?1-Math.exp(-dt/settings.smoothing):1;
   if(!right.x&&!right.y)rate={x:0,y:0};else{rate.x+=(right.x-rate.x)*blend;rate.y+=(right.y-rate.y)*blend;}
   look(-rate.x*2.8*scale*dt,-rate.y*2.8*settings.vertical*scale*dt*(settings.invert?-1:1));
   if(settings.sprintMode==='auto')sprinting=left.y<-.85;else if(settings.sprintMode==='hold')sprinting=down('sprint');else if(tap('sprint'))sprinting=!sprinting;
   if(left.y>-.2||aiming)sprinting=false;
   for(const kind of ['jump','crouch','prone','interact','reload','map','chat','camera']){if(generation!==serial)break;if(tap(kind))action(kind);}
   if(generation===serial){
    // Reload resets weapon state; keep a held trigger quarantined until released.
    if(tap('reload')){release();latches[bindings.attack]=physical[bindings.attack];triggerActive=false;}
    else if(tap('attack')){action('attack',true);triggerActive=true;}
    else if(!down('attack')&&buttons[bindings.attack]&&triggerActive){action('attack',false);triggerActive=false;}
    if(tap('previous'))action('spectate',-1);if(tap('next'))action('spectate',1);
   }
  }
  buttons=current;
 }
 addEventListener('blur',()=>{focused=false;reset();});addEventListener('focus',()=>{focused=true;reset();});document.addEventListener('visibilitychange',reset);
 addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===index){reset();index=null;identity='';active=false;document.body.dataset.gamepad='false';hint.hidden=true;}});
 document.addEventListener('pointerdown',switchToPointer,true);document.addEventListener('keydown',e=>{if(e.isTrusted)switchToPointer();},true);
 return {update,reset,get move(){return move;},get sprint(){return sprinting;},get aiming(){return active&&context==='play'&&aiming;},get ascend(){return active&&!needsLatch&&context==='play'&&!!buttons[bindings.next];},get descend(){return active&&!needsLatch&&context==='play'&&!!buttons[bindings.previous];}};
}
