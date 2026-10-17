// Click-operated controls for console browsers whose sticks control their own pointer.
export function createCompatControls({get,action,look,release}){
 const panel=document.createElement('section');panel.id='compatControls';panel.setAttribute('aria-label','互換モードの操作');panel.hidden=true;
 panel.innerHTML=`<p>互換描画 · ポインターでボタンを選んで決定。移動は押すたびに開始／停止。</p><div class="compat-row"><button data-move="forward">前進</button><button data-move="back">後退</button><button data-move="left">左移動</button><button data-move="right">右移動</button><button data-action="stop">■ 停止</button><button data-action="menu">メニュー</button><button data-action="previous">観戦 ◀</button><button data-action="next">観戦 ▶</button></div><div class="compat-row"><button data-look="left">視点 ◀</button><button data-look="right">視点 ▶</button><button data-look="up">視点 ▲</button><button data-look="down">視点 ▼</button><button data-action="aim">照準</button><button data-action="attack">射撃・攻撃</button><button data-action="reload">装填</button><button data-action="jump">ジャンプ</button><button data-action="crouch">しゃがむ</button><button data-action="interact">使う</button></div>`;
 document.body.append(panel);let move={x:0,y:0},aiming=false,available=false;
 function sync(){for(const button of panel.querySelectorAll('[data-move]')){const kind=button.dataset.move,on=kind==='forward'?move.y<0:kind==='back'?move.y>0:kind==='left'?move.x<0:move.x>0;button.setAttribute('aria-pressed',String(on));}panel.querySelector('[data-action="aim"]').setAttribute('aria-pressed',String(aiming));}
 function reset(){move={x:0,y:0};aiming=false;release();sync();}
 panel.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const state=get(),requested=button.dataset.action;if(requested==='menu'&&state.inStudio){action('menu');return;}if((requested==='previous'||requested==='next')&&state.spectator){action('spectate',requested==='previous'?-1:1);return;}if(!state.enabled)return;
  const kind=button.dataset.move;if(kind){if(kind==='forward')move.y=move.y<0?0:-1;if(kind==='back')move.y=move.y>0?0:1;if(kind==='left')move.x=move.x<0?0:-1;if(kind==='right')move.x=move.x>0?0:1;sync();return;}
  const turn=button.dataset.look;if(turn){look(turn==='left' ? .16 : turn==='right' ? -.16 : 0,turn==='up' ? .10 : turn==='down' ? -.10 : 0);return;}
  const command=button.dataset.action;if(command==='stop'){reset();return;}if(command==='aim'){aiming=!aiming;action('aim',aiming);sync();return;}
  if(command==='attack'){action('attack',true);action('attack',false);return;}action(command);
 });
 addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);
 return {reset,get move(){return move;},update(){const s=get();panel.hidden=!s.inStudio||s.menu||s.clean||s.padActive;if(s.padActive){if(available)reset();available=false;return;}if(!s.enabled){if(available)reset();available=false;for(const button of panel.querySelectorAll('button'))button.disabled=!(button.dataset.action==='menu'||s.spectator&&['previous','next'].includes(button.dataset.action));return;}for(const button of panel.querySelectorAll('button'))button.disabled=false;available=true;action('aim',aiming);}};
}
