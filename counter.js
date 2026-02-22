// counter.js  - 全ページ共通のアクセスカウンター & キリ番
(() => {
  const WORKSPACE = "tomoponzs-workspace";
  const COUNTER = "first-counter";

  // キリ番（好きに追加OK）
  const luckyNumbers = [7, 10, 22, 50, 77, 100, 123, 777, 1000];

  // フッターが無いページでも必ず表示できるようにする
  function ensureFooter() {
    let footer = document.querySelector(".footer");
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "footer";
      footer.textContent = "© tomoponz";
      document.body.appendChild(footer);
    }
    return footer;
  }

  function showCount(count) {
    const footer = ensureFooter();

    // 既に表示があれば更新、無ければ追加（innerHTML でフッターを壊さない）
    let span = document.getElementById("access-count");
    if (!span) {
      // 既に " | " を追加済みかチェック
      const hasSep = footer.querySelector("#access-count-sep");
      if (!hasSep) {
        const sep = document.createElement("span");
        sep.id = "access-count-sep";
        sep.textContent = " | ";
        footer.appendChild(sep);
      }
      span = document.createElement("span");
      span.id = "access-count";
      footer.appendChild(span);
    }
    span.textContent = `Access: ${count}`;
  }


  function triggerKiribanEvent(num) {
    alert(
      `【🎊 祝・キリ番達成 🎊】\n` +
      `おめでとうございます！あなたは ${num} 番目の訪問者です！\n` +
      `この画面をスクリーンショットして店主に報告してください。`
    );

    document.body.style.transition = "all 2s ease";
    document.body.style.background = "linear-gradient(45deg, #ffd700, #ff8c00)";
    document.body.style.color = "#000";

    const bars = document.querySelectorAll(".bar i");
    bars.forEach((bar) => {
      bar.style.background =
        "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)";
      bar.style.width = "100%";
    });

    console.log(
      "%c秘密のメッセージ: あなたは選ばれし者です。コードの裏側を覗くとは、なかなかの手練れですね。",
      "color: gold; font-size: 20px; font-weight: bold;"
    );
  }

  async function updateCounter() {
    try {
      // up で毎回+1（「訪問ごとに増やす」挙動）
      const res = await fetch(
        `https://api.counterapi.dev/v1/${WORKSPACE}/${COUNTER}/up`
      );
      const data = await res.json();
      const count = parseInt(data.count, 10);

      showCount(count);

      if (luckyNumbers.includes(count)) {
        triggerKiribanEvent(count);
      }
    } catch (e) {
      console.log("カウンターの取得に失敗しました。秘密基地はオフラインのようです。");
      // 取得失敗でも表示欄は残す（見た目だけでも統一）
      showCount("?");
    }
  }

  window.addEventListener("load", updateCounter);
})();
