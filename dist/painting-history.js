// Metadata parallels existing point arrays, so older saved canvases remain intact.
export function strokeMetadata(record){return (record.strokes||[]).map((_,i)=>record.strokeMeta?.[i]||{id:'legacy:'+i,owner:null,undone:false});}
export function paintAvailability(record,owner){const meta=strokeMetadata(record);return {undo:meta.some(m=>m.owner===owner&&!m.undone),redo:(record.paintRedo?.[owner]||[]).some(id=>meta.some(m=>m.owner===owner&&m.id===id&&m.undone))};}
export function changePaintHistory(record,owner,action){
 const strokeMeta=strokeMetadata(record).map(m=>({...m})),stack=[...(record.paintRedo?.[owner]||[])];let id;
 if(action==='undo'){id=[...strokeMeta].reverse().find(m=>m.owner===owner&&!m.undone)?.id;if(!id)return null;for(const m of strokeMeta)if(m.owner===owner&&m.id===id)m.undone=true;stack.push(id);}
 else{while(stack.length&&!id){const candidate=stack.pop();if(strokeMeta.some(m=>m.owner===owner&&m.id===candidate&&m.undone))id=candidate;}if(!id)return null;for(const m of strokeMeta)if(m.owner===owner&&m.id===id)m.undone=false;}
 return {...record,strokeMeta,paintRedo:{...(record.paintRedo||{}),[owner]:stack}};
}
export function appendPaint(record,owner,id,points){
 const meta=strokeMetadata(record),continuing=meta.some(m=>m.owner===owner&&m.id===id),strokes=[],strokeMeta=[];
 for(let i=0;i<meta.length;i++){if(!continuing&&meta[i].owner===owner&&meta[i].undone)continue;strokes.push(record.strokes[i]);strokeMeta.push(meta[i]);}
 if(strokes.length>=256||strokes.reduce((n,s)=>n+s.length,0)+points.length>3000)return null;
 strokes.push(points);strokeMeta.push({id,owner,undone:false});return {...record,strokes,strokeMeta,paintRedo:{...(record.paintRedo||{}),[owner]:continuing?(record.paintRedo?.[owner]||[]):[]}};
}
