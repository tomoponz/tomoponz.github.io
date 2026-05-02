// bbs.js
// 接続先：Cloudflare Worker
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

function createEl(tag, attrs = {}, ...children){
  const node = document.createElement(tag);
  for(const [key, value] of Object.entries(attrs)){
    if(value == null || value === false) continue;
    if(key === "className") node.className = value;
    else if(key === "text") node.textContent = value;
    else if(key === "style" && typeof value === "object") Object.assign(node.style, value);
    else node.setAttribute(key, String(value));
  }
  for(const child of children){
    if(child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function setListMessage(list, message){
  list.replaceChildren(createEl("li", { className:"muted", text:message }));
}

function safeUrl(raw){
  const value = String(raw || "").trim();
  if(!value) return "";
  try{
    const url = new URL(value, location.href);
    if(url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.href;
  }catch{
    return "";
  }
}

// Driveのuc URL → 画像として確実に返る thumbnail URL に変換
function driveThumb(url){
  const safe = safeUrl(url);
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

function fileToImage(file){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// 長辺1280 / JPEG圧縮
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

  // DataURL長さで軽くする（GAS 1.8MB想定）
  while(dataUrl.length > 2200000 && q > 0.45){
    q -= 0.10;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  return dataUrl;
}

function renderImageBlock(rawImgUrl){
  const href = safeUrl(rawImgUrl);
  if(!href) return null;

  const src = driveThumb(href) || href;
  const img = createEl("img", {
    src,
    alt:"投稿画像",
    loading:"lazy",
    style:{
      maxWidth:"420px",
      width:"100%",
      maxHeight:"280px",
      height:"auto",
      objectFit:"cover",
      borderRadius:"12px",
      border:"1px solid rgba(255,255,255,.12)"
    }
  });

  // 属性文字列ではなくプロパティに入れる。URLをHTMLへ連結しない。
  img.addEventListener("error", () => {
    if(img.dataset.fallbackTried === "1") return;
    img.dataset.fallbackTried = "1";
    img.src = href;
  });

  const link = createEl("a", { href, target:"_blank", rel:"noopener noreferrer" }, img);
  return createEl("div", { style:{ marginTop:"8px" } }, link);
}

function renderBBSItem(item){
  const li = createEl("li", {
    style:{
      marginBottom:"12px",
      borderBottom:"1px dashed rgba(255,255,255,.12)",
      paddingBottom:"10px"
    }
  });

  const header = createEl("div", {
    style:{
      display:"flex",
      gap:"10px",
      alignItems:"baseline",
      flexWrap:"wrap"
    }
  });

  header.appendChild(createEl("b", {
    text:item.name || "名無し",
    style:{ color:"rgba(124,203,255,.95)" }
  }));

  if(item.tag){
    header.appendChild(createEl("span", {
      className:"chip",
      text:item.tag,
      style:{ opacity:".85" }
    }));
  }

  header.appendChild(createEl("span", {
    text:item.date || "",
    style:{ fontSize:"11px", color:"rgba(255,255,255,.55)" }
  }));

  const body = createEl("div", {
    text:item.message || "",
    style:{
      color:"rgba(234,241,255,.95)",
      lineHeight:"1.55",
      marginTop:"6px",
      whiteSpace:"pre-wrap",
      overflowWrap:"anywhere"
    }
  });

  li.append(header, body);

  const imageBlock = renderImageBlock(item.imgUrl);
  if(imageBlock) li.appendChild(imageBlock);

  return li;
}

async function loadBBS(){
  const list = $("bbsList");
  if(!list) return;

  setListMessage(list, "通信中…");
  try{
    const res = await fetch(API_URL, { method:"GET" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if(!Array.isArray(data) || !data.length){
      setListMessage(list, "まだ書き込みはありません。");
      return;
    }

    const frag = document.createDocumentFragment();
    for(const item of data){
      frag.appendChild(renderBBSItem(item || {}));
    }
    list.replaceChildren(frag);
  }catch(e){
    setListMessage(list, "読み込みに失敗しました。");
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

  try{ window.playSfx && window.playSfx("bbsPost", 0.85, {local:true}); }catch(_){ }

  if(btn){
    btn.disabled = true;
    btn.textContent = "送信中…";
  }
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
      message: msg,
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

    if(msgEl) msgEl.value = "";
    if(fileEl) fileEl.value = "";
    if(st) st.textContent = "投稿しました。";

    await loadBBS();
  }catch(e){
    alert("送信に失敗: " + (e?.message || e));
    if(st) st.textContent = "送信に失敗しました。";
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = "書き込む";
    }
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  loadBBS();
  $("bbsSubmit")?.addEventListener("click", submitBBS);
  $("bbsReload")?.addEventListener("click", loadBBS);
});
