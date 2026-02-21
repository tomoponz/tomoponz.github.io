// app.js
// 目的：共通UI（ナビ/今日の一言/おみくじ/診断/サイト内検索）
// - 今日の一言：偉人(author)要素を撤去（アニメ名言側だけ使う想定）
// - サイト内検索：黒歴史(kuro/黒歴史)はヒットさせない
// - 変数 $ の衝突を避けるため、全体を IIFE で包む（kuro.js等と共存）

(() => {
  "use strict";

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

  // ========== omikuji (10 types) ==========
  const OMIKUJI_POOL = [
    // 毒舌 8種類：合計 94%
    { rank: "凶", cls: "rank-toxic", w: 12, msg: "いとよろしくなし。手を出すほど泥沼なり。", tips: "戒め：急ぐな。まず一息つけ。／開運：水を飲みて寝よ。" },
    { rank: "大凶", cls: "rank-toxic", w: 12, msg: "おほかた終はる。されど今日のうちに修正すれば命はある。", tips: "戒め：大事な操作は二度三度確かむべし。／開運：バックアップ。" },
    { rank: "末凶", cls: "rank-toxic", w: 12, msg: "末に崩るる兆し。最初の一手を誤るべからず。", tips: "戒め：着手は小さく。／開運：TODOを一つに絞れ。" },
    { rank: "凶相", cls: "rank-toxic", w: 12, msg: "顔に書かれたり、『まだ準備せず』とな。", tips: "戒め：装備（資料・道具）を整へよ。／開運：机を片づけよ。" },
    { rank: "災凶", cls: "rank-toxic", w: 12, msg: "災ひは外より来たるにあらず。己が油断より起こる。", tips: "戒め：見落とし一箇所が致命なり。／開運：チェックリスト。" },
    { rank: "虚凶", cls: "rank-toxic", w: 12, msg: "中身は空、やる気も空。だが動けば生まるる。", tips: "戒め：気分を待つな。／開運：五分だけ始めよ。" },
    { rank: "笑止凶", cls: "rank-toxic", w: 11, msg: "をかしきほどに運なし。笑ふしかなし。されど笑へ。", tips: "戒め：自滅ムーブを慎め。／開運：散歩して戻れ。" },
    { rank: "無慈悲凶", cls: "rank-toxic", w: 11, msg: "情け容赦なし。今日の世界は君を甘やかさぬ。", tips: "戒め：一点突破せよ。／開運：通知を切れ。" },

    // ちょっといい：5%
    { rank: "ちと佳し", cls: "rank-good", w: 5, msg: "よろし。大勝ちはせずとも、堅実に利あり。", tips: "勧め：小さき成功を積め。／開運：早寝早起き、まこと大事。" },

    // 1%：USアルティメット大吉
    { rank: "ウルトラースーパーアルティメット大吉", cls: "rank-ultra", w: 1, msg: "いみじくよし。天も地も味方せり。今引けば通る。", tips: "勧め：やりたきこと、今日のうちに放て。／開運：勢ひのまま提出せよ。" },
  ];

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
          return;
        }
      } catch (e) {}
    }
    const picked = weightedPick(OMIKUJI_POOL);
    showOmikuji(picked);
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
      showOmikuji(obj.picked);
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
    // 音源（assets/sfx/ 配下）
    neta: "assets/sfx/umahii.mp3",
    osuna: "assets/sfx/nanikore.wav",

    // 例：追加したらここに追記
    // click1: "assets/sfx/click1.mp3",
    // ok: "assets/sfx/ok.mp3",
  };

  // 既存仕様：ネタ置き場(gallery.html)は、data-sfx を付けてなくても鳴らす
  const GALLERY_AUTO_SFX_KEY = "neta";
  const GALLERY_AUTO_DELAY_MS = 380;

  // 事前ロード（同じ音は使い回し）
  const sfxCache = new Map(); // src -> HTMLAudioElement

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
      sfxCache.set(safeSrc, a);
      return a;
    }catch(e){
      return null;
    }
  }

  function playSfx(keyOrPath, volume){
    const src = resolveSfxSrc(keyOrPath);
    if(!src) return;
    const a = getAudio(src);
    if(!a) return;
    try{
      if(typeof volume === "number" && isFinite(volume)){
        a.volume = clamp(volume, 0, 1);
      }
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
      const t = e.target && e.target.closest ? e.target.closest("[data-sfx],a[href]") : null;
      if(!t) return;

      const isLink = (t.tagName || "").toLowerCase() === "a" && t.getAttribute("href");

      // data-sfx があればそれを優先
      let key = t.getAttribute("data-sfx") || "";

      // data-sfx が無くても「ネタ置き場リンク」なら自動で鳴らす（旧仕様互換）
      let autoDelay = 0;
      if(!key && isLink){
        let dest = "";
        try{
          const u = new URL(t.getAttribute("href"), location.href);
          dest = (u.pathname.split("/").pop() || "").toLowerCase();
        }catch{
          dest = (t.getAttribute("href") || "").toLowerCase();
        }
        dest = dest.replace(/^[.\/]+/, "").split(/[?#]/)[0];
        if(dest === "gallery.html"){
          key = GALLERY_AUTO_SFX_KEY;
          autoDelay = GALLERY_AUTO_DELAY_MS;
        }
      }

      if(!key) return; // 音指定が無いなら何もしない

      // 音を鳴らす
      const volAttr = t.getAttribute("data-sfx-volume");
      const vol = volAttr != null ? Number(volAttr) : undefined;
      playSfx(key, (typeof vol === "number" && isFinite(vol)) ? vol : undefined);

      // 遷移遅延：リンクだけ
      if(!isLink) return;

      const delayAttr = t.getAttribute("data-sfx-delay");
      const delay = clamp(
        parseInt((delayAttr != null ? delayAttr : autoDelay) || 0, 10) || 0,
        0, 4000
      );

      // すでに同ページなら遷移しない（音だけ）
      const hrefAbs = t.href;
      const current = (location.href || "");
      if(hrefAbs === current){
        if(delay > 0) e.preventDefault();
        return;
      }

      // 修飾キー/別タブ/target は尊重（音だけ鳴らして通常動作）
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if(t.target && t.target.toLowerCase() !== "_self") return;
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

})();
