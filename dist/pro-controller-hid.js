// Optional, explicitly chosen Nintendo Pro Controller transport. Protocol facts:
// Nintendo report definitions implemented by Linux drivers/hid/hid-nintendo.c.
// No Bluetooth pairing changes, vibration, or flash-memory writes are issued.
const clamp=v=>Math.max(-1,Math.min(1,v));
const unpack=(data,offset)=>[data.getUint8(offset)|((data.getUint8(offset+1)&15)<<8),(data.getUint8(offset+1)>>4)|(data.getUint8(offset+2)<<4)];
const neutral=[0,1,0x40,0x40,0,1,0x40,0x40];
function reports(device){const out=[];function walk(collection){out.push(...collection.outputReports||[]);for(const child of collection.children||[])walk(child);}for(const collection of device.collections||[])walk(collection);return out;}
export function createProControllerHid(changed=()=>{}){
 let device=null,packet=0,lastInput=0,opening=false,waiting=null,inputHandler=null;
 let centers=[[2048,2048],[2048,2048]],below=[[1600,1600],[1600,1600]],above=[[1600,1600],[1600,1600]];
 const pad={id:'Nintendo Pro Controller · 直接接続',index:1000,mapping:'standard',connected:false,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),timestamp:0};
 const supported=!!navigator.hid?.requestDevice;
 function zero(){pad.axes.fill(0);for(const button of pad.buttons){button.pressed=button.touched=false;button.value=0;}}
 function settle(value){if(!waiting)return;const pending=waiting;waiting=null;clearTimeout(pending.timer);pending.resolve(value);}
 async function send(id,bytes,match){
  const current=device;if(!current?.opened)throw new Error('接続が閉じています');
  const report=reports(current).find(r=>r.reportId===id),bits=report?.items?.reduce((n,item)=>n+item.reportSize*item.reportCount,0),length=Math.max(bytes.length,Math.ceil((bits||0)/8));
  const payload=new Uint8Array(length);payload.set(bytes);
  const response=match?new Promise(resolve=>{waiting={match,resolve,timer:setTimeout(()=>settle(null),700)};}):null;
  try{await current.sendReport(id,payload);}catch(error){settle(null);throw error;}
  return response?await response:null;
 }
 const subcommand=(command,args=[])=>send(1,[packet++&15,...neutral,command,...args],event=>event.reportId===0x21&&event.data.byteLength>=14&&event.data.getUint8(13)===command);
 function input(event){
  if(event.device!==device)return;if(waiting?.match(event))settle(event);
  const {reportId,data}=event;if(![0x30,0x21].includes(reportId)||data.byteLength<12)return;
  const right=data.getUint8(2),middle=data.getUint8(3),left=data.getUint8(4),bits=[[right,2],[right,3],[right,0],[right,1],[left,6],[right,6],[left,7],[right,7],[middle,0],[middle,1],[middle,3],[middle,2],[left,1],[left,0],[left,3],[left,2],[middle,4],[middle,5]];
  bits.forEach(([byte,bit],i)=>{const pressed=!!(byte&(1<<bit));pad.buttons[i].pressed=pad.buttons[i].touched=pressed;pad.buttons[i].value=pressed?1:0;});
  for(let stick=0;stick<2;stick++){const values=unpack(data,5+stick*3);for(let axis=0;axis<2;axis++){const delta=values[axis]-centers[stick][axis],extent=delta<0?below[stick][axis]:above[stick][axis];pad.axes[stick*2+axis]=clamp(delta/extent)*(axis?-1:1);}}
  const first=!pad.connected;lastInput=pad.timestamp=performance.now();pad.connected=true;if(first)changed('Pro Controllerからの入力を受信しました。');
 }
 async function close(){const old=device;device=null;settle(null);pad.connected=false;lastInput=0;zero();if(old&&inputHandler)old.removeEventListener('inputreport',inputHandler);inputHandler=null;if(old?.opened)try{await old.close();}catch{}changed('直接接続を解除しました。');}
 async function connect(){
  if(!supported)throw new Error('このブラウザーには直接接続APIがありません。Chrome / Edgeでこのページを開いてください。');
  if(opening)return;opening=true;
  try{
   // Keep the permission picker in this direct user-activation call.
   const chosen=await navigator.hid.requestDevice({filters:[{vendorId:0x057e,productId:0x2009}]});
   if(!chosen.length){changed('機器の選択をキャンセルしました。');return;}
   await close();device=chosen[0];packet=0;centers=[[2048,2048],[2048,2048]];below=[[1600,1600],[1600,1600]];above=[[1600,1600],[1600,1600]];
   await device.open();inputHandler=input;device.addEventListener('inputreport',inputHandler);changed('機器を開きました。入力モードを準備しています…');
   if(reports(device).some(r=>r.reportId===0x80))for(const command of [2,3,2,4])await send(0x80,[command],command===4?null:event=>event.reportId===0x81&&event.data.byteLength>0&&event.data.getUint8(0)===command);
   await subcommand(3,[0x30]);
   // Read factory stick calibration only. Both sticks use packed 12-bit pairs.
   const calibration=await subcommand(0x10,[0x3d,0x60,0,0,18]);
   if(calibration?.data.byteLength>=37&&calibration.data.getUint32(14,true)===0x603d){const data=calibration.data;for(let stick=0;stick<2;stick++){const offset=19+stick*9,c=unpack(data,offset+(stick?0:3)),low=unpack(data,offset+(stick?3:6)),high=unpack(data,offset+(stick?6:0));if(c.every(v=>v>500&&v<3500)&&[...low,...high].every(v=>v>200&&v<3000)){centers[stick]=c;below[stick]=low;above[stick]=high;}}}
   if(!pad.connected)changed('機器は開いていますが、入力をまだ受信していません。Pro ControllerのAボタンを押してください。');
  }catch(error){await close();throw error;}finally{opening=false;}
 }
 navigator.hid?.addEventListener('disconnect',event=>{if(event.device===device)void close();});
 addEventListener('blur',zero);document.addEventListener('visibilitychange',()=>{if(document.hidden)zero();});
 addEventListener('pagehide',()=>{void close();});
 return {supported,connect,close,get opened(){return !!device?.opened;},sample(){if(!device?.opened||!pad.connected)return null;if(performance.now()-lastInput>500){zero();return null;}return pad;}};
}
