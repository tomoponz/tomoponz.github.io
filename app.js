// ========== utilities ==========
function $(id){ return document.getElementById(id); }
function todayKey(){
  const d = new Date();
  return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
}
function weightedPick(pool){
  const total = pool.reduce((s,x)=>s+x.w,0);
  let r = Math.random()*total;
  for(const item of pool){
    r -= item.w;
    if(r <= 0) return item;
  }
  return pool[0];
}

// ========== quote ==========
const QUOTES = [
  "今日の目標：『1mmでも前進』",
  "最強の魔法：締切の48時間前着手",
  "勝ち筋：小さく作って公開して育てる",
  "バグは敵にあらず、イベントなり",
  "眠いときは寝よ（例外：締切前）",
  "やる気は後から来たる。まず着手。",
  "今の自分に勝て。過去の自分は倒した。"
];
function setRandomQuote(){
  const el = $("quote");
  if(!el) return;
  el.textContent = QUOTES[Math.floor(Math.random()*QUOTES.length)];
}

// ========== omikuji (10 types) ==========
const OMIKUJI_POOL = [
  // 毒舌 8種類：合計 94%
  { rank:"凶", cls:"rank-toxic", w:12,
    msg:"いとよろしくなし。手を出すほど泥沼なり。",
    tips:"戒め：急ぐな。まず一息つけ。／開運：水を飲みて寝よ。" },

  { rank:"大凶", cls:"rank-toxic", w:12,
    msg:"おほかた終はる。されど今日のうちに修正すれば命はある。",
    tips:"戒め：大事な操作は二度三度確かむべし。／開運：バックアップ。" },

  { rank:"末凶", cls:"rank-toxic", w:12,
    msg:"末に崩るる兆し。最初の一手を誤るべからず。",
    tips:"戒め：着手は小さく。／開運：TODOを一つに絞れ。" },

  { rank:"凶相", cls:"rank-toxic", w:12,
    msg:"顔に書かれたり、『まだ準備せず』とな。",
    tips:"戒め：装備（資料・道具）を整へよ。／開運：机を片づけよ。" },

  { rank:"災凶", cls:"rank-toxic", w:12,
    msg:"災ひは外より来たるにあらず。己が油断より起こる。",
    tips:"戒め：見落とし一箇所が致命なり。／開運：チェックリスト。" },

  { rank:"虚凶", cls:"rank-toxic", w:12,
    msg:"中身は空、やる気も空。だが動けば生まるる。",
    tips:"戒め：気分を待つな。／開運：五分だけ始めよ。" },

  { rank:"笑止凶", cls:"rank-toxic", w:11,
    msg:"をかしきほどに運なし。笑ふしかなし。されど笑へ。",
    tips:"戒め：自滅ムーブを慎め。／開運：散歩して戻れ。" },

  { rank:"無慈悲凶", cls:"rank-toxic", w:11,
    msg:"情け容赦なし。今日の世界は君を甘やかさぬ。",
    tips:"戒め：一点突破せよ。／開運：通知を切れ。" },

  // ちょっといい：5%
  { rank:"ちと佳し", cls:"rank-good", w:5,
    msg:"よろし。大勝ちはせずとも、堅実に利あり。",
    tips:"勧め：小さき成功を積め。／開運：早寝早起き、まこと大事。" },

  // 1%：USアルティメット大吉
  { rank:"ウルトラースーパーアルティメット大吉", cls:"rank-ultra", w:1,
    msg:"いみじくよし。天も地も味方せり。今引けば通る。",
    tips:"勧め：やりたきこと、今日のうちに放て。／開運：勢ひのまま提出せよ。" },
];

function showOmikuji(picked){
  const box = $("omikujiBox");
  const rankEl = $("omikujiRank");
  const msgEl = $("omikujiMsg");
  const tipsEl = $("omikujiTips");
  if(!box || !rankEl || !msgEl || !tipsEl) return;

  rankEl.className = "pill rank " + picked.cls;
  rankEl.textContent = "結果： " + picked.rank;
  msgEl.textContent = picked.msg;
  tipsEl.textContent = picked.tips;
  box.style.display = "block";
}

function drawOmikuji(){
  // 1日固定（同日なら同結果）
  const raw = localStorage.getItem("omikuji_today");
  if(raw){
    try{
      const obj = JSON.parse(raw);
      if(obj.date === todayKey()){
        showOmikuji(obj.picked);
        return;
      }
    }catch(e){}
  }
  const picked = weightedPick(OMIKUJI_POOL);
  showOmikuji(picked);
  localStorage.setItem("omikuji_today", JSON.stringify({date: todayKey(), picked}));
}

function resetOmikuji(){
  localStorage.removeItem("omikuji_today");
  const box = $("omikujiBox");
  if(box) box.style.display = "none";
}

function restoreOmikuji(){
  const raw = localStorage.getItem("omikuji_today");
  if(!raw) return;
  try{
    const obj = JSON.parse(raw);
    if(obj.date !== todayKey()) return;
    showOmikuji(obj.picked);
  }catch(e){}
}

// ========== shindan ==========
function runShindan(){
  const q1 = document.querySelector('input[name="q1"]:checked');
  const q2 = document.querySelector('input[name="q2"]:checked');
  const q3 = document.querySelector('input[name="q3"]:checked');
  const q4 = document.querySelector('input[name="q4"]:checked');
  const q5 = document.querySelector('input[name="q5"]:checked');
  const out = $("shindanOut");
  if(!out) return;

  if(!q1||!q2||!q3||!q4||!q5){
    out.innerHTML = `<div class="note">すべて選ぶべし。さもなくば結果、出でず。</div>`;
    return;
  }

  const vals = [q1.value,q2.value,q3.value,q4.value,q5.value];
  const score = vals.reduce((s,v)=>s+Number(v),0);

  // score: 5..25
  let type;
  if(score >= 22){
    type = {
      title:"覇道の者",
      msg:"いと猛し。やると決めしらば、道を開くなり。",
      tips:"戒め：勢ひに溺るるな。確認一回増やすべし。"
    };
  }else if(score >= 18){
    type = {
      title:"堅実の者",
      msg:"よろし。積み重ねにて勝つ。気づけば上に在る。",
      tips:"勧め：毎日一つ、終はらせよ。"
    };
  }else if(score >= 14){
    type = {
      title:"気分の者",
      msg:"をかし。波あり。乗れれば強し、外せば寝る。",
      tips:"勧め：最初の5分だけ始めよ。"
    };
  }else{
    type = {
      title:"夢想の者",
      msg:"いとあはれ。頭の中では最強、手は動かず。",
      tips:"戒め：まず画面を閉ぢよ。机に向かへ。"
    };
  }

  out.innerHTML = `
    <div class="card">
      <h2>結果：${type.title}</h2>
      <p class="muted">${type.msg}</p>
      <hr class="sep">
      <p class="muted">${type.tips}</p>
    </div>
  `;
}

// ========== init ==========
document.addEventListener("DOMContentLoaded", ()=>{
  setRandomQuote();
  restoreOmikuji();

  // active nav
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".chip").forEach(a=>{
    const href = a.getAttribute("href");
    if(href === path) a.classList.add("active");
  });
});
