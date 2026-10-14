export function createFpsHud({crosshair,health,onReload}){
 crosshair.innerHTML='<svg class="aim-ammo" viewBox="0 0 72 72" aria-hidden="true"><circle class="ammo-track" cx="36" cy="36" r="27"/><circle class="ammo-fill" cx="36" cy="36" r="27" pathLength="100"/></svg><span class="aim-lines"><i></i><i></i><i></i><i></i><b></b></span><span class="aim-count"></span>';
 health.innerHTML='<span class="hp-title">HP <b></b></span><span class="hp-blocks"><i></i><i></i><i></i></span>';
 const ring=crosshair.querySelector('.ammo-fill'),count=crosshair.querySelector('.aim-count'),hp=health.querySelector('b'),blocks=[...health.querySelectorAll('.hp-blocks i')],button=document.createElement('button');
 button.id='gunReload';button.type='button';button.title='リロード · R';button.setAttribute('aria-label','リロード');button.hidden=true;
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path d="M5 6h12V3h3v8h-8V8h4V7H7v4H4V6h1zm12 11H8v-1h4v-3H4v8h3v-3h12v-7h-3v6h1z" fill="currentColor"/></svg><kbd>R</kbd>';
 document.body.append(button);button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();onReload();});button.addEventListener('click',e=>{if(e.detail===0)onReload();});
 let lastCount='',lastArc=-1,lastHp=-1,lastReload=null,lastGap='';
 return {update(s,weapon,ammo,member,watching,recoil=0){
  const visible=!!weapon&&s.inStudio&&!s.paused&&!watching;button.hidden=!visible;const max=weapon?.magazine||1,matching=ammo?.weapon===weapon?.id,base=matching?ammo.left:max,reloading=!!(matching&&ammo.reloadAt>s.now),available=reloading?Math.min(max,ammo.reloadBase+Math.max(0,s.now-ammo.reloadStart)/(ammo.reloadStep||1)):base;
  const loaded=Math.floor(available+1e-6),text=loaded+' / '+max,arc=Math.round(Math.max(0,Math.min(1,available/max))*200)/2;
  if(text!==lastCount){count.textContent=text;lastCount=text;crosshair.setAttribute('aria-label',`発砲 · 弾数 ${loaded} / ${max}`);}if(arc!==lastArc){ring.style.strokeDashoffset=String(100-arc);lastArc=arc;}
  if(reloading!==lastReload){crosshair.dataset.reloading=String(reloading);button.dataset.reloading=String(reloading);lastReload=reloading;}crosshair.dataset.empty=String(loaded===0);const gap=(Math.round((5+Math.min(7,recoil*18))*10)/10)+'px';if(gap!==lastGap){crosshair.style.setProperty('--aim-gap',gap);lastGap=gap;}button.disabled=!matching||base>=max||!!member?.out;
  const life=member?.out?0:Math.max(0,3-(member?.damage||0));if(life!==lastHp){hp.textContent=String(life);health.setAttribute('aria-label',`残りライフ ${life} / 3`);health.dataset.danger=String(life<=1);blocks.forEach((block,i)=>block.classList.toggle('lost',i>=life));lastHp=life;}
 },hide(){button.hidden=true;}};
}
