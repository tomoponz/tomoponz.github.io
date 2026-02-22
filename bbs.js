// bbs.js
// サーバーレス掲示板（GAS + Spreadsheet）
// - GET: 最新順 JSON を取得
// - POST: {name, message} を送信
//
// ★GAS URL（あなたのWebアプリURL）
const GAS_URL = (window.BBS_GAS_URL) || "https://script.google.com/macros/s/AKfycbyBblZxfER3Lb_Pyak9fD863qM0sJFqrWljra9RkfYHxyno18fkU9gySKcravrDxtqu/exec";

(function(){
  "use strict";

  const $ = (id)=>document.getElementById(id);

  const KEY_LAST_POST = "bbs_last_post_at_v1";
  const KEY_UID = "bbs_uid_v1";
  const COOLDOWN_MS = 6000; // 6秒
  const MAX_MSG = 200;
  const MAX_NAME = 24;
  const MAX_IMG_SIDE = 1024;      // 端末側で縮小
  const MAX_IMG_BYTES = 900000;   // JPEG目安（約0.9MB）

  function esc(s){
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function showErr(msg){
    const el = $("bbsErr");
    if(!el) return;
    if(!msg){
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "";
    el.textContent = String(msg);
  }

  function getUid(){
    try{
      let v = localStorage.getItem(KEY_UID);
      if(v) return v;
      // crypto.randomUUID が無い古い環境用
      const gen = () => {
        const r = (n)=>Math.floor(Math.random()*n);
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const v = (c === 'x') ? r(16) : (8 + r(4));
          return v.toString(16);
        });
      };
      v = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : gen();
      localStorage.setItem(KEY_UID, v);
      return v;
    }catch(_){
      return "anon";
    }
  }

  function bytes(n){
    const b = Number(n)||0;
    if(b < 1024) return b + "B";
    if(b < 1024*1024) return (b/1024).toFixed(1) + "KB";
    return (b/1024/1024).toFixed(2) + "MB";
  }

  async function fileToJpegBase64(file){
    if(!file) return null;
    if(!/^image\//i.test(file.type||"")) throw new Error("画像ファイルのみ対応");

    const url = URL.createObjectURL(file);
    try{
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      // decode() が無いブラウザ対策
      await (img.decode ? img.decode() : new Promise((ok,ng)=>{ img.onload=ok; img.onerror=ng; }));

      const w0 = img.naturalWidth || img.width;
      const h0 = img.naturalHeight || img.height;
      if(!w0 || !h0) throw new Error("画像の読み込みに失敗");

      const scale = Math.min(1, MAX_IMG_SIDE / Math.max(w0, h0));
      const w = Math.max(1, Math.round(w0 * scale));
      const h = Math.max(1, Math.round(h0 * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // 品質を段階調整（容量が大きい場合）
      let q = 0.86;
      let dataUrl = canvas.toDataURL('image/jpeg', q);
      while(dataUrl.length > MAX_IMG_BYTES * 1.37 && q > 0.55){
        q -= 0.07;
        dataUrl = canvas.toDataURL('image/jpeg', q);
      }

      const base64 = dataUrl.split(',')[1] || "";
      return { mime: 'image/jpeg', base64, width: w, height: h };
    } finally {
      try{ URL.revokeObjectURL(url); }catch(_){ }
    }
  }

  async function loadBBS(){
    const list = $("bbsList");
    if(!list) return;

    showErr("");
    list.innerHTML = '<li class="muted">通信中…</li>';

    try{
      const res = await fetch(GAS_URL + "?t=" + Date.now(), { cache:"no-store" });
      if(!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();

      list.innerHTML = "";
      if(!Array.isArray(data) || data.length === 0){
        list.innerHTML = '<li class="muted">まだ書き込みはありません。一番乗り。</li>';
        return;
      }

      for(const item of data.slice(0, 120)){
        const li = document.createElement("li");
        li.className = "bbsItem";

        const name = esc(item && item.name ? item.name : "名無し");
        const msgRaw = (item && item.message != null) ? String(item.message) : "";
        const msg = esc(msgRaw).slice(0, 2000);
        const date = esc(item && item.date ? item.date : "");

        // v2: uidTag / ipTag / imgUrl に対応（無くても落ちない）
        const tag = esc(item && (item.tag || item.uidTag || item.ipTag) ? (item.tag || item.uidTag || item.ipTag) : "");
        const imgUrl = (item && item.imgUrl) ? String(item.imgUrl) : "";
        const imgSafe = imgUrl ? esc(imgUrl) : "";
        const imgHtml = imgSafe ? `<img class="bbsImg" src="${imgSafe}" alt="" loading="lazy">` : "";

        li.innerHTML = `
          <div class="bbsMeta">
            <span class="bbsName">${name}</span>
            ${tag ? `<span class="badge" style="padding:2px 8px; font-size:11px; opacity:.85;">${tag}</span>` : ""}
            <span class="bbsDate">${date}</span>
          </div>
          <div class="bbsMsg">${msg}</div>
          ${imgHtml}
        `;
        list.appendChild(li);
      }
    }catch(e){
      list.innerHTML = '<li class="muted">読み込みに失敗しました。</li>';
      showErr("読み込み失敗：GASの公開設定（アクセスできるユーザー=全員）やURLを確認してください。");
    }
  }

  function cooldownLeft(){
    try{
      const t = Number(localStorage.getItem(KEY_LAST_POST) || 0);
      const left = (t + COOLDOWN_MS) - Date.now();
      return Math.max(0, left);
    }catch(_){ return 0; }
  }

  async function submitBBS(){
    const nameInput = $("bbsName");
    const msgInput  = $("bbsMsg");
    const hpInput   = $("bbsHp");
    const btn       = $("bbsSubmit");

    if(!nameInput || !msgInput || !btn) return;

    // honeypot（bot）
    if(hpInput && hpInput.value && hpInput.value.trim()){
      showErr("");
      return;
    }

    const left = cooldownLeft();
    if(left > 0){
      showErr("連投は少し待って。あと " + Math.ceil(left/1000) + " 秒。");
      return;
    }

    const name = (nameInput.value || "").trim().slice(0, 24) || "名無し";
    const msg  = (msgInput.value  || "").trim().slice(0, 200);

    // 画像（任意）
    const fileInput = $("bbsImg");
    const file = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;

    if(!msg){
      showErr("メッセージを入力してください。");
      return;
    }

    showErr("");
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "送信中…";

    try{
      const uid = getUid();

      let image = null;
      if(file){
        try{
          btn.textContent = "画像処理…";
          image = await fileToJpegBase64(file);
        }catch(err){
          showErr("画像の処理に失敗しました（別の画像で試して）");
          return;
        }
      }

      // GAS側の仕様に合わせて text/plain で送る（CORS周りが安定しやすい）
      await fetch(GAS_URL, {
        method:"POST",
        headers:{ "Content-Type":"text/plain;charset=utf-8" },
        body: JSON.stringify({
          name, message: msg,
          uid,
          ua: navigator.userAgent,
          image
        })
      });

      try{ localStorage.setItem(KEY_LAST_POST, String(Date.now())); }catch(_){}

      msgInput.value = "";
      if(fileInput) fileInput.value = "";
      const pv = $("bbsPreview");
      if(pv) pv.classList.remove("show");
      await loadBBS();
    }catch(e){
      showErr("送信に失敗しました。時間をおいて再試行してください。");
    }finally{
      btn.textContent = old;
      btn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    if(!$("bbsList")) return; // bbsページ以外では何もしない
    loadBBS();

    const submitBtn = $("bbsSubmit");
    if(submitBtn) submitBtn.addEventListener("click", submitBBS);

    const reloadBtn = $("bbsReload");
    if(reloadBtn) reloadBtn.addEventListener("click", loadBBS);

    // 画像プレビュー
    const imgIn = $("bbsImg");
    const pv = $("bbsPreview");
    const pvImg = $("bbsPreviewImg");
    const pvInfo = $("bbsPreviewInfo");
    const pvClear = $("bbsImgClear");

    function clearPreview(){
      try{ if(imgIn) imgIn.value = ""; }catch(_){ }
      if(pv) pv.classList.remove("show");
      if(pvImg) pvImg.src = "";
      if(pvInfo) pvInfo.textContent = "";
    }
    if(pvClear) pvClear.addEventListener('click', clearPreview);

    if(imgIn){
      imgIn.addEventListener('change', async ()=>{
        showErr("");
        const f = imgIn.files && imgIn.files[0];
        if(!f){ clearPreview(); return; }
        if(!/^image\//i.test(f.type||"")){
          showErr("画像ファイルのみ対応です");
          clearPreview();
          return;
        }
        // そのままのプレビュー（圧縮は送信時）
        const url = URL.createObjectURL(f);
        if(pvImg) pvImg.src = url;
        if(pvInfo) pvInfo.textContent = `${esc(f.name).slice(0,60)} / ${bytes(f.size)}`;
        if(pv) pv.classList.add('show');
        // revoke は onload 後
        if(pvImg){
          pvImg.onload = ()=>{ try{ URL.revokeObjectURL(url); }catch(_){ } };
        }
      });
    }

    const msg = $("bbsMsg");
    if(msg){
      msg.addEventListener("keydown", (e)=>{
        if((e.ctrlKey || e.metaKey) && e.key === "Enter"){
          submitBBS();
        }
      });
    }
  });
})();
