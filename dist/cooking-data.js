// Food definitions and dish recognition are shared by client and server.
const rows=`
egg|卵|protein|egg|#fff1b8|16
chicken|鶏肉|meat|meat|#e9bdab|28
beef|牛肉|meat|meat|#b76456|24
pork|豚肉|meat|meat|#e69b94|28
bacon|ベーコン|meat|strip|#ce7970|16
sausage|ソーセージ|meat|sausage|#af6350|18
duck|鴨肉|meat|meat|#df8973|30
lamb|ラム肉|meat|meat|#d97866|26
salmon|サーモン|fish|fish|#ed9670|20|raw
tuna|マグロ|fish|fish|#b85967|20|raw
shrimp|えび|fish|shrimp|#edb39a|18
squid|いか|fish|strip|#efe5df|18
cod|たら|fish|fish|#ffe3c7|20
mackerel|さば|fish|fish|#8ab0b8|22
scallop|ほたて|fish|block|#ffe6bc|18
tofu|豆腐|protein|block|#f3edda|12|raw
cabbage|キャベツ|vegetable|leaf|#8cb768|12|raw
lettuce|レタス|vegetable|leaf|#a5c96c|8|raw
carrot|にんじん|vegetable|carrot|#e38e42|18|raw
onion|玉ねぎ|vegetable|round|#e9d6a5|16|raw
potato|じゃがいも|vegetable|potato|#c6ad7e|24
tomato|トマト|vegetable|round|#d85c4b|12|raw
cucumber|きゅうり|vegetable|long|#579163|8|raw
pepper|ピーマン|vegetable|pepper|#65a65c|12|raw
broccoli|ブロッコリー|vegetable|broccoli|#4b8a58|16
spinach|ほうれん草|vegetable|leaf|#498058|10
pumpkin|かぼちゃ|vegetable|round|#bd9451|24
corn|とうもろこし|vegetable|corn|#e9c563|18
mushroom|しめじ|vegetable|mushroom|#b69b7d|14
shiitake|しいたけ|vegetable|mushroom|#8c6e52|16
radish|大根|vegetable|long|#e9ecda|20
leek|ねぎ|vegetable|long|#96b984|10|raw
rice|米|starch|grains|#f5efde|28
pasta|パスタ|starch|pasta|#e8cf89|22
udon|うどん|starch|noodles|#efe9d7|18
bread|パン|starch|bread|#c79254|8|raw
flour|小麦粉|starch|powder|#f2ecdb|20
noodles|中華麺|starch|noodles|#dec777|18
milk|牛乳|dairy|bottle|#f4f0de|8|raw
cream|生クリーム|dairy|bottle|#f2ebd4|8|raw
cheese|チーズ|dairy|cheese|#e6c568|8|raw
butter|バター|dairy|block|#ead495|8|raw
yogurt|ヨーグルト|dairy|bottle|#f3efdf|0|raw
apple|りんご|fruit|round|#bc5c4f|8|raw
banana|バナナ|fruit|banana|#e6ca66|8|raw
strawberry|いちご|fruit|berry|#d76762|6|raw
orange|オレンジ|fruit|round|#dd994a|8|raw
lemon|レモン|fruit|round|#e3d568|6|raw
grape|ぶどう|fruit|grape|#927092|6|raw
peach|桃|fruit|round|#e2aaa0|8|raw
pineapple|パイナップル|fruit|pineapple|#c7ac59|8|raw
`;
export const INGREDIENTS=rows.trim().split('\n').map(row=>{const [id,name,group,shape,color,time,raw]=row.split('|');return {id,name,group,shape,color,time:Number(time),raw:raw==='raw',wash:['vegetable','fruit'].includes(group)};});
export const FOOD_BY_ID=new Map(INGREDIENTS.map(f=>[f.id,f]));
export const FOOD_GROUPS={all:'全種類',protein:'卵・豆腐',meat:'肉',fish:'魚介',vegetable:'野菜・きのこ',starch:'米・麺・パン・粉',dairy:'乳製品',fruit:'果物'};
export function fridgeFoods(group){if(group!=='all')return INGREDIENTS.filter(f=>f.group===group);const first=['beef','chicken','salmon','shrimp','rice','pasta','potato','egg'];return [...first.map(id=>FOOD_BY_ID.get(id)),...INGREDIENTS.filter(f=>!first.includes(f.id))];}
export const SEASONINGS={salt:'塩',pepper:'こしょう',soy:'しょうゆ',sugar:'砂糖',miso:'味噌',curry:'カレースパイス',stock:'だし',oil:'油',vinegar:'酢',ketchup:'ケチャップ',herbs:'ハーブ'};
export const CUTS={dice:'角切り',slice:'薄切り',mince:'みじん切り',grate:'すりおろし'};
export const COOK_METHODS={raw:'そのまま',mix:'混ぜる',fry:'焼く・炒める',boil:'ゆでる',simmer:'煮込む',steam:'蒸す',bake:'オーブン焼き'};
export function cleanFood(f){if(!FOOD_BY_ID.has(f?.id))return null;return {id:f.id,washed:f.washed===true,peeled:f.peeled===true,cut:Object.hasOwn(CUTS,f.cut)?f.cut:null,cuts:Math.min(3,Math.max(0,Number(f.cuts)||0)),progress:Math.min(180,Math.max(0,Number(f.progress)||0)),burn:Math.min(100,Math.max(0,Number(f.burn)||0)),method:Object.hasOwn(COOK_METHODS,f.method)?f.method:'raw'};}
export function cleanMeal(meal){const foods=(Array.isArray(meal?.foods)?meal.foods:[]).slice(0,16).map(cleanFood).filter(Boolean),seasonings=Object.fromEntries(Object.keys(SEASONINGS).filter(k=>Number(meal?.seasonings?.[k])>0).map(k=>[k,Math.min(8,Math.floor(Number(meal.seasonings[k])))]));return {foods,seasonings,water:Math.max(0,Math.min(3,Number(meal?.water)||0)),mixed:meal?.mixed===true,kneaded:meal?.kneaded===true,rolled:meal?.rolled===true};}
export function foodCookingState(food,{wet=false}={}){
 const def=FOOD_BY_ID.get(food.id),heat=Math.max(0,food.progress||0)/Math.max(1,def?.time||1),moist=wet||['boil','simmer','steam'].includes(food.method);
 const fine=['mince','grate'].includes(food.cut),fragile=def?.group==='fish'||['potato','pumpkin','tomato','onion','apple','tofu'].includes(food.id)||def?.shape==='leaf';
 const softness=moist?Math.min(1,Math.max(0,(heat-.35)/(fine?.8:fragile?1.4:2.5))):0;
 return {heat,moist,fine,softness,flaked:def?.group==='fish'&&moist&&heat>.45,melted:['butter','cheese'].includes(food.id)&&heat>.35,absorbed:food.id==='flour'&&moist,swelling:['rice','pasta','udon','noodles'].includes(food.id)?Math.min(1,heat):0};
}
export function tasteMeal(input){
 const meal=cleanMeal(input),foods=meal.foods,sp=meal.seasonings,has=id=>foods.some(f=>f.id===id),group=g=>foods.some(f=>FOOD_BY_ID.get(f.id).group===g),issues=[];let score=80,cap=5;
 const savory=group('fish')||group('meat')||group('vegetable')||has('tofu'),sweetDish=!savory&&(group('fruit')||has('yogurt')||has('flour')&&(has('egg')||has('milk'))),salt=(sp.salt||0)+(sp.soy||0)*.8+(sp.miso||0)*.8,umami=(sp.stock||0)+(sp.soy||0)+(sp.miso||0),sweet=sp.sugar||0;
 const penalize=(points,reason,limit=5)=>{score-=points;issues.push(reason);cap=Math.min(cap,limit);};
 if(!foods.length)return {stars:1,score:0,reasons:['食材がありません']};
 if(foods.some(f=>!FOOD_BY_ID.get(f.id).raw&&f.progress<FOOD_BY_ID.get(f.id).time))penalize(60,'火の通りが足りない',1);
 if(foods.some(f=>f.burn>35))penalize(45,'焦げの苦味が強い',2);
 if(foods.some(f=>FOOD_BY_ID.get(f.id).wash&&!f.washed))penalize(22,'野菜や果物の下洗いが足りない',3);
 if(savory&&sweet&&!salt&&!umami&&!sp.curry&&!sp.ketchup)penalize(group('fish')?52:40,group('fish')?'魚に砂糖だけが加わり、甘さと魚の風味が合っていない':'砂糖の甘さを支える塩味やうま味がない',2);
 else if(savory&&sweet>Math.max(1,salt+umami)*1.2)penalize(25,'甘さが塩味とうま味に対して強すぎる',3);
 const servings=Math.max(1,foods.length*.6+meal.water*.8);
 if(salt/servings>2.2)penalize(35,'塩味が強すぎる',2);
 if(sweetDish&&sweet/servings>3)penalize(30,'砂糖が多すぎて甘さが重い',2);
 if((sp.vinegar||0)/servings>1.6)penalize(24,'酸味が強すぎる',3);
 if((sp.pepper||0)/servings>2||(sp.curry||0)/servings>3)penalize(24,'香辛料が強すぎて食材の味が隠れている',3);
 if(sweetDish&&(sp.miso||sp.curry||sp.stock||salt>1))penalize(35,'甘い料理に塩味や香辛料が強く混ざっている',2);
 const bound=meal.mixed&&(has('egg')||has('flour'));
 if(foods.some(f=>FOOD_BY_ID.get(f.id).group==='fish'&&f.cut==='mince'&&['boil','simmer'].includes(f.method)&&f.progress>0)&&!bound)penalize(18,'みじん切りの魚が煮汁に崩れ、食感がまとまっていない');
 if(foods.some(f=>foodCookingState(f).moist&&f.progress>FOOD_BY_ID.get(f.id).time*2.4&&!['rice','flour','milk','cream','yogurt'].includes(f.id)))penalize(20,'加熱しすぎて食材の食感が失われている',3);
 if(savory&&!salt&&!umami&&!sp.curry&&!sp.ketchup&&!sp.herbs&&!sweet)penalize(10,'味付けが薄く、食材の味がまとまっていない');
 if((group('meat')||group('fish'))&&group('vegetable'))score+=5;
 if(group('starch')&&(group('meat')||group('fish')||has('egg')))score+=4;
 if(savory&&salt&&umami&&sweet<=Math.max(1,salt+umami)*1.2)score+=8;
 if(savory&&(sp.pepper||sp.herbs||sp.curry)&&salt)score+=3;
 if(sweetDish&&sweet&&sweet/servings<=3)score+=8;
 if(meal.mixed&&foods.length>1)score+=3;
 const stars=Math.min(cap,score<35?1:score<55?2:score<72?3:score<90?4:5);
 return {stars,score:Math.max(0,Math.min(100,Math.round(score))),reasons:issues};
}
// Colours and texture are derived from the same saved food/process data everywhere.
export function brothAppearance(input){
 const foods=input.foods||[],sp=input.seasonings||{},dairy=foods.some(f=>['milk','cream','yogurt'].includes(f.id)),bound=input.mixed&&foods.some(f=>['egg','flour'].includes(f.id)),water=Math.max(0,input.water||0),melted=foods.some(f=>foodCookingState(f).melted),sauce=foods.some(f=>f.id==='tomato'&&foodCookingState(f).heat>.5&&(f.cut||input.mixed)),volume=water||(dairy?.3:melted?.055:sauce?.12:0);
 let rgb=water?[186,214,215]:[238,216,152],cloud=0,thick=0;
 const mix=(hex,amount)=>{const n=parseInt(hex.slice(1),16),c=[n>>16,(n>>8)&255,n&255];amount=Math.max(0,Math.min(1,amount));rgb=rgb.map((v,i)=>v+(c[i]-v)*amount);};
 for(const f of foods){const def=FOOD_BY_ID.get(f.id),state=foodCookingState(f,{wet:water>.01});if(!def)continue;const extraction=Math.min(1,state.heat)*(state.fine?(bound&&['meat','fish'].includes(def.group)?.25:.8):f.cut?.5:.3);
  if(['meat','fish'].includes(def.group)){mix(def.group==='fish'?'#dfd5be':'#c69c69',extraction*.85);cloud+=extraction*.8;}
  else if(['rice','flour','potato'].includes(f.id)){mix('#eee0b5',extraction*.35);cloud+=extraction*.3;thick+=extraction*.25;}
  else if(['tomato','carrot','pumpkin','onion','mushroom','shiitake'].includes(f.id)){mix({tomato:'#d8643b',carrot:'#e4a057',pumpkin:'#e6ad4c',onion:'#d8b878',mushroom:'#ac8b66',shiitake:'#9e7853'}[f.id],extraction*.55);thick+=state.softness*.12;}
  else if(def.shape==='leaf'){mix('#a1b977',extraction*.18);cloud+=extraction*.08;}
  if(state.melted){mix(f.id==='cheese'?'#edc771':'#ead392',.35);thick+=.2;}
 }
 if(sp.stock)mix('#dfbe73',Math.min(.75,sp.stock*.3));
 if(sp.sugar)mix('#efdaad',Math.min(.25,sp.sugar*.04));
 if(sp.soy){mix('#724522',Math.min(.95,sp.soy*.4));cloud+=.1;}
 if(sp.ketchup){mix('#d35c35',Math.min(.8,sp.ketchup*.28));thick+=.2;}
 if(dairy){mix('#f3e2bb',.9);cloud+=.9;thick+=.35;}
 if(sp.miso){mix('#b2925f',Math.min(.95,.65+sp.miso*.08));cloud+=.8;thick+=.2;}
 if(sp.curry){mix('#bd8837',Math.min(.98,.7+sp.curry*.07));cloud+=.95;thick+=.5;}
 cloud=Math.min(1,cloud);thick=Math.min(1,thick);
 const color='#'+rgb.map(n=>Math.round(n/4)*4).map(n=>Math.min(255,n).toString(16).padStart(2,'0')).join('');
 return {color,opacity:Math.round((.35+cloud*.6)*20)/20,cloudiness:cloud,thickness:thick,volume};
}
export function describeDish(input){
 const meal=cleanMeal(input),foods=meal.foods,ids=new Set(foods.map(f=>f.id)),has=id=>ids.has(id),all=(...list)=>list.every(has),group=g=>foods.some(f=>FOOD_BY_ID.get(f.id).group===g),method=m=>foods.some(f=>f.method===m),hot=foods.some(f=>f.progress>0),ready=f=>FOOD_BY_ID.get(f.id).raw||f.progress>=FOOD_BY_ID.get(f.id).time,liquid=meal.water>.15,sp=meal.seasonings;
 let name='',shape='plate';
 if(liquid&&sp.curry&&has('rice')){name='カレーライス';shape='rice';}
 else if(liquid&&sp.curry){name='カレー';shape='soup';}
 else if(liquid&&sp.miso){name='味噌汁';shape='soup';}
 else if(liquid&&has('udon')){name='具だくさんうどん';shape='soup';}
 else if(liquid&&has('noodles')){name='ラーメン';shape='soup';}
 else if(liquid&&(has('milk')||has('cream'))&&has('potato')){name='クリームシチュー';shape='soup';}
 else if(liquid&&has('rice')){name=has('egg')?'卵雑炊':'リゾット';shape='soup';}
 else if(has('pasta')){name=all('bacon','egg')&&(has('milk')||has('cream'))?'カルボナーラ':has('tomato')&&group('meat')?'ミートソースパスタ':has('tomato')?'トマトパスタ':has('cream')?'クリームパスタ':has('shrimp')||has('squid')?'海鮮パスタ':'具だくさんパスタ';shape='pasta';}
 else if(has('rice')&&has('chicken')&&has('egg')){name='親子丼';shape='rice';}
 else if(has('rice')&&has('beef')){name='牛丼';shape='rice';}
 else if(has('rice')&&has('salmon')&&!hot){name='サーモン丼';shape='rice';}
 else if(has('rice')&&has('egg')&&sp.ketchup){name='オムライス';shape='rice';}
 else if(has('rice')&&method('fry')){name='チャーハン';shape='rice';}
 else if(has('rice')&&group('fish')){name='海鮮ご飯';shape='rice';}
 else if(has('rice')){name=foods.length===1?'ご飯':'炊き込みご飯';shape='rice';}
 else if(all('bread','beef')){name='ハンバーガー';shape='sandwich';}
 else if(has('bread')&&foods.length>1){name='サンドイッチ';shape='sandwich';}
 else if(all('flour','tomato','cheese')&&method('bake')){name='ピザ';shape='pizza';}
 else if(all('flour','egg','milk')&&method('fry')){name='パンケーキ';shape='pancake';}
 else if(all('flour','egg')&&sp.sugar&&method('bake')){name=group('fruit')?'フルーツケーキ':'焼き菓子';shape='cake';}
 else if(group('fruit')&&(has('milk')||has('yogurt'))&&meal.mixed){name=has('yogurt')?'フルーツヨーグルト':'フルーツミルク';shape='dessert';}
 else if(liquid){name=method('simmer')?'具だくさん煮込み':'具だくさんスープ';shape='soup';}
 else if(has('noodles'))name='焼きそば';
 else if(all('potato','carrot')&&!method('fry'))name='ポテトサラダ';
 else if(has('egg')&&foods.length===1)name=method('boil')?'ゆで卵':meal.mixed?'スクランブルエッグ':'目玉焼き';
 else if(has('egg')&&method('fry'))name='具入りオムレツ';
 else if(group('meat')&&group('vegetable'))name=method('bake')?'肉と野菜のオーブン焼き':method('simmer')?'肉と野菜の煮込み':method('steam')?'肉と野菜の蒸し料理':method('boil')?'肉と野菜のゆで盛り':'肉野菜炒め';
 else if(group('fish')&&group('vegetable'))name=method('steam')?'魚介と野菜の蒸し料理':method('simmer')?'魚介と野菜の煮込み':method('boil')?'魚介と野菜のゆで盛り':'魚介野菜炒め';
 else if(group('meat'))name=has('beef')?'ビーフステーキ':has('chicken')?'チキンソテー':'肉のソテー';
 else if(group('fish'))name=!hot?'刺身盛り合わせ':method('boil')?'魚介のゆで盛り':'魚介のソテー';
 else if(group('fruit')){name='フルーツ盛り合わせ';shape='dessert';}
 else if(group('vegetable'))name=hot?(method('steam')?'蒸し野菜':method('boil')?'温野菜':method('bake')?'野菜のオーブン焼き':method('simmer')?'野菜の煮込み':'野菜炒め'):'フレッシュサラダ';
 else name='自由な盛り合わせ';
 const taste=tasteMeal(meal),quality=foods.some(f=>f.burn>35)?'焦げ気味':foods.some(f=>!ready(f))?'加熱不足':foods.some(f=>FOOD_BY_ID.get(f.id).wash&&!f.washed)?'洗浄不足':taste.stars<=2?'味や食感がまとまっていない':taste.stars===3?'味や食感に改善の余地':'食べ頃';
 const labels=[...ids].map(id=>FOOD_BY_ID.get(id).name),signature=[...ids].sort().join('+')+'|'+[...new Set(foods.map(f=>f.method))].sort().join('+')+'|'+Object.keys(sp).sort().join('+');
 return {name,shape,quality,signature,subtitle:labels.join('・'),meal,edible:foods.length>0&&quality!=='加熱不足'};
}
