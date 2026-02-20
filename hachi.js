// hachi.js（本家へ飛ぶ：URL修正版）
// - /w/index.php を使わない（ここが Not Found の原因になりがち）
// - /wiki/Special:Search?search=... に飛ぶ
// - すべて https 固定

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

// ✅ 検索結果ページ（ここが重要）
// MediaWikiの特別ページは /wiki/Special:Search が通ることが多い
function searchUrl(query){
  const q = norm(query);
  if(!q) return pageUrl("メインページ");
  return `${WIKI_BASE}/wiki/Special:Search?search=${encodeURIComponent(q)}&fulltext=1`;
}

function openNewTab(url){
  window.open(url, "_blank", "noopener");
}

function setOpenLink(title){
  const a = el("btnOpen");
  if(!a) return;
  a.href = pageUrl(title);
}

function wireUI(){
  const q = el("q");

  el("btnSearch")?.addEventListener("click", () => {
    const url = searchUrl(q?.value || "");
    log(`open search: ${url}`);
    openNewTab(url);
  });

  q?.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      const url = searchUrl(q.value || "");
      log(`open search(enter): ${url}`);
      openNewTab(url);
    }
  });

  el("btnRandom")?.addEventListener("click", () => {
    const url = `${WIKI_BASE}/wiki/Special:Random`;
    log(`open random: ${url}`);
    openNewTab(url);
  });

  const updateOpen = () => setOpenLink(q?.value || "メインページ");
  q?.addEventListener("input", updateOpen);
  updateOpen();

  // 画面内表示はしない（Cloudflareで弾かれるので）
  const t = el("articleTitle");
  const n = el("articleNote");
  const c = el("articleContent");
  if(t) t.textContent = "外部表示モード";
  if(n) n.textContent = "Cloudflare対策：サイト内に埋め込まず、本家を新規タブで開く。";
  if(c) c.innerHTML = `
    <p class="note">
      検索は <b>本家の検索結果ページ</b> を新規タブで開きます。<br>
      ※ 本家側で Cloudflare の確認が出たら、そこでチェックを通過してください。
    </p>
  `;

  log("ready: external open mode (fixed URL)");
}

document.addEventListener("DOMContentLoaded", () => {
  if(el("console")) el("console").textContent = "init…\n";
  wireUI();
  const q = el("q");
  if(q && !q.value) q.value = "メインページ";
  setOpenLink(q?.value || "メインページ");
});
