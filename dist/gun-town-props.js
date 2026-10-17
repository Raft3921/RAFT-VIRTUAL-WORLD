// One geometry recipe for all four towns. Every piece belonging to a leaf or
// grille shares its logical bounds/ID, so visuals and server prop state agree.
export function buildTownDoor({prop,id,x,z,width,base=0,dark='#65513e',wood='#79604a',panel='#96785a'}){
 const bounds={x,y:base+1.44,z,w:width,h:2.6,d:.16,floor:base+.12};
 const part=(px,py,pz,w,h,d,color)=>prop(id,'door',px,base+py,pz,w,h,d,color,bounds);
 part(x,1.44,z,width,2.6,.16,wood);
 for(const edge of [-1,1])part(x+edge*(width/2-.13),1.44,z,.19,2.6,.23,dark);
 for(const y of [.30,1.42,2.58])part(x,y,z,width,.16,.23,dark);
 for(const side of [-1,1]){for(const y of [.77,2.01])part(x,y,z+side*.09,width-.53,.85,.035,panel);
  part(x+width/2-.26,1.34,z+side*.16,.09,.30,.06,'#3e4140');part(x+width/2-.39,1.38,z+side*.21,.30,.055,.07,'#a6a49a');}
 for(const y of [.45,1.44,2.43])part(x-width/2+.04,y,z,.10,.22,.27,'#414442');
}
export function buildTownBarredWall({box,detail,prop,id,x,z,depth,height,base=0,thickness=.38,paint}){
 const sill=.68,head=3.35;
 box(x,base+sill/2,z,thickness,sill,depth,paint);box(x,base+(height+head)/2,z,thickness,height-head,depth,paint);
 box(x,base+(sill+head)/2,z,thickness,head-sill,1.1,paint);
 for(const edge of [-1,1])box(x,base+(sill+head)/2,z+edge*(depth/2-.7),thickness,head-sill,1.4,paint);
 for(const edge of [-1,1]){const length=(depth-2.8-1.1)/2,cz=z+edge*(.55+length/2),bounds={x,y:base+(sill+head)/2,z:cz,w:.18,h:head-sill,d:length,floor:base+.12},key=`${id}-${edge}`;
  for(const y of [sill,head])for(const end of [-1,1])detail(x,base+y,cz+end*(length/2-.1),.14,.12,.20,'#525750');
  for(let k=0;k<4;k++)prop(key,'bars',x,base+(sill+head)/2,cz+(k-1.5)*length/4,.055,head-sill,.055,'#424b49',bounds);
  for(const y of [sill+.1,head-.1])prop(key,'bars',x,base+y,cz,.055,.055,length,'#424b49',bounds);
 }
}
