// hachi.js (代案：JSONP + ローカル辞書フォールバック)
// - fetch/CORS/無料プロキシ不調/iframe埋め込み不可 を全部避けるため、MediaWiki API を JSONP(script) で叩く。
// - 外部取得が完全に死んだ時は、ローカル辞書(LOCAL_ENTRIES)を表示して「機能しない」を潰す。

const WIKI_BASE = "https://ja.uncyclopedia.info";
const API = `${WIKI_BASE}/w/api.php`;

const el = (id) => document.getElementById(id);

function log(line){
  const c = el("console");
  if(!c) return;
  c.textContent += `\n${line}`;
}

// ============================
// ローカル辞書（最低限の保険）
// ============================
// タイトル一致で表示される。増やしたければ entries に追加していけばOK。
// content は HTML を入れてOK（安全のため script は使わない）
const LOCAL_ENTRIES = [
  {
    title: "メインページ",
    tags: ["local"],
    content: `
      <h3>ローカル辞書：メインページ</h3>
      <p class="note">外部取得が落ちても “八百科事典が空になる” を防ぐための保険。</p>
      <ul>
        <li><a href="${WIKI_BASE}/wiki/%E3%83%A1%E3%82%A4%E3%83%B3%E3%83%9A%E3%83%BC%E3%82%B8" target="_blank" rel="noopener">本家：メインページ</a></li>
        <li>試しに：<b>八百科事典</b> / <b>黒歴史</b> / <b>ドア</b> で検索してみて</li>
      </ul>
      <hr>
      <p>ここはあなたのサイトなので、ローカル辞書を「自分のネタ百科」にしても良い。</p>
      <p class="note">編集：hachi.js の LOCAL_ENTRIES に足すだけ。</p>
    `
  },
  {
    title: "八百科事典",
    tags: ["local"],
    content: `
      <h3>八百科事典（ローカル）</h3>
      <p>このページは “学術資料風” の閲覧器。外部（アンサイクロペディア）取得は JSONP で行う。</p>
      <ul>
        <li>外部取得が成功：記事本文をここに表示</li>
        <li>外部取得が失敗：このローカル辞書にフォールバック</li>
      </ul>
      <p class="note">「機能しない」をゼロにするための設計。</p>
    `
  },
  {
    title: "黒歴史",
    tags: ["local"],
    content: `
      <h3>黒歴史（ローカル）</h3>
      <p>「黒歴史枠」用の索引ページにしたければ、ここを好きに育てればOK。</p>
      <p class="note">例：過去作品／没案／封印した文章／供養ログ など。</p>
    `
  },
  {
    title: "ドア",
    tags: ["local"],
    content: `
      <h3>ドア（ローカル）</h3>
      <p>あなたのサイトの <code>door.html</code> は “押すだけワープ” のポータル。</p>
      <p>八百科事典側に「ドア仕様書」的な記事を置くなら、ここに書けばOK。</p>
    `
  },
  {
    title: "不具合",
    tags: ["local"],
    content: `
      <h3>よくある不具合</h3>
      <ul>
        <li><b>外部記事が取れない</b>：回線／相手側仕様変更／ブロック等。→ この版はローカル辞書に逃げる。</li>
        <li><b>記事は見えるが画像が壊れる</b>：相手の画像ホスト変更。→ URL書き換えはしてるが限界あり。</li>
        <li><b>内部リンクが効かない</b>：記事側のリンク形式が特殊な場合。→ “本家で開く” で逃げる。</li>
      </ul>
    `
  }
];

function normTitle(s){
  return (s || "")
    .trim()
    .replaceAll("_"," ")
    .replace(/\s+/g, " ");
}

function findLocalEntry(title){
  const t = normTitle(title).toLowerCase();
  return LOCAL_ENTRIES.find(x => normTitle(x.title).toLowerCase() === t) || null;
}

function setOpenLink(title){
  const openA = el("btnOpen");
  if(!openA) return;
  const safe = normTitle(title || "メインページ");
  openA.href = `${WIKI_BASE}/wiki/${encodeURIComponent(safe.replaceAll(" ","_"))}`;
}

function showLocal(title, reason){
  const safe = normTitle(title || "メインページ");
  const entry = findLocalEntry(safe) || findLocalEntry("メインページ");

  el("articleTitle").textContent = entry ? entry.title : safe;
  el("articleNote").textContent =
    `ローカル辞書表示（理由：${reason || "外部取得失敗"}）`;

  setOpenLink(safe);

  if(entry){
    el("articleContent").innerHTML = entry.content;
  }else{
    el("articleContent").innerHTML = `
      <p class="note">ローカル辞書にも見つからない：<b>${escapeHtml(safe)}</b></p>
      <p><a class="btn" href="${WIKI_BASE}/wiki/${encodeURIComponent(safe.replaceAll(" ","_"))}" target="_blank" rel="noopener">本家で開く</a></p>
    `;
  }
}

// ============================
// JSONP（CORS回避：scriptタグ）
// ============================
function apiUrl(params){
  const u = new URL(API);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, String(v)));
  u.searchParams.set("format", "json");
  u.searchParams.set("formatversion", "2");
  // origin はあっても害が少ない（JSONPなので必須ではない）
  u.searchParams.set("origin", "*");
  return u.toString();
}

function jsonp(url, timeoutMs = 12000){
  return new Promise((resolve, reject) => {
    const cbName = `__hachi_jsonp_${Date.now()}_${Math.floor(Math.random()*1e9)}`;
    const sep = url.includes("?") ? "&" : "?";
    const src = `${url}${sep}callback=${encodeURIComponent(cbName)}`;

    let done = false;
    const cleanup = () => {
      if(done) return;
      done = true;
      try{ delete window[cbName]; }catch{}
      if(script && script.parentNode) script.parentNode.removeChild(script);
      clearTimeout(timer);
    };

    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.referrerPolicy = "no-referrer";

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP script load error"));
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    document.head.appendChild(script);
  });
}

async function getJson(params){
  const url = apiUrl(params);
  log(`jsonp: ${params.action}${params.page ? " / " + params.page : ""}`);
  return await jsonp(url);
}

// ============================
// HTML整形（script除去 / URL補正 / 内部リンク処理）
// ============================
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll("\"","&quot;")
    .replaceAll("'","&#39;");
}

function normalizeTitleFromHref(href){
  try{
    const u = new URL(href, WIKI_BASE);

    // /wiki/Title
    const m1 = u.pathname.match(/^\/wiki\/(.+)$/);
    if(m1) return decodeURIComponent(m1[1]).replaceAll("_"," ");

    // /w/index.php?title=Title
    if(u.pathname.includes("/w/index.php")){
      const t = u.searchParams.get("title");
      if(t) return decodeURIComponent(t).replaceAll("_"," ");
    }

    return null;
  }catch{
    return null;
  }
}

function sanitizeAndRewrite(html){
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 危険要素 제거
  doc.querySelectorAll("script, noscript").forEach(n => n.remove());

  // リンク整形
  doc.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href") || "";
    try{
      const abs = new URL(href, WIKI_BASE).toString();
      a.setAttribute("href", abs);
    }catch{}
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });

  // 画像整形
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

function attachInternalLinkHandlers(){
  const root = el("articleContent");
  if(!root) return;

  root.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href") || "";
    const t = normalizeTitleFromHref(href);
    if(!t) return;

    // 内部リンクはこのページ内で辿る（Ctrl/⌘は新規タブを許可）
    a.addEventListener("click", (ev) => {
      if(ev.ctrlKey || ev.metaKey) return;
      ev.preventDefault();
      el("q").value = t;
      loadByTitle(t);
    });

    // 内部リンクは target 外す
    a.removeAttribute("target");
    a.removeAttribute("rel");
  });
}

// ============================
// 本体
// ============================
async function loadByTitle(title){
  const safe = normTitle(title);
  if(!safe) return;

  el("articleTitle").textContent = "読み込み中…";
  el("articleNote").textContent = `取得中：${safe}`;
  el("articleContent").textContent = "Loading…";
  setOpenLink(safe);

  try{
    const js = await getJson({
      action: "parse",
      page: safe,
      prop: "text|displaytitle",
      redirects: 1
    });

    const parse = js && js.parse;
    if(!parse) throw new Error("parse missing");

    const displayTitleRaw = parse.displaytitle || safe;
    const displayTitle = String(displayTitleRaw).replace(/<[^>]*>/g, "");

    let html = parse.text;
    if(typeof html === "object" && html && typeof html["*"] === "string"){
      html = html["*"];
    }
    if(typeof html !== "string" || !html.trim()){
      throw new Error("parse.text missing");
    }

    el("articleTitle").textContent = displayTitle;
    el("articleNote").textContent = "出典：アンサイクロペディア（パロディ百科） / JSONP取得";

    const cleaned = sanitizeAndRewrite(html);
    el("articleContent").innerHTML = cleaned;
    attachInternalLinkHandlers();

    log("OK");
  }catch(err){
    log(`ERR: ${err.message}`);
    // 外部取得が死んだらローカル辞書に逃がす（機能停止を回避）
    showLocal(safe, err.message);
  }
}

async function loadRandom(){
  try{
    const js = await getJson({
      action: "query",
      list: "random",
      rnnamespace: 0,
      rnlimit: 1
    });

    const t = js?.query?.random?.[0]?.title;
    if(!t) throw new Error("random title missing");

    el("q").value = t;
    await loadByTitle(t);
  }catch(err){
    log(`ERR: ${err.message}`);
    showLocal("メインページ", "random失敗");
  }
}

function wireUI(){
  el("btnSearch")?.addEventListener("click", () => {
    const t = el("q").value.trim();
    loadByTitle(t);
  });

  el("btnRandom")?.addEventListener("click", () => {
    loadRandom();
  });

  el("q")?.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      const t = el("q").value.trim();
      loadByTitle(t);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if(el("console")) el("console").textContent = "init…\n";

  wireUI();

  // 初期表示
  el("q").value = "メインページ";
  loadByTitle("メインページ");
});
