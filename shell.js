// shell.js
(function(){
  const frame = document.getElementById("viewFrame");
  if(!frame) return;

  // WebXR / fullscreen permission for iframe (VR/AR on mobile)
  // - WebXR in iframes requires the xr-spatial-tracking permission policy.
  // - AR may also need camera + motion sensors.
  try{
    frame.setAttribute('allow', 'fullscreen; xr-spatial-tracking; accelerometer; gyroscope; magnetometer; camera');
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('webkitallowfullscreen', '');
  }catch(_){ }

  function safeDecode(x){ return String(x || ""); }

  function isMushroomUrl(raw){
    try{
      const u = new URL(String(raw || ""), location.href);
      if(u.origin !== location.origin) return false;
      const path = (u.pathname || "/").replace(/^\/+/, "").toLowerCase();
      return path === "mushroom" || path === "mushroom/" || path === "mushroom/index.html" || path.startsWith("mushroom/?");
    }catch(_){
      const path = String(raw || "").replace(/^\/+/, "").split(/[?#]/)[0].toLowerCase();
      return path === "mushroom" || path === "mushroom/" || path === "mushroom/index.html";
    }
  }

  function openTopLevel(raw){
    const u = new URL(String(raw || ""), location.href);
    location.href = u.href;
  }

  function normalizeP(raw){
    const p = (raw || "index.html").trim() || "index.html";
    // "index.html?x#y" 形式を許容。フルURLなら同一オリジンだけ受ける。
    try{
      const u = new URL(p, location.href);
      if(u.origin !== location.origin) return "index.html";
      const path = (u.pathname || '/index.html').replace(/^\/+/,'');
      return path + (u.search || "") + (u.hash || "");
    }catch(_){
      // 相対で雑に
      const cleaned = p.replace(/^[.\/]+/, "");
      return cleaned || "index.html";
    }
  }

  function withEmbed(p){
    const base = normalizeP(p);
    const u = new URL(base, location.href);
    const sp = new URLSearchParams(u.search);
    sp.set("embed","1");
    u.search = sp.toString() ? ("?"+sp.toString()) : "";
    const path = (u.pathname || '/index.html').replace(/^\/+/,'');
    return path + u.search + (u.hash || "");
  }


  const NAV_LABELS = {
    "index.html": "プロフィール",
    "omikuji.html": "おみくじ",
    "shindan.html": "診断",
    "gallery.html": "ネタ置き場",
    "links.html": "リンク",
    "games.html": "ゲーム",
    "minigames.html": "ミニゲーム",
    "door.html": "ドア",
    "warp.html": "ワープ",
    "hachi.html": "八百科事典",
    "achievements.html": "実績",
    "bbs.html": "足跡帳",
    "tetris.html": "テトリス",
    "roadmap.html": "ロードマップ",
    "staff.html": "スタッフロール",
    "sweetdeath.html": "甘き死よ",
    "eva.html": "終劇",
    "meigen.html": "名言",
    "kuro.html": "黒歴史",
    "404.html": "迷ひ道",
    "aero/index.html": "Aero",
    "vaporwave/index.html": "Vaporwave",
    "dreamcore/index.html": "Dreamcore",
    "liminal/index.html": "Liminal",
  };

  let currentFramePath = "";

  function navPathOnly(raw){
    let p = normalizeP(raw || "index.html");
    try{
      const u = new URL(p, location.href);
      u.searchParams.delete("embed");
      let path = (u.pathname || "/index.html").replace(/^\/+/, "").toLowerCase();
      if(!path) path = "index.html";
      if(path.endsWith("/")) path += "index.html";
      return path;
    }catch(_){
      p = String(p || "index.html").split(/[?#]/)[0].replace(/^\/+/, "").toLowerCase();
      if(!p) p = "index.html";
      if(p.endsWith("/")) p += "index.html";
      return p;
    }
  }

  function navFileName(path){
    return (String(path || "index.html").split("/").pop() || "index.html").toLowerCase();
  }

  function isNavMatch(linkHref, activePath){
    const hrefPath = navPathOnly(linkHref || "index.html");
    const activeFile = navFileName(activePath);
    const hrefFile = navFileName(hrefPath);

    return (
      hrefPath === activePath ||
      hrefFile === activeFile ||
      (activeFile === "warp.html" && hrefFile === "door.html") ||
      (activeFile === "minigames.html" && hrefFile === "games.html")
    );
  }

  function updateShellNav(rawPath){
    const activePath = navPathOnly(rawPath || currentFramePath || getPFromLocation());
    currentFramePath = activePath;

    const activeFile = navFileName(activePath);
    const label = NAV_LABELS[activePath] || NAV_LABELS[activeFile] || "";

    const sub = document.getElementById("brandSub") || document.querySelector(".brand small");
    if(sub) sub.textContent = label;

    let activeLink = null;
    document.querySelectorAll(".navlinks a.chip[href]").forEach((a)=>{
      const active = isNavMatch(a.getAttribute("href") || "", activePath);
      a.classList.toggle("active", active);
      if(active){
        a.setAttribute("aria-current", "page");
        activeLink = a;
      }else{
        a.removeAttribute("aria-current");
      }
    });

    if(activeLink){
      try{
        activeLink.scrollIntoView({behavior:"smooth", inline:"center", block:"nearest"});
      }catch(_){
        try{ activeLink.scrollIntoView(false); }catch(__){}
      }
    }
  }

  function syncShellFromFrame(){
    try{
      const loc = frame.contentWindow && frame.contentWindow.location;
      if(!loc || loc.origin !== location.origin) return;

      const sp = new URLSearchParams(loc.search || "");
      sp.delete("embed");
      const qs = sp.toString();
      const raw = (loc.pathname || "/index.html").replace(/^\/+/, "") + (qs ? ("?" + qs) : "") + (loc.hash || "");
      const nextPath = navPathOnly(raw);
      if(!nextPath || nextPath === navPathOnly(currentFramePath)) return;

      currentFramePath = raw;
      const shellQs = new URLSearchParams(location.search);
      shellQs.set("p", raw);
      history.replaceState({p: raw}, "", "shell.html?" + shellQs.toString());
      updateShellNav(raw);
    }catch(_){}
  }

  function setFrame(p, push){
    if(isMushroomUrl(p)){
      openTopLevel(p);
      return;
    }
    const norm = normalizeP(p);

    // immersive はページごとに明示ONする方式。遷移時はいったん解除しておく（戻り忘れ防止）
    try{ document.documentElement.classList.remove("immersive"); }catch(_){ }
    // 長いナビ音（リンク/ゲームなど）は、別ページへ移動する時に停止
    try{ if(typeof window.__stopLongNavSfxFor === "function") window.__stopLongNavSfxFor(norm); }catch(_){ }

    // ページ切替の瞬間に“音楽（BGM/動画）”は止める（SEは親で鳴るのでOK）
    try{ if(typeof window.stopAllMedia === "function") window.stopAllMedia(); }catch(_){ }
    try{ frame.contentWindow && frame.contentWindow.postMessage({type:"STOP_MEDIA"}, location.origin); }catch(_){ }
    // postMessage が間に合わない環境対策：同一オリジンなら直接止める
    try{
      const doc = frame.contentDocument;
      if(doc) doc.querySelectorAll("audio,video").forEach(m=>{
        try{ m.pause(); m.currentTime = 0; }catch(_){ }
      });
    }catch(_){ }

    
    currentFramePath = norm;
    frame.src = withEmbed(norm);

    if(push){
      const qs = new URLSearchParams(location.search);
      qs.set("p", norm);
      history.pushState({p:norm}, "", "shell.html?"+qs.toString());
    }

    // shell 側のナビ表示は即時更新する。app.js 側の URLSearchParams キャッシュに依存しない。
    updateShellNav(norm);
    try{
      if(typeof window.setActiveNav === "function") window.setActiveNav();
    }catch(_){}
  }

  function getPFromLocation(){
    const qs = new URLSearchParams(location.search);
    const raw = qs.get("p");
    if(!raw) return "index.html";
    return normalizeP(raw);
  }

  // shell 内リンク：同一オリジンの a[href] は iframe 遷移にする
  document.addEventListener("click", (e)=>{
    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if(!a) return;

    // 修飾キー/別タブは尊重
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = (a.target || "").toLowerCase();
    if(target && target !== "_self") return;
    if(a.dataset && a.dataset.shellExternal === "1") return;

    let u;
    try{ u = new URL(a.getAttribute("href"), location.href); }catch(_){ return; }
    if(u.origin !== location.origin) return;
    if(isMushroomUrl(u.href)){
      e.preventDefault();
      openTopLevel(u.href);
      return;
    }

    // shell 自身の遷移に置き換える
    e.preventDefault();
    setFrame((u.pathname || '/index.html').replace(/^\/+/,'') + (u.search || "") + (u.hash || ""), true);
  }, true);

  // iframe 側（embed=1）からの遷移要求
  window.addEventListener("message", (ev)=>{
    // 同一オリジンだけ
    if(ev.origin && ev.origin !== location.origin) return;
    const d = ev.data || {};
    if(!d || typeof d !== "object") return;

    if(d.type === "SFX" && d.key){
      try{
        if(typeof window.playSfx === "function"){
          window.playSfx(
            String(d.key),
            (typeof d.volume === "number" ? d.volume : undefined),
            (d.opts && typeof d.opts === "object" ? d.opts : undefined)
          );
        }
      }catch(_){}
      return;
    }

    
    if(d.type === "MUSIC"){
      try{
        const mc = window.musicCtrl;
        if(!mc) return;

        if(Array.isArray(d.playlist) && d.playlist.length){
          mc.setPlaylist(d.playlist, (typeof d.idx === "number" ? d.idx : (mc.getIndex ? mc.getIndex() : 0)));
        }

        const cmd = String(d.cmd || "");
        if(cmd === "toggle") mc.toggle(1.0, {boost:2.2});
        else if(cmd === "next") mc.next(1.0, {boost:2.2, restart:true});
        else if(cmd === "prev") mc.prev(1.0, {boost:2.2, restart:true});
        else if(cmd === "stop") mc.stop();
      }catch(_){}
      return;
    }

if(d.type === "IMMERSION" && typeof d.active === "boolean"){
      try{ document.documentElement.classList.toggle("immersive", !!d.active); }catch(_){ }
      return;
    }

    if(d.type === "NAV" && d.href){
      const key = d.key || d.sfx;
      if(key){
        try{
          if(typeof window.playSfx === "function"){
            window.playSfx(
              String(key),
              (typeof d.volume === "number" ? d.volume : undefined),
              (d.opts && typeof d.opts === "object" ? d.opts : undefined)
            );
          }
        }catch(_){}
      }
      // iframe内→別ページへ行く直前に、いま鳴っている“音楽”を止める
      try{ if(typeof window.stopAllMedia === "function") window.stopAllMedia(); }catch(_){ }
      if(isMushroomUrl(d.href)){
        openTopLevel(d.href);
        return;
      }
      setFrame(String(d.href), true);
    }
  });

  window.addEventListener("popstate", ()=>{
    setFrame(getPFromLocation(), false);
  });

  frame.addEventListener("load", ()=>{
    syncShellFromFrame();
    updateShellNav(currentFramePath || getPFromLocation());
  });


  // Konami command (works anywhere in shell)
  (function(){
    const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let pos = 0;
    window.addEventListener("keydown", (e)=>{
      const t = e.target;
      const tag = (t && t.tagName) ? t.tagName.toLowerCase() : "";
      if(tag === "input" || tag === "textarea" || (t && t.isContentEditable)) return;

      const k = e.key;
      const need = seq[pos];
      const ok = (pos < 8) ? (k === need) : (String(k).toLowerCase() === need);
      if(ok){
        pos++;
        if(pos >= seq.length){
          pos = 0;
          try{ if(typeof window.playSfx === "function") window.playSfx("konamiKuro", 1.0, {boost: 2.8}); }catch(_){ }
          setFrame("kuro.html", true);
        }
      }else{
        pos = (k === seq[0]) ? 1 : 0;
      }
    });
  })();

  // expose for app.js fallback (optional)
  try{
    window.__shellSetFrame = function(href, push){ setFrame(href, !!push); };
  }catch(_){}

  // ===== Collapsible ribbon + menu injection (shell only) =====
  (function initNavEnhancements(){
    const root = document.documentElement;
    const header = document.querySelector("header.nav");
    if(!header) return;

    // CSS (inject once)
    if(!document.getElementById("navCollapseCss")){
      const st = document.createElement("style");
      st.id = "navCollapseCss";
      st.textContent = `
        html.navCollapsed .navlinks{ display:none !important; }
        html.navCollapsed .nav{ padding-top:10px !important; padding-bottom:10px !important; }
        html.navCollapsed .brandSub{ display:none !important; }
        @media (max-width:780px){
          html.navCollapsed .nav{ flex-direction:row !important; align-items:center !important; }
          html.navCollapsed body.shellPage header.nav .navtools .nav-search,
          html.navCollapsed body.shellPage #audioToggle{ display:none !important; }
          html.navCollapsed body.shellPage .navtools{ width:auto !important; justify-content:flex-end !important; }
        }
      `;
      document.head.appendChild(st);
    }

    // Ensure navtools exists
    let tools = header.querySelector(".navtools");
    if(!tools){
      tools = document.createElement("div");
      tools.className = "navtools";
      header.appendChild(tools);
    }

    // Collapse toggle button
    let btn = header.querySelector("#navCollapse");
    if(!btn){
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "navCollapse";
      btn.className = "chip";
      btn.setAttribute("aria-pressed","false");
      btn.title = "メニューを折りたたむ";
      btn.textContent = "✕";
      tools.insertBefore(btn, tools.firstChild);
    }

    const KEY = "tomoponz_nav_collapsed";
    function load(){
      try{
        const v = localStorage.getItem(KEY);
        if(v === null) return null;
        return v === "1";
      }catch(_){ return null; }
    }
    function save(v){
      try{ localStorage.setItem(KEY, v ? "1" : "0"); }catch(_){}
    }
    function apply(v){
      root.classList.toggle("navCollapsed", !!v);
      btn.setAttribute("aria-pressed", v ? "true" : "false");
      btn.textContent = v ? "≡" : "✕";
      btn.title = v ? "メニューを開く" : "メニューを折りたたむ";
    }

    let st0 = load();
    const isSmallScreen = !!(window.matchMedia && window.matchMedia("(max-width:780px)").matches);
    if(isSmallScreen){
      // mobile: the iframe content is the main stage, so start compact every time.
      st0 = true;
    }else if(st0 === null){
      st0 = false;
    }
    apply(st0);

    btn.addEventListener("click", ()=>{
      const next = !root.classList.contains("navCollapsed");
      apply(next);
      save(next);
    });

    // Inject "足跡帳" link if missing
    const navlinks = header.querySelector(".navlinks");
    if(navlinks){
      const exists = Array.from(navlinks.querySelectorAll("a[href]")).some(a=>{
        const h = (a.getAttribute("href")||"").replace(/^\/+/,"");
        return h === "bbs.html" || h.endsWith("/bbs.html");
      });
      if(!exists){
        const a = document.createElement("a");
        a.className = "chip";
        a.href = "bbs.html";
        a.textContent = "足跡帳";
        // insert after gallery if possible
        const anchors = Array.from(navlinks.querySelectorAll("a[href]"));
        const after = anchors.find(x => (x.getAttribute("href")||"").includes("gallery.html"));
        if(after && after.insertAdjacentElement){
          after.insertAdjacentElement("afterend", a);
        }else{
          navlinks.appendChild(a);
        }
      }
    }
  })();

  // ===== Search bar (restore) + shell-aware navigation =====
  (function initShellSearch(){
    const header = document.querySelector("header.nav");
    if(!header) return;

    // Ensure navtools exists
    let tools = header.querySelector(".navtools");
    if(!tools){
      tools = document.createElement("div");
      tools.className = "navtools";
      header.appendChild(tools);
    }

    // Search UI styles are defined in style.css; keep this file behavior-only.

    // If already exists, do nothing
    if(document.getElementById("searchInput") && document.getElementById("searchBtn")) return;

    const wrap = document.createElement("div");
    wrap.className = "nav-search";

    const input = document.createElement("input");
    input.type = "search";
    input.id = "searchInput";
    input.placeholder = "検索キーワードを入力してください";
    input.autocomplete = "off";
    // Prevent app.js default site-search handler from hijacking (shell has its own)
    input.dataset.searchMode = "page";

    const btn = document.createElement("button");
    btn.id = "searchBtn";
    btn.type = "button";
    btn.textContent = "検索";
    btn.dataset.searchMode = "page";

    wrap.appendChild(input);
    wrap.appendChild(btn);

    // Place near right side (tools)
    tools.insertBefore(wrap, tools.firstChild);

    const executeSearch = () => {
      if(!window.SiteSearch || typeof window.SiteSearch.execute !== "function"){
        console.warn("SiteSearch is not loaded. Skipping shell search.");
        return;
      }

      window.SiteSearch.execute({
        query: input.value || "",
        navigate: (url) => setFrame(url, true),
        hiddenNavigate: (url) => setFrame(url, true),
        openUrl: (url) => window.open(url, "_blank", "noopener"),
      });
    };

    btn.addEventListener("click", executeSearch);
    input.addEventListener("keydown", (e)=>{
      if(e.key === "Enter") executeSearch();
    });
  })();


  // 初期表示
  setFrame(getPFromLocation(), false);
})();
