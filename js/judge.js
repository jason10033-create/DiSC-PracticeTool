/* 評審版 Demo 影片（前台段）：開場 → 痛點 → 四大功能依序（①→④）實際操作 → 自動接續後台（judge-admin.html）
   要改影片上的字，只要改下面 T 這一段；兩行字幕用 \n 分開（第二行自動縮小）。*/
(() => {
  /* ================= 字幕與字卡文字 ================= */
  const T = {
    open: { kick: "MOXA AI 創客獎 ・ Demo", title: "DiSC 人際風格實踐平台", sub: "把一天的溝通課程，變成每天都用得到的溝通工具" },
    pain: { kick: "痛點", title: "溝通的隔閡，每天都在消耗團隊",
      points: ["風格不同 → 誤解、重工、會議空轉，彼此越來越難信任", "沒學過 DiSC 不知從何開始；上過課的，三週後只記得「我是 D 型」", "遇到難溝通的情境，當下沒有工具能查「該怎麼跟他說」"],
      src: "全球職場平均每人每週花 2.1 小時處理衝突（CPP Global Human Capital Report, 2008）" },
    home: "四個步驟：學原理 → 看懂自己 → 識別他人 → 彈性調適\n手機、電腦都能用，打開網址就能上手",
    tools1: "① 解密工具\n沒學過 DiSC 也沒關係：從四種風格的基本觀念開始",
    tools2: "教材、圖卡、重點觀念，幾分鐘就能看懂\n上過課的同仁，也能隨時回來複習",
    self1: "② 看懂自己\n15 題自我測評：逐項勾選施測須知，才能開始作答",
    self2: "每題選「最像我」與「最不像我」",
    self3: "作答完成，立即計分並判讀風格\n共 23 種結果類型（含主型與輔型）",
    self4: "一鍵下載專屬結果小卡，分享給夥伴",
    others1: "③ 識別他人\n面對不太熟的同事、主管、客戶，可以用「觀察到的行為」來判斷",
    others2: "10 題的外顯特徵觀察：憑實際看到的作答，不憑印象",
    others3: "得到「可能的類型」，不貼標籤、保留彈性",
    adapt1: "④ 彈性調適\n先認識四種風格：在乎什麼、怎麼溝通最有效",
    adapt2: "風格應對神器：選好「自己」與「對方」的風格\n12 × 12 = 144 種組合，各有專屬攻略",
    adapt3: "再選關係方向：上對下、下對上、平行單位\n同一組合，不同對象的溝通方法不一樣",
    adapt4: "具體告訴你：怎麼調整、避免踩雷、如何找到共識",
    toAdmin: { kick: "講師／HR 視角", title: "管理後台", sub: "一個後台，管理全部內容與學員結果" },
    demoName: "示範學員"
  };
  /* 「看懂自己」示範作答：每題「最像我」與「最不像我」要選的風格（結果會是 i 型帶 D 或 S 傾向）*/
  const SELF_MOST = ["I", "I", "D", "I", "S", "I", "D", "I", "I", "S", "I", "D", "I", "S", "I"];
  const SELF_LEAST = ["C", "C", "S", "C", "C", "C", "C", "S", "C", "C", "D", "C", "C", "C", "S"];
  /* 「識別他人」示範作答（D、C 交錯 → 結果會是「D 型或 C 型」）*/
  const OTHERS_PICK = ["D", "C", "D", "C", "D", "C", "D", "C", "I", "S"];
  /* ================================================== */

  const { wait, cap, tag, card, cardOff, q, moveTo, click, type, scrollTo, scrollToEl, ff, cp, start, goPage } = DK;
  const home = async () => { const b = document.querySelector('.wrap a[href="#/"], a.imm-back'); if (b) await click(b, { dur: 0.6 }); else location.hash = "#/"; await q(".feature"); await wait(500); };
  const optIdx = (opts, t) => Math.max(0, opts.findIndex(o => o.type === t));

  async function run() {
    await card(T.open, 2600); await card(T.pain, 2600, { step: 1700 }); await cardOff();

    // 首頁
    location.hash = "#/"; await q(".feature"); await cap(T.home); await wait(1200);
    for (const id of ["tools", "self", "others", "adapt"]) { await moveTo(await q(`.feature[data-f="${id}"]`), { dur: 0.5 }); await wait(220); }

    // ① 解密工具：沒學過 DiSC 也能從這裡開始
    tag("① 解密工具"); await cap(T.tools1); await click(await q('.feature[data-f="tools"]'), { after: 600 });
    await q(".article-item"); await wait(1600);
    await click(await q(".article-item"), { after: 900 }); await cap(T.tools2); await cp("tools");
    await scrollTo(Math.min(640, document.documentElement.scrollHeight), 1400); await wait(1600); await scrollTo(0, 800);
    await home();

    // ② 看懂自己：實際作答 15 題
    tag("② 看懂自己"); await cap(T.self1); await click(await q('.feature[data-f="self"]'), { after: 900 });
    await cp("self-intro");
    for (const l of document.querySelectorAll(".imm-check")) await click(l, { dur: 0.45, after: 260, fx: 0.92 });
    await wait(700);
    await type(await q("#nm"), T.demoName, { after: 400 });
    await click(await q("#go:not([disabled])"), { after: 900 });
    await q(".imm-qcard"); await cap(T.self2);
    const n = selfRun.qs.length;
    for (let i = 0; i < n; i++) {
      const fast = i >= 2; if (i === 2) ff(true);
      const opts = selfRun.qs[selfRun.cur].options, sp = fast ? { dur: 0.2, after: 90 } : { dur: 0.65, after: 420 };
      await click(await q(`.mark.most[data-i="${optIdx(opts, SELF_MOST[i % SELF_MOST.length])}"]`), sp);
      let li = optIdx(opts, SELF_LEAST[i % SELF_LEAST.length]); if (li === optIdx(opts, SELF_MOST[i % SELF_MOST.length])) li = (li + 1) % opts.length;
      await click(await q(`.mark.least[data-i="${li}"]`), sp);
      await click(await q("#next:not([disabled])"), fast ? { dur: 0.2, after: 160 } : { dur: 0.55, after: 600 });
    }
    ff(false);
    await q(".res-split, .tips", 15000); await cap(T.self3); await cp("self-result"); await wait(2800);
    await scrollTo(520, 1300); await wait(1400); await scrollTo(0, 900);
    const dl = document.querySelector("#dlCard");
    if (dl) { await cap(T.self4); await click(dl, { after: 700 }); await q(".cardpv"); await wait(2600); await click(await q("#cardClose"), { dur: 0.6 }); }
    await home();

    // ③ 識別他人
    tag("③ 識別他人"); await cap(T.others1); await click(await q('.feature[data-f="others"]'), { after: 700 });
    await q("#go"); await wait(2000); await cap(T.others2); await click(await q("#go"), { after: 600 });
    await q(".pick"); await cp("others-quiz");
    const total = othersRun.qs.length;
    for (let i = 0; i < total; i++) {
      const fast = i >= 2; if (i === 2) ff(true);
      const idx = othersRun.qs[othersRun.cur].options.findIndex(o => o.type === OTHERS_PICK[i % OTHERS_PICK.length]);
      await click(await q(`.pick[data-i="${Math.max(0, idx)}"]`), fast ? { dur: 0.2, after: 110 } : { dur: 0.65, after: 450 });
      await click(await q("#next"), fast ? { dur: 0.2, after: 180 } : { dur: 0.55, after: 550 });
    }
    ff(false);
    await q(".styleBadge"); await cap(T.others3); await cp("others-result"); await wait(2800);
    await scrollTo(420, 1200); await wait(1400); await scrollTo(0, 900);
    await home();

    // ④ 彈性調適
    tag("④ 彈性調適"); await cap(T.adapt1); await click(await q('.feature[data-f="adapt"]'), { after: 800 });
    await q(".mk-pick, .chip"); await cp("adapt-types");
    for (const t of ["D", "S"]) { const b = document.querySelector(`[data-tsel="${t}"]`); if (b) await click(b, { after: 1500 }); }
    await scrollTo(330, 1100); await wait(1300); await scrollTo(0, 800);
    await click(await q('[data-tab="tool"]'), { after: 700 });
    await cap(T.adapt2);
    await click(await q('.chip[data-w="me"][data-p="D"]'), { dur: 0.6, after: 250 });
    await click(await q('.chip[data-w="me"][data-s="I"]'), { dur: 0.5, after: 250 });
    await click(await q('.chip[data-w="other"][data-p="S"]'), { dur: 0.6, after: 250 });
    await click(await q('.chip[data-w="other"][data-s="C"]'), { dur: 0.5, after: 350 });
    await cap(T.adapt3);
    const up = document.querySelector('.chip[data-dir="up"]'); if (up) await click(up, { dur: 0.6, after: 500 });
    await click(await q("#queryBtn"), { after: 1200 });
    const duo = await q(".mk-duo, #adaptBody .card:last-child"); await scrollToEl(duo, 120); await cp("adapt-tool"); await wait(2200);
    await cap(T.adapt4); await scrollTo(scrollY + 420, 1300); await wait(1800); await scrollTo(scrollY + 380, 1200); await wait(1400);
    await scrollTo(0, 900);
    const down = document.querySelector('.chip[data-dir="down"]'); if (down) { await click(down, { dur: 0.6, after: 400 }); await click(await q("#queryBtn"), { after: 1200 }); const d2 = await q(".mk-duo, #adaptBody .card:last-child"); await scrollToEl(d2, 120); await wait(2200); await scrollTo(0, 800); }
    await home();

    // 接續後台
    tag(""); await cap(""); await card(T.toAdmin, 1400); await cp("to-admin");
    goPage("judge-admin.html");
  }
  start(run, { intro: `<p style="color:#ffd27a">前台約 2 分 40 秒 ＋ 後台約 1 分 30 秒，全程自動，不會寫入正式資料</p>` });
})();
