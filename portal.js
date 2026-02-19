// portal.js（堅牢版：Wikipedia(ja) + OSM）
// 演出：効果音／暗転／粒子／ワープログ
// Wikipedia取得が失敗しても「止まらず」必ず表示する（多段フォールバック）
//
// 取得順：
// 1) REST summary（ja.wikipedia.org/api/rest_v1）
// 2) MediaWiki API（action=query extracts/pageimages redirects）
// 3) 404/曖昧タイトルなら検索して「近い記事」に補正
// 4) direct fetch が落ちたら allorigins プロキシで再試行
// 5) それでも無理なら「説明は取れなかった」＋Wikipedia検索リンクを出す
//
// ※ door.html でも places.js を読み込むこと（window.PLACES が必要）

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

// 無料プロキシ（CORS/回線/仕様変更の逃げ道）
const PROXY_RAW = "https://api.allorigins.win/raw?url=";

// ===== utils =====
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function toWikiSlug(title){
  // RESTはスペース→_ が安定しがち
  return encodeURIComponent(String(title).replaceAll(" ", "_"));
}
function wikiPageUrl(title){
  return WIKI_PAGE_BASE + toWikiSlug(title);
}
function wikiSearchUrl(q){
  return `${WIKI_HOST}/w/index.php?search=${encodeURIComponent(String(q))}`;
}

async function fetchTextDirect(url){
  const res = await fetch(url, { cache: "no-store" });
  return res;
}
async function fetchTextViaProxy(url){
  const proxied = PROXY_RAW + encodeURIComponent(url);
  const res = await fetch(proxied, { cache: "no-store" });
  return res;
}

async function fetchJsonWithRetry(url, { tryProxy=false, retries=2 } = {}){
  let lastErr = null;

  for(let attempt=0; attempt<=retries; attempt++){
    try{
      const res = tryProxy ? await fetchTextViaProxy(url) : await fetchTextDirect(url);

      // 429/5xx は少し待って再試行
      if([429, 500, 502, 503, 504].includes(res.status)){
        lastErr = new Error(`HTTP ${res.status}`);
        const wait = 250 * Math.pow(2, attempt);
        await sleep(wait);
        continue;
      }

      if(!res.ok){
        // 404等はここで返す（呼び出し側で分岐）
        const e = new Error(`HTTP ${res.status}`);
        e.httpStatus = res.status;
        throw e;
      }

      const txt = await res.text();
      return JSON.parse(txt);
    }catch(e){
      lastErr = e;
      // ネットワークエラー等：少し待って再試行
      const wait = 200 * Math.pow(2, attempt);
      await sleep(wait);
    }
  }

  throw lastErr || new Error("fetch failed");
}

function apiUrl(params){
  const u = new URL(WIKI_API);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, String(v)));
  u.searchParams.set("origin", "*");     // CORS許可
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

// ===== Wiki fallback strategy =====
async function searchBestTitle(query, { proxy=false } = {}){
  // タイトルが曖昧/存在しない時に、検索上位を採用
  const js = await mwApi({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: 1,
    srprop: ""
  }, { proxy });

  const t = js?.query?.search?.[0]?.title;
  return t || null;
}

function pickFromMwQuery(js){
  const page = js?.query?.pages?.[0];
  if(!page) return null;
  if(page.missing) return { missing:true };
  return {
    title: page.title,
    extract: page.extract || "",
    thumbnail: page?.thumbnail?.source || null
  };
}

async function fetchViaMediaWiki(title){
  // extracts + pageimages で「説明文＋画像」を取る（RESTより堅牢）
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
  }, { proxy:false });

  const picked = pickFromMwQuery(js);
  if(picked && !picked.missing){
    const pageUrl = js?.query?.pages?.[0]?.fullurl || wikiPageUrl(picked.title);
    return {
      title: picked.title,
      extract: picked.extract,
      thumbnail: picked.thumbnail,
      pageUrl
    };
  }
  return { missing:true };
}

async function fetchViaMediaWikiProxy(title){
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
  }, { proxy:true });

  const picked = pickFromMwQuery(js);
  if(picked && !picked.missing){
    const pageUrl = js?.query?.pages?.[0]?.fullurl || wikiPageUrl(picked.title);
    return {
      title: picked.title,
      extract: picked.extract,
      thumbnail: picked.thumbnail,
      pageUrl
    };
  }
  return { missing:true };
}

async function getWikiDataSmart(inputTitle, logFn){
  const original = String(inputTitle || "").trim() || "日本";
  const log = (s)=>{ try{ logFn && logFn(s); }catch{} };

  // 0) 入力タイトルのWikipediaリンクは常に作っておく
  let fallbackLink = wikiPageUrl(original);

  // 1) REST summary（direct）
  try{
    log("Wikipedia REST (direct)...");
    const sum = await restSummary(original, { proxy:false });

    const title = sum?.title || original;
    const extract = sum?.extract || "";
    const pageUrl = sum?.content_urls?.desktop?.page || wikiPageUrl(title);
    const thumbnail = sum?.thumbnail?.source || null;

    if(extract){
      log("REST OK");
      return { title, extract, thumbnail, pageUrl };
    }

    // extractが空でも次に回す
    log("REST empty -> fallback");
    fallbackLink = pageUrl;
  }catch(e){
    log(`REST fail: ${e.message}`);
  }

  // 2) MediaWiki API（direct）
  try{
    log("MediaWiki API (direct)...");
    const mw = await fetchViaMediaWiki(original);
    if(!mw.missing && mw.extract){
      log("MW API OK");
      return mw;
    }
    log("MW missing/empty -> search");
    fallbackLink = wikiPageUrl(original);
  }catch(e){
    log(`MW API fail: ${e.message}`);
  }

  // 3) 検索で「近い記事」に補正（direct）
  try{
    log("Search best title (direct)...");
    const best = await searchBestTitle(original, { proxy:false });
    if(best){
      log(`Search -> ${best}`);
      // 補正タイトルで再取得（MW direct）
      try{
        const mw2 = await fetchViaMediaWiki(best);
        if(!mw2.missing && mw2.extract){
          log("MW API (best) OK");
          return mw2;
        }
      }catch(e2){
        log(`MW(best) fail: ${e2.message}`);
      }

      // REST proxyも試す（best）
      try{
        log("REST (best via proxy)...");
        const sum2 = await restSummary(best, { proxy:true });
        const title2 = sum2?.title || best;
        const extract2 = sum2?.extract || "";
        const pageUrl2 = sum2?.content_urls?.desktop?.page || wikiPageUrl(title2);
        const thumbnail2 = sum2?.thumbnail?.source || null;
        if(extract2){
          log("REST(best proxy) OK");
          return { title: title2, extract: extract2, thumbnail: thumbnail2, pageUrl: pageUrl2 };
        }
      }catch(e3){
        log(`REST(best proxy) fail: ${e3.message}`);
      }

      fallbackLink = wikiPageUrl(best);
    }else{
      log("Search result: none");
      fallbackLink = wikiSearchUrl(original);
    }
  }catch(e){
    log(`Search fail: ${e.message}`);
    fallbackLink = wikiSearchUrl(original);
  }

  // 4) MediaWiki API（proxy）
  try{
    log("MediaWiki API (proxy)...");
    const mwP = await fetchViaMediaWikiProxy(original);
    if(!mwP.missing && mwP.extract){
      log("MW API (proxy) OK");
      return mwP;
    }
  }catch(e){
    log(`MW API (proxy) fail: ${e.message}`);
  }

  // 5) 最終：必ず返す（失敗しても画面は埋める）
  log("FINAL fallback");
  return {
    title: original,
    extract: "Wikipediaの説明取得に失敗（回線/CORS/仕様/存在しない記事など）。でもワープ自体は成功。",
    thumbnail: null,
    pageUrl: fallbackLink || wikiSearchUrl(original)
  };
}

// ===== OSM embed =====
function osmEmbed(lat, lng){
  const d = 0.08;
  const left = lng - d, right = lng + d, top = lat + d, bottom = lat - d;
  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  return `<iframe src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}
function mapsLink(lat,lng){ return `https://www.google.com/maps?q=${lat},${lng}`; }

// ===== FX Settings =====
const FX_KEY = "warp_fx_v1";
function loadFx(){
  try{
    const v = JSON.parse(localStorage.getItem(FX_KEY) || "{}");
    return { sound: v.sound !== false, particles: v.particles !== false };
  }catch{ return { sound:true, particles:true }; }
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

// ===== Fade =====
function fadeIn(){
  const f = document.getElementById("fade");
  if(f) f.classList.add("fadeIn");
}
function fadeOut(){
  const f = document.getElementById("fade");
  if(f) f.classList.remove("fadeIn");
}

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
  const fx = loadFx();
  if(!fx.sound) return;
  const ctx = getAudioCtx();
  if(!ctx) return;

  const now = ctx.currentTime;

  // click
  const o1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  o1.type = "triangle";
  o1.frequency.setValueAtTime(180, now);
  o1.frequency.exponentialRampToValueAtTime(90, now + 0.08);
  g1.gain.setValueAtTime(0.0001, now);
  g1.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  o1.connect(g1).connect(ctx.destination);
  o1.start(now);
  o1.stop(now + 0.14);

  // whoosh noise
  const dur = 0.45;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0;i<data.length;i++){
    const t = i / data.length;
    data[i] = (Math.random()*2-1) * Math.sin(Math.PI * t);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(700, now);
  bp.frequency.exponentialRampToValueAtTime(260, now + dur);

  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, now);
  g2.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  src.connect(bp).connect(g2).connect(ctx.destination);
  src.start(now);
  src.stop(now + dur);
}

// ===== Particles =====
function burstParticles(canvas){
  const fx = loadFx();
  if(!fx.particles) return;

  const ctx = canvas.getContext("2d");
  if(!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const W = rect.width, H = rect.height;
  const cx = W*0.5, cy = H*0.55;

  const n = 90;
  const ps = [];
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 40 + Math.random()*220;
    ps.push({
      x: cx, y: cy,
      vx: Math.cos(a)*sp,
      vy: Math.sin(a)*sp - 30,
      life: 0.65 + Math.random()*0.35,
      r: 1 + Math.random()*2.6
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
      p.vy += 240 * dt;
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

// ===== Warp Log =====
const LOG_KEY = "warp_log_v1";
function loadLog(){
  try{ return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); }
  catch{ return []; }
}
function saveLog(list){ localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 40))); }
function addLog(entry){
  const list = loadLog();
  list.unshift(entry);
  saveLog(list);
}
function formatTs(ts){
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}
function renderLog(){
  const list = loadLog();

  const shortEl = document.getElementById("warpLogShort");
  if(shortEl){
    shortEl.innerHTML = "";
    const items = list.slice(0,6);
    if(!items.length){
      shortEl.innerHTML = `<li class="muted">まだワープしてない</li>`;
    }else{
      for(const it of items){
        const li = document.createElement("li");
        li.innerHTML = `<b>${formatTs(it.ts)}</b> ${escapeHtml(it.title)}`;
        shortEl.appendChild(li);
      }
    }
  }

  const fullEl = document.getElementById("warpLogList");
  if(fullEl){
    fullEl.innerHTML = "";
    const items = list.slice(0,18);
    if(!items.length){
      fullEl.innerHTML = `<li class="muted">ログなし</li>`;
    }else{
      for(const it of items){
        const li = document.createElement("li");
        li.innerHTML =
          `<b>${formatTs(it.ts)}</b> ${escapeHtml(it.title)} <span class="muted">(${it.lat.toFixed(3)}, ${it.lng.toFixed(3)})</span>`;
        fullEl.appendChild(li);
      }
    }
  }
}
window.clearWarpLog = function(){
  localStorage.removeItem(LOG_KEY);
  renderLog();
};

// tiny escape
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ===== Door / Warp init =====
document.addEventListener("DOMContentLoaded", () => {
  renderFxStates();
  renderLog();

  // Door page
  const doorBtn = document.getElementById("doorBtn");
  const doorWrap = document.getElementById("doorWrap");
  const fxCanvas = document.getElementById("fxCanvas");

  if(doorWrap){
    const clickTarget = doorBtn || doorWrap; // ボタンが無ければドア全体クリック
    clickTarget.addEventListener("click", () => {
      const { index } = pickRandomPlace();
      setCurrentPlaceIndex(index);

      if(fxCanvas) burstParticles(fxCanvas);
      playDoorSound();

      doorWrap.classList.add("opening");
      setTimeout(() => fadeIn(), 180);
      setTimeout(() => { location.href = "warp.html"; }, 560);
    });
  }

  // Warp page
  if(document.getElementById("placeTitle")){
    renderWarp();
  }
});

// ===== Warp page logic =====
function logConsole(line){
  const el = document.getElementById("warpConsole");
  if(!el) return;
  el.textContent += `\n${line}`;
}

async function renderWarp(){
  const places = window.PLACES || [];
  let idx = getCurrentPlaceIndex();
  if(idx == null || idx < 0 || idx >= places.length){
    idx = pickRandomPlace().index;
    setCurrentPlaceIndex(idx);
  }
  const p = places[idx];

  const titleEl = document.getElementById("placeTitle");
  const descEl  = document.getElementById("placeDesc");
  const imgBox  = document.getElementById("imgBox");
  const mapBox  = document.getElementById("mapBox");
  const mapA    = document.getElementById("mapLink");
  const wikiA   = document.getElementById("wikiLink");
  const c       = document.getElementById("warpConsole");

  if(titleEl) titleEl.textContent = p.wikiTitle || "Loading...";
  if(descEl) descEl.textContent = "読み込み中…";
  if(mapBox) mapBox.innerHTML = osmEmbed(p.lat, p.lng);
  if(mapA) mapA.href = mapsLink(p.lat, p.lng);

  if(c) c.textContent = "warp init…\nOSM embed OK\nWikipedia(ja) fetch…";

  const data = await getWikiDataSmart(p.wikiTitle, (s)=>logConsole(s));

  if(titleEl) titleEl.textContent = data.title || (p.wikiTitle || "");
  if(descEl) descEl.textContent = data.extract || "（説明が取れなかった。だが場所は本物だ。）";

  if(wikiA) wikiA.href = data.pageUrl || wikiSearchUrl(p.wikiTitle);

  if(imgBox){
    if(data.thumbnail){
      imgBox.innerHTML = `<img src="${data.thumbnail}" alt="${escapeHtml(data.title || p.wikiTitle)}">`;
    }else{
      imgBox.innerHTML = `<div class="imgPh">画像なし（でもワープは成功）。</div>`;
    }
  }

  addLog({ ts: Date.now(), title: data.title || p.wikiTitle, lat: p.lat, lng: p.lng, mode:"free" });
  renderLog();
  logConsole("DONE");

  setTimeout(() => fadeOut(), 80);
}

window.warpAgain = function(){
  const { index } = pickRandomPlace();
  setCurrentPlaceIndex(index);
  fadeIn();
  setTimeout(() => location.reload(), 260);
};
