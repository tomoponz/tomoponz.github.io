// assets/js/site-search.js
// 共通サイト内検索：検索辞書・Google検索・隠しコマンドを1か所に集約する。
// 通常検索から hidden/blocked ページを出さない。

(() => {
  "use strict";

  const DEFAULT_DOMAIN = "tomoponz.github.io";
  const SOUND_ROOM_URL = "https://tomoponz.github.io/mushroom/";
  const FLY_MOON_URL = "vaporwave/eva.html";
  const BLOCKED_QUERY_RE = /黒歴史|kuro|deep/i;
  const HIDDEN_COMMAND = ["kuro", "n", "tomo"].join("-");
  const HIDDEN_COMMAND_TARGET = "deep.html";
  const GOOGLE_EXCLUDE = " -inurl:kuro -inurl:deep";

  const PAGES = Object.freeze([
    { keywords: ["プロフィール", "profile", "tomoponz", "自己紹介", "名前"], url: "index.html" },
    { keywords: ["おみくじ", "占い", "運勢", "omikuji", "大吉", "凶"], url: "omikuji.html" },
    { keywords: ["診断", "shindan", "性格", "タイプ"], url: "shindan.html" },
    { keywords: ["ネタ", "ギャラリー", "gallery", "ネタ置き場", "画像"], url: "gallery.html" },
    { keywords: ["音楽", "曲", "music", "sound", "sound room", "youtube", "ny", "NYnpsWrVGKg", "night pulse", "サウンドルーム", "mushroom", "mashroom", "きのこ", "キノコ", "ドコノコノキノコ"], url: SOUND_ROOM_URL },
    { keywords: ["リンク", "links", "お気に入り", "おすすめ", "おすすめ動画"], url: "links.html" },
    { keywords: ["ゲーム", "games", "遊ぶ", "game"], url: "games.html" },
    { keywords: ["ミニゲーム", "minigames", "暇つぶし", "2048", "マイン", "マインスイーパ", "mine", "minigame"], url: "minigames.html" },
    { keywords: ["ドア", "door", "ワープ", "warp", "移動"], url: "door.html" },
    { keywords: ["八百科事典", "hachi", "百科事典", "事典", "辞典"], url: "hachi.html" },
    { keywords: ["名言", "meigen", "迷言", "セリフ", "言葉"], url: "meigen.html" },
    { keywords: ["足跡帳", "掲示板", "bbs", "書き込み"], url: "bbs.html" },
    { keywords: ["実績", "achievements", "achievement"], url: "achievements.html" },
    { keywords: ["スタッフロール", "staff", "credit", "credits"], url: "staff.html" },
    { keywords: ["テトリス", "tetris"], url: "tetris.html" },
    { keywords: ["ロードマップ", "roadmap", "予定"], url: "roadmap.html" },
    { keywords: ["aero", "エアロ", "windows", "vista"], url: "aero/index.html" },
    { keywords: ["vaporwave", "ヴェイパー", "eva", "終劇", "fly me to the moon", "fly me", "moon", "エヴァ"], url: FLY_MOON_URL },
    { keywords: ["dreamcore", "ドリームコア", "夢"], url: "dreamcore/index.html" },
    { keywords: ["liminal", "リミナル", "backrooms", "バックルーム"], url: "liminal/index.html" },
  ]);

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isLocalhost(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";
  }

  function getDomain(hostname = window.location.hostname) {
    return isLocalhost(hostname) ? DEFAULT_DOMAIN : hostname;
  }

  function isBlockedQuery(query) {
    return BLOCKED_QUERY_RE.test(String(query || ""));
  }

  function isHiddenCommand(query) {
    return String(query || "").trim() === HIDDEN_COMMAND;
  }

  function find(query) {
    const needle = normalize(query);
    if (!needle || isBlockedQuery(needle) || isHiddenCommand(needle)) return null;

    for (const page of PAGES) {
      const hit = page.keywords.some((keyword) => {
        const key = normalize(keyword);
        return key.includes(needle) || needle.includes(key);
      });
      if (hit) return page;
    }
    return null;
  }

  function resolveDocumentUrl(url, pathname = window.location.pathname) {
    const target = String(url || "");
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target) || target.startsWith("#")) return target;

    const clean = String(pathname || "").split(/[?#]/)[0].replace(/^\/+/, "");
    const parts = clean ? clean.split("/") : [];
    const depth = Math.max(0, parts.length - 1);
    return "../".repeat(depth) + target;
  }

  function googleSiteSearchUrl(query, domain = getDomain()) {
    const q = String(query || "").trim() + GOOGLE_EXCLUDE;
    return `https://www.google.com/search?q=site:${domain}+${encodeURIComponent(q)}`;
  }

  function execute(options = {}) {
    const query = String(options.query || "").trim();
    if (!query) return { status: "empty" };

    const alertFn = options.alertFn || window.alert.bind(window);
    const confirmFn = options.confirmFn || window.confirm.bind(window);
    const openUrl = options.openUrl || ((url) => window.open(url, "_blank", "noopener"));
    const navigate = options.navigate || ((url) => { window.location.href = url; });
    const hiddenNavigate = options.hiddenNavigate || navigate;

    if (isHiddenCommand(query)) {
      alertFn("認証完了。裏付けされた記録を開示します。");
      hiddenNavigate(HIDDEN_COMMAND_TARGET);
      return { status: "hidden", url: HIDDEN_COMMAND_TARGET };
    }

    if (isBlockedQuery(query)) {
      alertFn("そのキーワードは検索対象外。");
      return { status: "blocked" };
    }

    const page = find(query);
    if (page) {
      if (confirmFn(`「${query}」に関連するページが見つかった。\n移動する？`)) {
        navigate(page.url);
      }
      return { status: "found", page };
    }

    if (confirmFn(`「${query}」は主要ページ辞書に無かった。\nGoogleでサイト内検索する？`)) {
      const url = googleSiteSearchUrl(query, getDomain());
      openUrl(url);
      return { status: "google", url };
    }

    return { status: "cancelled" };
  }

  function getCurrentPageName() {
    const path = String(window.location.pathname || "").split(/[?#]/)[0].replace(/^\/+/, "");
    return (path.split("/").pop() || "index.html").toLowerCase();
  }

  function injectMusicCardIntoGallery() {
    if (getCurrentPageName() !== "gallery.html") return;

    const firstGrid = document.querySelector("main .grid2");
    if (!firstGrid) return;

    function insertAfterR122OrAppend(card) {
      const r122 = Array.from(firstGrid.children).find((node) => {
        return node.textContent && node.textContent.includes("R-122");
      });
      if (r122 && r122.insertAdjacentElement) {
        r122.insertAdjacentElement("afterend", card);
      } else {
        firstGrid.appendChild(card);
      }
    }

    if (!document.getElementById("musicNyCard")) {
      const card = document.createElement("div");
      card.className = "card";
      card.id = "musicNyCard";
      card.innerHTML = `
        <h2>🍄 Mushroom Room</h2>
        <p class="muted">ドコノコノキノコ系の狂気ページ。shell内ではなく、新しいページとして開く。</p>

        <div class="btnrow">
          <a class="btn primary" href="${SOUND_ROOM_URL}" target="_top" rel="noopener" data-shell-external="1">Mushroomへ</a>
          <a class="btn" href="https://www.youtube.com/watch?v=NYnpsWrVGKg" target="_blank" rel="noopener">YouTube</a>
        </div>

        <hr class="sep">
        <div class="note">本体ページは <code>tomoponz/mushroom</code> 側で管理。クリック時は shell の iframe ではなく <code>/mushroom/</code> へ直接移動する。</div>
      `;
      insertAfterR122OrAppend(card);
    }

    if (!document.getElementById("flyMoonCard")) {
      const card = document.createElement("div");
      card.className = "card";
      card.id = "flyMoonCard";
      card.innerHTML = `
        <h2>🌕 Fly Me to the Moon</h2>
        <p class="muted">Vaporwave側の終劇ページへ直接行く導線。スマホでも押しやすい入口。</p>

        <div class="btnrow">
          <a class="btn primary" href="${FLY_MOON_URL}">開く</a>
          <a class="btn" href="vaporwave/index.html">Vaporwave入口</a>
        </div>

        <hr class="sep">
        <div class="note">検索では <code>fly me</code> / <code>moon</code> / <code>終劇</code> でも開ける。</div>
      `;
      const music = document.getElementById("musicNyCard");
      if (music && music.insertAdjacentElement) music.insertAdjacentElement("afterend", card);
      else insertAfterR122OrAppend(card);
    }
  }

  document.addEventListener("DOMContentLoaded", injectMusicCardIntoGallery);

  window.SiteSearch = Object.freeze({
    pages: PAGES,
    find,
    execute,
    getDomain,
    googleSiteSearchUrl,
    resolveDocumentUrl,
    isBlockedQuery,
    isHiddenCommand,
    hiddenCommandTarget: HIDDEN_COMMAND_TARGET,
  });
})();
