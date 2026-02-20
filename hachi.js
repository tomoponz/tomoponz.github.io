// hachi.js（検索は外部検索エンジンに丸投げ版：確実に動く）
// - 「検索して読む」: Googleの site:ja.uncyclopedia.info 検索結果へ
// - 「本家で開く」    : 入力を記事タイトルとして直接開く
// - 「ランダム」      : Special:Randomへ

const WIKI_BASE = "https://ja.uncyclopedia.info";
const SITE = "ja.uncyclopedia.info"; // site: 検索用

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

// ✅ これが本命：本家の検索機能に依存しない
function googleSiteSearchUrl(query){
  const q = norm(query);
  if(!q) return `https://www.google.com/search?q=${encodeURIComponent("site:" + SITE)}`;
  return `https://www.google.com/search?q=${encodeURIComponent("site:" + SITE + " " + q)}`;
}

// 予備：Googleが嫌ならこっちに切り替えてもOK
function ddgSiteSearchUrl(query){
  const q = norm(query);
  if(!q) return `https://duckduckgo.com/?q=${encodeURIComponent("site:" + SITE)}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent("site:" + SITE + " " + q)}`;
}

function openUrl(url, newTab = true){
  if(newTab){
    const w = window.open(url, "_blank", "noopener");
    if(w) return;
  }
  // ポップアップブロック時の保険
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
  if(t) t.textContent = "外部検索モード";
  if(n) n.textContent = "Cloudflare等で本家検索が不安定なので、検索は外部検索結果へ飛ばす。";
  if(c) c.innerHTML = `
    <p class="note">
      「検索して読む」→ Googleで <b>site:${SITE}</b> 検索結果を開きます。<br>
      「本家で開く」→ 入力を記事名として直接開きます。<br>
      「ランダム」→ 本家ランダムへ。
    </p>
  `;
}

function wireSearch(inputId, buttonId){
  const inp = el(inputId);
  const btn = el(buttonId);
  if(!inp || !btn) return;

  const run = () => {
    const q = inp.value || "";
    // ここを ddgSiteSearchUrl(q) に変えるとDuckDuckGoにできる
    const url = googleSiteSearchUrl(q);
    log(`open search: ${url}`);
    openUrl(url, true);
  };

  btn.addEventListener("click", run);
  inp.addEventListener("keydown", (e) => {
    if(e.key === "Enter") run();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if(el("console")) el("console").textContent = "init…\n";

  // メイン欄（q / btnSearch）
  wireSearch("q", "btnSearch");

  // ナビ検索（searchInput / searchBtn があるなら同じ挙動にする）
  wireSearch("searchInput", "searchBtn");

  // ランダム
  el("btnRandom")?.addEventListener("click", () => {
    const url = `${WIKI_BASE}/wiki/Special:Random`;
    log(`open random: ${url}`);
    openUrl(url, true);
  });

  // 「本家で開く」リンクを入力に追従
  const q = el("q");
  if(q && !q.value) q.value = "メインページ";
  const updateOpen = () => setOpenLink(q?.value || "メインページ");
  q?.addEventListener("input", updateOpen);
  updateOpen();

  setStatus();
  log("ready: external search mode");
});
