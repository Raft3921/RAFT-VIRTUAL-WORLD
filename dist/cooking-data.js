// Food definitions and dish recognition are shared by client and server.
const rows=`
egg|卵|protein|egg|#fff1b8|16
chicken|鶏肉|meat|meat|#e9bdab|28
beef|牛肉|meat|meat|#b76456|24
pork|豚肉|meat|meat|#e69b94|28
bacon|ベーコン|meat|strip|#ce7970|16
sausage|ソーセージ|meat|sausage|#af6350|18
salmon|サーモン|fish|fish|#ed9670|20|raw
tuna|マグロ|fish|fish|#b85967|20|raw
shrimp|えび|fish|shrimp|#edb39a|18
squid|いか|fish|strip|#efe5df|18
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
export const FOOD_GROUPS={protein:'卵・豆腐',meat:'肉',fish:'魚介',vegetable:'野菜・きのこ',starch:'米・麺・パン・粉',dairy:'乳製品',fruit:'果物'};
export const SEASONINGS={salt:'塩',pepper:'こしょう',soy:'しょうゆ',sugar:'砂糖',miso:'味噌',curry:'カレースパイス',stock:'だし',oil:'油',vinegar:'酢',ketchup:'ケチャップ',herbs:'ハーブ'};
export const CUTS={dice:'角切り',slice:'薄切り',mince:'みじん切り',grate:'すりおろし'};
export const COOK_METHODS={raw:'そのまま',mix:'混ぜる',fry:'焼く・炒める',boil:'ゆでる',simmer:'煮込む',steam:'蒸す',bake:'オーブン焼き'};
export function cleanFood(f){if(!FOOD_BY_ID.has(f?.id))return null;return {id:f.id,washed:f.washed===true,peeled:f.peeled===true,cut:Object.hasOwn(CUTS,f.cut)?f.cut:null,cuts:Math.min(3,Math.max(0,Number(f.cuts)||0)),progress:Math.min(180,Math.max(0,Number(f.progress)||0)),burn:Math.min(100,Math.max(0,Number(f.burn)||0)),method:Object.hasOwn(COOK_METHODS,f.method)?f.method:'raw'};}
export function cleanMeal(meal){const foods=(Array.isArray(meal?.foods)?meal.foods:[]).slice(0,16).map(cleanFood).filter(Boolean),seasonings=Object.fromEntries(Object.keys(SEASONINGS).filter(k=>Number(meal?.seasonings?.[k])>0).map(k=>[k,Math.min(8,Math.floor(Number(meal.seasonings[k])))]));return {foods,seasonings,water:Math.max(0,Math.min(3,Number(meal?.water)||0)),mixed:meal?.mixed===true,kneaded:meal?.kneaded===true,rolled:meal?.rolled===true};}
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
 const quality=foods.some(f=>f.burn>35)?'焦げ気味':foods.some(f=>!ready(f))?'加熱不足':Object.entries(sp).some(([k,v])=>!['oil','stock'].includes(k)&&v>3)?'味付け濃いめ':foods.some(f=>FOOD_BY_ID.get(f.id).wash&&!f.washed)?'洗浄不足':'食べ頃';
 const labels=[...ids].map(id=>FOOD_BY_ID.get(id).name),signature=[...ids].sort().join('+')+'|'+[...new Set(foods.map(f=>f.method))].sort().join('+')+'|'+Object.keys(sp).sort().join('+');
 return {name,shape,quality,signature,subtitle:labels.join('・'),meal,edible:foods.length>0&&quality!=='加熱不足'};
}
