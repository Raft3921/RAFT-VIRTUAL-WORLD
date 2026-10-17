// Standard Gamepad API positions; names are presentation only (Nintendo B/A/Y/X).
export function gamepadStick(x=0,y=0,deadzone=.14,curve=1){
 x=Number.isFinite(x)?x:0;y=Number.isFinite(y)?y:0;
 const length=Math.hypot(x,y);if(length<=deadzone)return {x:0,y:0};
 const amount=Math.pow(Math.min(1,(length-deadzone)/(1-deadzone)),curve);
 return {x:x/length*amount,y:y/length*amount};
}
export function createGamepadControls({get,action,look,release}){
 const read=(key,fallback)=>{try{return localStorage.getItem('vrs-pad-'+key)??fallback;}catch{return fallback;}};
 const save=(key,value)=>{try{localStorage.setItem('vrs-pad-'+key,String(value));}catch{}};
 const number=(key,fallback,min,max)=>{const n=Number(read(key,fallback));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
 const settings={sensitivity:number('sensitivity',1,.2,3),aim:number('aim',.35,.1,1),deadzone:number('deadzone',.14,.05,.4),invert:read('invert','false')==='true',layout:read('layout','auto'),raw:read('raw','false')==='true'};
 const panel=document.createElement('div');panel.className='gamepad-settings';
 panel.innerHTML=`<h3>コントローラー</h3><p id="gamepadStatus" role="status"></p><p class="help">接続後にボタンを押すと検出します。スマホでも自動対応。Nintendo配置の表示はB/A/Y/X、Xbox配置はA/B/X/Yです。</p><label>ボタン表示 <select data-pad="layout"><option value="auto">自動</option><option value="nintendo">Nintendo</option><option value="xbox">Xbox / その他</option></select></label><label>視点感度 <output data-pad-out="sensitivity"></output><input data-pad="sensitivity" type="range" min=".2" max="3" step=".05"></label><label>照準中の感度 <output data-pad-out="aim"></output><input data-pad="aim" type="range" min=".1" max="1" step=".05"></label><label>スティックの遊び <output data-pad-out="deadzone"></output><input data-pad="deadzone" type="range" min=".05" max=".4" step=".01"></label><label><input data-pad="invert" type="checkbox">視点の上下を反転</label><label><input data-pad="raw" type="checkbox">未認識パッドを標準配置として使用</label><p class="help">未認識パッドは配置が異なる場合があります。SwitchのDNSブラウザーは動作未確認です。Gamepad APIを提供しないブラウザーでは入力できません。HTTPSのURLを使用してください。</p>`;
 document.querySelector('[data-world-panel="controls"]').prepend(panel);
 const status=panel.querySelector('#gamepadStatus'),hint=document.createElement('div');hint.id='gamepadHint';hint.hidden=true;document.body.append(hint);
 const lobbyStatus=document.createElement('p');lobbyStatus.className='help';document.querySelector('#lobby .lobby-panel').append(lobbyStatus);
 const help=document.createElement('p');help.className='help';document.getElementById('controlHelp').after(help);
 for(const input of panel.querySelectorAll('[data-pad]')){
  const key=input.dataset.pad;input[input.type==='checkbox'?'checked':'value']=settings[key];
  const refresh=()=>{const output=panel.querySelector(`[data-pad-out="${key}"]`);if(output)output.textContent=key==='deadzone'?Math.round(settings[key]*100)+'%':Number(settings[key]).toFixed(2)+'×';};refresh();
  input.addEventListener('change',()=>{if(input.tagName==='SELECT')input.dispatchEvent(new Event('input',{bubbles:true}));});
  input.addEventListener('input',()=>{settings[key]=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;save(key,settings[key]);refresh();reset();});
 }
 let index=null,identity='',buttons=[],blocked=true,context='',repeatAt=0,repeatDir='',lastStatus='',active=false,sprint=false;
 let move={x:0,y:0},loadout='';
 const pressed=(pad,i)=>!!pad.buttons[i]?.pressed||(pad.buttons[i]?.value||0)>.5;
 const visible=el=>!el.disabled&&!el.closest('[hidden],[inert]')&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
 function reset(){move={x:0,y:0};sprint=false;blocked=true;hint.hidden=true;release();}
 function uiItems(){
  const roots=[...document.querySelectorAll('#lobby,#menu,#master,#worldMenu,.experience-panel,[role="dialog"],.chat-panel,#worldChat,#plazaMap,#worldGuide')].filter(visible);
  const root=roots.find(el=>el.contains(document.activeElement))||roots.at(-1)||document.body;
  return [...root.querySelectorAll('button,a[href],input,select,textarea,summary')].filter(el=>visible(el)&&el.tabIndex!==-1&&!el.closest('#hud,#economyHud,#gamepadHint'));
 }
 function navigate(dir){
  const items=uiItems();if(!items.length)return;let item=document.activeElement,at=items.indexOf(item);
  if((dir==='left'||dir==='right')&&at>=0){
   const step=dir==='right'?1:-1;
   if(item.tagName==='SELECT'){
    let next=item.selectedIndex+step;while(item.options[next]?.disabled)next+=step;
    if(next>=0&&next<item.options.length){item.selectedIndex=next;item.dispatchEvent(new Event('change',{bubbles:true}));}return;
   }
   if(item.tagName==='INPUT'&&['range','number'].includes(item.type)){
    const unit=Number(item.step)||1,value=Number(item.value)||0,min=item.min===''?-Infinity:Number(item.min),max=item.max===''?Infinity:Number(item.max);
    item.value=String(Math.max(min,Math.min(max,Number((value+step*unit).toFixed(5)))));item.dispatchEvent(new Event('input',{bubbles:true}));item.dispatchEvent(new Event('change',{bubbles:true}));return;
   }
  }
  at=at<0?0:(at+(dir==='up'||dir==='left'?-1:1)+items.length)%items.length;
  items[at].focus({preventScroll:true});items[at].scrollIntoView({block:'nearest',inline:'nearest'});
 }
 function update(dt,now){
  const s=get();let pads=[];
  try{pads=typeof navigator.getGamepads==='function'?Array.from(navigator.getGamepads()):[];}catch{}
  const candidates=pads.filter(p=>p?.connected);
  let pad=candidates.find(p=>p.index===index);
  const used=candidates.find(p=>p.buttons.some((b,i)=>pressed(p,i))||p.axes.some(a=>Math.abs(a)>.55));
  if(used&&(!pad||!active))pad=used;else pad??=candidates[0];
  const next=pad?pad.index+':'+pad.id:'';
  if(identity!==next){reset();identity=next;index=pad?.index??null;buttons=[];active=false;}
  const usable=!!pad&&(pad.mapping==='standard'||settings.raw);
  const nintendo=settings.layout==='nintendo'||settings.layout==='auto'&&/nintendo|joy-con|switch|pro controller|057e/i.test(pad?.id||'');
  const names=nintendo?['B','A','Y','X']:['A','B','X','Y'];
  const label=typeof navigator.getGamepads!=='function'?'このブラウザーはコントローラー入力に非対応です':!pad?'未検出 · 接続してボタンを押してください':!usable?'未認識の配置 · 必要なら「標準配置として使用」を選択':`接続中：${pad.id}`;
  if(label!==lastStatus){status.textContent=label;lobbyStatus.textContent='コントローラー：'+label;lastStatus=label;}
  const helpText=`左スティック：移動 / 右：視点 / ZR・RT：射撃 / ZL・LT：照準 / ${names[0]}：ジャンプ / ${names[1]}：しゃがむ / ${names[2]}：リロード / ${names[3]}：使う / L3：ダッシュ / R3：匍匐 / 十字上：視点切替 / 十字下：チャット / −・Back：地図 / L・R：観戦切替（飛行中は降下・上昇） / ＋・Start：メニュー`;
  if(help.textContent!==helpText)help.textContent=helpText;
  if(!usable||document.hidden||!document.hasFocus()){if(active)reset();active=false;document.body.dataset.gamepad='false';hint.hidden=true;return;}
  const current=pad.buttons.map((_,i)=>pressed(pad,i));
  const left=gamepadStick(pad.axes[0],pad.axes[1],settings.deadzone),right=gamepadStick(pad.axes[2],pad.axes[3],settings.deadzone,1.65);
  const mode=s.cinematic?'cinematic':s.menu?'menu':s.spectator?'spectator':s.enabled?'play':'blocked';
  if(loadout!==(s.weapon||'')){reset();loadout=s.weapon||'';}
  if(mode!==context){reset();context=mode;repeatDir='';}
  const edge=i=>current[i]&&!buttons[i];
  if(blocked){if(!current.some(Boolean)&&!left.x&&!left.y&&!right.x&&!right.y)blocked=false;buttons=current;return;}
  const hasInput=current.some(Boolean)||left.x||left.y||right.x||right.y;
  if(hasInput)active=true;
  if(!active){buttons=current;return;}
  document.body.dataset.gamepad=String(active);hint.hidden=!active||mode!=='play'||s.clean;
  const hintText=`ZR/RT 射撃 · ZL/LT 照準 · ${names[0]} ジャンプ · ${names[2]} リロード · ${names[3]} 使う · ＋ メニュー`;
  if(hint.textContent!==hintText)hint.textContent=hintText;
  if(mode==='cinematic'){if(edge(9))action('skip');}
  else if(mode==='spectator'){if(edge(9))action('menu');if(edge(4))action('spectate',-1);if(edge(5))action('spectate',1);}
  else if(mode==='menu'){
   const dir=current[12]||left.y<-.55?'up':current[13]||left.y>.55?'down':current[14]||left.x<-.55?'left':current[15]||left.x>.55?'right':'';
   if(dir&&(dir!==repeatDir||now>=repeatAt)){navigate(dir);repeatAt=now+(dir===repeatDir?130:380);}repeatDir=dir;
   const confirm=nintendo?1:0,back=nintendo?0:1;
   if(edge(back)||edge(9))action('back');
   else if(edge(confirm)){
    const items=uiItems();let focused=document.activeElement;if(!items.includes(focused)){focused=items[0];focused?.focus();}
    if(focused?.matches('button,a,summary,input[type="checkbox"],input[type="radio"]'))focused.click();else focused?.focus();
   }
   if(edge(4))navigate('up');if(edge(5))navigate('down');
  }else if(mode==='play'){
   move=left;if(Math.hypot(left.x,left.y)<.2)sprint=false;if(edge(10))sprint=!sprint;
   const aiming=current[6]&&s.weapon;action('aim',aiming);
   const scale=(aiming?settings.aim:1)*settings.sensitivity;
   look(-right.x*2.8*scale*dt,-right.y*2.15*scale*dt*(settings.invert?-1:1));
   if(edge(9)){action('menu');buttons=current;return;}
   if(edge(0))action('jump');if(edge(1))action('crouch');if(edge(2))action('reload');if(edge(3))action('interact');if(edge(11))action('prone');
   if(!blocked){if(edge(7))action('attack',true);if(!current[7]&&buttons[7])action('attack',false);}
   if(edge(8))action('map');if(edge(12))action('camera');if(edge(13))action('chat');if(edge(4))action('spectate',-1);if(edge(5))action('spectate',1);
  }
  buttons=current;
 }
 addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===index){reset();index=null;identity='';active=false;document.body.dataset.gamepad='false';hint.hidden=true;}});
 // Touch and mouse resume their own UI immediately. Keep device type for graphics quality.
 document.addEventListener('pointerdown',()=>{if(active){reset();active=false;document.body.dataset.gamepad='false';hint.hidden=true;}},true);
 document.addEventListener('keydown',e=>{if(e.isTrusted&&active){reset();active=false;document.body.dataset.gamepad='false';hint.hidden=true;}},true);
 return {update,reset,get move(){return move;},get sprint(){return sprint;},get ascend(){return active&&!blocked&&context==='play'&&!!buttons[5];},get descend(){return active&&!blocked&&context==='play'&&!!buttons[4];}};
}
