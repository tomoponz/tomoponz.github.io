// hachi.js
// Uncyclopedia(=MediaWiki) を API で取得して “学術資料風” に表示する

const WIKI_BASE = "https://ja.uncyclopedia.info";
const API = `${WIKI_BASE}/w/api.php`;

const el = (id) => document.getElementById(id);

function log(line){
  const c = el("console");
  if(!c) return;
  c.textContent += `\n${line}`;
}

function apiUrl(params){
  const u = new URL(API);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, String(v)));
  // MediaWiki の CORS 用
  u.searchParams.set("origin", "*");
  return u.toString();
}

async function getJson(params){
  const url = apiUrl({ format: "json", ...params });
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function normalizeTitleFromHref(href){
  // /wiki/記事名 → 記事名
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

  // 余計なもの削除
  doc.querySelectorAll("script, noscript").forEach(n => n.remove());

  // link / img を絶対URL化
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

async function loadByTitle(title){
  if(!title) return;

  el("articleTitle").textContent = "読み込み中…";
  el("articleNote").textContent = `取得中：${title}`;
  el("articleContent").textContent = "Loading…";

  el("btnOpen").href = `${WIKI_BASE}/wiki/${encodeURIComponent(title.replaceAll(" ","_"))}`;

  log(`parse: ${title}`);

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
  el("articleNote").textContent = "出典：アンサイクロペディア / API取得";

  const cleaned = sanitizeAndRewrite(js.parse.text);
  el("articleContent").innerHTML = cleaned;

  // 内部リンク（/wiki/...）はこのページ内で読む
  el("articleContent").querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href") || "";
    const t = normalizeTitleFromHref(href);
    if(t){
      a.addEventListener("click", (ev) => {
        if(ev.ctrlKey || ev.metaKey) return; // Ctrl/Commandは別タブOK
        ev.preventDefault();
        el("q").value = t;
        loadByTitle(t).catch(err=>{
          log(`ERR: ${err.message}`);
          window.open(`${WIKI_BASE}/wiki/${encodeURIComponent(t.replaceAll(" ","_"))}`, "_blank", "noopener");
        });
      });
      a.removeAttribute("target");
      a.removeAttribute("rel");
    }
  });

  log("OK");
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
    loadByTitle(t).catch(err=> log(`ERR: ${err.message}`));
  });

  el("btnRandom").addEventListener("click", () => {
    loadRandom().catch(err=> log(`ERR: ${err.message}`));
  });

  el("q").addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      const t = el("q").value.trim();
      loadByTitle(t).catch(err=> log(`ERR: ${err.message}`));
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  el("console").textContent = "init…\n";
  wireUI();

  el("q").value = "メインページ";
  loadByTitle("メインページ").catch(err=>{
    log(`ERR: ${err.message}`);
    el("articleTitle").textContent = "読み込み失敗";
    el("articleContent").innerHTML =
      `<p>APIで取得できなかった。<a href="${WIKI_BASE}/wiki/%E3%83%A1%E3%82%A4%E3%83%B3%E3%83%9A%E3%83%BC%E3%82%B8" target="_blank" rel="noopener">本家で開く</a></p>`;
  });
});
