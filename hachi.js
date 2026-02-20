// hachi.js（検索URLを /index.php に修正＋フォールバック付き）
// - ランダム：/wiki/Special:Random
// - 検索：/index.php?search=... （ここが一番通りやすい）
// - もし環境によって /index.php がダメでも、/wiki/特別:検索 と /wiki/Special:Search を順に試せるリンクも用意

const WIKI_BASE = "https://ja.uncyclopedia.info";

const el = (id) => document.getElementById(id);

function log(line){
  const c = el("console");
  if(!c) return;
  c.textContent += `\n${line}`;
}

function norm(s){
  return (s || "").trim().replaceAll("_"," ").replace(/\s+/g, " ");
}

function pageUrl(title){
  const t = norm(title || "メインページ").replaceAll(" ", "_");
  return `${WIKI_BASE}/wiki/${encodeURIComponent(t)}`;
}

// ✅ 検索：まず /index.php を使う（/w/index.php は Not Found になりがち）
function searchUrl_primary(q){
  const query = norm(q);
  if(!query) return pageUrl("メインページ");
  return `${WIKI_BASE}/index.php?search=${encodeURIComponent(query)}&title=Special:Search&fulltext=1`;
}

// 予備（環境差対策）
function searchUrl_fallback_jp(q){
  const query = norm(q);
  if(!query) return pageUrl("メインページ");
  // 「特別:検索」(日本語エイリアス)
  return `${WIKI_BASE}/wiki/${encodeURIComponent("特別:検索")}?search=${encodeURIComponent(query)}&fulltext=1`;
}
function searchUrl_fallback_en(q){
  const query = norm(q);
  if(!query) return pageUrl("メインページ");
  return `${WIKI_BASE}/wiki/Special:Search?search=${encodeURIComponent(query)}&fulltext=1`;
}

// ポップアップブロック回避：検索は同一タブ遷移にする（これが一番確実）
function go(url){
  location.href = url;
}

function setOpenLink(title){
  const a = el("btnOpen");
  if(!a) return;
  a.href = pageUrl(title);
}

function setStatus(){
  const t = el("articleTitle");
  const n = el("articleNote");
  const c = el("articleContent");
  if(t) t.textContent = "外部表示モード";
  if(n) n.textContent = "Cloudflare対策：サイト内に埋め込まず、本家ページへ移動します。";
  if(c) c.innerHTML = `
    <p class="note">
      「検索して読む」＝本家の検索結果へ移動します。<br>
      もし 404 になったら、下の“予備リンク”を試してください。
    </p>
    <ul>
      <li><a id="fb1" href="#" rel="noopener">予備①：/wiki/特別:検索</a></li>
      <li><a id="fb2" href="#" rel="noopener">予備②：/wiki/Special:Search</a></li>
    </ul>
  `;
}

function wireSearch(inputId, buttonId){
  const inp = el(inputId);
  const btn = el(buttonId);
  if(!inp || !btn) return;

  const run = () => {
    const q = inp.value || "";
    const url = searchUrl_primary(q);
    log(`go search: ${url}`);
    go(url);
  };

  btn.addEventListener("click", run);
  inp.addEventListener("keydown", (e) => {
    if(e.key === "Enter") run();
  });
}

function wireUI(){
  // メイン入力（hachi.html の q / btnSearch）
  wireSearch("q", "btnSearch");

  // ナビ検索（共通app.jsにある想定：searchInput / searchBtn）
  wireSearch("searchInput", "searchBtn");

  // ランダム
  el("btnRandom")?.addEventListener("click", () => {
    const url = `${WIKI_BASE}/wiki/Special:Random`;
    log(`go random: ${url}`);
    go(url);
  });

  // 「本家で開く」リンク更新
  const q = el("q");
  const updateOpen = () => setOpenLink(q?.value || "メインページ");
  q?.addEventListener("input", updateOpen);
  updateOpen();

  setStatus();

  // 予備リンクを実際のURLに差し込む
  const fb1 = el("fb1");
  const fb2 = el("fb2");
  const query = norm(q?.value || "");
  if(fb1) fb1.href = searchUrl_fallback_jp(query);
  if(fb2) fb2.href = searchUrl_fallback_en(query);

  log("ready: search via /index.php");
}

document.addEventListener("DOMContentLoaded", () => {
  if(el("console")) el("console").textContent = "init…\n";
  const q = el("q");
  if(q && !q.value) q.value = "メインページ";
  wireUI();
});
