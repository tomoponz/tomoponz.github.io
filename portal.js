// portal.js（無料MVP：Wikipedia + OSM）
// 演出：効果音／暗転／粒子／ワープログ

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

// ===== Wikipedia summary =====
async function fetchWikiSummary(title){
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "Accept":"application/json" } });
  if(!res.ok) throw new Error("wiki fetch failed");
  return await res.json();
}
function wikiLinkFromSummary(summary){
  return summary?.content_urls?.desktop?.page || null;
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

  if(doorBtn && doorWrap){
    doorBtn.addEventListener("click", () => {
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

  if(titleEl) titleEl.textContent = p.wikiTitle;
  if(descEl) descEl.textContent = "読み込み中…";
  if(mapBox) mapBox.innerHTML = osmEmbed(p.lat, p.lng);
  if(mapA) mapA.href = mapsLink(p.lat, p.lng);

  const c = document.getElementById("warpConsole");
  if(c) c.textContent = "warp init…\nOSM embed OK\nWikipedia fetch…";

  try{
    const sum = await fetchWikiSummary(p.wikiTitle);
    const t = sum.title || p.wikiTitle;
    const ex = sum.extract || "（説明が取れなかった。だが場所は本物だ。）";

    if(titleEl) titleEl.textContent = t;
    if(descEl) descEl.textContent = ex;

    const w = wikiLinkFromSummary(sum);
    if(wikiA) wikiA.href = w || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.wikiTitle)}`;

    const img = sum?.thumbnail?.source;
    if(imgBox){
      if(img) imgBox.innerHTML = `<img src="${img}" alt="${escapeHtml(t)}">`;
      else imgBox.innerHTML = `<div class="imgPh">画像なし（でもワープは成功）。</div>`;
    }

    addLog({ ts: Date.now(), title: t, lat: p.lat, lng: p.lng, mode:"free" });
    renderLog();
    logConsole("Wikipedia OK\nLOG saved\nDONE");
  }catch(e){
    if(descEl) descEl.textContent = "Wikipedia取得に失敗。回線かCORSの気分。もう一回ワープ。";
    if(wikiA) wikiA.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(p.wikiTitle)}`;
    if(imgBox) imgBox.innerHTML = `<div class="imgPh">画像読み込み失敗。</div>`;
    addLog({ ts: Date.now(), title: p.wikiTitle, lat: p.lat, lng: p.lng, mode:"free" });
    renderLog();
    logConsole("Wikipedia FAIL\nLOG saved\nDONE");
  }

  setTimeout(() => fadeOut(), 80);
}

window.warpAgain = function(){
  const { index } = pickRandomPlace();
  setCurrentPlaceIndex(index);
  fadeIn();
  setTimeout(() => location.reload(), 260);
};
