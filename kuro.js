// kuro.js
// 黒歴史ページ：データ駆動（追加＝配列に足すだけ）
// 検索・タグ・ソート・封印(blur)解除を実装
// 対応HTML: kuro.html（id: kuroQuery / kuroSort / kuroClear / kuroToggleSeal / kuroTags / kuroCount / kuroListWrap / sealBar / kuroList）

const KURO_ENTRIES = [
  // ★追加したい銀さんコスプレ（画像は img/kuro/ginsan.jpg 推奨）
  {
    id: "k-gintama-001",
    title: "銀魂：銀さんのコスプレ（3000円＋実家の木刀）",
    date: "2019-??-??", // 分かるなら書き換え、不要なら "" でもOK
    tags: ["コスプレ", "銀魂", "写真", "黒歴史"],
    level: 3,
    summary: "銀魂の銀さんのコスプレです。3000円＋実家の木刀でなりきりました。半分不登校で頭がおかしかった時期です。おいィィィ",
    body: `
      <figure style="margin:0">
        <img
          src="img/kuro/ginsan.jpg"
          alt="銀さんコスプレ写真"
          style="max-width:100%;height:auto;border-radius:14px;border:1px solid rgba(255,255,255,.12)"
          onerror="this.onerror=null; this.src='img/kuro/ginsan.JPG';"
          loading="lazy"
        >
        <figcaption class="note" style="margin-top:8px">
          銀魂の銀さんのコスプレです。3000円＋実家の木刀でなりきりました。
        </figcaption>
      </figure>

      <p style="margin-top:12px">
        半分不登校で頭がおかしかった時期です。
      </p>

      <blockquote>おいィィィ</blockquote>
    `,
    link: ""
  },

  // ---- 以下はサンプル（消してもOK） ----
  {
    id: "k2026-001",
    title: "黒歴史ページの初期サンプル",
    date: "2026-02-20",
    tags: ["ページ", "設計"],
    level: 1,
    summary: "供養庫の雛形。検索・タグ・封印解除が動くかの確認用。",
    body: `
      <p>これはサンプル。<b>kuro.js の KURO_ENTRIES</b> に追加していけば増える。</p>
      <ul>
        <li>タグで絞り込み</li>
        <li>検索（タイトル/要約/本文）</li>
        <li>封印（ぼかし）ON/OFF</li>
      </ul>
    `,
    link: ""
  },
  {
    id: "k2026-002",
    title: "没案：タイトルだけ強いが中身が無い",
    date: "2026-02-18",
    tags: ["没案", "文章"],
    level: 2,
    summary: "勢いで付けたタイトルがピークだったやつ。",
    body: `
      <p>本文ここに書く。長文でもOK。HTMLをそのまま入れられる。</p>
      <p class="note">※ script は入れない（安全＆事故防止）</p>
    `,
    link: ""
  }
];

// ===== utilities =====
const $ = (id) => document.getElementById(id);

function norm(s) {
  return (s || "").trim().replace(/\s+/g, " ");
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll("`", "&#96;");
}

// HTMLをざっくりテキスト化（検索用）
function toText(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || "").toLowerCase();
}

// 念のため <script> を除去（事故防止）
function stripScripts(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  div.querySelectorAll("script").forEach(n => n.remove());
  return div.innerHTML;
}

function levelLabel(level) {
  const lv = Number(level || 1);
  if (lv >= 3) return "危険度:III";
  if (lv === 2) return "危険度:II";
  return "危険度:I";
}

// ===== seal (blur) =====
const LS_SEAL = "kuro_seal_off"; // "1" なら封印解除

function isSealOff() {
  return localStorage.getItem(LS_SEAL) === "1";
}

function setSealOff(v) {
  localStorage.setItem(LS_SEAL, v ? "1" : "0");
}

function applySealUI() {
  const wrap = $("kuroListWrap");
  const bar = $("sealBar");
  const btn = $("kuroToggleSeal");
  if (!wrap) return;

  const off = isSealOff();
  if (off) {
    wrap.classList.remove("sealed");
    if (bar) bar.style.display = "none";
    if (btn) btn.textContent = "封印を戻す";
  } else {
    wrap.classList.add("sealed");
    if (bar) bar.style.display = "flex";
    if (btn) btn.textContent = "封印を解く";
  }
}

// ===== render =====
function renderTags(allTags, active) {
  const wrap = $("kuroTags");
  if (!wrap) return;

  wrap.innerHTML = "";
  const tags = ["全部", ...allTags];

  tags.forEach(t => {
    const btn = document.createElement("button");
    const isOn = (t === "全部" && active.size === 0) || active.has(t);
    btn.className = "tagBtn" + (isOn ? " on" : "");
    btn.type = "button";
    btn.textContent = t;

    btn.addEventListener("click", () => {
      if (t === "全部") {
        active.clear();
      } else {
        if (active.has(t)) active.delete(t);
        else active.add(t);
      }
      update(active);
      // ON/OFF反映のため再描画
      renderTags(allTags, active);
    });

    wrap.appendChild(btn);
  });
}

function renderList(list) {
  const out = $("kuroList");
  if (!out) return;

  out.innerHTML = "";

  if (list.length === 0) {
    out.innerHTML = `<p class="note">該当なし。</p>`;
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.padding = "14px";
    card.style.marginBottom = "12px";

    const tagsHtml = (item.tags || [])
      .map(t => `<span class="miniTag">${escapeHtml(t)}</span>`)
      .join("");

    const linkHtml = item.link
      ? `<div style="margin-top:10px"><a class="btn" href="${escapeAttr(item.link)}">関連リンク</a></div>`
      : "";

    const safeBody = stripScripts(item.body || "");

    card.innerHTML = `
      <div class="kuroHead">
        <div>
          <h3 class="kuroTitle">${escapeHtml(item.title)}</h3>
          <div class="kuroMeta">${escapeHtml(item.date || "")} ・ ${levelLabel(item.level)}</div>
          <div class="miniTags">${tagsHtml}</div>
        </div>
      </div>

      <p class="kuroSummary">${escapeHtml(item.summary || "")}</p>

      <details style="margin-top:10px">
        <summary style="cursor:pointer; opacity:.9">本文を開く</summary>
        <div class="kuroBody">${safeBody}</div>
        ${linkHtml}
      </details>
    `;

    out.appendChild(card);
  });
}

function update(activeTags) {
  const qEl = $("kuroQuery");
  const sortEl = $("kuroSort");
  const countEl = $("kuroCount");

  const q = norm(qEl ? qEl.value : "").toLowerCase();
  const sort = sortEl ? sortEl.value : "new";

  let list = KURO_ENTRIES.slice();

  // tag filter
  if (activeTags && activeTags.size > 0) {
    list = list.filter(x => (x.tags || []).some(t => activeTags.has(t)));
  }

  // query filter
  if (q) {
    list = list.filter(x => {
      const hay = [
        (x.title || "").toLowerCase(),
        (x.summary || "").toLowerCase(),
        toText(x.body || "")
      ].join("\n");
      return hay.includes(q);
    });
  }

  // sort
  if (sort === "old") {
    list.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  } else if (sort === "title") {
    list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  } else {
    // new
    list.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }

  renderList(list);

  if (countEl) {
    countEl.textContent = `表示 ${list.length} / 全 ${KURO_ENTRIES.length}`;
  }

  applySealUI();
}

// ===== init =====
document.addEventListener("DOMContentLoaded", () => {
  // collect tags
  const allTags = uniq(KURO_ENTRIES.flatMap(x => x.tags || []))
    .sort((a, b) => a.localeCompare(b));

  const active = new Set();

  renderTags(allTags, active);
  update(active);

  $("kuroQuery")?.addEventListener("input", () => update(active));
  $("kuroSort")?.addEventListener("change", () => update(active));

  $("kuroClear")?.addEventListener("click", () => {
    const q = $("kuroQuery");
    const s = $("kuroSort");
    if (q) q.value = "";
    if (s) s.value = "new";
    active.clear();
    renderTags(allTags, active);
    update(active);
  });

  $("kuroToggleSeal")?.addEventListener("click", () => {
    setSealOff(!isSealOff());
    applySealUI();
  });
});
