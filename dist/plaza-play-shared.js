export const playHint={swing:'前後でこぐ · 勢いをつけて一周 · ジャンプで降りる',seesaw:'2人で乗る · Shiftを押して足を伸ばす · ジャンプで降りる',spring:'前後左右を長押しで溜める → 離すと反対へ飛ぶ',carousel:'左右で回す · ジャンプで飛び降りる',climb:'前後・左右で登る · Shiftで速く登る · ジャンプで離す',monkey:'前後で渡る · Shiftで速く渡る · ジャンプで離す',zipline:'前を押して滑走 · ジャンプで飛び降りる'};
export function stepSwing(state,input,dt,length){
 const steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
 for(let i=0;i<steps;i++){
  const angle=state.angle||0,velocity=state.angularVelocity||0;
  // Pump in the direction of travel to build enough energy to go over the top.
  const drive=input*3.8,drag=velocity*.055;
  state.angularVelocity=Math.max(-6.8,Math.min(6.8,velocity+(-9.8/Math.max(1,length)*Math.sin(angle)+drive-drag)*h));
  state.angle=angle+state.angularVelocity*h;
 }

}
export function swingSeat(def,angle,slot=0){const top=def.h*.88*.95,rest=def.h*.88*(def.design==='zipline'?.67:.23),length=top-rest;return {x:def.id==='play-double-swing'?(slot===1?.24:-.24)*def.w*.88:0,y:top-Math.cos(angle)*length,z:-Math.sin(angle)*length,top,length};}
export function motionAngle(state,now){if(!state)return 0;const age=Math.max(0,Math.min(.25,(now-state.updatedAt)/1000));if(state.kind==='seesaw'){const t=Math.min(1,age/.2);return (state.fromAngle??state.angle??0)+((state.angle||0)-(state.fromAngle??state.angle??0))*t;}return (state.angle||0)+(state.angularVelocity||0)*age;}
