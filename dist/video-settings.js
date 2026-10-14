import * as THREE from 'three';
const KEY='vrs-video-settings-v1';
export function createVideoSettings({canvas,getRenderer,getEnvironment,onQuality,mobile=false}){
 const defaults={quality:'auto',scale:100,fps:0,shadows:mobile?'low':'high',color:'filmic',exposure:1,saturation:100,contrast:100,postResolution:mobile?'1280':'native',motionBlur:true,depthOfField:true};
 let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{}
 const settings={...defaults};
 const choices={quality:['auto','low','medium','high','ultra'],fps:[0,30,60,90,120,144,165,240],shadows:['off','low','medium','high','ultra'],color:['filmic','natural','vivid'],postResolution:['720','1280','2560','native']};
 for(const [key,options]of Object.entries(choices))if(options.includes(saved[key]))settings[key]=saved[key];
 for(const [key,min,max]of [['scale',50,200],['exposure',.65,1.6],['saturation',50,150],['contrast',75,125]])if(Number.isFinite(saved[key]))settings[key]=Math.max(min,Math.min(max,saved[key]));
 for(const key of ['motionBlur','depthOfField'])if(typeof saved[key]==='boolean')settings[key]=saved[key];
 const panel=document.querySelector('[data-world-panel="video"]');
 panel.innerHTML=`<h3>ビデオ設定</h3><p class="help">この端末に保存。高性能PCでは最高画質・解像度100〜200%・影ウルトラ・映像処理フル解像度を選べます。</p>
 <label>画質プリセット<select data-video="quality"><option value="auto">自動</option><option value="low">軽量</option><option value="medium">標準</option><option value="high">高画質</option><option value="ultra">最高画質 · PC</option></select></label>
 <label>描画解像度 <output data-out="scale"></output><input data-video="scale" type="range" min="50" max="200" step="10"></label>
 <label>FPS上限<select data-video="fps">${[0,30,60,90,120,144,165,240].map(n=>`<option value="${n}">${n?n+' FPS':'無制限（画面のリフレッシュレートまで）'}</option>`).join('')}</select></label>
 <label>影<select data-video="shadows"><option value="off">なし</option><option value="low">軽量 · 512</option><option value="medium">標準 · 1024</option><option value="high">高精細 · 2048</option><option value="ultra">ウルトラ · 4096</option></select></label>
 <label>色調<select data-video="color"><option value="filmic">フィルム調</option><option value="natural">自然</option><option value="vivid">鮮やか</option></select></label>
 <label>明るさ <output data-out="exposure"></output><input data-video="exposure" type="range" min=".65" max="1.6" step=".05"></label>
 <label>彩度 <output data-out="saturation"></output><input data-video="saturation" type="range" min="50" max="150" step="5"></label>
 <label>コントラスト <output data-out="contrast"></output><input data-video="contrast" type="range" min="75" max="125" step="5"></label>
 <label>一人称の映像処理解像度<select data-video="postResolution"><option value="720">軽量 · 最大720px</option><option value="1280">標準 · 最大1280px</option><option value="2560">高精細 · 最大2560px</option><option value="native">フル解像度</option></select></label>
 <label class="check-label"><input data-video="motionBlur" type="checkbox">動きのブラー</label><label class="check-label"><input data-video="depthOfField" type="checkbox">被写界深度（ボケ）</label>
 <p class="help" id="videoStatus"></p><button type="button" id="videoReset">ビデオ設定を初期値に戻す</button>`;
 function sync(){for(const el of panel.querySelectorAll('[data-video]')){const key=el.dataset.video;if(el.type==='checkbox')el.checked=settings[key];else el.value=settings[key];}for(const el of panel.querySelectorAll('[data-out]'))el.textContent=settings[el.dataset.out]+(el.dataset.out==='exposure'?'×':'%');}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}}
 function apply(){const renderer=getRenderer(),environment=getEnvironment();if(!renderer||!environment)return;
  const autoCap=settings.quality==='auto'?({low:1,medium:1.25,high:2,ultra:3}[environment.settings.quality]||2):2,base=Math.min(devicePixelRatio||1,mobile?1:autoCap),limit=Math.min(4,renderer.capabilities.maxTextureSize/Math.max(innerWidth,innerHeight)),ratio=Math.max(.5,Math.min(limit,base*settings.scale/100));renderer.setPixelRatio(ratio);
  const size=Math.min(renderer.capabilities.maxTextureSize,{off:512,low:512,medium:1024,high:2048,ultra:4096}[settings.shadows]),shadow=environment.sun.shadow;
  renderer.shadowMap.enabled=settings.shadows!=='off';environment.sun.castShadow=settings.shadows!=='off';
  if(shadow.mapSize.x!==size){shadow.mapSize.set(size,size);shadow.map?.dispose();shadow.map=null;shadow.needsUpdate=true;}
  renderer.toneMapping=settings.color==='natural'?THREE.ReinhardToneMapping:THREE.ACESFilmicToneMapping;
  environment.setSettings({exposure:settings.exposure});
  const saturation=settings.saturation/100*(settings.color==='vivid'?1.15:1),contrast=settings.contrast/100;
  canvas.style.filter=`saturate(${saturation}) contrast(${contrast})`;
  document.getElementById('videoStatus').textContent=`描画 ${Math.round(innerWidth*ratio)} × ${Math.round(innerHeight*ratio)} · 設定はこの端末のみ`;
 }
 for(const el of panel.querySelectorAll('[data-video]'))el.addEventListener(el.type==='range'?'input':'change',()=>{const key=el.dataset.video;settings[key]=el.type==='checkbox'?el.checked:['scale','fps','exposure','saturation','contrast'].includes(key)?Number(el.value):el.value;
  if(key==='quality'){const presets={low:[75,'low','1280'],medium:[100,'medium','1280'],high:[100,'high','native'],ultra:[100,'ultra','native']},preset=presets[settings.quality];if(preset){[settings.scale,settings.shadows,settings.postResolution]=preset;}onQuality(settings.quality);}sync();apply();save();});
 document.getElementById('videoReset').onclick=()=>{Object.assign(settings,defaults);sync();onQuality(settings.quality);apply();save();};
 sync();return {settings,apply,setQuality(value){settings.quality=value;sync();save();}};
}
