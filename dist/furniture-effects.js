import * as THREE from 'three';

export function createFurnitureEffects(scene){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const context=canvas.getContext('2d');context.fillStyle='#ffffff';for(const [x,y,w,h]of [[8,2,2,10],[9,2,5,2],[9,4,5,2],[4,10,6,4]])context.fillRect(x,y,w,h);
  const texture=new THREE.CanvasTexture(canvas);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.2,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.22,.28),material,24),transform=new THREE.Object3D(),slots=Array.from({length:24},()=>({age:10,x:0,y:0,z:0,note:0}));mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
  let cursor=0,audio=null;const voices=[];
  function unlock(){if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)try{audio=new Audio();}catch{}}audio?.resume().catch(()=>{});}
  window.addEventListener('pointerdown',unlock,{passive:true});window.addEventListener('keydown',unlock,{passive:true});
  function play(point,note,listener){
    if(!listener||Math.hypot(listener.x-point.x,listener.y-point.y,listener.z-point.z)>30)return;
    note=Math.max(0,Math.min(23,Math.floor(note)||0));const distance=Math.hypot(listener.x-point.x,listener.y-point.y,listener.z-point.z);
    if(audio?.state==='running'){
      while(voices.length>=8){const voice=voices.shift();for(const oscillator of voice.oscillators)try{oscillator.stop();}catch{}voice.gain.disconnect();}
      const now=audio.currentTime,gain=audio.createGain(),frequency=261.625565*Math.pow(2,note/12),voice={gain,oscillators:[]};gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.12/(1+distance*.25),now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+1.5);gain.connect(audio.destination);
      for(const [multiple,volume]of [[1,1],[2,.3],[3,.12]]){const oscillator=audio.createOscillator(),harmonic=audio.createGain();oscillator.type='sine';oscillator.frequency.value=frequency*multiple;harmonic.gain.value=volume;oscillator.connect(harmonic);harmonic.connect(gain);oscillator.start(now);oscillator.stop(now+1.6);voice.oscillators.push(oscillator);oscillator.onended=()=>{oscillator.disconnect();harmonic.disconnect();};}voice.oscillators[0].addEventListener('ended',()=>{gain.disconnect();const i=voices.indexOf(voice);if(i>=0)voices.splice(i,1);});voices.push(voice);
    }
    for(let i=0;i<3;i++){const slot=slots[cursor++%24];Object.assign(slot,{age:0,x:point.x+(i-1)*.18,y:point.y,z:point.z,note:note+i});}mesh.visible=true;
  }
  function update(dt,camera){if(!mesh.visible)return;let count=0;for(let i=0;i<slots.length;i++){const slot=slots[i];slot.age+=dt;const alive=slot.age<1.3;if(alive)count++;transform.position.set(slot.x+Math.sin(slot.age*4+slot.note)*.12,slot.y+slot.age*.8,slot.z);transform.quaternion.copy(camera.quaternion);transform.scale.setScalar(alive?Math.min(1,(1.3-slot.age)*3):0);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);mesh.setColorAt(i,new THREE.Color().setHSL((slot.note%12)/12,.7,.7));}mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.visible=count>0;}
  return {play,update};
}
