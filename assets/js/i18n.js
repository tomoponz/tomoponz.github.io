// assets/js/i18n.js
// JP/EN language switcher for tomoponz.github.io
// Focus: navigation and core UI labels. It intentionally does not machine-translate all creative content.
(() => {
  "use strict";

  const STORAGE_KEY = "tomoponz_lang";
  const SUPPORTED = new Set(["ja", "en"]);
  const EXCLUDED_SELECTOR = "script, style, noscript, template, code, pre, textarea, input, select, option, [data-no-i18n]";

  const JA_TO_EN = {
    // nav / page names
    "プロフィール": "Profile",
    "おみくじ": "Fortune",
    "診断": "Quiz",
    "ネタ置き場": "Oddities",
    "リンク": "Links",
    "ゲーム": "Games",
    "ミニゲーム": "Mini Games",
    "足跡帳": "Guestbook",
    "実績": "Achievements",
    "ドア": "Door",
    "ワープ": "Warp",
    "八百科事典": "Hachi Encyclopedia",
    "スタッフロール": "Staff Roll",
    "名言": "Quotes",
    "黒歴史": "Dark Archive",
    "迷ひ道": "Lost Page",
    "甘き死よ": "Sweet Death",
    "終劇": "The End",
    "ロードマップ": "Roadmap",
    "テトリス": "Tetris",
    "サイトマップ": "Sitemap",

    // search / controls
    "検索": "Search",
    "探す": "Find",
    "戻る": "Back",
    "トップ": "Home",
    "トップへ": "Home",
    "トップへ戻る": "Back to Home",
    "開く": "Open",
    "閉じる": "Close",
    "× 閉じる": "× Close",
    "コピー": "Copy",
    "次の名言": "Next Quote",
    "リセット": "Reset",
    "更新": "Refresh",
    "読み込み中…": "Loading...",
    "通信中…": "Loading...",
    "ログ消去": "Clear Log",
    "効果音：ON": "SFX: ON",
    "効果音：OFF": "SFX: OFF",
    "粒子：ON": "Particles: ON",
    "粒子：OFF": "Particles: OFF",
    "音声：ON": "Sound: ON",
    "音声：OFF": "Sound: OFF",
    "⚠️ 押すな": "⚠️ Do Not Press",
    "書き込む": "Post",
    "診断する": "Run Quiz",
    "おみくじを引く": "Draw Fortune",
    "おみくじ引く": "Draw Fortune",
    "ゲームへ": "Go to Games",
    "リンク集へ": "Go to Links",
    "ミニゲームへ": "Go to Mini Games",
    "ゲーム一覧": "Game List",
    "ドアへ": "Go to Door",
    "ワープ先（直）": "Warp Destinations",
    "プロフィールへ": "Go to Profile",
    "リンクへ": "Go to Links",
    "八百科事典へ": "Go to Hachi Encyclopedia",
    "検索して読む": "Search and Read",
    "ランダム": "Random",
    "本家で開く": "Open Original",
    "読込先：": "Source:",
    "結果": "Result",
    "確率": "Probability",
    "回答（5段階）": "Answers (5 levels)",
    "メモ": "Memo",
    "注意": "Note",

    // common page copy
    "秘密基地 / ネタ置き場 / ミニゲーム / いろいろ": "Secret base / oddities / mini games / experiments",
    "今日の一言（名言）": "Quote of the Day",
    "小さな遊びを置く場所。増やしていく。": "A place for small games. More will be added.",
    "実験場": "Lab",
    "ミニゲーム一覧": "Mini Game List",
    "ここに今後、Canvas/Audio/WebGL系を足していけば“楽しいサイト”になる。": "Canvas, audio, and WebGL experiments can be added here over time.",
    "おすすめフリーゲーム（ネタ）": "Recommended Free Games",
    "二十一種あり。毒舌多し（九割超）。されど稀に奇跡、降りる。": "There are 21 outcomes. Most are harsh. Rarely, a miracle appears.",
    "10問 → 5能力 → 50結果。結果はコピペ可能。": "10 questions, 5 traits, 50 outcomes. Results can be copied.",
    "各設問：1=当てはまらない ～ 5=めちゃ当てはまる": "Each question: 1 = not true, 5 = very true",
    "名前は任意。メッセージは200文字まで。": "Name is optional. Messages are limited to 200 characters.",
    "いとあはれ。道を誤りしなり。戻るべし。": "You seem to have wandered off. Please head back.",
    "このサイトは、複数の世界観とパロディで構成されています。": "This site is built from multiple aesthetics, worlds, and parodies.",
    "このサイトはだいたいネタです": "This site is mostly a joke.",
    "これは世界最高峰の学術資料の閲覧器。": "A viewer for the world's most questionable academic materials.",
    "学術資料UI": "Academic-style UI",
    "ソース：アンサイクロペディア": "Source: Uncyclopedia",
    "無料。鍵なし。…たぶん安全。": "Free. No key required. Probably safe.",
    "押せばワープ。無料。鍵なし。…たぶん安全。": "Press it to warp. Free. No key required. Probably safe.",
    "信じるか信じないかは、あなた次第です。": "Believe it or not; that is up to you.",

    // diagnostics / dynamic messages
    "まだ書き込みはありません。": "No posts yet.",
    "読み込みに失敗しました。": "Failed to load.",
    "投稿しました。": "Posted.",
    "送信中…": "Sending...",
    "画像なしで送信中…": "Sending without an image...",
    "送信に失敗しました。": "Failed to send.",
    "メッセージを入力してください。": "Please enter a message.",
    "コピーしました": "Copied",
    "コピーした。友達に貼れ。": "Copied. Share it with a friend."
  };

  const ATTR_JA_TO_EN = {
    "検索キーワードを入力してください": "Enter a keyword",
    "本文内検索（このページだけ）": "Search within this page",
    "名前（任意）": "Name (optional)",
    "一言どうぞ！": "Leave a short message!",
    "メニューを折りたたむ": "Collapse menu",
    "メニューを開く": "Open menu",
    "tomoponz ホーム": "tomoponz Home"
  };

  const TITLE_REPLACEMENTS = {
    "プロフィール": "Profile",
    "おみくじ": "Fortune",
    "診断": "Quiz",
    "ネタ置き場": "Oddities",
    "リンク": "Links",
    "ゲーム": "Games",
    "ミニゲーム": "Mini Games",
    "足跡帳": "Guestbook",
    "実績": "Achievements",
    "ドア": "Door",
    "八百科事典": "Hachi Encyclopedia",
    "スタッフロール": "Staff Roll",
    "サイトマップ": "Sitemap",
    "迷ひ道": "Lost Page"
  };

  const EN_TO_JA = Object.fromEntries(Object.entries(JA_TO_EN).map(([ja, en]) => [en, ja]));
  const ATTR_EN_TO_JA = Object.fromEntries(Object.entries(ATTR_JA_TO_EN).map(([ja, en]) => [en, ja]));
  const TITLE_EN_TO_JA = Object.fromEntries(Object.entries(TITLE_REPLACEMENTS).map(([ja, en]) => [en, ja]));

  function safe(fn, fallback) {
    try { return fn(); } catch (_) { return fallback; }
  }

  function normalizeLang(value) {
    const lang = String(value || "").toLowerCase().slice(0, 2);
    return SUPPORTED.has(lang) ? lang : "ja";
  }

  function defaultLang() {
    const stored = safe(() => localStorage.getItem(STORAGE_KEY), "");
    if (SUPPORTED.has(stored)) return stored;
    return /^en\b/i.test(navigator.language || "") ? "en" : "ja";
  }

  let currentLang = normalizeLang(defaultLang());
  let applying = false;
  let observer = null;
  let debounceTimer = 0;

  function translateExact(text, lang) {
    if (!text) return text;
    if (lang === "en") return JA_TO_EN[text] || text;
    return EN_TO_JA[text] || text;
  }

  function translateAttr(value, lang) {
    if (!value) return value;
    if (lang === "en") return ATTR_JA_TO_EN[value] || JA_TO_EN[value] || value;
    return ATTR_EN_TO_JA[value] || EN_TO_JA[value] || value;
  }

  function shouldSkipElement(el) {
    return !el || !el.closest || !!el.closest(EXCLUDED_SELECTOR);
  }

  function applyTextNodes(root, lang) {
    const start = root && root.nodeType === Node.ELEMENT_NODE ? root : document.body;
    if (!start) return;

    const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
        const text = node.nodeValue || "";
        if (!text.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const original = node.nodeValue;
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      const core = original.trim();
      const translated = translateExact(core, lang);
      if (translated !== core) node.nodeValue = leading + translated + trailing;
    }
  }

  function applyAttributes(root, lang) {
    const scope = root && root.querySelectorAll ? root : document;
    const selector = "[placeholder], [title], [aria-label], input[value], button[value]";
    scope.querySelectorAll(selector).forEach((el) => {
      if (shouldSkipElement(el) && !/^(input|button)$/i.test(el.tagName || "")) return;
      for (const attr of ["placeholder", "title", "aria-label", "value"]) {
        if (!el.hasAttribute(attr)) continue;
        const oldValue = el.getAttribute(attr);
        const next = translateAttr(oldValue, lang);
        if (next !== oldValue) el.setAttribute(attr, next);
      }
    });
  }

  function applyTitle(lang) {
    if (!document.title) return;
    const replacements = lang === "en" ? TITLE_REPLACEMENTS : TITLE_EN_TO_JA;
    let next = document.title;
    for (const [from, to] of Object.entries(replacements)) {
      next = next.replaceAll(from, to);
    }
    next = next.replaceAll("｜", " | ");
    if (next !== document.title) document.title = next;
  }

  function injectStyle() {
    if (document.getElementById("tomoponzI18nStyle")) return;
    const style = document.createElement("style");
    style.id = "tomoponzI18nStyle";
    style.textContent = `
      .i18nToggle{ min-width:54px !important; font-weight:800 !important; letter-spacing:.06em !important; }
      .i18nToggle[aria-pressed="true"]{ box-shadow:0 0 0 2px rgba(88,221,255,.18), inset 0 1px 0 rgba(255,255,255,.08) !important; }
      @media (max-width:780px){ .i18nToggle{ min-width:48px !important; padding-inline:12px !important; } }
    `;
    document.head.appendChild(style);
  }

  function ensureToggle() {
    const header = document.querySelector("header.nav, .nav");
    if (!header || document.getElementById("langToggle")) return;

    let tools = header.querySelector(".navtools");
    if (!tools) {
      tools = document.createElement("div");
      tools.className = "navtools";
      header.appendChild(tools);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "langToggle";
    btn.className = "chip i18nToggle";
    btn.setAttribute("data-no-i18n", "");
    btn.addEventListener("click", () => setLanguage(currentLang === "en" ? "ja" : "en", { broadcast: true }));

    const audio = tools.querySelector("#audioToggle");
    if (audio && audio.parentNode === tools) tools.insertBefore(btn, audio);
    else tools.appendChild(btn);
  }

  function updateToggle(lang) {
    const btn = document.getElementById("langToggle");
    if (!btn) return;
    btn.textContent = lang === "en" ? "JP" : "EN";
    btn.title = lang === "en" ? "日本語に切り替え" : "Switch to English";
    btn.setAttribute("aria-label", btn.title);
    btn.setAttribute("aria-pressed", lang === "en" ? "true" : "false");
  }

  function broadcastLanguage(lang) {
    const payload = { type: "LANGUAGE", lang };
    document.querySelectorAll("iframe").forEach((frame) => {
      try { frame.contentWindow && frame.contentWindow.postMessage(payload, location.origin); } catch (_) {}
    });
    try { window.parent && window.parent !== window && window.parent.postMessage(payload, location.origin); } catch (_) {}
  }

  function apply(root = document.body) {
    if (applying) return;
    applying = true;
    try {
      document.documentElement.lang = currentLang;
      injectStyle();
      ensureToggle();
      applyTextNodes(root, currentLang);
      applyAttributes(root, currentLang);
      applyTitle(currentLang);
      updateToggle(currentLang);
    } finally {
      applying = false;
    }
  }

  function scheduleApply(root) {
    if (applying) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => apply(root || document.body), 60);
  }

  function setLanguage(lang, options = {}) {
    const next = normalizeLang(lang);
    currentLang = next;
    safe(() => localStorage.setItem(STORAGE_KEY, next), undefined);
    apply(document.body);
    if (options.broadcast) broadcastLanguage(next);
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((mutations) => {
      if (applying) return;
      let target = document.body;
      for (const m of mutations) {
        if (m.type === "childList" && m.addedNodes && m.addedNodes.length) {
          const node = Array.from(m.addedNodes).find(n => n.nodeType === Node.ELEMENT_NODE);
          if (node) { target = node; break; }
        }
        if (m.type === "characterData") {
          target = m.target && m.target.parentElement ? m.target.parentElement : document.body;
          break;
        }
      }
      scheduleApply(target);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.addEventListener("message", (ev) => {
    if (ev.origin && ev.origin !== location.origin) return;
    const data = ev.data || {};
    if (data && data.type === "LANGUAGE" && data.lang) setLanguage(data.lang, { broadcast: false });
  });

  window.addEventListener("storage", (ev) => {
    if (ev.key === STORAGE_KEY && ev.newValue) setLanguage(ev.newValue, { broadcast: false });
  });

  window.TomoponzI18n = {
    apply: () => apply(document.body),
    setLanguage: (lang) => setLanguage(lang, { broadcast: true }),
    getLanguage: () => currentLang,
  };

  function init() {
    currentLang = normalizeLang(defaultLang());
    apply(document.body);
    startObserver();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
