// app.js
// 目的：共通UI（ナビ/今日の一言/おみくじ/診断/サイト内検索）
// - 今日の一言：偉人(author)要素を撤去（アニメ名言側だけ使う想定）
// - サイト内検索：黒歴史(kuro/黒歴史)はヒットさせない
// - 変数 $ の衝突を避けるため、全体を IIFE で包む（kuro.js等と共存）

(() => {
  "use strict";

  // ========= Shell / Embedded =========
  const __QS = new URLSearchParams(location.search);
  const __IS_EMBED = (__QS.get("embed") === "1") || (window.self !== window.top);
  const __NO_SHELL = (__QS.get("noshell") === "1");
  const __FILE_LC = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const __IS_SHELL = (__FILE_LC === "shell.html");
  const __IS_404 = (__FILE_LC === "404.html");

  // ページ遷移でSEが途切れる問題の回避：通常アクセスは shell.html に集約
  // （noshell=1 を付ければ従来挙動）
  if(!__IS_EMBED && !__IS_SHELL && !__IS_404 && !__NO_SHELL){
    const p = encodeURIComponent((location.pathname.split("/").pop() || "index.html") + location.search + location.hash);
    location.replace("shell.html?p=" + p);
    return;
  }


  // embed(iframe) のときは iframe 側のヘッダ/ナビを隠す（shell側だけ残す）
  try{ if(__IS_EMBED) document.documentElement.classList.add("embedded"); }catch(_){ }

  // dev=1 のときだけ開発メモを表示
  try{ if(__QS.get("dev") === "1") document.documentElement.classList.add("dev"); }catch(_){ }

  // 既定は immersive OFF（効果中だけONにする）
  if(__IS_EMBED){
    try{ window.parent && window.parent.postMessage({type:"IMMERSION", active:false}, location.origin); }catch(_){
      try{ window.parent && window.parent.postMessage({type:"IMMERSION", active:false}, "*"); }catch(__){}
    }
  }


  // ========== security-lite (deterrence only) ==========
  // 静的サイトでは本当の意味で「ソースを隠す」ことはできない。
  // これは Ctrl+U/F12 等を“軽く”妨害し、target=_blank を noopener で安全化するだけ。
  try {
    if (typeof window !== "undefined" && !window.__securityLiteInjected) {
      window.__securityLiteInjected = true;
      const sc = document.createElement("script");
      sc.src = "assets/js/security-lite.js?v=20260222";
      sc.defer = true;
      document.head.appendChild(sc);
    }
  } catch (_) {}

  // ========== utilities ==========
  const $id = (id) => document.getElementById(id);

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function weightedPick(pool) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const item of pool) {
      r -= item.w;
      if (r <= 0) return item;
    }
    return pool[0];
  }
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  // ========== NAV (統一) ==========
  function setActiveNav() {
    let file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    // shell.html は ?p= で中身が変わるので、そのファイル名でアクティブ判定
    if(file === "shell.html"){
      const p = new URLSearchParams(location.search).get("p");
      if(p){
        try{
          const decoded = decodeURIComponent(p);
          file = (decoded.split(/[?#]/)[0].split("/").pop() || "index.html").toLowerCase();
        }catch(_){}
      }
    }
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
      "404.html": "迷ひ道",
    };

    // brandSub があるページも、<small>だけのページも両対応
    const sub = document.getElementById("brandSub") || document.querySelector(".brand small");
    if (sub) sub.textContent = labelMap[file] || "";

    document.querySelectorAll(".navlinks a.chip").forEach((a) => {
      a.classList.remove("active");
      const href = (a.getAttribute("href") || "").toLowerCase();

      const isActive =
        href === file ||
        // warp.html は「ドア」扱いでアクティブにしたい
        (file === "warp.html" && href === "door.html") ||
        // minigames は nav に直リンクが無いので「ゲーム」をアクティブにする
        (file === "minigames.html" && href === "games.html");

      if (isActive) a.classList.add("active");
    });
  }

  // 外部（shell.js）から呼べるように
  window.setActiveNav = setActiveNav;


  // ========== quote（今日の一言：偉人(author)撤去） ==========
  // 使うのは「ベース（quotes_base.js）」＋「追加（user_quotes.js）」のみ
  // ※偉人名言枠は廃止
  function getQuotePool() {
    const base = (typeof window !== "undefined" && Array.isArray(window.BASE_QUOTES)) ? window.BASE_QUOTES : [];
    const user = (typeof window !== "undefined" && Array.isArray(window.USER_QUOTES)) ? window.USER_QUOTES : [];
    return [...base, ...user];
  }

  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  // author/偉人名は出さない（quoteMeta があっても消す）
  function setQuote(q) {
    const qEl = $id("quote");
    if (!qEl) return;

    const metaEl = $id("quoteMeta");
    if (metaEl) metaEl.textContent = "";

    if (typeof q === "string") {
      qEl.textContent = q;
      return;
    }
    // USER_QUOTES が {text, author} 形式でも text だけ拾う
    qEl.textContent = (q && q.text) ? q.text : "";
  }

  function setDailyQuote() {
    const pool = getQuotePool();
    if (!pool.length) return;
    const idx = hashString(todayKey()) % pool.length;
    setQuote(pool[idx]);
  }

  function setRandomQuote() {
    const pool = getQuotePool();
    if (!pool.length) return;
    const idx = Math.floor(Math.random() * pool.length);
    setQuote(pool[idx]);
  }
  // ボタン等から呼ぶ可能性があるので公開
  window.setRandomQuote = setRandomQuote;
  // ========== omikuji (21 types) ==========
  // 重みは 10000 基準（= 0.01% 単位）
  const OMIKUJI_POOL = [
    // 毒舌 18種類：合計 93.99%
    { rank: "凶", cls: "rank-toxic", w: 523, msgs: ["いとよろしくなし。手を出すほど泥沼なり。", "手順を飛ばして事故る日。深呼吸して戻れ。", "今日は“雑に進める”ほど損する。丁寧に。"], tipsList: ["戒め：急ぐな。まず一息つけ。", "開運：水を飲みて寝よ。", "保険：バックアップを取れ。"] },
    { rank: "大凶", cls: "rank-toxic", w: 523, msgs: ["おほかた終はる。されど今日のうちに修正すれば命はある。", "破滅の気配。だが“撤退”は最強の勝ち筋。", "今やると燃える。やるなら小さく。"], tipsList: ["戒め：大事な操作は二度三度確かむべし。", "開運：バックアップ。", "勧め：やる前にメモを取れ。"] },
    { rank: "末凶", cls: "rank-toxic", w: 523, msgs: ["末に崩るる兆し。最初の一手を誤るべからず。", "序盤の雑さが終盤に利子つけて返る。", "今は攻めより整備。"], tipsList: ["戒め：着手は小さく。", "開運：TODOを一つに絞れ。", "勧め：最初の10分で設計。"] },
    { rank: "凶相", cls: "rank-toxic", w: 522, msgs: ["顔に書かれたり、『まだ準備せず』とな。", "装備不足。気合いより道具。", "資料を開かぬまま突撃するな。"], tipsList: ["戒め：装備（資料・道具）を整へよ。", "開運：机を片づけよ。", "勧め：環境を整えたら勝ち。"] },
    { rank: "災凶", cls: "rank-toxic", w: 522, msgs: ["災ひは外より来たるにあらず。己が油断より起こる。", "確認不足が刺さる日。指差し確認。", "“たぶん”は敵。"], tipsList: ["戒め：見落とし一箇所が致命なり。", "開運：チェックリスト。", "勧め：保存→確認→提出。"] },
    { rank: "虚凶", cls: "rank-toxic", w: 522, msgs: ["中身は空、やる気も空。だが動けば生まるる。", "考えすぎて手が止まる。まず動け。", "やる気待ちは一生来ない。"], tipsList: ["戒め：気分を待つな。", "開運：五分だけ始めよ。", "勧め：開始＝勝ち。"] },
    { rank: "笑止凶", cls: "rank-toxic", w: 522, msgs: ["をかしきほどに運なし。笑ふしかなし。されど笑へ。", "ミスが重なる日。笑って切り替えろ。", "うまく行かないほどネタになる。"], tipsList: ["戒め：自滅ムーブを慎め。", "開運：散歩して戻れ。", "勧め：一回リセット。"] },
    { rank: "無慈悲凶", cls: "rank-toxic", w: 522, msgs: ["情け容赦なし。今日の世界は君を甘やかさぬ。", "現実が殴ってくる。殴り返せ。", "妥協が裏目。一本通せ。"], tipsList: ["戒め：一点突破せよ。", "開運：通知を切れ。", "勧め：やることを1つに。"] },
    { rank: "怠惰凶", cls: "rank-toxic", w: 522, msgs: ["怠け癖が牙をむく日。ベッドが最強の敵。", "やる気が消える。だからルールで動け。", "「あとで」が全部殺す。"], tipsList: ["戒め：最初の5分を固定せよ。", "開運：タイマーを回せ。", "勧め：起動だけしろ。"] },
    { rank: "散財凶", cls: "rank-toxic", w: 522, msgs: ["財布が軽くなる兆し。衝動買い、厳禁。", "課金の誘惑が強い。耐えろ。", "“ついで購入”が刺さる。"], tipsList: ["戒め：買う前に24分待て。", "開運：家計簿アプリ。", "勧め：水と米を買え。"] },
    { rank: "寝不足凶", cls: "rank-toxic", w: 522, msgs: ["眠り足らずして判断が鈍る。今日は攻めるな。", "集中が切れる。短距離戦にせよ。", "睡眠をケチると全部負ける。"], tipsList: ["戒め：夜更かし厳禁。", "開運：昼に10分仮眠。", "勧め：やるなら第2位まで。"] },
    { rank: "通信凶", cls: "rank-toxic", w: 522, msgs: ["電波も心も途切れがち。送信前に保存せよ。", "アップロードが落ちる日。余裕を持て。", "回線が裏切る。オフラインで進め。"], tipsList: ["戒め：提出は早めに。", "開運：ローカル保存。", "勧め：二重化。"] },
    { rank: "バグ凶", cls: "rank-toxic", w: 522, msgs: ["バグは君を愛してゐる。今日も寄ってくる。", "動いたと思ったら気のせい。", "直したら別が壊れる。"], tipsList: ["戒め：差分を小さく。", "開運：console/log。", "勧め：1つずつ検証。"] },
    { rank: "連絡凶", cls: "rank-toxic", w: 522, msgs: ["連絡が遅れるほど面倒が増える。今返せ。", "未読の山が崩れる。", "返信一通が今日の勝敗を決める。"], tipsList: ["戒め：短く返せ。", "開運：テンプレ。", "勧め：先に謝る。"] },
    { rank: "締切凶", cls: "rank-toxic", w: 522, msgs: ["締切が背後に立つ。感じろ、その気配。", "48時間を切ると世界が燃える。", "先延ばしが終わる。今日が始まり。"], tipsList: ["戒め：今すぐ着手。", "開運：区切って提出。", "勧め：8割で一回出す。"] },
    { rank: "暴走凶", cls: "rank-toxic", w: 522, msgs: ["勢いで押すボタンほど危ない。", "ノリで決めると死ぬ。", "落ち着け。勢いは後で使え。"], tipsList: ["戒め：確認してから押せ。", "開運：一呼吸。", "勧め：慎重に一手。"] },
    { rank: "孤独凶", cls: "rank-toxic", w: 522, msgs: ["一人で抱えるほど重くなる。頼れ。", "黙って詰むより、聞いて進め。", "孤軍奮闘は美談だが、効率は悪い。"], tipsList: ["戒め：質問を作れ。", "開運：誰かに一言。", "勧め：助けを借りろ。"] },
    { rank: "迷走凶", cls: "rank-toxic", w: 522, msgs: ["迷う時間が最も無駄。選べ。", "ルートが多すぎる。削れ。", "悩むなら小さく試せ。"], tipsList: ["戒め：選択肢を2つに。", "開運：試作。", "勧め：決めて進む。"] },

    // ちょっといい：5%
    { rank: "ちと佳し", cls: "rank-good", w: 500, msgs: ["よろし。大勝ちはせずとも、堅実に利あり。", "運は地味に味方せり。小さく積めば勝つ。", "今日は“整え”が効く。仕上げるほど良し。"], tipsList: ["勧め：小さき成功を積め。", "開運：早寝早起き、まこと大事。", "保険：提出は前倒し。"] },

    // ???（1%）
    { rank: "ウルトラースーパーアルティメット大吉", cls: "rank-ultra", w: 100, msgs: ["いみじくよし。天も地も味方せり。今引けば通る。", "奇跡の追い風。今日は攻めて勝て。", "やること全部、通る日。勢いを信じよ。"], tipsList: ["勧め：やりたきこと、今日のうちに放て。", "開運：勢ひのまま提出せよ。", "保険：一撃で決める。"] },

    // ???（0.01%）
    { rank: "凶とか大吉とか、そんなことはどうでもよくて、今世は無敵です。", cls: "rank-ultra", w: 1, msgs: ["理不尽さすら踏み台にするモードに入った。今の君は“強制クリア”のターン。", "今日だけは世界がバグって君を通す。遠慮なく通れ。", "無敵。問題が問題にならない。やれ。"], tipsList: ["勧め：怖い所へ一歩。", "開運：やるべき一撃を今日放て（提出・連絡・着手）。", "保険：自分の勝ち筋に乗れ。"] },
  ];



function pickOne(v){
  if(Array.isArray(v) && v.length) return v[Math.floor(Math.random()*v.length)];
  return v;
}

function resolveOmikujiItem(item){
  // store resolved msg/tips so daily result is stable
  const msg = pickOne(item.msgs || item.msg);
  const tips = pickOne(item.tipsList || item.tips);
  return { ...item, msg, tips };
}

  function showOmikuji(picked) {
    const box = $id("omikujiBox");
    const rankEl = $id("omikujiRank");
    const msgEl = $id("omikujiMsg");
    const tipsEl = $id("omikujiTips");
    if (!box || !rankEl || !msgEl || !tipsEl) return;

    rankEl.className = "pill rank " + picked.cls;
    rankEl.textContent = "結果： " + picked.rank;
    msgEl.textContent = picked.msg;
    tipsEl.textContent = picked.tips;
    box.style.display = "block";
  }

  function drawOmikuji() {
    // 1日固定（同日なら同結果）
    const raw = localStorage.getItem("omikuji_today");
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj.date === todayKey()) {
          showOmikuji(obj.picked);
          if(window.playSfx) playSfx("omikujiResult", 1.0, {boost: 2.6});
          return;
        }
      } catch (e) {}
    }
    const pickedRaw = weightedPick(OMIKUJI_POOL);
    const picked = resolveOmikujiItem(pickedRaw);
    showOmikuji(picked);
    if(window.playSfx) playSfx("omikujiResult", 1.0, {boost: 2.6});
    localStorage.setItem("omikuji_today", JSON.stringify({ date: todayKey(), picked }));
  }

  function resetOmikuji() {
    localStorage.removeItem("omikuji_today");
    const box = $id("omikujiBox");
    if (box) box.style.display = "none";
  }

  function restoreOmikuji() {
    const raw = localStorage.getItem("omikuji_today");
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      if (obj.date !== todayKey()) return;
      const p = obj.picked;
      if(p && (p.msg == null || p.tips == null) && (p.msgs || p.tipsList)){
        const resolved = resolveOmikujiItem(p);
        obj.picked = resolved;
        try{ localStorage.setItem("omikuji_today", JSON.stringify(obj)); }catch(e){}
        showOmikuji(resolved);
      } else {
        showOmikuji(p);
      }
    } catch (e) {}
  }

  // HTMLの onclick から呼べるように公開
  window.drawOmikuji = drawOmikuji;
  window.resetOmikuji = resetOmikuji;

  // ========== shindan (10 questions -> 50 outcomes) ==========
  const TRAITS = [
    { key: "focus", name: "集中力" },
    { key: "curio", name: "好奇心" },
    { key: "chaos", name: "奔放さ" },
    { key: "social", name: "社交性" },
    { key: "guts", name: "胆力" },
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

  const PAIR_ORDER = { focus:0, curio:1, chaos:2, social:3, guts:4 };
  function pairKey(a,b){
    const sorted = [a,b].sort((x,y)=> (PAIR_ORDER[x] ?? 999) - (PAIR_ORDER[y] ?? 999));
    return sorted.join("+");
  }

  function runShindan(){
    const out = $id("shindanOut");
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
      const text = $id("shareBox")?.value || "";
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

  // HTMLの onclick から呼べるように公開
  window.runShindan = runShindan;

  // ========== site search (全ページ共通) ==========
  function initSiteSearch(){
    const searchBtn = document.getElementById("searchBtn");
    const searchInput = document.getElementById("searchInput");
    if(!searchBtn || !searchInput) return;

    // プロフィール(index)は index.html 側で検索が動いてる前提。二重発火を避ける
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if(file === "index.html") return;

    // data-search-mode="page" が付いている場合は「ページ内検索」専用なので、共通サイト内検索は付けない
    const searchMode = String(searchInput.dataset.searchMode || searchBtn.dataset.searchMode || "").toLowerCase();
    if(searchMode === "page") return;

    // サイト内の簡易辞書（増やしてOK）
    // ★黒歴史は入れない（ヒットさせない）
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
    ];

    const executeSearch = () => {
      const query = (searchInput.value || "").trim();
      if(!query) return;

      // 裏コマンド（必要なら残す）
      if(query === "kuro-n-tomo"){
        alert("認証完了。裏付けされた記録を開示します。");
        location.href = "deep.html";
        return;
      }

      // ★黒歴史ワードは検索対象外（ヒットさせない＆Google検索にも投げない）
      const blocked = /黒歴史|kuro/i;
      if(blocked.test(query)){
        alert("そのキーワードは検索対象外。");
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
        // ★黒歴史/裏ページはサイト内検索に出さない（通常ワード検索時の漏れ防止）
        const exclude = " -inurl:kuro -inurl:deep";
        const q = query + exclude;
        const url = `https://www.google.com/search?q=site:${domain}+${encodeURIComponent(q)}`;
        window.open(url, "_blank");
      }
    };

    searchBtn.addEventListener("click", executeSearch);
    searchInput.addEventListener("keydown", (e)=>{
      if(e.key === "Enter") executeSearch();
    });
  }

    // ========== sfx: クリック音（汎用） ==========
  // ✅おすすめ：音声は  assets/sfx/  にまとめる（例: assets/sfx/umahii.mp3）
  // ただし「今すぐ動かしたい」場合は、現状どおりサイト直下に置いてもOK。
  //
  // 使い方（HTML）：
  //   <button data-sfx="neta">押す</button>
  //   <a href="gallery.html" data-sfx="neta" data-sfx-delay="380">ネタ置き場</a>
  //   <button data-sfx="click1" data-sfx-volume="0.6">OK</button>
  //
  // data-sfx には「キー」または「ファイルパス」を入れられる：
  //   data-sfx="neta"  → 下の SFX_MAP を参照
  //   data-sfx="assets/sfx/umahii.mp3" → そのまま再生

  // ここに音を追加（キー→ファイル）
  // ※フォルダ運用にしたら、値を assets/sfx/... に変えるだけ
    const SFX_MAP = {
    // クリック/遷移
    neta: "/assets/sfx/nc170231_nnnn,nanikore.wav",
    profile: "/assets/sfx/nc316178_naniwositennnou.mp3",
    hachi: "/assets/sfx/nc245505_deeeeeeeeenn.mp3",
    shindan: "/assets/sfx/nc170234_honntokanaa.wav",

    links: "/assets/sfx/nc93329_xfairu.wav",
    games: "/assets/sfx/nc108262_RSEonngennbann_hosinoka-bixi_gekitotugurumere-su.mp3",

    // おみくじ
    omikujiResult: "/assets/sfx/nc64483_detaxa.wav",

    // ミニゲーム
    msBoom: "/assets/sfx/nc288712_kannkyouhakaihakimotiizoi(BGM delete).mp3",
    g2048Stuck: "/assets/sfx/nc38022_warattehaikenai【dede-nn】koukaonn.mp3",

    // 隠し/演出
    doorWarp: "/assets/sfx/nc126285_doragonnbo-ru_syunnkannidounokoukaonn.wav",
    konamiKuro: "/assets/sfx/nc453817_kissyo,nanndewakarunndayo(GetouSuguru).wav",
    sealUnlock: "/assets/sfx/nc62053_yaroubuxtukorositeyaruxu.wav",
    nigasanai: "/assets/sfx/nigasanai.wav",
    yarimasunee: "/assets/sfx/nc116455_yarimasunee.wav",

    // Aero
    aeroPlay: "/assets/sfx/nc28445_yaranaika_【SE】koukaonn.wma",
    aeroTrack: "/assets/sfx/nc123011_uiiissudo-mosyamude-su.mp3",

    // 既存
    osuna: "/assets/sfx/nanikore.wav",
  };

  // 既存仕様：ネタ置き場(gallery.html)は、data-sfx を付けてなくても鳴らす
  const GALLERY_AUTO_SFX_KEY = "neta";
  const GALLERY_AUTO_DELAY_MS = 380;


  // Quiet SFX boost (WebAudio GainNode). Works even if fps-player.js is not loaded.
  // Usage: window.__boostAudio(audioEl, 2.8)
  if(!window.__boostAudio){
    let __boostCtx = null;
    const __boosted = new WeakMap();
    function __getBoostCtx(){
      if(__boostCtx) return __boostCtx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      try{ __boostCtx = new AC(); }catch(_){ return null; }
      const resume = ()=>{ try{ __boostCtx.resume().catch(()=>{}); }catch(_){} };
      document.addEventListener("pointerdown", resume, {once:true, capture:true});
      document.addEventListener("touchstart", resume, {once:true, capture:true, passive:true});
      return __boostCtx;
    }
    window.__boostAudio = function(audioEl, gainValue){
      if(!audioEl) return false;
      const ctx = __getBoostCtx();
      if(!ctx) return false;
      const g = Math.max(1, Number(gainValue) || 1);
      if(__boosted.has(audioEl)){
        try{ __boosted.get(audioEl).gain.gain.value = g; }catch(_){}
        return true;
      }
      try{
        const src = ctx.createMediaElementSource(audioEl);
        const gain = ctx.createGain();
        gain.gain.value = g;
        src.connect(gain).connect(ctx.destination);
        __boosted.set(audioEl, {src, gain});
        return true;
      }catch(_){ return false; }
    };
  }
  // 事前ロード（同じ音は使い回し）
  const sfxCache = new Map();

  // ========== audio master toggle ==========
  const AUDIO_ENABLED_KEY = "audio_enabled";

  function getAudioEnabled(){
    try{ return localStorage.getItem(AUDIO_ENABLED_KEY) !== "0"; }catch(_){ return true; }
  }

  function applyAudioEnabled(on){
    try{ document.documentElement.classList.toggle("audioOff", !on); }catch(_){ }

    // pause/mute in-page audio tags
    try{
      document.querySelectorAll("audio").forEach(a=>{
        try{ a.muted = !on; if(!on) a.pause(); }catch(_){ }
      });
    }catch(_){ }

    // stop cached SFX
    try{
      for(const a of sfxCache.values()){
        try{ a.muted = !on; if(!on){ a.pause(); a.currentTime = 0; } }catch(_){ }
      }
    }catch(_){ }

    // update toggle button (shell only)
    const btn = document.getElementById("audioToggle");
    if(btn){
      btn.textContent = on ? "音声：ON" : "音声：OFF";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("active", on);
    }
  }

  function setAudioEnabled(on){
    const v = on ? "1" : "0";
    try{ localStorage.setItem(AUDIO_ENABLED_KEY, v); }catch(_){ }
    applyAudioEnabled(on);
  }

  window.getAudioEnabled = getAudioEnabled;
  window.setAudioEnabled = setAudioEnabled;

  function initAudioToggle(){
    const btn = document.getElementById("audioToggle");
    if(!btn) return;

    // initial state
    applyAudioEnabled(getAudioEnabled());

    btn.addEventListener("click", ()=>{
      const next = !getAudioEnabled();
      setAudioEnabled(next);
      // iframeにも即反映（storageイベントが効かないブラウザ対策）
      try{
        const f = document.getElementById("viewFrame");
        if(f && f.contentWindow){
          f.contentWindow.postMessage({type:"AUDIO", enabled: next}, location.origin);
        }
      }catch(_){ }
    });
  }
 // src -> HTMLAudioElement

  function resolveSfxSrc(keyOrPath){
    const s = (keyOrPath || "").trim();
    if(!s) return "";
    // パスっぽい/拡張子があるなら、そのまま使う
    if(s.includes("/") || /\.(mp3|wav|ogg)$/i.test(s)) return s;
    return SFX_MAP[s] || "";
  }

  function getAudio(src){
    if(!src) return null;
    // スペース等を含むパスでも確実に読めるように URL エンコード（%20 などは二重化しない）
    const safeSrc = encodeURI(src);
    if(sfxCache.has(safeSrc)) return sfxCache.get(safeSrc);
    try{
      const a = new Audio(safeSrc);
      a.preload = "auto";
      a.volume = 0.95;
      try{ a.load(); }catch(e){}
      sfxCache.set(safeSrc, a);
      return a;
    }catch(e){
      return null;
    }
  }

  function preloadSfx(keyOrPath){
    const src = resolveSfxSrc(keyOrPath);
    if(!src) return;
    const a = getAudio(src);
    if(!a) return;
    try{ a.load(); }catch(e){}
  }
  window.preloadSfx = preloadSfx;

  function playSfx(keyOrPath, volume, opts){
    try{ if(typeof getAudioEnabled === "function" && !getAudioEnabled()) return; }catch(_){ }
    // embed(iframe) 内なら親(shell)で鳴らす（ページ切替でもSEが途切れない）
    // ※親側（shell.html）は __IS_EMBED=false なのでループしない
    if(__IS_EMBED){
      const k = String(keyOrPath || "").trim();
      if(k){
        const payload = { type:"SFX", key:k };
        if(typeof volume === "number" && isFinite(volume)) payload.volume = volume;
        if(opts && typeof opts === "object") payload.opts = opts;
        try{ window.parent && window.parent.postMessage(payload, location.origin); return; }catch(_){ }
        try{ window.parent && window.parent.postMessage(payload, "*"); return; }catch(_){ }
      }
      // postMessage が失敗した場合のみ、ローカルで鳴らす
    }

    const src = resolveSfxSrc(keyOrPath);
    if(!src) return;
    const a = getAudio(src);
    if(!a) return;

    const o = (opts && typeof opts === "object") ? opts : {};
    const boost = Number(o.boost || 1);

    try{
      if(boost > 1 && window.__boostAudio){
        try{ window.__boostAudio(a, boost); }catch(e){}
      }

      const v =
        (typeof volume === "number" && isFinite(volume)) ? volume :
        (typeof o.volume === "number" && isFinite(o.volume)) ? o.volume :
        undefined;
      if(v != null) a.volume = clamp(v, 0, 1);

      a.currentTime = 0;
      a.play().catch(()=>{});
    }catch(e){}
  }

  // 外からも呼べるように（任意）
  window.playSfx = playSfx;

  function initSfxClicks(){
    // 一部ブラウザで「最初のユーザー操作」以降でないと音が鳴らないので、
    // ここは click をトリガにする（OK）
    document.addEventListener("click", (e)=>{
      const any = e.target && e.target.closest ? e.target.closest("[data-sfx],a[href]") : null;
      if(!any) return;

      const a = (e.target && e.target.closest) ? e.target.closest("a[href]") : null;
      const isLink = !!(a && a.getAttribute("href"));

      // data-sfx があればそれを優先（リンク内の子要素でも拾う）
      let key = "";
      try{ key = (any.getAttribute && any.getAttribute("data-sfx")) ? (any.getAttribute("data-sfx")||"") : ""; }catch(_){}
      if(!key && a){
        try{ key = (a.getAttribute("data-sfx") || ""); }catch(_){}
      }

      // data-sfx が無くても「ネタ置き場リンク」等なら自動で鳴らす（旧仕様互換）
      let autoDelay = 0;
      if(!key && isLink){
        let dest = "";
        try{
          const u = new URL(a.getAttribute("href"), location.href);
          dest = (u.pathname.split("/").pop() || "").toLowerCase();
        }catch{
          dest = (a.getAttribute("href") || "").toLowerCase();
        }
        dest = dest.replace(/^[.\/]+/, "").split(/[?#]/)[0];
        if(dest === "gallery.html"){
          key = GALLERY_AUTO_SFX_KEY;
          autoDelay = GALLERY_AUTO_DELAY_MS;
        } else if(dest === "index.html" && (a.textContent || "").includes("プロフィール")){
          key = "profile";
          autoDelay = 180;
        } else if(dest === "hachi.html"){
          key = "hachi";
          autoDelay = 180;
        } else if(dest === "shindan.html"){
          key = "shindan";
          autoDelay = 180;
        } else if(dest === "games.html"){
          key = "games";
          autoDelay = 180;
        } else if(dest === "links.html"){
          key = "links";
          autoDelay = 180;
        }
      }

      // ========= embed(iframe) モード：親(shell)へ委譲 =========
      if(__IS_EMBED){
        // iframe内の遷移は shell 側でやる（SEを途切れさせない＆URL同期）
        if(isLink && a){
          const hrefRaw = a.getAttribute("href") || "";
          if(hrefRaw.startsWith("#")) return;

          // 修飾キー/別タブは尊重
          if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          if(a.target && a.target.toLowerCase() !== "_self") return;

          let u;
          try{ u = new URL(hrefRaw, location.href); }catch(_){ return; }
          if(u.origin !== location.origin) return;

          e.preventDefault();
          try{
            window.parent && window.parent.postMessage({type:"NAV", href:u.href, key:key||""}, location.origin);
          }catch(_){
            try{ window.parent && window.parent.postMessage({type:"NAV", href:u.href, key:key||""}, "*"); }catch(__){}
          }
          return;
        }

        // リンクじゃないクリックSEは親に鳴らしてもらう
        if(key){
          try{
            window.parent && window.parent.postMessage({type:"SFX", key:key}, location.origin);
          }catch(_){
            try{ window.parent && window.parent.postMessage({type:"SFX", key:key}, "*"); }catch(__){}
          }
        }
        return;
      }

      // ========= 通常モード =========
      if(!key) return; // 音指定が無いなら何もしない

      // 音を鳴らす
      const volAttr = any.getAttribute ? any.getAttribute("data-sfx-volume") : null;
      const vol = volAttr != null ? Number(volAttr) : undefined;
      playSfx(key, (typeof vol === "number" && isFinite(vol)) ? vol : undefined);

      // shell.html では shell.js が iframe 遷移を担当するため、
      // ここで location.href への遷移予約（delay遷移）をしない（※二重読み込み/挙動崩れ防止）
      if(__IS_SHELL){
        // shell.js がすでに処理しているなら二重実行しない
        if(e.defaultPrevented) return;

        // shell.js が居るなら即 iframe 遷移（音は親に残るので待たない）
        if(typeof window.__shellSetFrame === "function" && isLink && a){
          // 修飾キー/別タブ/target は尊重（音だけ鳴らして通常動作）
          if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          if(a.target && a.target.toLowerCase() !== "_self") return;
          let u;
          try{ u = new URL(a.getAttribute("href"), location.href); }catch(_){ return; }
          if(u.origin !== location.origin) return;

          e.preventDefault();
          try{ e.stopImmediatePropagation(); }catch(_){ }
          window.__shellSetFrame(u.href, true);
          return;
        }
        // shell.js が無い/壊れている場合は通常遷移（delayなし）
        return;
      }

      // すでに他のハンドラ（shell.js等）が preventDefault 済みなら、ここでは遷移予約しない
      if(e.defaultPrevented) return;

      // 遷移遅延：リンクだけ
      if(!isLink || !a) return;

      const delayAttr = a.getAttribute("data-sfx-delay");
      const delay = clamp(
        parseInt((delayAttr != null ? delayAttr : autoDelay) || 0, 10) || 0,
        0, 4000
      );

      // すでに同ページなら遷移しない（音だけ）
      const hrefAbs = a.href;
      const current = (location.href || "");
      if(hrefAbs === current){
        if(delay > 0) e.preventDefault();
        return;
      }

      // 修飾キー/別タブ/target は尊重（音だけ鳴らして通常動作）
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if(a.target && a.target.toLowerCase() !== "_self") return;
      if(delay <= 0) return;

      // 同一タブ遷移だけ少し遅らせる
      e.preventDefault();
      setTimeout(()=>{ location.href = hrefAbs; }, delay);
    }, true);
  }


// ========== init ==========
  document.addEventListener("DOMContentLoaded", ()=>{
    setActiveNav();
    setDailyQuote();   // USER_QUOTES があるならそれだけで回る
    restoreOmikuji();
    initSiteSearch();
    initSfxClicks();
  });


  // ========= audio init =========
  try{ applyAudioEnabled(getAudioEnabled()); }catch(_){ }
  try{ initAudioToggle(); }catch(_){ }

  // iframe: parentからの即時反映
  window.addEventListener("message", (ev)=>{
    const d = ev.data || {};
    if(!d || typeof d !== "object") return;
    if(d.type === "AUDIO"){
      try{ applyAudioEnabled(!!d.enabled); }catch(_){ }
    }
  });

  // 別コンテキストで切り替えた時も反映（shell ⇄ iframe）
  window.addEventListener("storage", (e)=>{
    if(e && e.key === AUDIO_ENABLED_KEY){
      try{ applyAudioEnabled(getAudioEnabled()); }catch(_){ }
    }
  });

})();
