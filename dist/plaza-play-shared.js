export const playHint={swing:'前後でこぐ · ジャンプで降りる',seesaw:'2人で乗る · Shiftを押して足を伸ばす · ジャンプで降りる',spring:'前後左右を長押しで溜める → 離すと反対へ飛ぶ',carousel:'左右で回す · ジャンプで飛び降りる',climb:'前後・左右で登る · Shiftで速く登る · ジャンプで離す',monkey:'前後で渡る · Shiftで速く渡る · ジャンプで離す',zipline:'前を押して滑走 · ジャンプで飛び降りる'};
export function stepSwing(state,input,dt,length){
 state.angularVelocity=(state.angularVelocity||0)+(-9.8/Math.max(1,length)*Math.sin(state.angle||0)+input*1.8-(state.angularVelocity||0)*.35)*dt;
 state.angularVelocity=Math.max(-2.4,Math.min(2.4,state.angularVelocity));state.angle=Math.max(-1.05,Math.min(1.05,(state.angle||0)+state.angularVelocity*dt));
 if(Math.abs(state.angle)>=1.05&&Math.sign(state.angularVelocity)===Math.sign(state.angle))state.angularVelocity*=.25;
}
export function swingSeat(def,angle,slot=0){const top=def.h*.88*.95,rest=def.h*.88*.23,length=top-rest;return {x:def.id==='play-double-swing'?(slot===1?.24:-.24)*def.w*.88:0,y:top-Math.cos(angle)*length,z:-Math.sin(angle)*length,top,length};}
export function motionAngle(state,now){if(!state)return 0;const age=Math.max(0,Math.min(.25,(now-state.updatedAt)/1000));if(state.kind==='seesaw'){const t=Math.min(1,age/.2);return (state.fromAngle??state.angle??0)+((state.angle||0)-(state.fromAngle??state.angle??0))*t;}return (state.angle||0)+(state.angularVelocity||0)*age;}
