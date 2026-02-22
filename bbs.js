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
  const COOLDOWN_MS = 6000; // 6秒

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

        li.innerHTML = `
          <div class="bbsMeta">
            <span class="bbsName">${name}</span>
            <span class="bbsDate">${date}</span>
          </div>
          <div class="bbsMsg">${msg}</div>
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

    if(!msg){
      showErr("メッセージを入力してください。");
      return;
    }

    showErr("");
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "送信中…";

    try{
      // GAS側の仕様に合わせて text/plain で送る（CORS周りが安定しやすい）
      await fetch(GAS_URL, {
        method:"POST",
        headers:{ "Content-Type":"text/plain;charset=utf-8" },
        body: JSON.stringify({ name, message: msg })
      });

      try{ localStorage.setItem(KEY_LAST_POST, String(Date.now())); }catch(_){}

      msgInput.value = "";
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
