// Adapter for the supplied Blockbench player JEM. Boxes use exported model
// space; translate defines the anatomical pivot, not a second box translation.
export function jemAvatarDefinition(model){
  const models=new Map(model.models.map(part=>[part.part,part]));
  const names={head:['head','headwear'],torso:['body','jacket'],leftArm:['left_arm','left_sleeve'],rightArm:['right_arm','right_sleeve'],leftLeg:['left_leg','left_pants'],rightLeg:['right_leg','right_pants']};
  const parts={};
  for(const [name,[base,overlay]]of Object.entries(names)){
    const record=models.get(base),box=record?.boxes?.[0],outer=models.get(overlay)?.boxes?.[0];
    if(!box||!outer)throw new Error('ギョーザのJEMに必要な部位がありません：'+base);
    const [x,y,z,w,h,d]=box.coordinates;
    parts[name]={size:[w,h,d],base:box.textureOffset||[0,0],overlay:outer.textureOffset||[0,0],inflate:outer.sizeAdd||0,baseBox:box,overlayBox:outer,textureSize:model.textureSize||[64,64],center:[-(x+w/2),y+h/2,z+d/2],bottom:y,top:y+h,pivot:[record.translate?.[0]||0,-(record.translate?.[1]||0),record.translate?.[2]||0]};
  }
  return {parts,legHeight:parts.leftLeg.top,bodyBottom:parts.torso.bottom,bodyHeight:parts.torso.size[1],headBottom:parts.head.bottom,totalHeight:parts.head.top};
}
