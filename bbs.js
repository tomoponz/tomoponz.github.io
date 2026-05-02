// bbs.js（画像表示・XSS対策・トースト通知版）
// 接続先：Cloudflare Worker
const API_URL = "https://tomoponz-bbs-proxy.yuto181130.workers.dev";

function $(id){ return document.getElementById(id); }

function notify(message, type = "info"){
  if(window.showToast) window.showToast(message, {type});
  else console.log(message);
}

function getUid(){
  let uid = localStorage.getItem("bbs_uid");
  if(!uid){
    uid = (crypto.randomUUID ? crypto.randomUUID() : ("uid-" + Math.random().toString(16).slice(2) + Date.now()));
    localStorage.setItem("bbs_uid", uid);
  }
  return uid;
}

function safeText(value, fallback = ""){
  return String(value ?? fallback);
}

function safeHttpUrl(value){
  const raw = String(value || "").trim();
  if(!raw) return "";
  try{
    const url = new URL(raw, location.href);
    if(url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.href;
  }catch{
    return "";
  }
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

function driveThumb(url){
  const safe = safeHttpUrl(url);
  if(!safe) return "";
  try{
    const u = new URL(safe);
    const id = u.searchParams.get("id");
    if(!id) return safe;
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w2000`;
  }catch{
    return safe;
  }
}

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

  let q = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", q);

  while(dataUrl.length > 2200000 && q > 0.45){
    q -= 0.10;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  return dataUrl;
}

function makeMutedItem(text){
  const li = document.createElement("li");
  li.className = "muted";
  li.textContent = text;
  return li;
}

function renderPost(item){
  const li = document.createElement("li");
  li.style.marginBottom = "12px";
  li.style.borderBottom = "1px dashed rgba(255,255,255,.12)";
  li.style.paddingBottom = "10px";

  const meta = document.createElement("div");
  meta.style.display = "flex";
  meta.style.gap = "10px";
  meta.style.alignItems = "baseline";
  meta.style.flexWrap = "wrap";

  const name = document.createElement("b");
  name.style.color = "rgba(124,203,255,.95)";
  name.textContent = safeText(item.name || "名無し");
  meta.appendChild(name);

  const tagText = safeText(item.tag || "").trim();
  if(tagText){
    const tag = document.createElement("span");
    tag.className = "chip";
    tag.style.opacity = ".85";
    tag.textContent = tagText;
    meta.appendChild(tag);
  }

  const date = document.createElement("span");
  date.style.fontSize = "11px";
  date.style.color = "rgba(255,255,255,.55)";
  date.textContent = safeText(item.date || "");
  meta.appendChild(date);

  const msg = document.createElement("div");
  msg.style.color = "rgba(234,241,255,.95)";
  msg.style.lineHeight = "1.55";
  msg.style.marginTop = "6px";
  msg.textContent = safeText(item.message || "");

  li.appendChild(meta);
  li.appendChild(msg);

  const originalUrl = safeHttpUrl(item.imgUrl);
  if(originalUrl){
    const thumbUrl = driveThumb(originalUrl) || originalUrl;
    const wrap = document.createElement("div");
    wrap.style.marginTop = "8px";

    const link = document.createElement("a");
    link.href = originalUrl;
    link.target = "_blank";
    link.rel = "noopener";

    const img = document.createElement("img");
    img.src = thumbUrl;
    img.alt = "投稿画像";
    img.loading = "lazy";
    img.className = "bbsImg";
    img.style.maxWidth = "420px";
    img.style.width = "100%";
    img.style.maxHeight = "280px";
    img.style.height = "auto";
    img.style.objectFit = "cover";
    img.onerror = () => {
      img.onerror = null;
      if(img.src !== originalUrl) img.src = originalUrl;
    };

    link.appendChild(img);
    wrap.appendChild(link);
    li.appendChild(wrap);
  }

  return li;
}

async function loadBBS(){
  const list = $("bbsList");
  if(!list) return;

  list.replaceChildren(makeMutedItem("通信中…"));
  try{
    const res = await fetch(API_URL, { method:"GET" });
    const data = await res.json();

    list.replaceChildren();
    if(!Array.isArray(data) || !data.length){
      list.appendChild(makeMutedItem("まだ書き込みはありません。"));
      return;
    }

    for(const item of data){
      list.appendChild(renderPost(item));
    }
  }catch(e){
    list.replaceChildren(makeMutedItem("読み込みに失敗しました。"));
    notify("足跡帳の読み込みに失敗しました。", "error");
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
    notify("メッセージを入力してください。", "warn");
    msgEl?.focus();
    return;
  }

  try{ window.playSfx && window.playSfx("bbsPost", 0.85, {local:true}); }catch(_){ }

  btn.disabled = true;
  btn.textContent = "送信中…";
  if(st) st.textContent = "";

  try{
    let imgData = "";
    const file = fileEl?.files?.[0];

    if(file){
      if(st) st.textContent = `選択: ${file.name} (${Math.round(file.size/1024)}KB) → 圧縮中…`;
      imgData = await compressToDataURL(file);
      if(!imgData || imgData.indexOf("data:image") !== 0){
        throw new Error("画像の変換に失敗しました");
      }
      if(st) st.textContent = `圧縮後: ${Math.round(imgData.length/1024)}KB（送信中…）`;
    }else{
      if(st) st.textContent = "画像なしで送信中…";
    }

    const payload = {
      name,
      message: msg.slice(0, 200),
      uid: getUid(),
      imgData
    };

    const res = await fetch(API_URL, {
      method:"POST",
      headers:{ "Content-Type":"text/plain" },
      body: JSON.stringify(payload)
    });

    const txt = await res.text();
    if(!/^Success/i.test(txt)){
      throw new Error(txt || "unknown");
    }

    msgEl.value = "";
    if(fileEl) fileEl.value = "";
    if(st) st.textContent = "投稿しました。";
    notify("投稿しました。", "success");

    await loadBBS();
  }catch(e){
    notify("送信に失敗しました。", "error");
    if(st) st.textContent = "送信に失敗しました。";
    console.warn("BBS submit failed:", e);
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
