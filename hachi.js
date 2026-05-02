// hachi.js
// 八百科事典：アンサイクロペディアを JSONP で読み込み → 学術資料風に表示
// 右上（nav）の検索バー：このページの「本文内検索」（ハイライト + ジャンプ）
// 上の「検索して読む」：記事名検索（記事を読み込む）

(() => {
  "use strict";

  // ===== constants =====
  const WIKI_BASE = "https://ja.uncyclopedia.info";
  const API = `${WIKI_BASE}/api.php`;
  const SITE = "ja.uncyclopedia.info";
  const DEFAULT_TITLE = "メインページ";
  const ANOMALY_RATE = 1 / 20;

  const IDS = Object.freeze({
    articleTitle: "articleTitle",
    articleNote: "articleNote",
    articleContent: "articleContent",
    console: "console",
    q: "q",
    btnOpen: "btnOpen",
    btnSearch: "btnSearch",
    btnRandom: "btnRandom",
    searchInput: "searchInput",
    searchBtn: "searchBtn",
  });

  const REMOVABLE_SELECTORS = [
    "script",
    "style",
    "noscript",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
    ".mw-editsection",
    "sup.reference",
  ].join(",");

  const SKIP_HIGHLIGHT_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "MARK"]);

  // ===== local anomaly data =====
  const ANOMALY_BOX_STYLE = [
    "white-space:pre-wrap",
    "background:rgba(0,0,0,.22)",
    "padding:12px",
    "border-radius:12px",
    "border:1px solid rgba(255,255,255,.10)",
  ].join("; ");

  const createPreBlock = (text) => (
    `<pre style="${ANOMALY_BOX_STYLE};">${text}</pre>`
  );

  const MOJIBAKE_LINES = [
    // Source-level invisible C1 control characters are intentionally avoided.
    // Runtime text is reconstructed from code points so the visual mojibake effect remains.
    fromCodePoints([0x00E3, 0x0081, 0x201A, 0x00E3, 0x0081, 0x00AA, 0x00E3, 0x0081, 0x017D, 0x00E3, 0x0081, 0x00AF, 0x00E3, 0x20AC, 0x20AC, 0x00E3, 0x0081, 0x201C, 0x00E3, 0x0081, 0x201C, 0x00E3, 0x0081, 0x00AB, 0x00E3, 0x20AC, 0x20AC, 0x00E3, 0x0081, 0x201E, 0x00E3, 0x201A, 0x2039]),
    fromCodePoints([0x00E3, 0x0081, 0x201E, 0x00E3, 0x0081, 0x00BE, 0x00E3, 0x0081, 0x00AF, 0x00E3, 0x20AC, 0x20AC, 0x00E3, 0x0081, 0x201C, 0x00E3, 0x0081, 0x201C, 0x00E3, 0x0081, 0x00AB, 0x00E3, 0x20AC, 0x20AC, 0x00E3, 0x0081, 0x201E, 0x00E3, 0x0081, 0x00AA, 0x00E3, 0x0081, 0x201E]),
  ];

  const ANOMALIES = [
    {
      title: "■■■について",
      note: "表示中：■■■（ローカル資料）",
      html: `
        <p>この項目は閲覧権限が不足しています。</p>
        <p>しかし、あなたはすでに<strong>読んでしまった</strong>。</p>
        <hr>
        ${createPreBlock(`■■■■■■■■■■■■■■■■■■
■■■  記録番号: 0xDEAD-BEEF  ■■■
■■■  観測ログ: 欠損         ■■■
■■■■■■■■■■■■■■■■■■

・「ランダム」を押した回数が一致しない
・本文内検索をすると文字の並びが変わる
・閉じても、次に開いた時、続きから始まる

――――――――――――――――――
見つけないでください`)}
      `,
    },
    {
      title: "文字化け資料（復元不能）",
      note: "表示中：復元不能（ローカル資料）",
      html: `
        <p>復元処理に失敗しました。</p>
        <p class="note">※外部APIは呼び出していません。</p>
        ${createPreBlock(`${MOJIBAKE_LINES.join("\n")}

[ERR] parse.text: NULL
[WARN] callback: missing
[INFO] retry: 0
[INFO] retry: 0
[INFO] retry: 0`)}
      `,
    },
  ];

  // ===== DOM helpers =====
  const el = (id) => document.getElementById(id);

  function fromCodePoints(points) {
    return String.fromCodePoint(...points);
  }

  function getEls() {
    return {
      title: el(IDS.articleTitle),
      note: el(IDS.articleNote),
      content: el(IDS.articleContent),
      query: el(IDS.q),
      open: el(IDS.btnOpen),
    };
  }

  function log(line) {
    const consoleEl = el(IDS.console);
    if (!consoleEl) return;
    consoleEl.textContent += `\n${line}`;
  }

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHtml(node, html) {
    if (node) node.innerHTML = html;
  }

  function createElement(tag, attrs = {}, text = "") {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null) continue;
      node.setAttribute(key, String(value));
    }
    if (text) node.textContent = text;
    return node;
  }

  // ===== URL/API helpers =====
  function normTitle(value) {
    return String(value || "").trim().replaceAll("_", " ").replace(/\s+/g, " ");
  }

  function normalizedOrDefault(title) {
    return normTitle(title || DEFAULT_TITLE) || DEFAULT_TITLE;
  }

  function pageUrl(title) {
    const pathTitle = normalizedOrDefault(title).replaceAll(" ", "_");
    return `${WIKI_BASE}/wiki/${encodeURIComponent(pathTitle)}`;
  }

  function googleSiteSearchUrl(query) {
    const q = normTitle(query);
    const siteQuery = `site:${SITE}`;
    return `https://www.google.com/search?q=${encodeURIComponent(q ? `${siteQuery} ${q}` : siteQuery)}`;
  }

  function openUrl(url, newTab = true) {
    if (newTab) {
      const opened = window.open(url, "_blank", "noopener");
      if (opened) return;
    }
    location.href = url;
  }

  function setOpenLink(title, url = pageUrl(title)) {
    const open = el(IDS.btnOpen);
    if (!open) return;
    open.href = url;
    open.setAttribute("target", "_blank");
    open.setAttribute("rel", "noopener");
  }

  function buildApiUrl(params) {
    const url = new URL(API);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  function apiParseUrl(title) {
    return buildApiUrl({
      action: "parse",
      page: normalizedOrDefault(title),
      prop: "text",
      redirects: "1",
      format: "json",
      formatversion: "2",
    });
  }

  function apiRandomUrl() {
    return buildApiUrl({
      action: "query",
      list: "random",
      rnnamespace: "0",
      rnlimit: "1",
      format: "json",
      formatversion: "2",
    });
  }

  function jsonp(url, timeoutMs = 9000) {
    return new Promise((resolve, reject) => {
      const callbackName = `__hachi_cb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      const script = document.createElement("script");
      let settled = false;

      const cleanup = () => {
        if (script.parentNode) script.parentNode.removeChild(script);
        try {
          delete window[callbackName];
        } catch (_) {
          window[callbackName] = undefined;
        }
      };

      const finish = (fn, payload) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        fn(payload);
      };

      const timer = setTimeout(() => {
        finish(reject, new Error("JSONP timeout"));
      }, timeoutMs);

      window[callbackName] = (data) => finish(resolve, data);

      const parsedUrl = new URL(url);
      if (!parsedUrl.searchParams.get("callback")) {
        parsedUrl.searchParams.set("callback", callbackName);
      }

      script.async = true;
      script.src = parsedUrl.toString();
      script.onerror = () => finish(reject, new Error("JSONP script error"));

      document.head.appendChild(script);
    });
  }

  // ===== article sanitizing =====
  function absolutizeUrl(raw) {
    if (!raw) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return `${WIKI_BASE}${raw}`;
    return raw;
  }

  function fixSrcset(srcset) {
    if (!srcset) return srcset;
    return srcset
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const pieces = part.split(/\s+/);
        pieces[0] = absolutizeUrl(pieces[0]);
        return pieces.join(" ");
      })
      .join(", ");
  }

  function removeInlineEventHandlers(root) {
    root.querySelectorAll("*").forEach((node) => {
      [...node.attributes].forEach((attr) => {
        if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
      });
    });
  }

  function normalizeLinks(root) {
    root.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("#")) return;
      anchor.setAttribute("href", absolutizeUrl(href));
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener");
    });
  }

  function normalizeImages(root) {
    root.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      if (src) img.setAttribute("src", absolutizeUrl(src));

      const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
      if (srcset) img.setAttribute("srcset", fixSrcset(srcset));

      img.removeAttribute("width");
      img.removeAttribute("height");
      img.loading = "lazy";
    });
  }

  function sanitizeArticleHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    doc.querySelectorAll(REMOVABLE_SELECTORS).forEach((node) => node.remove());
    removeInlineEventHandlers(doc.body);
    normalizeLinks(doc.body);
    normalizeImages(doc.body);
    return doc.body.innerHTML;
  }

  function getParsedHtml(data) {
    const text = data?.parse?.text;
    if (typeof text === "string") return text;
    if (text && typeof text["*"] === "string") return text["*"];
    return "";
  }

  // ===== in-page search =====
  let articleOriginalHTML = "";

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function resetArticleHtml() {
    const box = el(IDS.articleContent);
    if (box && articleOriginalHTML) box.innerHTML = articleOriginalHTML;
  }

  function shouldSearchTextNode(node) {
    const parent = node.parentNode;
    if (!parent) return false;
    if (SKIP_HIGHLIGHT_TAGS.has(parent.nodeName.toUpperCase())) return false;
    return !!(node.nodeValue && node.nodeValue.trim());
  }

  function collectSearchableTextNodes(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => (
          shouldSearchTextNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
        ),
      }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function markMatchesInTextNode(node, regexp) {
    const text = node.nodeValue;
    let match;
    let lastIndex = 0;
    let hitCount = 0;
    const fragment = document.createDocumentFragment();

    regexp.lastIndex = 0;

    while ((match = regexp.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));

      const mark = document.createElement("mark");
      mark.className = "hachiHit";
      mark.textContent = text.slice(start, end);
      fragment.appendChild(mark);

      hitCount += 1;
      lastIndex = end;

      if (regexp.lastIndex === match.index) regexp.lastIndex += 1;
    }

    if (hitCount > 0) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(fragment, node);
    }

    return hitCount;
  }

  function highlightInArticle(query) {
    const box = el(IDS.articleContent);
    if (!box || !articleOriginalHTML) return 0;

    const q = String(query || "").trim();
    resetArticleHtml();
    if (!q) return 0;

    const regexp = new RegExp(escapeRegExp(q), "gi");
    const total = collectSearchableTextNodes(box)
      .reduce((sum, node) => sum + markMatchesInTextNode(node, regexp), 0);

    box.querySelector("mark.hachiHit")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    return total;
  }

  function runCurrentInPageSearch(baseNote, title) {
    const searchInput = el(IDS.searchInput);
    const note = el(IDS.articleNote);
    const query = searchInput?.value || "";

    if (!query.trim()) {
      setText(note, baseNote);
      return 0;
    }

    const hits = highlightInArticle(query);
    setText(note, `表示中：${title}｜本文内検索「${query}」：${hits}件`);
    return hits;
  }

  // ===== rendering =====
  function renderArticleShell(title) {
    const nodes = getEls();
    setText(nodes.title, title);
    setText(nodes.note, "読み込み中…");
    setText(nodes.content, "Loading…");
    setOpenLink(title);
  }

  function renderArticle(title, html) {
    const nodes = getEls();
    const safe = sanitizeArticleHtml(html);
    const baseNote = `表示中：${title}（右上で本文内検索可）`;

    setText(nodes.title, title);
    setHtml(nodes.content, safe);
    articleOriginalHTML = safe;

    runCurrentInPageSearch(baseNote, title);

    if (nodes.query) nodes.query.value = title;
    setOpenLink(title);
    log("ok: rendered");
  }

  function renderFallback(title, reason) {
    const nodes = getEls();
    const fragment = document.createDocumentFragment();

    const message = createElement("p", { class: "note" });
    message.append(
      "取得に失敗した（環境要因：Cloudflare/通信/ブロック等）。",
      document.createElement("br"),
      `代替として、Googleで site:${SITE} 検索を開ける。`
    );

    const row = createElement("div", { class: "btnrow" });
    row.append(
      createElement("a", {
        class: "btn primary",
        href: googleSiteSearchUrl(title),
        target: "_blank",
        rel: "noopener",
      }, "Googleで探す"),
      createElement("a", {
        class: "btn",
        href: pageUrl(title),
        target: "_blank",
        rel: "noopener",
      }, "本家で開く")
    );

    fragment.append(message, row);

    setText(nodes.note, "外部取得に失敗 → 外部検索に逃げます");
    if (nodes.content) {
      nodes.content.replaceChildren(fragment);
      articleOriginalHTML = nodes.content.innerHTML;
    }

    log(`fail: ${String(reason?.message || reason)}`);
  }

  function renderAnomaly() {
    const anomaly = ANOMALIES[Math.floor(Math.random() * ANOMALIES.length)];
    const nodes = getEls();

    setText(nodes.title, anomaly.title);
    setText(nodes.note, anomaly.note);
    setHtml(nodes.content, anomaly.html);
    articleOriginalHTML = anomaly.html;

    if (nodes.query) nodes.query.value = anomaly.title;
    setOpenLink(anomaly.title, `${WIKI_BASE}/wiki/Special:Random`);

    const navQuery = el(IDS.searchInput)?.value || "";
    if (navQuery.trim()) {
      const hits = highlightInArticle(navQuery);
      setText(nodes.note, `${anomaly.note}｜本文内検索「${navQuery}」：${hits}件`);
    }

    log("anomaly: local render (no api)");
  }

  // ===== data loading =====
  async function loadArticle(title) {
    const normalizedTitle = normalizedOrDefault(title);
    renderArticleShell(normalizedTitle);
    log(`load: ${normalizedTitle}`);

    try {
      const data = await jsonp(apiParseUrl(normalizedTitle), 9000);
      const parsedTitle = data?.parse?.title || normalizedTitle;
      const html = getParsedHtml(data);
      if (!html) throw new Error("empty parse.text");
      renderArticle(parsedTitle, html);
    } catch (error) {
      renderFallback(normalizedTitle, error);
    }
  }

  async function loadRandom() {
    if (Math.random() < ANOMALY_RATE) {
      renderAnomaly();
      return;
    }

    try {
      log("random: query…");
      const data = await jsonp(apiRandomUrl(), 7000);
      const title = data?.query?.random?.[0]?.title;
      if (!title) throw new Error("no random title");
      await loadArticle(title);
    } catch (error) {
      log(`random fail: ${String(error?.message || error)}`);
      openUrl(`${WIKI_BASE}/wiki/Special:Random`, true);
    }
  }

  // ===== nav search override =====
  function replaceNavSearchElementsIfNeeded(input, button, pageMode) {
    if (pageMode) return { input, button };

    const inputClone = input.cloneNode(true);
    const buttonClone = button.cloneNode(true);

    input.parentNode.replaceChild(inputClone, input);
    button.parentNode.replaceChild(buttonClone, button);

    return { input: inputClone, button: buttonClone };
  }

  function updateSearchNote(query, hits) {
    const note = el(IDS.articleNote);
    const title = el(IDS.articleTitle)?.textContent || "";

    if (!query.trim()) {
      setText(note, `表示中：${title}（右上で本文内検索可）`);
      return;
    }

    setText(note, `表示中：${title}｜本文内検索「${query}」：${hits}件`);
    log(`in-page: ${hits} hits for "${query}"`);
  }

  function setupNavInPageSearch() {
    const oldInput = el(IDS.searchInput);
    const oldButton = el(IDS.searchBtn);
    if (!oldInput || !oldButton) return;

    const pageMode = String(oldInput.dataset.searchMode || oldButton.dataset.searchMode || "")
      .toLowerCase() === "page";

    // app.js のサイト内検索リスナーを消すため clone して差し替え
    const { input, button } = replaceNavSearchElementsIfNeeded(oldInput, oldButton, pageMode);

    input.placeholder = "本文内検索（このページだけ）";
    button.textContent = "探す";

    const run = () => {
      const query = input.value || "";
      const hits = highlightInArticle(query);
      updateSearchNote(query, hits);
    };

    button.addEventListener("click", run);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") run();
    });
  }

  // ===== startup =====
  function setupArticleSearchForm() {
    const query = el(IDS.q);
    const searchButton = el(IDS.btnSearch);
    const randomButton = el(IDS.btnRandom);

    if (query && !query.value) query.value = DEFAULT_TITLE;

    const runLoad = () => loadArticle(query?.value || DEFAULT_TITLE);
    const updateOpen = () => setOpenLink(query?.value || DEFAULT_TITLE);

    searchButton?.addEventListener("click", runLoad);
    query?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") runLoad();
    });
    query?.addEventListener("input", updateOpen);
    randomButton?.addEventListener("click", loadRandom);

    updateOpen();
    return query;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const consoleEl = el(IDS.console);
    if (consoleEl) consoleEl.textContent = "init…\n";

    setupNavInPageSearch();
    const query = setupArticleSearchForm();

    await loadArticle(query?.value || DEFAULT_TITLE);
    log("ready");
  });
})();
