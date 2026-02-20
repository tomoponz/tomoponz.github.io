// app.js
// ========== utilities ==========
function $(id){ return document.getElementById(id); }
function todayKey(){
  const d = new Date();
  return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
}
function weightedPick(pool){
  const total = pool.reduce((s,x)=>s+x.w,0);
  let r = Math.random()*total;
  for(const item of pool){
    r -= item.w;
    if(r <= 0) return item;
  }
  return pool[0];
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

// ========== NAV (統一) ==========
function setActiveNav(){
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const labelMap = {
    "index.html": "プロフィール",
    "omikuji.html": "おみくじ",
    "shindan.html": "診断",
    "gallery.html": "ネタ置き場",
    "links.html": "リンク",
    "games.html": "ゲーム",
    "minigames.html": "ミニゲーム",
    "door.html": "ドア",
    "warp.html": "ワープ",
    "hachi.html": "八百科事典",
    "meigen.html": "名言",
    "kuro.html": "黒歴史",
    "horror.html": "ホラー",
    "deep.html": "深層",
    "404.html": "迷ひ道"
  };

  // brandSub があるページも、<small>だけのページも両対応
  const sub = document.getElementById("brandSub") || document.querySelector(".brand small");
  if(sub) sub.textContent = labelMap[file] || "";

  document.querySelectorAll(".navlinks a.chip").forEach(a=>{
    a.classList.remove("active");
    const href = (a.getAttribute("href") || "").toLowerCase();

    const isActive =
      href === file ||
      // warp.html は「ドア」扱いでアクティブにしたい
      (file === "warp.html" && href === "door.html") ||
      // minigames は nav に直リンクが無いので「ゲーム」をアクティブにする
      (file === "minigames.html" && href === "games.html");

    if(isActive) a.classList.add("active");
  });
}

// ========== quote ==========
/* =====================
   Quotes (今日の一言)
   ===================== */

const GREAT_QUOTES = [
  { text: "自分を知ることから、すべてが始まる。", author: "ソクラテス" },
  { text: "幸福は、徳を日々実行する中で育つ。", author: "アリストテレス" },
  { text: "小さな積み重ねが、大きな差になる。", author: "孔子" },
  { text: "急ぐほど、順序を守れ。", author: "老子" },
  { text: "怒りは握った炭火だ。先に自分を焼く。", author: "仏陀" },
  { text: "時間は命そのもの。浪費は自分を削ること。", author: "セネカ" },
  { text: "今日できることを、明日に送るな。", author: "ベンジャミン・フランクリン" },
  { text: "疑うことは、確かさへの入口だ。", author: "デカルト" },
  { text: "理性は感情を消さない。扱える形に整える。", author: "スピノザ" },
  { text: "目的が明確なら、手段は研ぎ澄まされる。", author: "カント" },
  { text: "自由とは、自分に課す規律だ。", author: "ルソー" },
  { text: "他人を変えるより先に、行動を変えよ。", author: "トルストイ" },
  { text: "恐れは想像が作る。事実に戻れ。", author: "マルクス・アウレリウス" },
  { text: "障害は道になる。", author: "マルクス・アウレリウス" },
  { text: "小さく試し、早く学べ。", author: "ガリレオ" },
  { text: "見えないものを測ると、世界は解ける。", author: "ニュートン" },
  { text: "仮説は控えめに、検証を厚く。", author: "ニュートン" },
  { text: "偶然は準備した頭に味方する。", author: "パスツール" },
  { text: "失敗は情報だ。次の改善点が見える。", author: "エジソン" },
  { text: "一度に全部は無理でも、次の一歩はできる。", author: "エピクテトス" },
  { text: "比較は学びに使え。自分を潰す刃にするな。", author: "モンテーニュ" },
  { text: "複雑さはまず疑え。必要最小に削れ。", author: "オッカム" },
  { text: "自分の言葉で説明できて、理解と言える。", author: "セネカ" },
  { text: "人は見たいものを見る。だから記録せよ。", author: "ユリウス・カエサル" },
  { text: "勝つ戦いは、始まる前に決まっている。", author: "孫子" },
  { text: "兵は拙速を尊ぶ。完璧待ちは敗北を呼ぶ。", author: "孫子" },
  { text: "遠くを見るなら、足元を固めよ。", author: "孟子" },
  { text: "善は急いで行え。先延ばしは鈍る。", author: "アウグスティヌス" },
  { text: "学びは苦から始まるが、習慣で楽になる。", author: "孔子" },
  { text: "言葉より行動が語る。", author: "リンカーン" },
  { text: "最初の一歩は、小さくていい。", author: "マザー・テレサ" },
  { text: "祈りは心を整え、行動は現実を変える。", author: "マザー・テレサ" },
  { text: "本を読むとは、他者の脳を借りること。", author: "ショーペンハウアー" },
  { text: "孤独は思考の実験室だ。", author: "ショーペンハウアー" },
  { text: "運は、準備と挑戦の交点に生まれる。", author: "ルイ・パスツール" },
  { text: "習慣は第二の天性になる。", author: "キケロ" },
  { text: "始めない限り、何も始まらない。", author: "ゲーテ" },
  { text: "焦りは判断を曇らせる。深呼吸して整理せよ。", author: "ゲーテ" },
  { text: "やる気は待つものではなく、作るものだ。", author: "カント" },
  { text: "疑問を持て。疑問は成長の燃料だ。", author: "アインシュタイン" },
  { text: "単純な説明に落ちないなら、まだ粗い。", author: "ガウス" },
  { text: "定義が曖昧なら、議論は必ず迷子になる。", author: "デカルト" },
  { text: "データは嘘をつきにくい。解釈が嘘をつく。", author: "ダーウィン" },
  { text: "変化に適応する者が生き残る。", author: "ダーウィン" },
  { text: "困難は、器を広げる訓練だ。", author: "西郷隆盛" },
  { text: "志が立てば、道は後からついてくる。", author: "吉田松陰" },
  { text: "今できる最善を積む。明日の最善は上がる。", author: "坂本龍馬" },
  { text: "遠回りに見える基礎が、最短になる。", author: "福沢諭吉" },
  { text: "学問は実生活に活かして意味がある。", author: "福沢諭吉" },
  { text: "自分の弱さを知れば、戦い方が変わる。", author: "武田信玄" },
  { text: "勝敗は、準備の差で決まる。", author: "織田信長" },
  { text: "大将は、決断の責任から逃げるな。", author: "上杉謙信" },
  { text: "心が乱れたら、まず姿勢を整えよ。", author: "宮本武蔵" },
  { text: "千日の稽古を鍛とし、万日の稽古を錬とす。", author: "宮本武蔵" },
  { text: "他人の評価で自分の値を決めるな。", author: "夏目漱石" },
  { text: "焦らず、腐らず、積む。", author: "渋沢栄一" },
  { text: "信用は一瞬で失い、積むには時間が要る。", author: "渋沢栄一" },
  { text: "知識は道具。使わなければ錆びる。", author: "レオナルド・ダ・ヴィンチ" },
  { text: "観察は才能ではなく、訓練だ。", author: "レオナルド・ダ・ヴィンチ" },
  { text: "分からないを放置するな。分けて潰せ。", author: "パスカル" },
  { text: "心は理由を作り、後から納得する。", author: "パスカル" },
  { text: "恐れるな。理解せよ。", author: "スピノザ" },
  { text: "少しずつ良くする。それが強さになる。", author: "アリストテレス" },
  { text: "学びは一生。今日の自分を更新し続けよ。", author: "ソクラテス" },
  { text: "思考は紙に出すと、精度が上がる。", author: "ニュートン" },
  { text: "記憶より記録。再現できる形に残せ。", author: "ガリレオ" },
  { text: "「できるか」より「どうやるか」。", author: "ナポレオン" },
  { text: "勝ち筋は、最初に補給を見ろ。", author: "ナポレオン" },
  { text: "信念は刃。向け先を誤ると自分を傷つける。", author: "ニーチェ" },
  { text: "強くなりたいなら、弱い自分を直視せよ。", author: "ニーチェ" },
  { text: "努力は才能を補う。習慣は努力を補う。", author: "アリストテレス" },
  { text: "問題が大きいときは、言葉を短く切れ。", author: "デカルト" },
  { text: "仮説と結論を混ぜるな。", author: "カント" },
  { text: "失敗を恥じるな。反復を恥じろ。", author: "福沢諭吉" },
  { text: "読書は思想の旅。だが歩くのは自分だ。", author: "モンテーニュ" },
  { text: "判断は遅くてもいい。撤退は早く。", author: "孫子" },
  { text: "敵より先に、自分の内を制せ。", author: "仏陀" },
  { text: "欲を減らすと、自由が増える。", author: "老子" },
  { text: "満たそうとするほど、欠けが見える。手放せ。", author: "老子" },
  { text: "焦点を一つに絞れば、力は倍化する。", author: "武蔵（要旨）" },
  { text: "問いが良ければ、答えは半分出ている。", author: "アインシュタイン（要旨）" },
  { text: "実験は、世界に聞く質問だ。", author: "ファラデー（要旨）" },
  { text: "数式は、自然の言語の一つだ。", author: "ガリレオ（要旨）" },
  { text: "最短距離は、正しい方向を選ぶこと。", author: "ゲーテ（要旨）" },
  { text: "学ぶのに遅すぎる日はない。", author: "セネカ（要旨）" },
  { text: "心配は未来の借金。返済は今の集中で。", author: "キケロ（要旨）" },
  { text: "勝てる形にしてから戦え。", author: "孫子（要旨）" },
  { text: "簡単に見える解は、整理の勝利だ。", author: "ガウス（要旨）" },
  { text: "定義は約束。約束が揃えば、計算は進む。", author: "デカルト（要旨）" },
  { text: "成果は、良い反復からしか生まれない。", author: "ニュートン（要旨）" },
  { text: "やる前に不安でも、やりながら消える。", author: "龍馬（要旨）" },
  { text: "速さは、迷いの少なさだ。", author: "信長（要旨）" },
  { text: "人は忘れる。仕組みは忘れない。", author: "渋沢（要旨）" },
  { text: "一つの勝ちより、長期の信用を選べ。", author: "渋沢（要旨）" },
  { text: "思考は筋トレ。負荷をかけて太くする。", author: "ニーチェ（要旨）" },
  { text: "知は道具。使って力になる。", author: "フランシス・ベーコン（要旨）" },
  { text: "問題を小さく分ければ、必ず解ける。", author: "ラプラス（要旨）" },
  { text: "美しさは、正しさの手がかりになることがある。", author: "オイラー（要旨）" },
  { text: "方程式は、関係を言葉にする。", author: "マクスウェル（要旨）" },
  { text: "手を動かすと、頭は追いつく。", author: "レオナルド（要旨）" },
];

function getQuotePool(){
  const user = (typeof window !== "undefined" && Array.isArray(window.USER_QUOTES)) ? window.USER_QUOTES : [];
  return [...GREAT_QUOTES, ...user];
}

function hashString(s){
  let h = 0;
  for(let i=0;i<s.length;i++){
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function setQuote(q){
  const qEl = $("quote");
  if(!qEl) return;
  const metaEl = $("quoteMeta");

  if(typeof q === "string"){
    qEl.textContent = q;
    if(metaEl) metaEl.textContent = "";
    return;
  }

  qEl.textContent = (q && q.text) ? q.text : "";
  if(metaEl) metaEl.textContent = (q && q.author) ? `— ${q.author}` : "";
}

function setDailyQuote(){
  const pool = getQuotePool();
  if(!pool.length) return;
  const idx = hashString(todayKey()) % pool.length;
  setQuote(pool[idx]);
}

function setRandomQuote(){
  const pool = getQuotePool();
  if(!pool.length) return;
  const idx = Math.floor(Math.random() * pool.length);
  setQuote(pool[idx]);
}

// ========== omikuji (10 types) ==========
const OMIKUJI_POOL = [
  // 毒舌 8種類：合計 94%
  { rank:"凶", cls:"rank-toxic", w:12,
    msg:"いとよろしくなし。手を出すほど泥沼なり。",
    tips:"戒め：急ぐな。まず一息つけ。／開運：水を飲みて寝よ。" },

  { rank:"大凶", cls:"rank-toxic", w:12,
    msg:"おほかた終はる。されど今日のうちに修正すれば命はある。",
    tips:"戒め：大事な操作は二度三度確かむべし。／開運：バックアップ。" },

  { rank:"末凶", cls:"rank-toxic", w:12,
    msg:"末に崩るる兆し。最初の一手を誤るべからず。",
    tips:"戒め：着手は小さく。／開運：TODOを一つに絞れ。" },

  { rank:"凶相", cls:"rank-toxic", w:12,
    msg:"顔に書かれたり、『まだ準備せず』とな。",
    tips:"戒め：装備（資料・道具）を整へよ。／開運：机を片づけよ。" },

  { rank:"災凶", cls:"rank-toxic", w:12,
    msg:"災ひは外より来たるにあらず。己が油断より起こる。",
    tips:"戒め：見落とし一箇所が致命なり。／開運：チェックリスト。" },

  { rank:"虚凶", cls:"rank-toxic", w:12,
    msg:"中身は空、やる気も空。だが動けば生まるる。",
    tips:"戒め：気分を待つな。／開運：五分だけ始めよ。" },

  { rank:"笑止凶", cls:"rank-toxic", w:11,
    msg:"をかしきほどに運なし。笑ふしかなし。されど笑へ。",
    tips:"戒め：自滅ムーブを慎め。／開運：散歩して戻れ。" },

  { rank:"無慈悲凶", cls:"rank-toxic", w:11,
    msg:"情け容赦なし。今日の世界は君を甘やかさぬ。",
    tips:"戒め：一点突破せよ。／開運：通知を切れ。" },

  // ちょっといい：5%
  { rank:"ちと佳し", cls:"rank-good", w:5,
    msg:"よろし。大勝ちはせずとも、堅実に利あり。",
    tips:"勧め：小さき成功を積め。／開運：早寝早起き、まこと大事。" },

  // 1%：USアルティメット大吉
  { rank:"ウルトラースーパーアルティメット大吉", cls:"rank-ultra", w:1,
    msg:"いみじくよし。天も地も味方せり。今引けば通る。",
    tips:"勧め：やりたきこと、今日のうちに放て。／開運：勢ひのまま提出せよ。" },
];

function showOmikuji(picked){
  const box = $("omikujiBox");
  const rankEl = $("omikujiRank");
  const msgEl = $("omikujiMsg");
  const tipsEl = $("omikujiTips");
  if(!box || !rankEl || !msgEl || !tipsEl) return;

  rankEl.className = "pill rank " + picked.cls;
  rankEl.textContent = "結果： " + picked.rank;
  msgEl.textContent = picked.msg;
  tipsEl.textContent = picked.tips;
  box.style.display = "block";
}

function drawOmikuji(){
  // 1日固定（同日なら同結果）
  const raw = localStorage.getItem("omikuji_today");
  if(raw){
    try{
      const obj = JSON.parse(raw);
      if(obj.date === todayKey()){
        showOmikuji(obj.picked);
        return;
      }
    }catch(e){}
  }
  const picked = weightedPick(OMIKUJI_POOL);
  showOmikuji(picked);
  localStorage.setItem("omikuji_today", JSON.stringify({date: todayKey(), picked}));
}

function resetOmikuji(){
  localStorage.removeItem("omikuji_today");
  const box = $("omikujiBox");
  if(box) box.style.display = "none";
}

function restoreOmikuji(){
  const raw = localStorage.getItem("omikuji_today");
  if(!raw) return;
  try{
    const obj = JSON.parse(raw);
    if(obj.date !== todayKey()) return;
    showOmikuji(obj.picked);
  }catch(e){}
}

// ========== shindan (10 questions -> 50 outcomes) ==========
const TRAITS = [
  { key:"focus",  name:"集中力" },
  { key:"curio",  name:"好奇心" },
  { key:"chaos",  name:"奔放さ" },
  { key:"social", name:"社交性" },
  { key:"guts",   name:"胆力" },
];

const ARCHETYPES = {
  "focus+curio":  { name:"研究室型ストライカー", core:"学ぶ×仕上げる。理解と完成の両方を取りに行く。", strong:["吸収が速い","詰めが効く"], weak:["完璧主義になりがち","やりすぎて疲れる"], quest:["最初の30分で設計→残りで実装","締切48時間前に8割完成"] },
  "focus+chaos":  { name:"締切前ブースター", core:"普段は静か、でも火が付くと加速が異常。", strong:["短時間で爆発力","切り替えが速い"], weak:["ムラが出る","序盤が弱い"], quest:["朝イチに“着手だけ”を固定","タスクを3分割して第一段だけ終える"] },
  "focus+social": { name:"進行管理マスター", core:"人もタスクも回す。地味に最強のタイプ。", strong:["段取りが組める","周囲を動かせる"], weak:["背負い込みがち","断れない"], quest:["頼まれごとに期限を返す","週1で予定を棚卸し"] },
  "focus+guts":   { name:"硬派タンク", core:"やると決めたら折れない。継続の化身。", strong:["耐久力","逃げない"], weak:["柔軟性が落ちる","視野が狭くなる"], quest:["週の最重要1つを死守","無理な日は“軽い代替”を用意"] },

  "curio+chaos":  { name:"アイデア暴発職人", core:"発想が出る速度が異常。整える前に増える。", strong:["発想量","新規性"], weak:["収束が苦手","散らかる"], quest:["“捨てる勇気”をルール化","週1でアイデアを3つだけ残す"] },
  "curio+social": { name:"布教型クリエイター", core:"面白いを見つけて、誰かに伝えて増幅する。", strong:["説明が上手い","人脈が伸びる"], weak:["脱線しやすい","会話で時間が溶ける"], quest:["説明は5分で区切る","共有前に要点3つに圧縮"] },
  "curio+guts":   { name:"未知特攻探索者", core:"未知を怖がらず踏み込む。学習で殴る。", strong:["挑戦力","学習耐性"], weak:["リスク見積りが甘い","突っ込みすぎる"], quest:["最初に“撤退条件”を決める","調査→実験→結論の順に固定"] },

  "chaos+social": { name:"場を荒らすエンタメ王", core:"ノリで世界を動かす。友達ウケ最強枠。", strong:["空気を作る","行動が早い"], weak:["勢いで事故る","飽きやすい"], quest:["勢いで始めて、最後は1回だけ整える","“やること”を紙に書いて見える化"] },
  "chaos+guts":   { name:"破天荒バイカー", core:"怖いものがない。危険と面白さに寄る。", strong:["決断が速い","行動量"], weak:["詰めが甘い","後処理が残る"], quest:["最後の10%を他人に見せてチェック","“確認”を儀式化"] },
  "social+guts":  { name:"前線リーダー", core:"人前でも押し切る。声と胆力で道を作る。", strong:["度胸","巻き込み力"], weak:["強引に見えることがある","疲労が溜まる"], quest:["相手の合意を1回取る","頼む前に自分の条件を言語化"] },
};

function calcTier(total){
  if(total >= 43) return 5;      // S
  if(total >= 35) return 4;      // A
  if(total >= 27) return 3;      // B
  if(total >= 19) return 2;      // C
  return 1;                      // D
}
function tierLabel(t){ return ["D","C","B","A","S"][t-1]; }
function tierFlavor(t){
  const map = {
    1:{ vibe:"低燃費モード", detail:"やる気より環境が大事。仕組みで勝て。", tip:"最初の一歩を“5分”に固定。" },
    2:{ vibe:"安定し始め", detail:"悪くない。伸びる余地が明確。", tip:"毎日1つだけ完了を作る。" },
    3:{ vibe:"標準以上", detail:"普通に強い。運用で化ける。", tip:"週1で振り返って改善。" },
    4:{ vibe:"上振れ常連", detail:"結果が出る側。調子に乗っても勝てる。", tip:"背負いすぎない仕組み化。" },
    5:{ vibe:"最終形態", detail:"強い。勝ち筋を理解して回してる。", tip:"攻めるなら“発信/作品”に寄せろ。" },
  };
  return map[t];
}
function getTop2Traits(traitScore){
  const order = ["focus","curio","social","guts","chaos"];
  const arr = Object.entries(traitScore).map(([k,v])=>({k,v}));
  arr.sort((a,b)=>{
    if(b.v !== a.v) return b.v - a.v;
    return order.indexOf(a.k) - order.indexOf(b.k);
  });
  return [arr[0].k, arr[1].k];
}

// ★ここが致命バグだった：アルファベット順ソートだと ARCHETYPES と噛み合わない
const PAIR_ORDER = { focus:0, curio:1, chaos:2, social:3, guts:4 };
function pairKey(a,b){
  const sorted = [a,b].sort((x,y)=> (PAIR_ORDER[x] ?? 999) - (PAIR_ORDER[y] ?? 999));
  return sorted.join("+");
}

function runShindan(){
  const out = $("shindanOut");
  if(!out) return;

  const answers = [];
  for(let i=1;i<=10;i++){
    const checked = document.querySelector(`input[name="q${i}"]:checked`);
    if(!checked){
      out.innerHTML = `<div class="note">10問すべて選んでから「診断する」を押して。</div>`;
      return;
    }
    answers.push(checked);
  }

  const traitScore = { focus:0, curio:0, chaos:0, social:0, guts:0 };
  let total = 0;
  answers.forEach(inp=>{
    const t = inp.dataset.trait;
    const v = Number(inp.value);
    if(traitScore[t] == null) return;
    traitScore[t] += v;
    total += v;
  });

  const [t1, t2] = getTop2Traits(traitScore);
  const key = pairKey(t1, t2);
  const arche = ARCHETYPES[key] || { name:"謎の存在", core:"分類不能。たぶん面白い。", strong:["未知"], weak:["未知"], quest:["まず寝る"] };

  const tier = calcTier(total);
  const label = tierLabel(tier);
  const flav = tierFlavor(tier);

  function traitBar(v){
    const pct = clamp(Math.round((v/10)*100), 0, 100);
    return `<div class="bar"><i style="width:${pct}%"></i></div>`;
  }

  const traitNames = Object.fromEntries(TRAITS.map(x=>[x.key,x.name]));
  const topPairText = `${traitNames[t1]} × ${traitNames[t2]}`;
  const resultId = `${key.toUpperCase()}-${label}`;

  const shareText =
`診断結果：${arche.name} [${label}]
タイプ：${topPairText}
状態：${flav.vibe}
ひとこと：${arche.core}`;

  out.innerHTML = `
    <div class="card">
      <div class="spread">
        <div>
          <h2>結果：${arche.name} <span class="pill">RANK ${label}</span></h2>
          <p class="muted">タイプ：<b>${topPairText}</b> ／ 状態：<b>${flav.vibe}</b></p>
        </div>
        <div class="btnrow">
          <button onclick="copyResult()">結果をコピー</button>
          <button onclick="scrollToTop()">上へ</button>
        </div>
      </div>

      <p class="muted" style="margin-top:8px">${arche.core}</p>
      <hr class="sep">

      <div class="grid2">
        <div class="card">
          <h2>長所</h2>
          <ul class="list">${arche.strong.map(x=>`<li>${x}</li>`).join("")}</ul>
          <hr class="sep">
          <h2>弱点</h2>
          <ul class="list">${arche.weak.map(x=>`<li>${x}</li>`).join("")}</ul>
        </div>

        <div class="card">
          <h2>今日の運用（おすすめクエスト）</h2>
          <ul class="list">${arche.quest.map(x=>`<li>${x}</li>`).join("")}</ul>
          <hr class="sep">
          <h2>ランク補正：${label}</h2>
          <p class="muted"><b>${flav.detail}</b></p>
          <p class="muted">次の一手：${flav.tip}</p>
        </div>
      </div>

      <hr class="sep">

      <h2>内訳（10問 → 5能力）</h2>
      <div class="rows">
        <div class="row2"><div class="muted">集中力</div>${traitBar(traitScore.focus)}</div>
        <div class="row2"><div class="muted">好奇心</div>${traitBar(traitScore.curio)}</div>
        <div class="row2"><div class="muted">奔放さ</div>${traitBar(traitScore.chaos)}</div>
        <div class="row2"><div class="muted">社交性</div>${traitBar(traitScore.social)}</div>
        <div class="row2"><div class="muted">胆力</div>${traitBar(traitScore.guts)}</div>
      </div>

      <div class="footer">結果ID：${resultId}（全50通りのうちの1つ）</div>
      <textarea id="shareBox" style="position:absolute;left:-9999px;top:-9999px">${shareText}</textarea>
    </div>
  `;

  window.copyResult = async function(){
    const text = $("shareBox")?.value || "";
    try{
      await navigator.clipboard.writeText(text);
      alert("コピーした。友達に貼れ。");
    }catch(e){
      prompt("コピーして使って:", text);
    }
  };
  window.scrollToTop = function(){
    window.scrollTo({top:0, behavior:"smooth"});
  };
}

// ========== site search (全ページ共通) ==========
function initSiteSearch(){
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");
  if(!searchBtn || !searchInput) return;

  // プロフィール(index)は index.html 側で検索が動いてる前提。二重発火を避ける
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if(file === "index.html") return;

  // サイト内の簡易辞書（増やしてOK）
  const siteIndex = [
    { keywords: ["プロフィール", "profile", "tomoponz", "自己紹介"], url: "index.html" },
    { keywords: ["おみくじ", "占い", "運勢", "omikuji", "大吉", "凶"], url: "omikuji.html" },
    { keywords: ["診断", "shindan", "性格", "タイプ"], url: "shindan.html" },
    { keywords: ["ネタ", "ギャラリー", "gallery", "ネタ置き場", "画像"], url: "gallery.html" },
    { keywords: ["リンク", "links"], url: "links.html" },
    { keywords: ["ゲーム", "games"], url: "games.html" },
    { keywords: ["ミニゲーム", "minigames"], url: "minigames.html" },
    { keywords: ["ドア", "door", "ワープ", "warp"], url: "door.html" },
    { keywords: ["八百科事典", "hachi", "百科事典", "事典"], url: "hachi.html" },
    { keywords: ["名言", "meigen", "迷言", "セリフ"], url: "meigen.html" },
    { keywords: ["黒歴史", "kuro", "封印庫", "供養"], url: "kuro.html" },
    { keywords: ["ホラー", "horror", "怖い"], url: "horror.html" },
  ];

  const executeSearch = () => {
    const query = (searchInput.value || "").trim();
    if(!query) return;

    // （必要なら残す / 不要なら消してOK）
    if(query === "kuro-n-tomo"){
      alert("認証完了。裏付けされた記録を開示します。");
      location.href = "deep.html";
      return;
    }

    const lower = query.toLowerCase();
    let found = null;

    for(const page of siteIndex){
      const hit = page.keywords.some(kw=>{
        const k = String(kw).toLowerCase();
        return k.includes(lower) || lower.includes(k);
      });
      if(hit){ found = page.url; break; }
    }

    if(found){
      if(confirm(`「${query}」に関連するページが見つかった。\n移動する？`)){
        location.href = found;
      }
      return;
    }

    // 見つからない場合：Googleサイト内検索に投げる（別タブ）
    if(confirm(`「${query}」は主要ページ辞書に無かった。\nGoogleでサイト内検索する？`)){
      let domain = window.location.hostname;
      if(domain === "localhost" || domain === "127.0.0.1" || domain === ""){
        domain = "tomoponz.github.io";
      }
      const url = `https://www.google.com/search?q=site:${domain}+${encodeURIComponent(query)}`;
      window.open(url, "_blank");
    }
  };

  searchBtn.addEventListener("click", executeSearch);
  searchInput.addEventListener("keypress", (e)=>{
    if(e.key === "Enter") executeSearch();
  });
}

// ========== init ==========
document.addEventListener("DOMContentLoaded", ()=>{
  setActiveNav();
  setDailyQuote();
  restoreOmikuji();
  initSiteSearch(); // ★追加：プロフィール以外でも検索バーを動かす
});
