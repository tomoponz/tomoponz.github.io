// danger_crack_patch.js
// Mobile-only crack overlay using img/hibiware.jpg
// - triggers when OSUNA演出が始まった(= body.horror-glitch / #hackOverlay出現)タイミングで表示
(() => {
  "use strict";

  const btn = document.getElementById("dangerBtn");
  if(!btn) return;

  const isMobile =
    (window.matchMedia && window.matchMedia("(max-width: 780px)").matches) ||
    ("ontouchstart" in window) ||
    (navigator.maxTouchPoints > 0);

  if(!isMobile) return;

  const IMG_URL = "img/hibiware.jpg";
  let shown = false;

  function showCrack(){
    if(shown) return;
    shown = true;

    const wrap = document.createElement("div");
    wrap.id = "hibiwareOverlay";
    wrap.style.cssText = [
      "position:fixed","inset:0","z-index:1000001","pointer-events:none",
      "display:block","opacity:0",
      "transition:opacity .18s ease",
      // 画面の上に薄く“乗る”感じ（重い画像でも描画が安定しやすい）
      "background:rgba(0,0,0,.10)"
    ].join(";");

    const img = new Image();
    img.decoding = "async";
    img.alt = "";
    img.src = IMG_URL;
    img.style.cssText = [
      "width:100%","height:100%","object-fit:cover",
      // ひび割れが見えるように調整（好みで）
      "opacity:.92",
      "mix-blend-mode:multiply",
      "filter:contrast(1.15) saturate(.9) brightness(1.05)"
    ].join(";");

    // 読み込みできなかったら何もしない（既存のcanvasひび割れ等に任せる）
    img.onerror = () => { try{ wrap.remove(); }catch(_){}; shown = false; };

    wrap.appendChild(img);
    document.body.appendChild(wrap);

    // ちょい遅らせて“ガラスが割れた”感
    requestAnimationFrame(() => { wrap.style.opacity = "1"; });

    // 1.2秒ほどでフェードアウト
    setTimeout(() => { wrap.style.opacity = "0"; }, 950);
    setTimeout(() => { try{ wrap.remove(); }catch(_){ } }, 1400);
  }

  // OSUNA演出開始を監視（class付与 or hackOverlay生成）
  const mo = new MutationObserver(() => {
    if(document.body.classList.contains("horror-glitch") || document.getElementById("hackOverlay")){
      mo.disconnect();
      showCrack();
    }
  });

  mo.observe(document.documentElement, { subtree:true, childList:true, attributes:true, attributeFilter:["class"] });

})();
