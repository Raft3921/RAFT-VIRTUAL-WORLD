const instruments=new Set(['acoustic','electric','bass','ukulele','drums','snare','e-drums','keyboard','violin','harp']);
export function furnitureAction(f){
  const s=f.design;
  if(f.family==='computer'||f.family==='electronics'&&['pc','laptop','tablet','server'].includes(s))return {kind:'chat',label:'ワールドチャット'};
  if(f.family==='record')return {kind:'record',defaultEnabled:false,label:'レコード'};
  if(f.family==='piano')return {kind:'piano',instrument:'piano',label:'ピアノ'};
  if(f.family==='hobby'&&instruments.has(s))return {kind:'instrument',instrument:s,label:f.name};
  if(f.family==='fan'||f.family==='aircon'||f.family==='electronics'&&['fan','tower','purifier','humidifier'].includes(s))return {kind:'fan',toggle:true,defaultEnabled:true,label:'送風・動作'};
  if(f.light||['lamp','sconce','pendant','chandelier','ceiling-light','light-bar'].includes(f.family))return {kind:'light',toggle:true,defaultEnabled:true,label:'照明'};
  if(['tv','computer','projector'].includes(f.family)||f.family==='electronics'&&(s?.startsWith('tv-')||['crt','portable','screen','projector','pc','laptop','tablet','arcade','console','vr','server'].includes(s)))return {kind:'screen',toggle:true,defaultEnabled:true,label:'画面・電源'};
  if(f.family==='appliance'&&['washer','dryer','dishwasher','blender','mixer','coffee'].includes(s)||f.family==='electronics'&&['vacuum','robot','printer','scanner'].includes(s))return {kind:'motor',toggle:true,defaultEnabled:false,label:'運転'};
  if(f.family==='curtain'||f.family==='wall-decor'&&['venetian','roman','sheer','blackout','bamboo','tieback','roller'].includes(s))return {kind:'curtain',toggle:true,defaultEnabled:true,label:'カーテン・シェード'};
  if(['wardrobe','dresser','cabinet','wall-cabinet','fridge','oven','kitchen','sink'].includes(f.family)||f.family==='modern-storage'&&['shoe','sideboard','vitrine','sliding','tool','locker','filing','trunk','suitcase'].includes(s)||f.family==='appliance'&&['mini-fridge','wine','rice','trash','recycle'].includes(s))return {kind:'door',toggle:true,defaultEnabled:true,label:'扉・ふた'};
  if(['plant','bonsai','wall-planter','hanging-plant','botanical'].includes(f.family))return {kind:'plant',label:'葉っぱと花が揺れます'};
  if(['mirror','wall-mirror'].includes(f.family))return {kind:'mirror',label:'鏡の入口がきらめきます'};
  if(f.family==='clock')return {kind:'clock',label:'時計のチャイム'};
  if(['bed','canopy'].includes(f.family))return {kind:'bed',label:'寝具がふわっと反応します'};
  if(f.solid===false||f.family==='rug')return {kind:'ripple',label:'波紋が広がります'};
  if(f.family==='toy'||f.family==='soft')return {kind:'toy',label:'ぽよんと反応します'};
  if(['frame','poster','wall-decor'].includes(f.family)||f.design==='canvas')return {kind:'art',label:'絵と飾りがきらめきます'};
  if(['chair','sofa','stool','bench'].includes(f.family))return {kind:'seat',label:'座面が弾みます'};
  if(['table','desk'].includes(f.family))return {kind:'table',label:'天板が軽く震えます'};
  if(['bookshelf','modern-storage','coat','crate','wall-shelf','pegboard'].includes(f.family))return {kind:'storage',label:'収納からほこりが舞います'};
  if(f.family==='aquarium')return {kind:'aquarium',label:'水槽に泡が上がります'};
  if(f.family==='appliance')return {kind:'cook',label:'家電から湯気が上がります'};
  if(['electronics','wall-speaker','vent'].includes(f.family))return {kind:'gadget',label:'電子機器が点滅します'};
  if(f.family==='hobby')return {kind:'craft',label:'趣味の道具から色の粒が飛びます'};
  return {kind:'pulse',label:'コツンと反応します'};
}
