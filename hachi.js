// hachi.js
// Uncyclopedia(=MediaWiki) を API で取得して “学術資料風” に表示する
// 直fetchがCORS等で落ちる場合があるので、無料プロキシ(allorigins)へ自動フォールバックする

const WIKI_BASE = "https://ja.uncyclopedia.info";
const API = `${WIKI_BASE}/w/api.php`;
const PROXY_RAW = "https://api.allorigins.win/raw?url=";

const el = (id) => document.getElementById(id);

function log(line){
  const c = el("console");
  if(!c) return;
  c.textContent += `\n${line}`;
}

function apiUrl(params){
  const u = new URL(API);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, String(v)));
  u.searchParams.set("origin", "*"); // MediaWikiの定番CORS
  u.searchParams.set("format", "json");
  return u.toString();
}

async function fetchTextDirect(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}
async function fetchTextViaProxy(url){
  const proxied = PROXY_RAW + encodeURIComponent(url);
  const res = await fetch(proxied, { cache: "no-store" });
  if(!res.ok) throw new Error(`PROXY HTTP ${res.status}`);
  return await res.text();
}

async function getJson(params){
  const url = apiUrl(params);

  // 1) 直
  try{
    log(`fetch: direct`);
    const txt = await fetchTextDirect(url);
    return JSON.parse(txt);
  }catch(e1){
    log(`direct failed: ${e1.message}`);

    // 2) allorigins raw
    log(`fetch: proxy(allorigins)`);
    const txt = await fetchTextViaProxy(url);
    return JSON.parse(txt);
  }
}

function normalizeTitleFromHref(href){
  try{
    const u = new URL(href, WIKI_BASE);
    const m = u.pathname.match(/^\/wiki\/(.+)$/);
    if(m) return decodeURIComponent(m[1]).replaceAll("_"," ");
    return null;
  }catch{
    return null;
  }
}

function sanitizeAndRewrite(html){
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("script, noscript").forEach(n => n.remove());

  // rewrite links & images
  doc.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href") || "";
    try{
      const abs = new URL(href, WIKI_BASE).toString();
      a.setAttribute("href", abs);
    }catch{}
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });

  doc.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src") || "";
    try{
      const abs = new URL(src, WIKI_BASE).toString();
      img.setAttribute("src", abs);
      img.setAttribute("loading", "lazy");
      img.setAttribute("referrerpolicy", "no-referrer");
    }catch{}
  });

  return doc.body.innerHTML;
}

function showIframeFallback(title){
  const safeTitle = title || "メインページ";
  const url = `${WIKI_BASE}/wiki/${encodeURIComponent(safeTitle.replaceAll(" ","_"))}`;
  el("articleTitle").textContent = safeTitle + "（iframe表示）";
  el("articleNote").textContent = "API取得に失敗 → iframeで本家を表示（確実に動く逃げ道）";
  el("articleContent").innerHTML = `
    <div class="note" style="margin-bottom:10px">
      ブラウザ/回線の都合でAPIが弾かれた。中身は本家を埋め込みで表示する。
    </div>
    <div style="border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.18)">
      <iframe src="${url}" style="width:100%;height:70vh;border:0" loading="lazy" referrerpolicy="no-referrer"></iframe>
    </div>
  `;
}

async function loadByTitle(title){
  if(!title) return;

  el("articleTitle").textContent = "読み込み中…";
  el("articleNote").textContent = `取得中：${title}`;
  el("articleContent").textContent = "Loading…";

  const openA = el("btnOpen");
  if(openA) openA.href = `${WIKI_BASE}/wiki/${encodeURIComponent(title.replaceAll(" ","_"))}`;

  log(`parse: ${title}`);

  try{
    const js = await getJson({
      action: "parse",
      page: title,
      prop: "text|displaytitle",
      redirects: 1,
      formatversion: 2
    });

    if(!js.parse || !js.parse.text){
      throw new Error("parse result missing");
    }

    const displayTitle = js.parse.displaytitle
      ? js.parse.displaytitle.replaceAll(/<[^>]*>/g, "")
      : title;

    el("articleTitle").textContent = displayTitle;
    el("articleNote").textContent = "出典：アンサイクロペディア（パロディ百科） / API取得";

    const cleaned = sanitizeAndRewrite(js.parse.text);
    el("articleContent").innerHTML = cleaned;

    // 内部リンク（/wiki/...）はこのページ内で辿る
    el("articleContent").querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href") || "";
      const t = normalizeTitleFromHref(href);
      if(t){
        a.addEventListener("click", (ev) => {
          if(ev.ctrlKey || ev.metaKey) return;
          ev.preventDefault();
          el("q").value = t;
          loadByTitle(t).catch(err=>{
            log(`ERR: ${err.message}`);
            showIframeFallback(t);
          });
        });
        a.removeAttribute("target");
        a.removeAttribute("rel");
      }
    });

    log("OK");
  }catch(err){
    log(`ERR: ${err.message}`);
    showIframeFallback(title);
  }
}

async function loadRandom(){
  log("random…");
  const js = await getJson({
    action: "query",
    list: "random",
    rnnamespace: 0,
    rnlimit: 1,
    formatversion: 2
  });
  const t = js?.query?.random?.[0]?.title;
  if(!t) throw new Error("random title missing");
  el("q").value = t;
  await loadByTitle(t);
}

function wireUI(){
  el("btnSearch").addEventListener("click", () => {
    const t = el("q").value.trim();
    loadByTitle(t).catch(err=>{
      log(`ERR: ${err.message}`);
      showIframeFallback(t);
    });
  });

  el("btnRandom").addEventListener("click", () => {
    loadRandom().catch(err=>{
      log(`ERR: ${err.message}`);
      showIframeFallback("メインページ");
    });
  });

  el("q").addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      const t = el("q").value.trim();
      loadByTitle(t).catch(err=>{
        log(`ERR: ${err.message}`);
        showIframeFallback(t);
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  el("console").textContent = "init…\n";
  wireUI();

  el("q").value = "メインページ";
  loadByTitle("メインページ").catch(err=>{
    log(`ERR: ${err.message}`);
    showIframeFallback("メインページ");
  });
});
