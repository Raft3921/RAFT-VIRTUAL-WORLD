const SECTIONS=[
 ['guns','PC・コイン・銃撃戦',[
  ['PCとチャット','PCはデスクトップからチャット・ウェブ・ストアを開けます。ウェブではVRSの中でVRSを開けます。左上のコイン表示の下とMENUにもチャットがあります。'],
  ['ラフトコイン','初期1コイン。アスレチックの新しいステージをクリアすると1コイン、闘技場・銃撃戦の勝利で1コイン。家具の同時配置数の最高記録が5個増えるごとに1コイン。削除と再配置では増えません。'],
  ['武器の解放','拳銃1コイン、マシンガン3、スナイパー5、ショットガン7、ロケット10。前の武器で1・5・10・15回勝つと次を購入できます。勝利数は銃撃戦で記録します。'],
  ['撃つ・狙う','装備すると常に構え、✊で発砲。マシンガンは長押し連射。スナイパーは長押しでスコープ、ドラッグで狙い、離すと発砲。ショットガンは4発同時。ロケットは遅い大きな弾で範囲爆発。弾倉が空になると5秒でリロード。予備弾は無制限。'],
  ['砂の街','PCで銃を購入・装備してから、プラザ東側の道から、城壁の西門より入場。市場・中庭・屋上通路・細い路地がつながる砂の街です。一人称で、飛行は禁止。2人以上で15秒後に自動開始、4人は自動2対2。開始前は専用ボードでチームを編集できます。3被弾で脱落し、最後まで残ったチームが勝利。'],
  ['テレビで観戦','テレビを起動し、その方向を向いた近くの椅子・ソファに座ると全画面で観戦。左右の半透明矢印で闘技場3台・銃撃戦5台のカメラを切り替えます。ジャンプで席を立つと通常画面に戻ります。'],
  ['家の編集','家の前のMENUは普通のメニューです。自分の家の入り口に近づいたときだけカスタマイズを開けます。']
 ]],
  ['start','ワールドとゾーン',[
    ['中心のスタジオ','白い箱型の建物が撮影スタジオです。道をたどると住宅街、コロシアム、CHECK 100までのアスレチック、広場・市場・時計台・庭園へ行けます。'],
    ['メニューボード','縦長のMENUボードに近づき、上に出る「開く」を押すと、「撮影・外見・時間・対戦・アスレ」の項目を切り替えられます。闘技場とチェックポイントではその場に合った項目から開きます。右上の×で閉じます。スタジオ前では近づくと「ガイドを開く」が表示されます。'],
    ['メンバーとゲスト','8人のメンバーにはそれぞれ自分の家があります。9人目の真っ白なゲストも移動・撮影・対戦・アスレチックで遊べますが、家や共有設定、メンバーの保存データは編集できません。']
  ]],
  ['controls','移動・スマホ操作',[
    ['パソコン・タッチパッド','WASD／矢印キーで移動、画面をドラッグして視点を変更、Spaceでジャンプ。画面のダブルクリックでマウス固定、Escで解除できます。MENUの「操作」でマウス感度を変更でき、この端末に保存されます。'],
    ['スマホ・タブレット','左下スティックで移動。空いた画面をドラッグして視点を変更。右下の↑でジャンプ、✊でパンチします。家具の編集では2本指でズーム・視点移動もできます。'],
    ['空中飛行','ジャンプ操作を短い間隔で2回行うと飛行ON/OFF。飛行中はSpace・上昇ボタンで上へ、Shift・下降ボタンで下へ進みます。アスレチックと試合中は飛行できません。'],
    ['座る・寝る','座席に上から乗ると着席、ベッドに乗ると休憩します。ジャンプで立ち上がり、ベッドではパンチでも起きられます。']
  ]],
  ['studio','撮影・カメラ',[
    ['背景を変える','スタジオ近くのMENUからGB（緑）・RB（赤）・BB（青）を選びます。ゲストは背景を変更できません。スタジオの屋根は撮影中のプレイヤーを暗くする影を落としません。'],
    ['マスターモード','MENUのマスターモード、またはF1からカメラ・草原・プレイヤー設定を開きます。追従、一人称、周回、自由カメラを選べます。'],
    ['撮影カメラから戻る','自由・周回カメラはプレイヤーをその場に残します。1秒以内に5回クリック、または✊を5回タップすると追従カメラへ戻ります。1回のクリックやドラッグだけでは戻りません。'],
    ['表示を隠す','Hキーで撮影用の表示切り替えができます。設定画面は×やEscで閉じられます。']
  ]],
  ['home','家・家具の編集',[
    ['自分の家を開く','自分のメンバーカラーの家の玄関にあるHOMEボードをクリック／タップします。近くに出る「自分の家を編集」からも開けます。家の保存にはサーバー接続が必要です。'],
    ['310種類の家具','「家具を探す」で床置き・壁掛け・天井吊りを切り替え、名前検索・種類フィルター・前へ／次へで選びます。選ぶと「配置・編集」へ移動し、色や向きを変えられます。1軒に置ける数は64個までです。'],
    ['置く・回転・撤去','緑のプレビューは配置可能、赤は重なりなどで配置不可。「ここに置く」で確定します。編集中は家具を直接クリック／タップすると1段階回転し、ドラッグでは移動します。壁掛けは90度、ほかは45度刻み。複製・撤去・最後の撤去を戻す操作もできます。'],
    ['グリッドと小物','X/Zは25cm刻み。矢印ギズモ・数値入力で移動、黄色いリングやRでも回転できます。小物は机上にも置け、Yを5cm刻みで調整できます。椅子は机に限界まで近づけた時だけペアになり、離すと独立します。'],
    ['部屋・視点','「部屋・視点」で床・壁紙・天井を変更し、視点回転・視点移動・真上・全体を見るを使えます。スマホは2本指でズームと移動。パネルを縮小すると配置場所を広く見られます。編集中だけ屋根・手前の壁を隠します。']
  ]],
  ['arena','コロシアム・対戦',[
    ['試合の始め方','金色のリング内に2人で入り、両者が1秒以内にパンチすると開始。周囲の席は観戦用です。試合中はバリアの外へ出たり飛行・位置リセットをしたりできません。'],
    ['攻撃・溜め・コンボ','✊を押して離すと攻撃、長押しで10段階の溜め。通常攻撃は右パンチ→左パンチ→上段蹴り→回転攻撃へつながります。画面の相手をクリックして狙うと追撃しやすくなります。'],
    ['ダメージと保護時間','攻撃ダメージは1〜10、合計11が初期の勝利条件です。MENUから1〜100に変更でき、次の試合から反映。餃子のコンボ最後の茶色い投射物は2ダメージです。吹っ飛び中と、仰向けになってから1.5秒は追撃が入りません。'],
    ['記録・髪・王冠','メンバーの勝数・敗数・勝率・スコアと外見はキャラクターごとに保存します。負けると髪／王冠が減り、勝つと髪が戻り、回復後は王冠が付き伸びます。MENUのON/OFFで両方の外見表現を切り替えます。'],
    ['ゲスト戦と練習','ゲスト相手でもメンバー側の勝敗・外見は更新されます。ゲスト自身は変更しません。同じキャラクター同士は記録を変えない練習試合。勝率は勝敗内訳の保存を始めた更新以降から集計します。']
  ]],
  ['course','アスレチック',[
    ['ジャンプでCHECK 100へ','ゾーン内は飛行不可、ジャンプ力1.5倍。CHECK 1〜100へ登り、後半ほど難しくなります。細い道、小さい足場、左右・前後の動く床、上下リフト、落ちる床、回転バー、横から来る球を組み合わせたコースです。'],
    ['落下とチェックポイント','赤い発光する危険物を避け、チェックポイントを踏んで進捗を保存。危険物に当たるか、到達した高さから7m以上落ちるとチェックポイントから再開します。'],
    ['やめる・続きから再開','チェック地点のMENUから「アスレチックをやめる」を選びます。メンバーは退出・再読み込み後も、再び入ると保存したチェックから開始。ゲストの進捗はその入室中だけです。']
  ]],
  ['life','時計・照明・家具の遊び',[
    ['昼夜と懐中電灯','1日の長さは初期設定10分。朝・昼・夕方・夜を繰り返し、時計もゲーム内時刻に合わせます。MENUで1〜120分に変更、サイクルOFFでずっと昼。夜の懐中電灯はカメラの向きを照らし、有無は自分用の設定です。'],
    ['照明・楽器・レコード','照明や家電は殴ると点灯・運転を切り替えられます。ピアノ、ギター、ドラムなどの楽器はどれも同じ15音のメロディを順に鳴らし、音色と音符の演出が出ます。レコード台は殴ると「昼下がり気分」を再生し、もう一度殴ると停止。音は近くで聞こえます。'],
    ['家具のしかけ','扉・ふた・カーテンは殴ると開閉し、植物・ぬいぐるみ・絵やポスターも種類に応じて反応します。近くにいるプレイヤー同士で同じ変化が見えます。'],
    ['鏡の白い異空間','鏡は反射画面ではなく入口です。正面から歩いて入ると、元の家と同じ大きさの真っ白な空間へ移動します。中にある出口用の鏡へ歩いて入ると元の部屋に戻れます。']
  ]],
  ['online','オンライン・保存',[
    ['一緒に遊ぶ','同じルームへ参加すると最大9人で同じワールドに入れます。MENUのオンライン設定から接続状態を確認してください。'],
    ['保存と更新','家の家具・内装、キャラクターの対戦記録・髪／王冠・コース進捗、共有の試合条件・昼夜設定は同期サーバーに保存。更新後は全員ページを再読み込みし、LAN版はホストのサーバーも再起動します。接続できない間は家の編集を保存できません。']
  ]]
];
export function createWorldGuide({world,onOpen,onClose,isAllowed}){
  const panel=document.getElementById('worldGuide'),prompt=document.getElementById('guidePrompt'),nav=document.getElementById('guideSections'),content=document.getElementById('guideContent'),heading=document.getElementById('guideSectionTitle'),board=world.boards.find(b=>b.kind==='studio');let near=false,selected=SECTIONS[0][0];
  function show(id){const section=SECTIONS.find(s=>s[0]===id)||SECTIONS[0];selected=section[0];heading.textContent=section[1];content.replaceChildren();for(const [title,text]of section[2]){const article=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('p');summary.textContent=title;body.textContent=text;article.append(summary,body);content.append(article);}content.firstElementChild.open=true;for(const button of nav.children)button.setAttribute('aria-selected',String(button.dataset.section===selected));content.scrollTop=0;}
  function open(){onOpen();prompt.hidden=true;show(selected);panel.hidden=false;document.getElementById('closeWorldGuide').focus();}
  function close(focus=true){const wasOpen=!panel.hidden;panel.hidden=true;prompt.hidden=true;if(wasOpen&&focus)onClose();}
  for(const [id,title]of SECTIONS){const button=document.createElement('button');button.textContent=title;button.dataset.section=id;button.setAttribute('role','tab');button.onclick=()=>show(id);nav.append(button);}
  document.getElementById('closeWorldGuide').onclick=()=>close();prompt.onclick=()=>{if(near&&isAllowed())open();};
  panel.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...panel.querySelectorAll('button,summary')].filter(e=>!e.disabled),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
  function update(position,allowed){near=!!position&&!!board&&Math.hypot(position.x-board.x,position.z-board.z)<=3.5&&Math.abs(position.y-(board.y-1.45))<2.8;const hidden=!near||!allowed||!panel.hidden;prompt.hidden=true;}
  return {open,close,update,get active(){return !panel.hidden;}};
}
