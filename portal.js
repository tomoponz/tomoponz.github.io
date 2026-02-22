// portal.js（互換強化版：Wikipedia(ja) + OSM / Door→Warp / ログ / トグル / コナミ）
// - warp.html の構造（imgBox / imgPh / warpLogList / onclick warpAgain）に対応
// - 2026/02/20: 野獣邸ヒット時のカオス演出（glitch-mode）

(() => {
  "use strict";
  console.log("[portal.js] loaded (compat)");

  // =====================
  // Config
  // =====================
  const WIKI_HOST = "https://ja.wikipedia.org";
  const WIKI_REST_SUMMARY = `${WIKI_HOST}/api/rest_v1/page/summary/`;
  const WIKI_PAGE_BASE = `${WIKI_HOST}/wiki/`;
  const WIKI_API = `${WIKI_HOST}/w/api.php`;

  const PROXY_RAW = "https://api.allorigins.win/raw?url=";

  const WARP_INDEX_KEY = "warp_place_index"; // sessionStorage
  const WARP_LOG_KEY = "warp_log_v1";         // localStorage

  const KURO_UNLOCK_KEY = "kuro_unlocked_v1";

  const FX_SOUND_KEY = "fx_sound_v1";
  const FX_PARTICLES_KEY = "fx_particles_v1";

  // =====================
  // Helpers
  // =====================
  const $ = (id) => document.getElementById(id);

  function pageFile() {
    return (location.pathname.split("/").pop() || "index.html").toLowerCase();
  }
  function isDoorPage() { return pageFile() === "door.html"; }
  function isWarpPage() { return pageFile() === "warp.html"; }
  function isKuroPage() { return pageFile() === "kuro.html" || document.body?.dataset?.page === "kuro"; }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(s) {
    // href等に入れる用（最小）
    return String(s).replaceAll(`"`, "&quot;").replaceAll(`'`, "&#039;");
  }

  function toWikiSlug(title) {
    return encodeURIComponent(String(title).replaceAll(" ", "_"));
  }
  function wikiPageUrl(title) {
    return WIKI_PAGE_BASE + toWikiSlug(title);
  }
  function wikiSearchUrl(q) {
    return `${WIKI_HOST}/w/index.php?search=${encodeURIComponent(String(q))}`;
  }

  function getConsoleEl() {
    return $("warpConsole") || $("console");
  }

  const DEV_MODE = (new URLSearchParams(location.search).get("dev") === "1");
  function status(line){
    const c = getConsoleEl();
    if(!c) return;
    // 既存文字列を置き換え（画面の“内部ログ”にならないよう短文に）
    c.textContent = String(line || "");
  }
  function log(line) {
    // 画面に“こちら側メモ”が出ないよう、通常は沈黙（dev=1 の時だけ出す）
    if(!DEV_MODE) return;
    const c = getConsoleEl();
    if (c) c.textContent += (c.textContent ? "\n" : "") + line;
    else console.log(line);
  }

  // =====================
  // Chaotic Effect (野獣邸専用)
  // =====================
  function triggerChaoticEffect() {
    document.body.classList.add("glitch-mode");

    const c = getConsoleEl();
    if (c) {
      // textContent ベースで崩れないように先頭に追記
      c.textContent = `WARNING: CHAOTIC SPACE DETECTED\n` + (c.textContent || "");
    }
    console.warn("イキスギィ！！！");
  }

  // =====================
  // Places selection
  // =====================
  function pickRandomPlace(list) {
    const places = Array.isArray(list) ? list : (window.PLACES || []);
    if (!places.length) throw new Error("PLACES is empty");
    const i = Math.floor(Math.random() * places.length);
    return { place: places[i], index: i };
  }

  // 公開ワープ先（kuro:true を除外）から、元の index を保ったままランダム選択
  function pickRandomPublicPlace() {
    const places = window.PLACES || [];
    const pool = places
      .map((place, index) => ({ place, index }))
      .filter(x => x.place && !x.place.kuro);
    if (!pool.length) throw new Error("No public places");
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function setCurrentPlaceIndex(i) {
    sessionStorage.setItem(WARP_INDEX_KEY, String(i));
  }
  function getCurrentPlaceIndex() {
    const v = sessionStorage.getItem(WARP_INDEX_KEY);
    const i = Number(v);
    return Number.isFinite(i) ? i : null;
  }

  // =====================
  // Warp Log
  // =====================
  function loadWarpLog() {
    try {
      const raw = localStorage.getItem(WARP_LOG_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function saveWarpLog(arr) {
    const cut = Array.isArray(arr) ? arr.slice(0, 200) : [];
    localStorage.setItem(WARP_LOG_KEY, JSON.stringify(cut));
  }
  function pushWarpLog(item) {
    const arr = loadWarpLog();
    arr.unshift(item);
    saveWarpLog(arr);
  }

  function renderWarpLogs() {
    const ulShort = $("warpLogShort");
    const ulList = $("warpLogList");

    const arr = loadWarpLog();
    if (ulShort) {
      const a = arr.slice(0, 6);
      ulShort.innerHTML = a.length
        ? a.map(x => `<li>${escapeHtml(x.title)} <span class="muted">(${escapeHtml(x.time)})</span></li>`).join("")
        : `<li class="muted">まだログなし</li>`;
    }

    if (ulList) {
      const a = arr.slice(0, 20);
      ulList.innerHTML = a.length
        ? a.map(x => {
            const url = x.url || "#";
            const safeUrl = escapeAttr(url);
            return `<li>
              <a href="${safeUrl}" target="_blank" rel="noopener">${escapeHtml(x.title)}</a>
              <span class="muted">(${escapeHtml(x.time)})</span>
            </li>`;
          }).join("")
        : `<li class="muted">まだログなし</li>`;
    }
  }

  window.clearWarpLog = function () {
    localStorage.removeItem(WARP_LOG_KEY);
    renderWarpLogs();
    alert("ログ消した。");
  };

  // =====================
  // FX toggles (Door)
  // =====================
  function getBoolLS(key, def) {
    const v = localStorage.getItem(key);
    if (v == null) return def;
    return v === "1";
  }
  function setBoolLS(key, val) {
    localStorage.setItem(key, val ? "1" : "0");
  }

  function fxSoundOn() { return getBoolLS(FX_SOUND_KEY, true); }
  function fxParticlesOn() { return getBoolLS(FX_PARTICLES_KEY, true); }

  function updateFxUI() {
    const s = $("fxSoundState");
    const p = $("fxParticlesState");
    if (s) s.textContent = fxSoundOn() ? "ON" : "OFF";
    if (p) p.textContent = fxParticlesOn() ? "ON" : "OFF";
  }

  window.toggleFxSound = function () {
    setBoolLS(FX_SOUND_KEY, !fxSoundOn());
    updateFxUI();
  };
  window.toggleFxParticles = function () {
    setBoolLS(FX_PARTICLES_KEY, !fxParticlesOn());
    updateFxUI();
  };

  // =====================
  // Door: sound + particles
  // =====================
  function playClickSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = 880;
      g.gain.value = 0.03;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 120);
    } catch {}
  }

  function burstParticles(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);

    const W = rect.width, H = rect.height;
    const N = 120;
    const parts = Array.from({ length: N }, () => {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.6 + Math.random() * 2.2;
      return {
        x: W / 2, y: H / 2,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 1 + Math.random() * 2,
        life: 40 + Math.random() * 30
      };
    });

    let t = 0;
    function step() {
      t++;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 0.9;

      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.985; p.vy *= 0.985;
        p.life -= 1;

        if (p.life > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(190,230,255,0.85)";
          ctx.fill();
        }
      });

      if (t < 70) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(step);
  }

  // =====================
  // Wikipedia fetch (robust)
  // =====================
  async function fetchTextDirect(url) {
    return await fetch(url, { cache: "no-store" });
  }
  async function fetchTextViaProxy(url) {
    const proxied = PROXY_RAW + encodeURIComponent(url);
    return await fetch(proxied, { cache: "no-store" });
  }

  async function fetchJsonWithRetry(url, { tryProxy = false, retries = 2 } = {}) {
    let lastErr = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = tryProxy ? await fetchTextViaProxy(url) : await fetchTextDirect(url);

        if ([429, 500, 502, 503, 504].includes(res.status)) {
          lastErr = new Error(`HTTP ${res.status}`);
          await sleep(200 * Math.pow(2, attempt));
          continue;
        }
        if (!res.ok) {
          const e = new Error(`HTTP ${res.status}`);
          e.httpStatus = res.status;
          throw e;
        }

        const txt = await res.text();
        return JSON.parse(txt);
      } catch (e) {
        lastErr = e;
        await sleep(150 * Math.pow(2, attempt));
      }
    }

    throw lastErr || new Error("fetch failed");
  }

  function apiUrl(params) {
    const u = new URL(WIKI_API);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
    u.searchParams.set("origin", "*");
    u.searchParams.set("format", "json");
    u.searchParams.set("formatversion", "2");
    return u.toString();
  }

  async function mwApi(params, { proxy = false } = {}) {
    const url = apiUrl(params);
    return await fetchJsonWithRetry(url, { tryProxy: proxy, retries: 2 });
  }

  async function restSummary(title, { proxy = false } = {}) {
    const url = WIKI_REST_SUMMARY + toWikiSlug(title);
    return await fetchJsonWithRetry(url, { tryProxy: proxy, retries: 2 });
  }

  async function searchBestTitle(query, { proxy = false } = {}) {
    const js = await mwApi({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: 1,
      srprop: ""
    }, { proxy });
    return js?.query?.search?.[0]?.title || null;
  }

  function pickFromMwQuery(js) {
    const page = js?.query?.pages?.[0];
    if (!page || page.missing) return { missing: true };

    return {
      title: page.title,
      extract: page.extract || "",
      thumbnail: page?.thumbnail?.source || null,
      pageUrl: page?.fullurl || wikiPageUrl(page.title)
    };
  }

  async function fetchViaMediaWiki(title, { proxy = false } = {}) {
    const js = await mwApi({
      action: "query",
      prop: "extracts|pageimages|info",
      titles: title,
      redirects: 1,
      explaintext: 1,
      exintro: 1,
      piprop: "thumbnail",
      pithumbsize: 900,
      inprop: "url"
    }, { proxy });
    return pickFromMwQuery(js);
  }

  function normalizeFromRest(js, fallbackTitle) {
    const title = js?.title || fallbackTitle;
    const extract = js?.extract || "";
    const thumb = js?.thumbnail?.source || null;
    const url = js?.content_urls?.desktop?.page || wikiPageUrl(title);

    return { title, extract, thumbnail: thumb, pageUrl: url, ok: Boolean(title) };
  }

  async function getWikiDataSmart(inputTitle) {
    const original = String(inputTitle || "").trim();
    if (!original) throw new Error("empty title");

    try {
      log(`wiki(rest direct): ${original}`);
      const js = await restSummary(original, { proxy: false });
      return normalizeFromRest(js, original);
    } catch (e1) {
      log(`rest direct failed: ${e1.message}`);
    }

    try {
      log(`wiki(rest proxy): ${original}`);
      const js = await restSummary(original, { proxy: true });
      return normalizeFromRest(js, original);
    } catch (e2) {
      log(`rest proxy failed: ${e2.message}`);
    }

    let best = null;
    try {
      log(`wiki(search direct): ${original}`);
      best = await searchBestTitle(original, { proxy: false });
    } catch (e3) {
      log(`search direct failed: ${e3.message}`);
    }

    if (!best) {
      try {
        log(`wiki(search proxy): ${original}`);
        best = await searchBestTitle(original, { proxy: true });
      } catch (e4) {
        log(`search proxy failed: ${e4.message}`);
      }
    }

    const corrected = best || original;

    try {
      log(`wiki(mw direct): ${corrected}`);
      const data = await fetchViaMediaWiki(corrected, { proxy: false });
      if (!data.missing) return { ...data, ok: true };
      throw new Error("mw missing");
    } catch (e5) {
      log(`mw direct failed: ${e5.message}`);
    }

    try {
      log(`wiki(mw proxy): ${corrected}`);
      const data = await fetchViaMediaWiki(corrected, { proxy: true });
      if (!data.missing) return { ...data, ok: true };
      throw new Error("mw missing");
    } catch (e6) {
      log(`mw proxy failed: ${e6.message}`);
    }

    return {
      title: corrected,
      extract: "取得に失敗した。検索リンクから開け。",
      thumbnail: null,
      pageUrl: wikiSearchUrl(original),
      ok: false
    };
  }

  // =====================
  // OSM Map (warp.html の CSS(mapBox iframe 100%) に合わせる)
  // =====================
  function setMap(lat, lng) {
    const mapBox = $("mapBox");
    const mapLink = $("mapLink");
    if (!mapBox) return;

    if (typeof lat !== "number" || typeof lng !== "number") {
      mapBox.innerHTML = "";
      if (mapLink) {
        mapLink.href = "#";
        mapLink.style.pointerEvents = "none";
        mapLink.style.opacity = "0.5";
      }
      return;
    }

    const d = 0.01;
    const left = lng - d, right = lng + d, top = lat + d, bottom = lat - d;
    const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
      `${left},${bottom},${right},${top}`
    )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;

    const open = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;

    mapBox.innerHTML = `<iframe src="${embed}" loading="lazy" referrerpolicy="no-referrer"></iframe>`;

    if (mapLink) {
      mapLink.href = open;
      mapLink.style.pointerEvents = "";
      mapLink.style.opacity = "1";
    }
  }

  // =====================
  // UI rendering
  // =====================
  function setLink(a, href) {
    if (!a) return;
    if (!href || href === "#") {
      a.href = "#";
      a.style.pointerEvents = "none";
      a.style.opacity = "0.5";
      return;
    }
    a.href = href;
    a.style.pointerEvents = "";
    a.style.opacity = "1";
  }

  // warp.html に合わせて「imgBox + .imgPh」を操作（placeImg が無くてもOK）
  function setImage(url) {
    const img = $("placeImg");
    const box = $("imgBox");
    const ph = $("imgPh") || box?.querySelector?.(".imgPh");

    // 1) もし placeImg があれば優先
    if (img) {
      if (url) {
        img.src = url;
        img.style.display = "";
        if (ph) ph.style.display = "none";
      } else {
        img.removeAttribute("src");
        img.style.display = "none";
        if (ph) ph.style.display = "";
      }
      return;
    }

    // 2) placeImg が無い場合、imgBox を直接差し替え
    if (!box) return;
    if (url) {
      box.innerHTML = `<img src="${escapeAttr(url)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" referrerpolicy="no-referrer">`;
    } else {
      box.innerHTML = `<div class="imgPh">画像なし</div>`;
    }
  }

  async function renderPlace(place, { recordLog = true } = {}) {
    // カオス判定（野獣邸）
    if (place?.wikiTitle === "野獣邸") triggerChaoticEffect();
    else document.body.classList.remove("glitch-mode");

    const titleEl = $("placeTitle");
    const descEl = $("placeDesc");
    const wikiA = $("wikiLink");

    if (!titleEl || !descEl) return;

    if (place?.kuro) {
      const t = place.kuroTitle || place.wikiTitle || "黒歴史";
      const d = place.kuroText || "黒歴史。";
      titleEl.textContent = t;
      descEl.textContent = d;

      setLink(wikiA, place.kuroLink || "#");
      setImage(place.kuroImg || null);

      setMap(
        typeof place.lat === "number" ? place.lat : null,
        typeof place.lng === "number" ? place.lng : null
      );

      if (recordLog) {
        pushWarpLog({ title: t, time: new Date().toLocaleString(), url: place.kuroLink || "kuro.html" });
        renderWarpLogs();
      }
      status("完了。");
      return;
    }

    const wikiTitle = place?.wikiTitle || "メインページ";
    status("Wikipediaを取得中…");
    const data = await getWikiDataSmart(wikiTitle);

    titleEl.textContent = data.title || wikiTitle;
    try{
      const tt = String(data.title || wikiTitle || "");
      if(tt.includes("コートコーポレーション")){
        if(window.playSfx) window.playSfx("yarimasunee", 1.0, {boost: 2.8});
      }
    }catch(e){}
    const excerpt = (data.extract || "").trim();
    descEl.textContent = excerpt ? excerpt : "説明の取得に失敗。リンクから開け。";

    setLink(wikiA, data.pageUrl || wikiPageUrl(wikiTitle));
    setImage(data.thumbnail || null);

    status("地図を生成中…");
    const lat = (typeof place.lat === "number") ? place.lat : null;
    const lng = (typeof place.lng === "number") ? place.lng : null;
    setMap(lat, lng);

    if (recordLog) {
      pushWarpLog({ title: data.title || wikiTitle, time: new Date().toLocaleString(), url: data.pageUrl || wikiPageUrl(wikiTitle) });
      renderWarpLogs();
    }
    status("完了。");
  }

  // =====================
  // door.html behavior
  // =====================
  let doorBusy = false;

  function startDoorWarp() {
    if (doorBusy) return;
    doorBusy = true;

    const wrap = $("doorWrap");
    const fade = $("fade");
    const canvas = $("fxCanvas");

    // ワープ先を先に決めておく
    const { index } = pickRandomPublicPlace();
    setCurrentPlaceIndex(index);

    // 1) まずドア演出を見せる（opening → ガタガタ → 開く）
    if (wrap) wrap.classList.add("opening");
    if (fxParticlesOn()) burstParticles(canvas);
    if (fxSoundOn()) playClickSound();

    // 2) 暗転は“開き始めてから”に遅らせる（早いと演出が見えない）
    //    - door.html 側の CSS で doorOpen は 0.28s から開始 → 0.70s で完了
    //    - なので fade は 0.55s 付近で開始すると、開く瞬間がちゃんと見える
    setTimeout(() => {
      if (fade) fade.classList.add("fadeIn");
    }, 560);

    // 3) 遷移はドアが開き切ってから
    setTimeout(() => {
      // shell(iframe) なら親に遷移を委譲（URL/アクティブ表示/SEを維持）
      if(window.self !== window.top){
        const payload = { type:"NAV", href:"warp.html" };
        try{ window.parent && window.parent.postMessage(payload, location.origin); return; }catch(_){ }
        try{ window.parent && window.parent.postMessage(payload, "*"); return; }catch(_){ }
      }
      location.href = "warp.html";
    }, 1120);
  }

  function initDoor() {
    updateFxUI();
    renderWarpLogs();

    const btn = $("doorBtn");
    if (btn) btn.addEventListener("click", startDoorWarp);

    if (!Array.isArray(window.PLACES) || !window.PLACES.length) {
      log("WARN: places.js が読めてない（PLACESが空）");
    }
  }

  // =====================
  // warp.html behavior
  // =====================
  function warpAgainImpl() {
    const places = window.PLACES || [];
    if (!places.length) return;
    const p = pickRandomPublicPlace();
    setCurrentPlaceIndex(p.index);
    location.reload();
  }

  async function initWarp() {
    status("ワープ先を解析中…");
    const places = window.PLACES || [];
    if (!places.length) {
      status("ERR: データが読めません（places）。");
      return;
    }

    let idx = getCurrentPlaceIndex();
    // 直打ち/復元で kuro:true を引いた場合も回避
    if (idx == null || !places[idx] || places[idx]?.kuro) {
      const p = pickRandomPublicPlace();
      idx = p.index;
      setCurrentPlaceIndex(idx);
    }

    try {
      await renderPlace(places[idx], { recordLog: true });
    } catch (e) {
      log(`render failed: ${e.message}`);
      const titleEl = $("placeTitle");
      const descEl = $("placeDesc");
      const wikiA = $("wikiLink");
      if (titleEl) titleEl.textContent = places[idx]?.wikiTitle || "Warp";
      if (descEl) descEl.textContent = "表示に失敗。";
      if (wikiA) setLink(wikiA, wikiSearchUrl(places[idx]?.wikiTitle || "Wikipedia"));
      setImage(null);
      setMap(null, null);
    }

    // id="warpAgain" があるならイベント、無いなら onclick 用に window.warpAgain を提供
    const again = $("warpAgain");
    if (again) again.addEventListener("click", warpAgainImpl);
    window.warpAgain = warpAgainImpl;
  
    status("完了。");
}

  // =====================
  // kuro.html behavior
  // =====================
  async function initKuro() {
    const places = window.PLACES || [];
    const kuroList = places.filter(p => p && p.kuro);
    if (!kuroList.length) {
      log("kuro:true の候補が無い。");
      return;
    }
    const { place } = pickRandomPlace(kuroList);
    await renderPlace(place, { recordLog: false });
  }

  // =====================
  // Konami command → kuro.html
  // =====================
  function initKonami() {
    const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let i = 0;

    function navToKuroWithSfx(){
      // unlock を共有（同一オリジンの iframe/shell 間で sessionStorage は共有される）
      sessionStorage.setItem(KURO_UNLOCK_KEY, "1");

      // shell(iframe) なら親に「SE再生＋遷移」を委譲（SEが途切れない）
      if(window.self !== window.top){
        const payload = { type:"NAV", href:"kuro.html", key:"konamiKuro" };
        try{ window.parent && window.parent.postMessage(payload, location.origin); return; }catch(_){ }
        try{ window.parent && window.parent.postMessage(payload, "*"); return; }catch(_){ }
      }

      // 直開き（noshell=1 等）の場合：SEを鳴らして即遷移
      try{ if(window.playSfx) window.playSfx("konamiKuro", 1.0, {boost: 2.8}); }catch(e){}
      location.href = "kuro.html";
    }

    window.addEventListener("keydown", (e) => {
      const key = e.key;
      const ok = (key === seq[i]) || (key.toLowerCase() === seq[i]);
      if (ok) {
        i++;
        if (i >= seq.length) {
          i = 0;
          navToKuroWithSfx();
        }
      } else {
        i = 0;
      }
    });
  }

  // =====================
  // Init
  // =====================
  document.addEventListener("DOMContentLoaded", () => {
    initKonami();
    updateFxUI();
    renderWarpLogs();

    if (isDoorPage()) initDoor();
    if (isWarpPage()) initWarp();
    if (isKuroPage()) initKuro();
  });

})();
