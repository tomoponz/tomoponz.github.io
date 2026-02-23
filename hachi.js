// hachi.js
// 八百科事典：アンサイクロペディアを JSONP で読み込み → 学術資料風に表示
// 右上（nav）の検索バー：このページの「本文内検索」（ハイライト + ジャンプ）
// 上の「検索して読む」：記事名検索（記事を読み込む）

(() => {
  "use strict";

  const WIKI_BASE = "https://ja.uncyclopedia.info";
  const API = `${WIKI_BASE}/api.php`;
  const SITE = "ja.uncyclopedia.info"; // fallback用

  // ===== 怪異（ローカル）：1/50 =====
  const ANOMALY_RATE = 1 / 50;
  const ANOMALIES = [
    {
      title: "■■■について",
      note: "表示中：■■■（ローカル資料）",
      html: `
        <p>この項目は閲覧権限が不足しています。</p>
        <p>しかし、あなたはすでに<strong>読んでしまった</strong>。</p>
        <hr>
        <pre style="white-space:pre-wrap; background:rgba(0,0,0,.22); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,.10);">
■■■■■■■■■■■■■■■■■■
■■■  記録番号: 0xDEAD-BEEF  ■■■
■■■  観測ログ: 欠損         ■■■
■■■■■■■■■■■■■■■■■■

・「ランダム」を押した回数が一致しない
・本文内検索をすると文字の並びが変わる
・閉じても、次に開いた時、続きから始まる

――――――――――――――――――
見つけないでください
        </pre>
      `
    },
    {
      title: "文字化け資料（復元不能）",
      note: "表示中：復元不能（ローカル資料）",
      html: `
        <p>復元処理に失敗しました。</p>
        <p class="note">※外部APIは呼び出していません。</p>
        <pre style="white-space:pre-wrap; background:rgba(0,0,0,.22); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,.10);">
ã‚ãªãŸã¯ã€€ã“ã“ã«ã€€ã„ã‚‹
ã„ã¾ã¯ã€€ã“ã“ã«ã€€ã„ãªã„

[ERR] parse.text: NULL
[WARN] callback: missing
[INFO] retry: 0
[INFO] retry: 0
[INFO] retry: 0
        </pre>
      `
    }
  ];

  const el = (id) => document.getElementById(id);

  function log(line){
    const c = el("console");
    if(!c) return;
    c.textContent += `\n${line}`;
  }

  function normTitle(s){
    return (s || "").trim().replaceAll("_"," ").replace(/\s+/g, " ");
  }

  function pageUrl(title){
    const t = normTitle(title || "メインページ").replaceAll(" ", "_");
    return `${WIKI_BASE}/wiki/${encodeURIComponent(t)}`;
  }

  function googleSiteSearchUrl(query){
    const q = normTitle(query);
    const base = `site:${SITE}`;
    return `https://www.google.com/search?q=${encodeURIComponent(q ? base + " " + q : base)}`;
  }

  function openUrl(url, newTab = true){
    if(newTab){
      const w = window.open(url, "_blank", "noopener");
      if(w) return;
    }
    location.href = url;
  }

  function setOpenLink(title){
    const a = el("btnOpen");
    if(!a) return;
    a.href = pageUrl(title);
  }

  function jsonp(url, timeoutMs = 9000){
    return new Promise((resolve, reject) => {
      const cb = `__hachi_cb_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
      const script = document.createElement("script");
      let done = false;

      const cleanup = () => {
        if(script.parentNode) script.parentNode.removeChild(script);
        try { delete window[cb]; } catch { window[cb] = undefined; }
      };

      const timer = setTimeout(() => {
        if(done) return;
        done = true;
        cleanup();
        reject(new Error("JSONP timeout"));
      }, timeoutMs);

      window[cb] = (data) => {
        if(done) return;
        done = true;
        clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      const u = new URL(url);
      if(!u.searchParams.get("callback")) u.searchParams.set("callback", cb);

      script.src = u.toString();
      script.onerror = () => {
        if(done) return;
        done = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error("JSONP script error"));
      };

      document.head.appendChild(script);
    });
  }

  function apiParseUrl(title){
    const t = normTitle(title || "メインページ");
    const u = new URL(API);
    u.searchParams.set("action", "parse");
    u.searchParams.set("page", t);
    u.searchParams.set("prop", "text");
    u.searchParams.set("redirects", "1");
    u.searchParams.set("format", "json");
    u.searchParams.set("formatversion", "2");
    return u.toString();
  }

  function apiRandomUrl(){
    const u = new URL(API);
    u.searchParams.set("action", "query");
    u.searchParams.set("list", "random");
    u.searchParams.set("rnnamespace", "0");
    u.searchParams.set("rnlimit", "1");
    u.searchParams.set("format", "json");
    u.searchParams.set("formatversion", "2");
    return u.toString();
  }

  function absolutizeUrl(raw){
    if(!raw) return raw;
    if(raw.startsWith("//")) return "https:" + raw;
    if(raw.startsWith("/")) return WIKI_BASE + raw;
    return raw;
  }

  function fixSrcset(srcset){
    if(!srcset) return srcset;
    return srcset
      .split(",")
      .map(part => part.trim())
      .map(part => {
        const sp = part.split(/\s+/);
        sp[0] = absolutizeUrl(sp[0]);
        return sp.join(" ");
      })
      .join(", ");
  }

  function sanitizeArticleHtml(html){
    const doc = new DOMParser().parseFromString(html, "text/html");

    doc.querySelectorAll("script, style, noscript").forEach(n => n.remove());
    doc.querySelectorAll(".mw-editsection").forEach(n => n.remove());
    doc.querySelectorAll("sup.reference").forEach(n => n.remove());

    doc.querySelectorAll("a[href]").forEach(a => {
      const href = a.getAttribute("href") || "";
      if(href.startsWith("#")) return;
      const abs = absolutizeUrl(href);
      a.setAttribute("href", abs);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });

    doc.querySelectorAll("img").forEach(img => {
      const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      if(src) img.setAttribute("src", absolutizeUrl(src));

      const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset");
      if(srcset) img.setAttribute("srcset", fixSrcset(srcset));

      img.removeAttribute("width");
      img.removeAttribute("height");
      img.loading = "lazy";
    });

    return doc.body.innerHTML;
  }

  // ===== ページ内検索（本文ハイライト） =====
  let articleOriginalHTML = "";

  function escapeRegExp(s){
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function clearHighlights(){
    const box = el("articleContent");
    if(!box) return;
    if(articleOriginalHTML) box.innerHTML = articleOriginalHTML;
  }

  function highlightInArticle(query){
    const box = el("articleContent");
    if(!box) return 0;
    if(!articleOriginalHTML) return 0;

    const q = (query || "").trim();
    clearHighlights();
    if(!q) return 0;

    const re = new RegExp(escapeRegExp(q), "gi");
    let total = 0;

    const walker = document.createTreeWalker(
      box,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node){
          const p = node.parentNode;
          if(!p) return NodeFilter.FILTER_REJECT;
          const tag = (p.nodeName || "").toUpperCase();
          if(tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "MARK") {
            return NodeFilter.FILTER_REJECT;
          }
          if(!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);

    for(const node of nodes){
      const text = node.nodeValue;
      re.lastIndex = 0;
      let m;
      let last = 0;
      let local = 0;
      const frag = document.createDocumentFragment();

      while((m = re.exec(text)) !== null){
        const start = m.index;
        const end = start + m[0].length;
        frag.appendChild(document.createTextNode(text.slice(last, start)));
        const mark = document.createElement("mark");
        mark.className = "hachiHit";
        mark.textContent = text.slice(start, end);
        frag.appendChild(mark);
        local++;
        total++;
        last = end;
        if(m.index === re.lastIndex) re.lastIndex++;
      }

      if(local > 0){
        frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    }

    const first = box.querySelector("mark.hachiHit");
    first?.scrollIntoView({ behavior: "smooth", block: "center" });

    return total;
  }

  // ===== 怪異描画（APIを呼ばない） =====
  function renderAnomaly(){
    const a = ANOMALIES[Math.floor(Math.random() * ANOMALIES.length)];

    const titleEl = el("articleTitle");
    const noteEl  = el("articleNote");
    const box     = el("articleContent");

    if(titleEl) titleEl.textContent = a.title;
    if(noteEl)  noteEl.textContent  = a.note;
    if(box)     box.innerHTML = a.html;

    // 本文内検索が効くように
    articleOriginalHTML = a.html;

    const q = el("q");
    if(q) q.value = a.title;

    // 「本家で開く」はランダムへ（怪異はローカルなので）
    const open = el("btnOpen");
    if(open){
      open.href = `${WIKI_BASE}/wiki/Special:Random`;
      open.setAttribute("target", "_blank");
      open.setAttribute("rel", "noopener");
    }

    // nav検索が入ってたら、そのまま本文内検索も走らせる
    const navQ = el("searchInput")?.value || "";
    if(navQ.trim()){
      const hits = highlightInArticle(navQ);
      if(noteEl) noteEl.textContent = `${a.note}｜本文内検索「${navQ}」：${hits}件`;
    }

    log("anomaly: local render (no api)");
  }

  // ===== 記事読み込み =====
  async function loadArticle(title){
    const t = normTitle(title || "メインページ") || "メインページ";

    const titleEl = el("articleTitle");
    const noteEl = el("articleNote");
    const box = el("articleContent");

    if(titleEl) titleEl.textContent = t;
    if(noteEl) noteEl.textContent = "読み込み中…";
    if(box) box.textContent = "Loading…";

    setOpenLink(t);
    log(`load: ${t}`);

    try{
      const data = await jsonp(apiParseUrl(t), 9000);
      const parsedTitle = data?.parse?.title || t;
      const html = data?.parse?.text || data?.parse?.text?.["*"] || "";

      if(!html) throw new Error("empty parse.text");

      const safe = sanitizeArticleHtml(html);
      if(titleEl) titleEl.textContent = parsedTitle;
      if(noteEl) noteEl.textContent = `表示中：${parsedTitle}（右上で本文内検索可）`;
      if(box) box.innerHTML = safe;

      articleOriginalHTML = safe;

      const navQ = el("searchInput")?.value || "";
      if(navQ.trim()){
        const hits = highlightInArticle(navQ);
        if(noteEl) noteEl.textContent = `表示中：${parsedTitle}｜本文内検索「${navQ}」：${hits}件`;
      }

      const q = el("q");
      if(q) q.value = parsedTitle;
      setOpenLink(parsedTitle);

      log("ok: rendered");
    }catch(err){
      log(`fail: ${String(err?.message || err)}`);
      if(noteEl) noteEl.textContent = "外部取得に失敗 → 外部検索に逃げます";
      if(box){
        box.innerHTML = `
          <p class="note">
            取得に失敗した（環境要因：Cloudflare/通信/ブロック等）。<br>
            代替として、Googleで <b>site:${SITE}</b> 検索を開ける。
          </p>
          <div class="btnrow">
            <a class="btn primary" href="${googleSiteSearchUrl(t)}" target="_blank" rel="noopener">Googleで探す</a>
            <a class="btn" href="${pageUrl(t)}" target="_blank" rel="noopener">本家で開く</a>
          </div>
        `;
      }
    }
  }

  async function loadRandom(){
    // 1/50で怪異（APIを呼ばない）
    if(Math.random() < ANOMALY_RATE){
      renderAnomaly();
      return;
    }

    try{
      log("random: query…");
      const data = await jsonp(apiRandomUrl(), 7000);
      const title = data?.query?.random?.[0]?.title;
      if(!title) throw new Error("no random title");
      await loadArticle(title);
    }catch(err){
      log(`random fail: ${String(err?.message || err)}`);
      openUrl(`${WIKI_BASE}/wiki/Special:Random`, true);
    }
  }

  // ===== 右上（nav）検索を「本文内検索」にする =====
  function setupNavInPageSearch(){
    const oldInp = el("searchInput");
    const oldBtn = el("searchBtn");
    if(!oldInp || !oldBtn) return;

    const pageMode = String(oldInp.dataset.searchMode || oldBtn.dataset.searchMode || "").toLowerCase() === "page";

    // app.js のサイト内検索リスナーを消すため clone して差し替え
    const inp = pageMode ? oldInp : oldInp.cloneNode(true);
    const btn = pageMode ? oldBtn : oldBtn.cloneNode(true);
    if(!pageMode){
      oldInp.parentNode.replaceChild(inp, oldInp);
      oldBtn.parentNode.replaceChild(btn, oldBtn);
    }

    inp.placeholder = "本文内検索（このページだけ）";
    btn.textContent = "探す";

    const run = () => {
      const q = inp.value || "";
      const hits = highlightInArticle(q);

      const noteEl = el("articleNote");
      const titleEl = el("articleTitle");
      const title = titleEl?.textContent || "";

      if(!q.trim()){
        if(noteEl) noteEl.textContent = `表示中：${title}（右上で本文内検索可）`;
        return;
      }

      if(noteEl) noteEl.textContent = `表示中：${title}｜本文内検索「${q}」：${hits}件`;
      log(`in-page: ${hits} hits for "${q}"`);
    };

    btn.addEventListener("click", run);
    inp.addEventListener("keydown", (e) => {
      if(e.key === "Enter") run();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if(el("console")) el("console").textContent = "init…\n";

    setupNavInPageSearch();

    const q = el("q");
    const btnSearch = el("btnSearch");
    const btnRandom = el("btnRandom");

    if(q && !q.value) q.value = "メインページ";

    const runLoad = () => loadArticle(q?.value || "メインページ");

    btnSearch?.addEventListener("click", runLoad);
    q?.addEventListener("keydown", (e) => {
      if(e.key === "Enter") runLoad();
    });

    btnRandom?.addEventListener("click", loadRandom);

    const updateOpen = () => setOpenLink(q?.value || "メインページ");
    q?.addEventListener("input", updateOpen);
    updateOpen();

    await loadArticle(q?.value || "メインページ");

    log("ready");
  });

})();
