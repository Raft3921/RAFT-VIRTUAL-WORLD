export function createFpsHud({crosshair,health,onReload,onProne}){
 crosshair.innerHTML='<svg class="aim-ammo" viewBox="0 0 72 72" aria-hidden="true"><path class="ammo-track" d="M62.08 42.99 A27 27 0 0 1 40.69 62.59"/><path class="ammo-fill" d="M62.08 42.99 A27 27 0 0 1 40.69 62.59" pathLength="100"/></svg><svg class="aim-reticle" viewBox="0 0 72 72" aria-hidden="true"></svg><span class="aim-count"></span>';
 health.innerHTML='<span class="hp-title">HP <b></b></span><span class="hp-blocks"><i></i><i></i><i></i></span>';
 const ring=crosshair.querySelector('.ammo-fill'),count=crosshair.querySelector('.aim-count'),hp=health.querySelector('b'),blocks=[...health.querySelectorAll('.hp-blocks i')],button=document.createElement('button');
 button.id='gunReload';button.type='button';button.title='リロード · R';button.setAttribute('aria-label','リロード');button.hidden=true;
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path d="M5 6h12V3h3v8h-8V8h4V7H7v4H4V6h1zm12 11H8v-1h4v-3H4v8h3v-3h12v-7h-3v6h1z" fill="currentColor"/></svg><kbd>R</kbd>';
 const prone=document.createElement('button');prone.id='gunProne';prone.type='button';prone.textContent='匍匐前進';prone.hidden=true;prone.onclick=()=>onProne?.();document.body.append(prone);
 document.body.append(button);button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();onReload();});button.addEventListener('click',e=>{if(e.detail===0)onReload();});
 let lastCount='',lastArc=-1,lastHp='' ,lastReload=null,lastGap='',lastWeapon='';
 return {update(s,weapon,ammo,member,watching,recoil=0){
  const visible=!!weapon&&s.inStudio&&!s.paused&&!watching;button.hidden=!visible||!!weapon?.melee;prone.hidden=!visible;const max=weapon?.magazine||1,matching=!!weapon&&!!ammo&&ammo.weapon===weapon.id,base=matching&&Number.isFinite(ammo.left)?ammo.left:max,reloading=!!(matching&&ammo.reloadAt>s.now),available=reloading?Math.min(max,(Number.isFinite(ammo.reloadBase)?ammo.reloadBase:base)+Math.max(0,s.now-(ammo.reloadStart||s.now))/(ammo.reloadStep||1)):base;
  if(weapon?.id!==lastWeapon){lastWeapon=weapon?.id;crosshair.dataset.weapon=lastWeapon||'none';const reticles={katana:'<path d="M29 43l14-14m-4-2l6 6"/>',
   pistol:'<path d="M28 36h-5m26 0h-5M36 23v5m0 16v5"/><path class="reticle-dot" d="M35 35h2v2h-2z"/>',
   machine:'<path d="M26 36h-8m36 0h-8M36 18v8m0 20v8"/><path class="reticle-dot" d="M35 35h2v2h-2z"/>',
   sniper:'<path d="M36 22v10m0 8v10M22 36h10m8 0h10"/><path class="reticle-dot" d="M35.5 35.5h1v1h-1z"/>',
   shotgun:'<path d="M21 29v-8h8m14 0h8v8m0 14v8h-8m-14 0h-8v-8"/><path class="reticle-dot" d="M34.5 34.5h3v3h-3z"/>',
   rocket:'<path d="M20 29v-9h9m14 0h9v9m0 14v9h-9m-14 0h-9v-9M31 39l5-6 5 6"/>'};crosshair.querySelector('.aim-reticle').innerHTML=reticles[lastWeapon]||'';}
  const loaded=Math.floor(available+1e-6),text=weapon?.melee?(s.swordCharge>0?'溜め '+Math.round(s.swordCharge*100)+'% · 離して斬る':'長押しで溜める'):loaded+' / '+max,arc=weapon?.melee?Math.round((s.swordCharge||0)*100):Math.round(Math.max(0,Math.min(1,available/max))*200)/2;
  if(text!==lastCount){count.textContent=text;lastCount=text;crosshair.setAttribute('aria-label',weapon?.melee?'斬る · 長押しで溜めて離す':`発砲 · 弾数 ${loaded} / ${max}`);}if(arc!==lastArc){ring.style.strokeDashoffset=String(100-arc);lastArc=arc;}
  if(reloading!==lastReload){crosshair.dataset.reloading=String(reloading);button.dataset.reloading=String(reloading);lastReload=reloading;}crosshair.dataset.empty=String(loaded===0);const gap=(Math.round((5+Math.min(7,recoil*18))*10)/10)+'px';if(gap!==lastGap){crosshair.style.setProperty('--aim-gap',gap);crosshair.style.setProperty('--reticle-scale',String(1+Math.min(7,recoil*18)/40));lastGap=gap;}button.disabled=!matching||base>=max||!!member?.out;
  const maxLife=member?.maxLife||s.maxLife||3,life=member?.out?0:Math.max(0,maxLife-(member?.damage||0)),lifeKey=life+'/'+maxLife;
  if(lifeKey!==lastHp){hp.textContent=life+' / '+maxLife;health.setAttribute('aria-label',`残りライフ ${life} / ${maxLife}`);health.dataset.danger=String(life<=Math.max(1,maxLife*.2));blocks.forEach((block,i)=>{block.classList.toggle('lost',life/maxLife<=i/3);block.style.opacity=String(Math.max(.2,Math.min(1,(life/maxLife-i/3)*3)));});lastHp=lifeKey;}

 },hide(){prone.hidden=true;button.hidden=true;}};
}
