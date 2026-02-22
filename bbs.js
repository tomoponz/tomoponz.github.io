// bbs.js（画像投稿 確実版）
// ★接続先は Worker URL にする
const API_URL = "https://tomoponz-bbs-proxy.yuto181130.workers.dev";

function $(id){ return document.getElementById(id); }

function getUid(){
  let uid = localStorage.getItem("bbs_uid");
  if(!uid){
    uid = (crypto.randomUUID ? crypto.randomUUID() : ("uid-" + Math.random().toString(16).slice(2) + Date.now()));
    localStorage.setItem("bbs_uid", uid);
  }
  return uid;
}

// 文字の簡易エスケープ（表示用）
function esc(s){
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// 画像を縮小・圧縮してDataURL化（長辺max 1280 / jpeg品質可変）
async function compressToDataURL(file){
  const img = await fileToImage(file);

  const MAX_SIDE = 1280;
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { alpha:false });
  ctx.drawImage(img, 0, 0, w, h);

  // まずは品質0.85 → 大きければ段階的に下げる
  let q = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", q);

  // DataURLのサイズ目安（base64は約4/3）
  // GAS側 MAX_IMG_BYTES=1800000 なので、base64は余裕を見て ~2.2MB以下を目標
  while(dataUrl.length > 2_200_000 && q > 0.45){
    q -= 0.10;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }

  return dataUrl;
}

function fileToImage(file){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

async function loadBBS(){
  const list = $("bbsList");
  if(!list) return;

  list.innerHTML = `<li class="muted">通信中…</li>`;
  try{
    const res = await fetch(API_URL, { method:"GET" });
    const data = await res.json();

    list.innerHTML = "";
    if(!data.length){
      list.innerHTML = `<li class="muted">まだ書き込みはありません。</li>`;
      return;
    }

    for(const item of data){
      const li = document.createElement("li");
      li.style.marginBottom = "12px";
      li.style.borderBottom = "1px dashed rgba(255,255,255,.12)";
      li.style.paddingBottom = "10px";

      const name = esc(item.name || "名無し");
      const msg  = esc(item.message || "");
      const date = esc(item.date || "");
      const tag  = esc(item.tag || "");

      const imgUrl = String(item.imgUrl || "").trim();
      const imgHtml = imgUrl
        ? `<div style="margin-top:8px;">
             <a href="${imgUrl}" target="_blank" rel="noopener">
               <img src="${imgUrl}" alt="img" style="max-width:100%; border-radius:12px; border:1px solid rgba(255,255,255,.12);">
             </a>
           </div>`
        : "";

      li.innerHTML = `
        <div style="display:flex; gap:10px; align-items:baseline; flex-wrap:wrap;">
          <b style="color:rgba(124,203,255,.95);">${name}</b>
          ${tag ? `<span class="chip" style="opacity:.85">${tag}</span>` : ""}
          <span style="font-size:11px; color:rgba(255,255,255,.55);">${date}</span>
        </div>
        <div style="color:rgba(234,241,255,.95); line-height:1.55; margin-top:6px;">${msg}</div>
        ${imgHtml}
      `;
      list.appendChild(li);
    }
  }catch(e){
    list.innerHTML = `<li class="muted">読み込みに失敗しました。</li>`;
  }
}

async function submitBBS(){
  const nameEl = $("bbsName");
  const msgEl  = $("bbsMsg");
  const fileEl = $("bbsFile");
  const btn    = $("bbsSubmit");
  const st     = $("bbsStatus");

  const name = (nameEl?.value || "").trim() || "名無し";
  const msg  = (msgEl?.value || "").trim();

  if(!msg){
    alert("メッセージを入力してください。");
    return;
  }

  btn.disabled = true;
  btn.textContent = "送信中…";
  if(st) st.textContent = "";

  try{
    let imgData = "";
    const file = fileEl?.files?.[0];
    if(file){
      if(st) st.textContent = "画像を圧縮中…";
      imgData = await compressToDataURL(file);
    }

    if(st) st.textContent = "送信中…";

    const payload = {
      name,
      message: msg,
      uid: getUid(),
      imgData // ★これが入ればGASが保存して imgUrl列(D)にURLが入る
    };

    const res = await fetch(API_URL, {
      method:"POST",
      headers:{ "Content-Type":"text/plain" },
      body: JSON.stringify(payload)
    });

    const txt = await res.text();
    if(!/^Success/i.test(txt)){
      throw new Error(txt || "unknown error");
    }

    // リセット
    msgEl.value = "";
    if(fileEl) fileEl.value = "";
    if(st) st.textContent = "投稿しました。";

    await loadBBS();
  }catch(e){
    alert("送信に失敗: " + (e?.message || e));
    if(st) st.textContent = "送信に失敗しました。";
  }finally{
    btn.disabled = false;
    btn.textContent = "書き込む";
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  loadBBS();

  $("bbsSubmit")?.addEventListener("click", submitBBS);
  $("bbsReload")?.addEventListener("click", loadBBS);
});
