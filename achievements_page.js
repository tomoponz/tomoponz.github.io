// achievements_page.js
(function(){
  function el(tag, cls){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    return e;
  }
  function fmtDate(ts){
    try{
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const da = String(d.getDate()).padStart(2,'0');
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${y}/${m}/${da} ${hh}:${mm}`;
    }catch(_){ return ""; }
  }

  function render(){
    const ACH = window.ACH;
    if(!ACH || typeof ACH.getState !== 'function') return;

    const state = ACH.getState();
    const defs = (typeof ACH.getDefinitions === 'function') ? ACH.getDefinitions() : [];
    const unlocked = state.unlocked || {};

    // summary
    const total = defs.length || 0;
    const unlockedCount = Object.keys(unlocked).length;
    const pages = Object.keys(state.pages || {}).length;
    const visits = Number((state.counters||{}).visits || 0);

    const sum = document.getElementById('achSummary');
    if(sum){
      sum.innerHTML = '';
      const b1 = el('span','badge'); b1.innerHTML = `<span class="dot"></span>解除：<b>${unlockedCount}</b> / ${total}`;
      const b2 = el('span','badge'); b2.textContent = `訪問ページ：${pages}`;
      const b3 = el('span','badge'); b3.textContent = `訪問回数：${visits}`;
      sum.appendChild(b1); sum.appendChild(b2); sum.appendChild(b3);
    }

    const grid = document.getElementById('achGrid');
    if(!grid) return;
    grid.innerHTML = '';

    defs.forEach(def=>{
      if(!def || !def.id) return;
      const id = String(def.id);
      const isUnlocked = !!unlocked[id];
      let prog = 0;
      try{ prog = Number(def.progress ? def.progress(state) : (isUnlocked?1:0)) || 0; }catch(_){ prog = isUnlocked?1:0; }
      prog = Math.max(0, Math.min(1, prog));

      const card = el('div','card ach');
      const h = el('h2');
      h.textContent = def.title || id;

      const desc = el('div','muted');
      desc.textContent = def.desc || '';

      const meta = el('div','achMeta');
      if(isUnlocked){
        meta.innerHTML = `<span class="badge"><span class="dot"></span>解除済</span><span class="muted">${fmtDate(unlocked[id])}</span>`;
      }else{
        const hint = def.hint ? `ヒント：${def.hint}` : '未解除';
        meta.innerHTML = `<span class="badge">未解除</span><span class="muted">${hint}</span>`;
      }

      const progWrap = el('div','achProg');
      const bar = el('div','achBar');
      bar.style.width = `${Math.round(prog*100)}%`;
      progWrap.appendChild(bar);

      const pct = el('div','muted');
      pct.textContent = `${Math.round(prog*100)}%`;

      card.appendChild(h);
      card.appendChild(desc);
      card.appendChild(meta);
      card.appendChild(progWrap);
      card.appendChild(pct);

      grid.appendChild(card);
    });

    const resetBtn = document.getElementById('achResetBtn');
    if(resetBtn){
      resetBtn.onclick = ()=>{
        if(!confirm('実績をリセットします。よろしいですか？')) return;
        try{ ACH.reset && ACH.reset(); }catch(_){ }
        render();
      };
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    render();
  });
})();
