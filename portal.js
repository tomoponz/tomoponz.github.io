// portal.js（特殊演出・堅牢版：Wikipedia(ja) + OSM）
// - Wikipedia取得は多段フォールバックで「止まらない」
// - タイトル補正（検索）/ プロキシ(allorigins) / リトライ
// - lat/lng が無い場所は地図を非表示にできる

// ===== Places =====
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

// ===== Wikipedia (JA) config =====
const WIKI_HOST = "https://ja.wikipedia.org";
const WIKI_REST_SUMMARY = `${WIKI_HOST}/api/rest_v1/page/summary/`;
const WIKI_PAGE_BASE = `${WIKI_HOST}/wiki/`;
const WIKI_API = `${WIKI_HOST}/w/api.php`;
const PROXY_RAW = "https://api.allorigins.win/raw?url=";

// ===== utils =====
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function toWikiSlug(title){ return encodeURIComponent(String(title).replaceAll(" ", "_")); }
function wikiPageUrl(title){ return WIKI_PAGE_BASE + toWikiSlug(title); }
function wikiSearchUrl(q){ return `${WIKI_HOST}/w/index.php?search=${encodeURIComponent(String(q))}`; }

async function fetchTextDirect(url){ return await fetch(url, { cache:"no-store" }); }
async function fetchTextViaProxy(url){
  const proxied = PROXY_RAW + encodeURIComponent(url);
  return await fetch(proxied, { cache:"no-store" });
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
      return JSON.parse(txt);
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

// ===== Special FX (聖地演出) =====
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

let _audioCtx = null;
function getAudioCtx(){
  if(_audioCtx) return _audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  _audioCtx = new AC();
  return _audioCtx;
}

function triggerChaoticEffect() {
  const fx = loadFx();
  document.body.classList.add("glitch-mode");
  setTimeout(() => document.body.classList.remove("glitch-mode"), 3500);

  if (fx.sound) {
    const ctx = getAudioCtx();
    if(!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(114, now);
    osc.frequency.exponentialRampToValueAtTime(81, now + 3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 3.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 3.5);
  }
}

// ===== OSM =====
function osmEmbed(lat, lng){
  const d = 0.08;
  return `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-d}%2C${lat-d}%2C${lng+d}%2C${lat+d}&layer=mapnik&marker=${lat}%2C${lng}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}
function mapsLink(lat,lng){ return `https://www.google.com/maps?q=${lat},${lng}`; }

// ===== Door sound / particles =====
function playDoorSound(){
  const fx = loadFx(); if(!fx.sound) return;
  const ctx = getAudioCtx(); if(!ctx) return;
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(180, now);
  g.gain.setValueAtTime(0.12, now); g.gain.linearRampToValueAtTime(0, now + 0.2);
  o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.2);
}

function burstParticles(canvas){
  const fx = loadFx(); if(!fx.particles) return;
  const ctx = canvas.getContext("2d");
  if(!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const ps = Array.from({length:60}, () => ({
    x:rect.width/2, y:rect.height/2,
    vx:(Math.random()-0.5)*9, vy:(Math.random()-0.5)*9,
    life:1
  }));
  function step(){
    ctx.clearRect(0,0,rect.width,rect.height);
    for(const p of ps){
      p.x += p.vx; p.y += p.vy; p.life -= 0.02;
      if(p.life<=0) continue;
      ctx.fillStyle = `rgba(150,200,255,${p.life})`;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    if(ps.some(p=>p.life>0)) requestAnimationFrame(step);
  }
  step();
}

// ===== Log =====
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
  if(el) el.innerHTML = list.slice(0,10).map(it => `<li>${escapeHtml(it.title)} (${it.lat?.toFixed?.(2) ?? "--"})</li>`).join("");
}
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  renderFxStates();
  renderLog();

  const doorWrap = document.getElementById("doorWrap");
  if(doorWrap){
    doorWrap.addEventListener("click", () => {
      const { index } = pickRandomPlace();
      setCurrentPlaceIndex(index);

      const fxCanvas = document.getElementById("fxCanvas");
      if(fxCanvas) burstParticles(fxCanvas);
      playDoorSound();

      doorWrap.classList.add("opening");
      setTimeout(() => fadeIn(), 180);
      setTimeout(() => { location.href = "warp.html"; }, 560);
    });
  }

  if(document.getElementById("placeTitle")) renderWarp();
});

async function renderWarp(){
  const places = window.PLACES || [];
  if(!places.length) throw new Error("PLACES is empty");

  let idx = getCurrentPlaceIndex();
  if(idx == null || idx < 0 || idx >= places.length) idx = pickRandomPlace().index;
  const p = places[idx];

  const titleEl = document.getElementById("placeTitle");
  const descEl  = document.getElementById("placeDesc");
  const imgBox  = document.getElementById("imgBox");
  const mapBox  = document.getElementById("mapBox");
  const mapA    = document.getElementById("mapLink");
  const wikiA   = document.getElementById("wikiLink");
  const c       = document.getElementById("warpConsole");

  // 特殊演出（ミーム）
  if(p.wikiTitle === "野獣邸"){
    triggerChaoticEffect();
    if(c) c.innerHTML = "<span style='color:red'>WARNING: CHAOTIC SPACE</span>";
  }

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

  // wiki fetch
  if(c) c.textContent = "warp init...\nWikipedia fetch...";
  const data = await getWikiDataSmart(p.wikiTitle, (s)=>{ if(c) c.textContent += "\n" + s; });

  if(titleEl) titleEl.textContent = data.title;
  if(descEl) descEl.textContent = data.extract;

  if(wikiA) wikiA.href = data.pageUrl || wikiSearchUrl(p.wikiTitle);

  if(imgBox){
    imgBox.innerHTML = data.thumbnail
      ? `<img src="${data.thumbnail}" alt="${escapeHtml(data.title)}">`
      : `<div class="imgPh">画像なし</div>`;
  }

  addLog({ ts: Date.now(), title: data.title, lat: p.lat ?? NaN, lng: p.lng ?? NaN });
  renderLog();
  setTimeout(() => fadeOut(), 80);
}

window.warpAgain = function(){
  setCurrentPlaceIndex(pickRandomPlace().index);
  fadeIn();
  setTimeout(() => location.reload(), 260);
};
