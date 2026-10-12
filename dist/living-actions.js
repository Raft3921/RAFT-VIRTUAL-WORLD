// One state-driven description supplies mouse, touch and keyboard actions.
export const clothName=stage=>({dirty:'汚れた服',washed:'濡れた服',dry:'乾いた服',crafted:'仕立てた布'}[stage]||'洗濯物');
export function furnitureControls(t,state={},carry=null,run=null,now=Date.now(),selfId=null){
 const actions=[],add=(id,label,disabled=false)=>actions.push({id,label,disabled});let status='';
 const busy=state.endAt>now,remaining=Math.max(0,Math.ceil((state.endAt-now)/1000));
 if(t.kind==='exercise'){status=run?'移動を押して運動。緑の輪に重なる瞬間にジャンプ。':'移動で走る・こぐ → ジャンプで呼吸を整える → 記録を保存';add(run?'exercise-stop':'exercise-start',run?'降りて記録を保存':'乗って運動する');if(run)add('exercise-jump','ジャンプ / リズム（Space）');}
 else if(t.kind==='clothes'){const count=state.count??3;status=`かご：${count}束${carry?.type==='clothes'?' / 手元：'+clothName(carry.stage):''}`;add('use',carry?'かごへ戻す':'洗濯物を取る',carry?carry.type!=='clothes':count===0);}
 else if(['laundry','sewing','microwave'].includes(t.kind)){
  const sewing=t.kind==='sewing',micro=t.kind==='microwave',loaded=state.loaded;
  status=busy?`${sewing?'縫製':micro?'加熱':t.def.design==='dryer'?'乾燥':'洗濯'}中 · あと${remaining}秒`:loaded?state.endAt?'完了 · 取り出せます':sewing?'布をセット済み':micro?'食品をセット済み':'洗濯物をセット済み':sewing?'乾いた布をセット → 縫製 → 完成品を取る':micro?'冷蔵庫の冷凍食を入れて加熱':'かごから服を持つ → 扉を開けて入れる → 運転';
  if(sewing){if(loaded&&!state.endAt)add('start','ペダルを踏んで縫う');add('load',loaded?'布を取り出す':'布をセット',busy||(!loaded&&(carry?.type!=='clothes'||!['dry','crafted'].includes(carry.stage)))||loaded&&!!carry);status+=` / 完成 ${state.completed||0}点`;}
  else if(busy){add('open','運転中 · 扉ロック',true);}
  else if(!state.open){if(loaded&&!state.endAt)add('start','運転する');add('open',state.endAt?'扉を開けて取り出す':'扉を開ける');}
  else {if(loaded&&!state.endAt)add('start','閉じて運転する');add('load',loaded?'取り出す':micro?'冷凍食を入れる':'洗濯物を入れる',loaded?!!carry:micro?carry?.type!=='meal':carry?.type!=='clothes');add('open','扉を閉じる');}
  if(micro&&carry?.type==='meal'&&carry.hot)actions.unshift({id:'eat',label:'温かい食事を食べる'});
 }
 else if(t.kind==='coldstorage'){status=carry?.type==='meal'?'手元の食品を冷蔵庫へ戻せます':'電子レンジで温められる冷凍食';add('use',carry?'食品を戻す':'冷凍食を取り出す',!!carry&&carry.type!=='meal');}
 else if(t.kind==='trash'){status=`ごみ ${state.waste||0} / 10`;if(state.open&&carry&&(state.waste||0)<10)add('load','手元のごみを捨てる');if(state.waste)add('empty','ごみを回収する');add('open',state.open?'ふたを閉める':'ふたを開ける');if(state.open&&!carry)status+=' · 捨てる物を手に持ってください';}
 else if(t.kind==='bath'){status=busy?`給湯中 · あと${remaining}秒`:state.loaded?'お湯が入りました':'蛇口を操作してお湯を入れます';add('start',busy?'給湯を止める':state.loaded?'お湯を入れ直す':'お湯を入れる');if(state.bather&&state.bathUntil>now){status='入浴中 · あと'+Math.max(0,Math.ceil((state.bathUntil-now)/1000))+'秒';actions.length=0;add('bath-stop',state.bather===selfId?'お風呂から出る':'ほかの人が入浴中',state.bather!==selfId);}else {if(state.loaded&&(!busy||t.def.design==='shower'))actions.unshift({id:'bath-use',label:t.def.design==='shower'?'シャワーを浴びる':'お湯につかる'});if(state.loaded)add('load','栓を抜いて排水');}status+=' / 入浴 '+(state.baths||0)+'回';}
 else if(t.kind==='tv'){status=state.enabled?`電源ON · カメラ ${(state.channel||0)+1}`:'電源OFF';add('power',state.enabled?'電源を切る':'電源を入れる');add('remote','リモコンを持つ');}
 else if(t.kind==='basketball'){status=`成功 ${state.scored||0} / ${state.uses||0}投 · 押し続けて、緑の範囲で離す`;add('aim','投球位置を見る');}
 else if(t.kind==='globe'){status='回転 '+(((state.phase||0)%6)*60)+'°';add('use','地球儀を回す');}
 else if(t.kind==='toy'||t.kind==='horse'){status=state.enabled?'動いています':'押して動かせます';add('use',state.enabled?'止める':t.kind==='horse'?'揺らす':'動かす');}
 else if(t.kind==='chess'){status=(state.chess?.turn==='black'?'黒':'白')+'の番 · 駒と移動先をクリック';}
 else if(t.kind==='paint'){status='絵の面をドラッグして描く · Undo / Redoで修正';}
 else if(t.kind==='pc'){status='正面の椅子に座って操作 · ジャンプで席を立つ';}
 return {status,actions};
}
