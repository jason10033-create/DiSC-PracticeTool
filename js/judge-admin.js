/* 評審版 Demo 影片（後台段）：彙總報表 → DiSC 分布圖 → 填答者管理 → 144 種組合建議 → 結果類型內容 → AI 開發方式 → 效益 → 導入計畫 → 結尾
   要改影片上的字，只要改下面 T 這一段；兩行字幕用 \n 分開。畫面上的學員都是虛構的示範班級。*/
(() => {
  /* ================= 字幕與字卡文字 ================= */
  const T = {
    toAdmin: { kick: "講師／HR 視角", title: "管理後台", sub: "不寫程式，就能管理全部內容與學員結果" },
    settings: "基本設定：功能解鎖密碼、結果公開時機、吉祥物開關\n（以下學員皆為虛構的示範資料）",
    report1: "彙總報表：學員一交卷，全班結果即時彙整\n主型分布、平均分數、準確度回饋",
    report2: "DiSC 分布圖：一眼看出團隊的風格組成\n可顯示姓名與風格、調整大小、下載 PNG 放進簡報",
    report3: "12 種風格分布，滑鼠移上去就看到是誰\n講師不必再手動計分、畫圖",
    results: "填答者結果：依梯次分群組、一鍵匯出 CSV",
    combos: "144 種組合 × 3 種關係方向的應對建議\n內容都能在後台直接修改，改完前台立即生效",
    types: "23 種「看懂自己」結果類型：即改即預覽",
    ai: { kick: "怎麼做出來的", title: "全程用自然語言，和 AI 一起做出來",
      points: ["Claude Code 對話開發：說需求 → AI 寫程式 → 我驗收 → 再調整", "2 個月、67 次版本迭代，每一次修改都有紀錄可追溯", "GitHub Pages ＋ Supabase：零授權費、免伺服器維運"] },
    value: { kick: "效益", title: "把無形的溝通內耗，換算成看得見的時間",
      stats: [["48 人", "已實際使用\n（2026/9–11）"], ["91 工作天", "預估每年減少的溝通內耗\n（擴大至 200 人 ≒ 378 天）"], ["4.0 / 5", "學員評估\n結果準確度"]],
      src: "換算依據：CPP Global Human Capital Report（2008）每人每週 2.1 小時處理衝突" },
    plan: { kick: "導入計畫", title: "從一堂課，到全公司的溝通語言",
      points: ["2026 Q4：主管溝通工作坊導入，課前測評、課後練習", "2027 H1：擴大到新進同仁訓練與各 BU 團隊共識營", "2027 H2：團隊分布圖用於跨部門專案組隊與 1-on-1 面談"] },
    close: { title: "讓每一次溝通，都更貼近對方", sub: "DiSC 人際風格練習平台", url: "jason10033-create.github.io/DiSC-PracticeTool" }
  };
  /* ================================================== */

  const { wait, cap, tag, card, cardOff, q, moveTo, click, toggle, scrollTo, scrollToEl, cp, start } = DK;
  const nav = async v => { await click(await q(`.sidenav button[data-v="${v}"]`), { dur: 0.6, after: 300 }); await q("#view .card"); await wait(700); };
  const setRange = async (el, val) => { await moveTo(el, { fx: 0.3 }); const from = +el.value; for (let k = 1; k <= 6; k++) { el.value = Math.round(from + (val - from) * k / 6); el.dispatchEvent(new Event("input", { bubbles: true })); await wait(120); } await wait(600); };

  async function run() {
    await cardOff();
    tag("管理後台（示範資料）");
    await cap(T.settings); await wait(2600);

    // 彙總報表
    await nav("report"); await cap(T.report1); await cp("report"); await wait(2600);
    const sc = await q("#scatterWrap"); await scrollToEl(sc.closest(".card"), 90); await cap(T.report2); await wait(1200);
    await toggle(await q("#scName"), { after: 1400 });
    await toggle(await q("#scStyle"), { after: 1600 });
    await setRange(await q("#scZoom"), 150); await wait(1200);
    const dist = [...document.querySelectorAll("#view .card h2")].find(h => h.textContent.startsWith("風格分布"));
    if (dist) { await scrollToEl(dist.closest(".card"), 90); await cap(T.report3); const row = dist.closest(".card").querySelector(".bar-row[data-tip]:not([data-tip=''])"); if (row) { await moveTo(row, { fx: 0.4 }); row.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: row.getBoundingClientRect().left + 200, clientY: row.getBoundingClientRect().top + 10 })); row.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: row.getBoundingClientRect().left + 200, clientY: row.getBoundingClientRect().top + 10 })); } await wait(2600); }
    await scrollTo(0, 700);

    // 填答者結果
    await nav("results"); await cap(T.results);
    const g = document.querySelector('[data-filter="demo-g1"]'); if (g) await click(g, { after: 900 });
    await q("#csv"); await moveTo(await q("#csv"), { dur: 0.6 }); await wait(1800); await scrollTo(380, 1100); await wait(1200); await scrollTo(0, 700);

    // 144 種組合
    await nav("combos"); await cap(T.combos);
    const tab = document.querySelector('[data-dirtab="up"]'); if (tab) await click(tab, { after: 700 });
    const cell = await q('.matrix button[data-m="Di"][data-o="SC"]', 4000).catch(() => document.querySelector(".matrix button"));
    if (cell) await click(cell, { after: 900 });
    await scrollToEl(await q("#cbEd"), 90); await wait(2600); await scrollTo(0, 700);

    // 結果類型內容
    await nav("selfTypes"); await cap(T.types); await wait(2600);
    const pv = [...document.querySelectorAll("#view .card h2")].find(h => h.textContent.trim().startsWith("預覽")); if (pv) { await scrollToEl(pv.closest(".card"), 90); await wait(1800); }

    // 字卡：AI 開發方式 → 效益 → 導入計畫 → 結尾
    tag(""); await cap("");
    await card(T.ai, 2200, { step: 1700 });
    await card(T.value, 2600, { step: 1500 });
    await card(T.plan, 2200, { step: 1700 }); await cp("close");
    await card(T.close, 5000);
  }
  start(run, { coverFirst: T.toAdmin, ready: () => document.querySelector(".sidenav") && document.querySelector("#view .card") });
})();
