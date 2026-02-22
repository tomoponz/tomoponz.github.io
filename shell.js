// shell.js
(function(){
  const frame = document.getElementById("viewFrame");
  if(!frame) return;

  function safeDecode(x){ return String(x || ""); }

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

  function setFrame(p, push){
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

    
    frame.src = withEmbed(norm);

    if(push){
      const qs = new URLSearchParams(location.search);
      qs.set("p", norm);
      history.pushState({p:norm}, "", "shell.html?"+qs.toString());
    }
    // nav 表示更新（app.js が window.setActiveNav を持ってるなら使う）
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
    if(a.target && a.target.toLowerCase() !== "_self") return;

    let u;
    try{ u = new URL(a.getAttribute("href"), location.href); }catch(_){ return; }
    if(u.origin !== location.origin) return;

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
      setFrame(String(d.href), true);
    }
  });

  window.addEventListener("popstate", ()=>{
    setFrame(getPFromLocation(), false);
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

  // 初期表示
  setFrame(getPFromLocation(), false);
})();
