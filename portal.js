// portal.js（特殊演出・堅牢版：Wikipedia(ja) + OSM）
// - Wikipedia取得は多段フォールバックで「止まらない」
// - REST(summary) → MediaWiki API(query) → search補正 → proxy(allorigins) → 最後はリンクだけ出す
// - Konamiコマンド（↑↑↓↓←→←→BA）で「隠しワープ」発動：glitch-mode演出（style.css末尾）を利用
//   ※ places.js の各placeに { ..., kuro:true } を付けると隠しワープ先の候補になる
//
// 依存：window.PLACES（places.js）
// 期待DOM：
//  - Doorページ：#doorWrap（クリックでワープ）/ #fxCanvas（任意）/ #fade（任意）
//  - Warpページ：#placeTitle #placeDesc #imgBox #mapBox #mapLink #wikiLink #warpConsole（任意）
//  - ログ：#warpLogList（任意）
//  - FXトグル表示：#fxSoundState #fxParticlesState（任意）

// =====================
// ===== Places ========
// =====================
function pickRandomPlace(){
  const places = window.PLACES || [];
  if(!places.length) throw new Error("PLACES is empty");
  const i = Math.floor(Math.random() * places.length);
  return { place: places[i], index: i };
}
function setCurrentPlaceIndex(i){ sessionStorage.setItem("warp_place_index", String(i)); }
function getCurrentPlaceIndex(){
  const v = sessionStorage.getItem("warp_place_index");
  const i = Number(v);
  return Number.isFinite(i) ? i : null;
}

// =====================
// ===== Wikipedia =====
// =====================
const WIKI_HOST = "https://ja.wikipedia.org";
const WIKI_REST_SUMMARY = `${WIKI_HOST}/api/rest_v1/page/summary/`;
const WIKI_PAGE_BASE    = `${WIKI_HOST}/wiki/`;
const WIKI_API          = `${WIKI_HOST}/w/api.php`;
const PROXY_RAW         = "https://api.allorigins.win/raw?url=";

// ===== utils =====
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function toWikiSlug(title){ return encodeURIComponent(String(title).replaceAll(" ", "_")); }
function wikiPageUrl(title){ return WIKI_PAGE_BASE + toWikiSlug(title); }
function wikiSearchUrl(q){ return `${WIKI_HOST}/w/index.php?search=${encodeURIComponent(String(q))}`; }

async function fetchWithTimeout(url, opts = {}, timeoutMs = 8000){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try{
    return await fetch(url, { ...opts, signal: ctrl.signal });
  }finally{
    clearTimeout(t);
  }
}

async function fetchTextDirect(url){
  return await fetchWithTimeout(url, { cache:"no-store" }, 9000);
}
async function fetchTextViaProxy(url){
  const proxied = PROXY_RAW + encodeURIComponent(url);
  return await fetchWithTimeout(proxied, { cache:"no-store" }, 12000);
}

async function fetchJsonWithRetry(url, { tryProxy=false, retries=2 } = {}){
  let lastErr = null;

  for(let attempt=0; attempt<=retries; attempt++){
    try{
      const res = tryProxy ? await fetchTextViaProxy(url) : await fetchTextDirect(url);

      // 429/5xx は待って再試行
      if([429, 500, 502, 503, 504].includes(res.status)){
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(250 * Math.pow(2, attempt));
        continue;
      }
      if(!res.ok){
        const e = new Error(`HTTP ${res.status}`);
        e.httpStatus = res.status;
        throw e;
      }

      const txt = await res.text();
      try{
        return JSON.parse(txt);
      }catch(parseErr){
        // proxy側がHTMLを返す等
        const e = new Error("JSON parse failed");
        e.cause = parseErr;
        throw e;
      }
    }catch(e){
      lastErr = e;
      await sleep(200 * Math.pow(2, attempt));
    }
  }
  throw lastErr || new Error("fetch failed");
}

function apiUrl(params){
  const u = new URL(WIKI_API);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, String(v)));
  u.searchParams.set("origin", "*");
  u.searchParams.set("format", "json");
  u.searchParams.set("formatversion", "2");
  return u.toString();
}

async function mwApi(params, { proxy=false } = {}){
  const url = apiUrl(params);
  return await fetchJsonWithRetry(url, { tryProxy: proxy, retries: 2 });
}

async function restSummary(title, { proxy=false } = {}){
  const url = WIKI_REST_SUMMARY + toWikiSlug(title);
  return await fetchJsonWithRetry(url, { tryProxy: proxy, retries: 2 });
}

async function searchBestTitle(query, { proxy=false } = {}){
  const js = await mwApi({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: 1,
    srprop: ""
  }, { proxy });
  return js?.query?.search?.[0]?.title || null;
}

function pickFromMwQuery(js){
  const page = js?.query?.pages?.[0];
  if(!page) return { missing:true };
  if(page.missing) return { missing:true };

  return {
    title: page.title,
    extract: page.extract || "",
    thumbnail: page?.thumbnail?.source || null,
    pageUrl: page?.fullurl || wikiPageUrl(page.title)
  };
}

async function fetchViaMediaWiki(title, { proxy=false } = {}){
  const js = await mwApi({
    action: "query",
    prop: "extracts|pageimages|info",
    titles: title,
    redirects: 1,
    explaintext: 1,
    exintro: 1,
    piprop: "thumbnail",
    pithumbsize: 800,
    inprop: "url"
  }, { proxy });

  return pickFromMwQuery(js);
}

// ===== smart wiki =====
async function getWikiDataSmart(inputTitle, logFn){
  const original = String(inputTitle || "").trim() || "日本";
  const log = (s)=>{ try{ logFn && logFn(s); }catch{} };

  // 最終的に必ずリンクは出す
  let fallbackLink = wikiPageUrl(original);

  // 1) REST direct
  try{
    log("REST(direct)...");
    const sum = await restSummary(original, { proxy:false });
    const extract = sum?.extract || "";
    if(extract){
      return {
        title: sum?.title || original,
        extract,
        thumbnail: sum?.thumbnail?.source || null,
        pageUrl: sum?.content_urls?.desktop?.page || wikiPageUrl(sum?.title || original)
      };
    }
    fallbackLink = sum?.content_urls?.desktop?.page || fallbackLink;
    log("REST empty -> fallback");
  }catch(e){
    log(`REST fail: ${e.message}`);
  }

  // 2) MW direct
  try{
    log("MW(direct)...");
    const mw = await fetchViaMediaWiki(original, { proxy:false });
    if(!mw.missing && mw.extract){
      return mw;
    }
    log("MW missing/empty -> search");
  }catch(e){
    log(`MW fail: ${e.message}`);
  }

  // 3) Search direct -> MW direct
  try{
    log("Search(direct)...");
    const best = await searchBestTitle(original, { proxy:false });
    if(best){
      fallbackLink = wikiPageUrl(best);
      log(`Search -> ${best}`);
      const mw2 = await fetchViaMediaWiki(best, { proxy:false });
      if(!mw2.missing && mw2.extract) return mw2;
    }else{
      fallbackLink = wikiSearchUrl(original);
    }
  }catch(e){
    log(`Search fail: ${e.message}`);
    fallbackLink = wikiSearchUrl(original);
  }

  // 4) REST proxy
  try{
    log("REST(proxy)...");
    const sumP = await restSummary(original, { proxy:true });
    const extractP = sumP?.extract || "";
    if(extractP){
      return {
        title: sumP?.title || original,
        extract: extractP,
        thumbnail: sumP?.thumbnail?.source || null,
        pageUrl: sumP?.content_urls?.desktop?.page || fallbackLink
      };
    }
  }catch(e){
    log(`REST proxy fail: ${e.message}`);
  }

  // 5) MW proxy
  try{
    log("MW(proxy)...");
    const mwP = await fetchViaMediaWiki(original, { proxy:true });
    if(!mwP.missing && mwP.extract) return mwP;
  }catch(e){
    log(`MW proxy fail: ${e.message}`);
  }

  // FINAL
  log("FINAL fallback");
  return {
    title: original,
    extract: "Wikipediaの説明取得に失敗（回線/CORS/仕様変更/記事無しなど）。でもワープ自体は成功。",
    thumbnail: null,
    pageUrl: fallbackLink || wikiSearchUrl(original)
  };
}

// =====================
// ===== FX / UI =======
// =====================
const FX_KEY = "warp_fx_v1";
function loadFx(){
  try{
    const v = JSON.parse(localStorage.getItem(FX_KEY) || "{}");
    return { sound: v.sound !== false, particles: v.particles !== false };
  }catch{
    return { sound:true, particles:true };
  }
}
function saveFx(fx){ localStorage.setItem(FX_KEY, JSON.stringify(fx)); }

window.toggleFxSound = function(){
  const fx = loadFx();
  fx.sound = !fx.sound;
  saveFx(fx);
  renderFxStates();
};
window.toggleFxParticles = function(){
  const fx = loadFx();
  fx.particles = !fx.particles;
  saveFx(fx);
  renderFxStates();
};

function renderFxStates(){
  const fx = loadFx();
  const s = document.getElementById("fxSoundState");
  const p = document.getElementById("fxParticlesState");
  if(s) s.textContent = fx.sound ? "ON" : "OFF";
  if(p) p.textContent = fx.particles ? "ON" : "OFF";
}

function fadeIn(){ document.getElementById("fade")?.classList.add("fadeIn"); }
function fadeOut(){ document.getElementById("fade")?.classList.remove("fadeIn"); }

// ===== Sound (WebAudio / user gesture only) =====
let _audioCtx = null;
function getAudioCtx(){
  if(_audioCtx) return _audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  _audioCtx = new AC();
  return _audioCtx;
}

function playDoorSound(){
  const fx = loadFx(); if(!fx.sound) return;
  const ctx = getAudioCtx(); if(!ctx) return;

  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(180, now);
  o.frequency.exponentialRampToValueAtTime(90, now + 0.08);

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  o.connect(g).connect(ctx.destination);
  o.start(now);
  o.stop(now + 0.14);
}

// ===== glitch-mode 演出（style.css 末尾を利用）=====
function triggerChaoticEffect() {
  const fx = loadFx();
  document.body.classList.add("glitch-mode");
  setTimeout(() => document.body.classList.remove("glitch-mode"), 3500);

  if(!fx.sound) return;
  const ctx = getAudioCtx();
  if(!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(114, now);
  osc.frequency.exponentialRampToValueAtTime(81, now + 3);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.linearRampToValueAtTime(0, now + 3.5);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 3.5);
}

// ===== Particles =====
function burstParticles(canvas){
  const fx = loadFx(); if(!fx.particles) return;
  const ctx = canvas.getContext("2d");
  if(!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const W = rect.width, H = rect.height;
  const cx = W*0.5, cy = H*0.55;

  const n = 70;
  const ps = [];
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 30 + Math.random()*200;
    ps.push({
      x: cx, y: cy,
      vx: Math.cos(a)*sp,
      vy: Math.sin(a)*sp - 20,
      life: 0.55 + Math.random()*0.35,
      r: 1 + Math.random()*2.4
    });
  }

  let t0 = performance.now();
  function step(t){
    const dt = Math.min(0.033, (t - t0)/1000);
    t0 = t;

    ctx.clearRect(0,0,W,H);
    for(const p of ps){
      p.life -= dt;
      if(p.life <= 0) continue;
      p.vy += 220 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.94, dt*60);
      p.vy *= Math.pow(0.98, dt*60);

      const alpha = Math.max(0, Math.min(1, p.life));
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = "rgba(160,220,255,1)";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if(ps.some(p=>p.life>0)) requestAnimationFrame(step);
    else ctx.clearRect(0,0,W,H);
  }
  requestAnimationFrame(step);
}

// =====================
// ===== Maps / OSM =====
// =====================
function osmEmbed(lat, lng){
  const d = 0.08;
  return `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-d}%2C${lat-d}%2C${lng+d}%2C${lat+d}&layer=mapnik&marker=${lat}%2C${lng}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}
// Googleマップリンク（これが安定）
function mapsLink(lat,lng){ return `https://www.google.com/maps?q=${lat},${lng}`; }

// =====================
// ===== Warp Log =======
// =====================
const LOG_KEY = "warp_log_v1";
function loadLog(){ try{ return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); }catch{ return []; } }
function addLog(entry){
  const list = loadLog();
  list.unshift(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0,40)));
}
function renderLog(){
  const list = loadLog();
  const el = document.getElementById("warpLogList");
  if(!el) return;
  el.innerHTML = list.slice(0,10).map(it => {
    const t = escapeHtml(it.title || "???");
    const la = Number.isFinite(it.lat) ? it.lat.toFixed(2) : "--";
    const ln = Number.isFinite(it.lng) ? it.lng.toFixed(2) : "--";
    return `<li>${t} <span class="muted">(${la}, ${ln})</span></li>`;
  }).join("");
}
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// =====================
// ===== Main init ======
// =====================
document.addEventListener("DOMContentLoaded", () => {
  renderFxStates();
  renderLog();

  // Door page：#doorWrap があればクリックでワープ
  const doorWrap = document.getElementById("doorWrap");
  if(doorWrap){
    doorWrap.addEventListener("click", () => {
      const { index } = pickRandomPlace();
      setCurrentPlaceIndex(index);
      sessionStorage.removeItem("warp_kuro"); // 通常ワープでは黒演出フラグを消す

      const fxCanvas = document.getElementById("fxCanvas");
      if(fxCanvas) burstParticles(fxCanvas);
      playDoorSound();

      doorWrap.classList.add("opening");
      setTimeout(() => fadeIn(), 180);
      setTimeout(() => { location.href = "warp.html"; }, 560);
    });
  }

  // Warp page
  if(document.getElementById("placeTitle")) renderWarp();
});

// =====================
// ===== Warp page ======
// =====================
async function renderWarp(){
  const places = window.PLACES || [];
  if(!places.length) throw new Error("PLACES is empty");

  let idx = getCurrentPlaceIndex();
  if(idx == null || idx < 0 || idx >= places.length) idx = pickRandomPlace().index;

  const p = places[idx] || { wikiTitle:"日本" };

  const titleEl = document.getElementById("placeTitle");
  const descEl  = document.getElementById("placeDesc");
  const imgBox  = document.getElementById("imgBox");
  const mapBox  = document.getElementById("mapBox");
  const mapA    = document.getElementById("mapLink");
  const wikiA   = document.getElementById("wikiLink");
  const c       = document.getElementById("warpConsole");

  // 隠し演出フラグ（Konamiでセットされる） or place.kuro=true
  const kuroFlag = (sessionStorage.getItem("warp_kuro") === "1") || (p.kuro === true);
  if(kuroFlag){
    triggerChaoticEffect();
    if(c) c.innerHTML = "<span style='color:red'>KONAMI SECRET WARP</span>";
    sessionStorage.removeItem("warp_kuro"); // 1回で消す
  }

  if(titleEl) titleEl.textContent = p.wikiTitle || "読み込み中…";
  if(descEl)  descEl.textContent  = "読み込み中…";

  // map
  const hasLatLng = Number.isFinite(p.lat) && Number.isFinite(p.lng);
  if(mapBox){
    mapBox.innerHTML = hasLatLng ? osmEmbed(p.lat, p.lng) : `<div class="imgPh">地図は非表示（座標なし）</div>`;
  }
  if(mapA){
    mapA.href = hasLatLng ? mapsLink(p.lat, p.lng) : "#";
    mapA.style.pointerEvents = hasLatLng ? "auto" : "none";
    mapA.style.opacity = hasLatLng ? "1" : "0.5";
  }

  if(c && !kuroFlag) c.textContent = "warp init...\nWikipedia fetch...";

  // wiki fetch
  const data = await getWikiDataSmart(p.wikiTitle, (s)=>{ if(c) c.textContent += "\n" + s; });

  if(titleEl) titleEl.textContent = data.title || p.wikiTitle || "???";
  if(descEl)  descEl.textContent  = data.extract || "（説明なし）";
  if(wikiA)   wikiA.href = data.pageUrl || wikiSearchUrl(p.wikiTitle);

  if(imgBox){
    imgBox.innerHTML = data.thumbnail
      ? `<img src="${data.thumbnail}" alt="${escapeHtml(data.title)}">`
      : `<div class="imgPh">画像なし</div>`;
  }

  addLog({ ts: Date.now(), title: data.title, lat: hasLatLng ? p.lat : NaN, lng: hasLatLng ? p.lng : NaN });
  renderLog();

  setTimeout(() => fadeOut(), 80);
}

window.warpAgain = function(){
  setCurrentPlaceIndex(pickRandomPlace().index);
  sessionStorage.removeItem("warp_kuro");
  fadeIn();
  setTimeout(() => location.reload(), 260);
};

// ===============================
// KONAMI 隠しワープ（↑↑↓↓←→←→BA）
// - コマンド入力だけで飛ぶ（通常クリックとは独立）
// - style.css の .glitch-mode 演出を利用（renderWarpで発火させる）
// ===============================
(function(){
  if (window.__konamiWarpInited) return;
  window.__konamiWarpInited = true;

  function pickSecretOrRandomIndex(){
    const places = window.PLACES || [];
    if(!places.length) return null;

    const secret = [];
    for(let i=0;i<places.length;i++){
      if(places[i] && places[i].kuro === true) secret.push(i);
    }
    const pool = secret.length ? secret : places.map((_,i)=>i);
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function konamiWarp(){
    // 隠しワープフラグ（warp側でglitch発火）
    sessionStorage.setItem("warp_kuro", "1");

    const idx = pickSecretOrRandomIndex();
    if(idx == null) return;
    setCurrentPlaceIndex(idx);

    const onWarpPage = !!document.getElementById("placeTitle");

    // ワープページ：リロードで再描画
    if(onWarpPage){
      const c = document.getElementById("warpConsole");
      if(c) c.textContent = "KONAMI DETECTED...\nSECRET WARP...\nRELOADING...";
      fadeIn();
      setTimeout(() => location.reload(), 260);
      return;
    }

    // ドアページ：warp.htmlへ移動
    try{
      const fxCanvas = document.getElementById("fxCanvas");
      if(fxCanvas) burstParticles(fxCanvas);
      playDoorSound();
    }catch{}

    fadeIn();
    setTimeout(() => { location.href = "warp.html"; }, 520);
  }

  function initKonami(){
    const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let buf = [];

    window.addEventListener("keydown", (e) => {
      const t = e.target;
      const tag = (t && t.tagName) ? t.tagName.toLowerCase() : "";
      if(tag === "input" || tag === "textarea" || (t && t.isContentEditable)) return;

      buf.push(e.key);
      if(buf.length > KONAMI.length) buf.shift();

      if(KONAMI.every((k,i)=>buf[i]===k)){
        buf = [];
        konamiWarp();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initKonami);
})();
