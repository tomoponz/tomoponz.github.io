// hachi.js（Cloudflare対策：表示は諦めて「本家へ飛ぶ」専用）
// - あなたのサイト内に検索結果/本文を埋め込まない
// - 入力 -> Uncyclopedia の検索結果ページを新規タブで開く
// - 「本家で開く」= 入力文字列を記事タイトルとして開く
// - 「ランダム」= Special:Random へ飛ぶ

const WIKI_BASE = "https://ja.uncyclopedia.info";

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

// MediaWikiの検索結果ページ（言語に依存しない Special:Search を使う）
function searchUrl(query){
  const q = (query || "").trim();
  // 何も入ってなければメインページ相当へ
  if(!q) return pageUrl("メインページ");
  return `${WIKI_BASE}/w/index.php?search=${encodeURIComponent(q)}&title=Special%3ASearch&fulltext=1`;
}

function openNewTab(url){
  // noopener で安全に
  window.open(url, "_blank", "noopener");
}

function setOpenLink(title){
  const a = el("btnOpen");
  if(!a) return;
  a.href = pageUrl(title);
}

function wireUI(){
  const q = el("q");
  const btnSearch = el("btnSearch");
  const btnRandom = el("btnRandom");
  const btnOpen = el("btnOpen");

  // 検索ボタン：検索結果ページへ飛ぶ
  btnSearch?.addEventListener("click", () => {
    const s = q?.value || "";
    const url = searchUrl(s);
    log(`open search: ${url}`);
    openNewTab(url);
  });

  // Enter：検索結果ページへ飛ぶ
  q?.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      const s = q.value || "";
      const url = searchUrl(s);
      log(`open search(enter): ${url}`);
      openNewTab(url);
    }
  });

  // ランダム：Special:Randomへ
  btnRandom?.addEventListener("click", () => {
    const url = `${WIKI_BASE}/wiki/Special:Random`;
    log(`open random: ${url}`);
    openNewTab(url);
  });

  // 本家で開く：入力を“記事名”として開く（ボタンは a なので href 更新だけでもOK）
  const updateOpen = () => setOpenLink(q?.value || "メインページ");
  q?.addEventListener("input", updateOpen);
  updateOpen();

  // 画面内表示はしない（Cloudflareで死ぬので）
  const t = el("articleTitle");
  const n = el("articleNote");
  const c = el("articleContent");
  if(t) t.textContent = "外部表示モード";
  if(n) n.textContent = "Cloudflare対策：このページ内には埋め込まず、本家を新規タブで開く。";
  if(c) c.innerHTML = `
    <p class="note">
      アンサイクロペディア側が Cloudflare で保護されているため、
      このサイト内に検索結果や本文を表示する方式は不安定です。<br>
      代わりに、検索は <b>本家の検索結果ページ</b> を新規タブで開きます。
    </p>
  `;

  log("ready: external open mode");
}

document.addEventListener("DOMContentLoaded", () => {
  if(el("console")) el("console").textContent = "init…\n";
  wireUI();
  const q = el("q");
  if(q && !q.value) q.value = "メインページ";
  setOpenLink(q?.value || "メインページ");
});
