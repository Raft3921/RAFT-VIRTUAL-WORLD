// Cooking owns scene input while active; combat and furniture-edit handlers must
// never consume the same click. A menu releases the cursor, not the session.
export function createCookingControls({canvas,cooking,look,clearInput,isTouch,notify}){
 let pointer=null,pending=false;
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 function resume(){
  canvas.focus();clearInput();
  if(isTouch()||document.pointerLockElement===canvas||pending)return;
  if(!canvas.requestPointerLock){notify('マウスドラッグで視点を動かせます');return;}
  pending=true;
  const failed=()=>{pending=false;notify('画面をクリックしてマウス操作を再開してください。ドラッグ操作も使えます');};
  try{const result=canvas.requestPointerLock();result?.catch(failed);}catch{failed();}
 }
 canvas.addEventListener('pointerdown',e=>{
  if(!cooking.active)return;consume(e);canvas.focus();
  if(cooking.choosing){cooking.closeMenu();return;}
  if(e.pointerType==='mouse'&&document.pointerLockElement===canvas){if(e.button===0)cooking.interact();else if(e.button===2)cooking.alternate();return;}
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false,button:e.button};
  if(e.pointerType==='mouse'&&e.button===0){resume();return;}
  try{canvas.setPointerCapture(e.pointerId);}catch{}
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(!cooking.active)return;consume(e);if(cooking.choosing)return;
  if(document.pointerLockElement===canvas){look(e.movementX,e.movementY);return;}
  if(!pointer||pointer.id!==e.pointerId)return;
  const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;
  if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>7)pointer.drag=true;
  if(pointer.drag)look(dx,dy);
 },true);
 canvas.addEventListener('pointerup',e=>{
  if(!cooking.active)return;consume(e);const p=pointer;pointer=null;
  if(document.pointerLockElement===canvas||!p||p.id!==e.pointerId||p.drag||cooking.choosing)return;
  if(p.button===2){cooking.alternate();return;}if(p.button!==0)return;
  // Touch and browsers without pointer lock use the furniture under the tap.
  const rect=canvas.getBoundingClientRect();cooking.interact({x:(e.clientX-rect.left)/rect.width*2-1,y:1-(e.clientY-rect.top)/rect.height*2});
 },true);
 for(const type of ['mousedown','mouseup','click','dblclick','contextmenu'])canvas.addEventListener(type,e=>{if(cooking.active)consume(e);},true);
 for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{pointer=null;},true);
 document.addEventListener('pointerlockchange',()=>{
  pending=false;pointer=null;
  if(!cooking.active)return;
  clearInput();
  if(document.pointerLockElement===canvas&&cooking.choosing)document.exitPointerLock();
 });
 document.addEventListener('pointerlockerror',()=>{pending=false;});
 return {resume,release(){pointer=null;clearInput();if(document.pointerLockElement===canvas)document.exitPointerLock();}};
}
