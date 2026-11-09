/* 影片示範頁（demo.html）：自動操作前台、加上字幕與字卡，供螢幕錄影用。
   用法：開啟 demo.html → 瀏覽器按 F11 全螢幕並放大到 150% → 開始錄影 → 按空白鍵開始播放。
   網址參數：?speed=1（播放速度，預設 1）、?theme=light|dark（預設沿用網站，第一次進入為深色）。*/
(() => {
  /* ================= 字幕與字卡文字（要改影片上的字，就改這一段）================= */
  const T = {
    openTitle: "課後，繼續用 DiSC",
    openSub: "四個工具，陪你把學到的用進每天的溝通",
    home: "課後這個網站，陪你把 DiSC 用進每天的工作",
    tools1: "① 解密工具\n隨時回來複習課程重點",
    tools2: "教材、圖文、影片，一次看完",
    self1: "② 看懂自己\n課前測評的結果，隨時回頭看",
    self2: "還能下載專屬的結果小卡，分享給夥伴",
    others1: "③ 識別他人\n面對不太熟的人，用「觀察到的行為」來釐清",
    others2: "憑實際看到的行為作答，不憑猜測",
    others3: "得到「可能的類型」，不貼標籤、保留彈性",
    adapt1: "④ 彈性調適\n找到與每一種風格的溝通攻略",
    adapt2: "先認識四種風格：在乎什麼、怎麼溝通最有效",
    adapt3: "選好你和對方的風格，立刻得到調整建議",
    adapt4: "不管對方是哪一型，都有對應的攻略",
    closeTitle: "課後一起練習",
    closeSub: "解密工具　→　識別他人　→　彈性調適",
    closeLine: "讓每一次溝通，都更貼近對方",
    url: "jason10033-create.github.io/DiSC-PracticeTool"
  };
  /* 「識別他人」示範時要選的風格順序（D、C 交錯 → 結果會是「D 型或 C 型」）*/
  const OTHERS_PICK = ["D", "C", "D", "C", "D", "C", "D", "C", "I", "S"];
  /* =============================================================================== */

  const P = new URLSearchParams(location.search), SPEED = Math.max(0.3, +P.get("speed") || 1.25); // 預設 1.25 倍；想放慢可用 ?speed=1
  if (P.get("theme") === "light" || P.get("theme") === "dark") applyTheme(P.get("theme")); // 只影響這次，不寫入瀏覽器偏好
  const wait = ms => new Promise(r => setTimeout(r, ms / SPEED));
  const realWait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 版面：字幕列、字卡、假滑鼠、點擊光圈、快轉標示、擋住真實點擊的透明層 ---------- */
  const css = document.createElement("style");
  css.textContent = `
    html { scrollbar-width:none; } ::-webkit-scrollbar { display:none; }
    #siteFooter { display:none; }
    #demoBlock { position:fixed; inset:0; z-index:9000; }
    #demoCap { position:fixed; left:50%; bottom:5vh; transform:translate(-50%,12px); z-index:9100; width:max-content; max-width:min(1180px,92vw); padding:16px 34px; border-radius:22px; text-align:center;
      font-size:clamp(22px,2.6vw,34px); font-weight:800; line-height:1.5; letter-spacing:.04em; color:#fff; background:rgba(14,16,30,.82); border:1px solid rgba(255,255,255,.18);
      box-shadow:0 14px 40px rgba(0,0,0,.4); opacity:0; transition:opacity .35s ease, transform .35s ease; pointer-events:none; -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); }
    #demoCap.on { opacity:1; transform:translate(-50%,0); }
    #demoCap .l2 { display:block; font-size:.74em; font-weight:700; opacity:.92; }
    #demoCard { position:fixed; inset:0; z-index:9300; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; text-align:center; background:var(--bg);
      opacity:0; pointer-events:none; transition:opacity .6s ease; }
    #demoCard.on { opacity:1; }
    #demoCard::before { content:""; position:absolute; inset:0; z-index:-1;
      background:radial-gradient(38% 38% at 16% 20%, color-mix(in srgb, var(--D) 30%, transparent), transparent 70%), radial-gradient(36% 36% at 84% 16%, color-mix(in srgb, var(--I) 32%, transparent), transparent 70%),
        radial-gradient(40% 40% at 86% 84%, color-mix(in srgb, var(--C) 30%, transparent), transparent 70%), radial-gradient(38% 38% at 14% 86%, color-mix(in srgb, var(--S) 32%, transparent), transparent 70%); }
    #demoCard h1 { margin:18px 0 0; font-size:clamp(40px,6vw,78px); font-weight:900; letter-spacing:.06em; }
    #demoCard .sub { margin:0; font-size:clamp(22px,2.8vw,38px); font-weight:700; color:var(--muted); }
    #demoCard .line { margin:6px 0 0; font-size:clamp(18px,2.2vw,28px); font-weight:700; }
    #demoCard .url { margin:18px 0 0; padding:8px 26px; border-radius:99px; font-size:clamp(16px,2vw,26px); font-weight:800; letter-spacing:.04em; background:var(--surface); border:1px solid var(--line); }
    #demoCur { position:fixed; left:0; top:0; z-index:9200; width:34px; height:34px; margin:-4px 0 0 -4px; pointer-events:none; transition:transform .8s cubic-bezier(.45,0,.2,1); filter:drop-shadow(0 4px 6px rgba(0,0,0,.45)); }
    .demoRip { position:fixed; z-index:9190; width:18px; height:18px; margin:-9px 0 0 -9px; border-radius:50%; pointer-events:none; border:3px solid var(--brand); animation:demoRip .55s ease-out forwards; }
    @keyframes demoRip { from { transform:scale(.4); opacity:1; } to { transform:scale(3.2); opacity:0; } }
    #demoFF { position:fixed; top:74px; right:22px; z-index:9100; padding:6px 16px; border-radius:99px; font-weight:800; font-size:16px; letter-spacing:.1em; color:#fff; background:rgba(14,16,30,.82); opacity:0; transition:opacity .3s; pointer-events:none; }
    #demoFF.on { opacity:1; }
    #demoStart { position:fixed; inset:0; z-index:9500; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; background:#0b0d17; color:#fff; text-align:center; padding:24px; }
    #demoStart h2 { margin:0 0 8px; font-size:34px; } #demoStart p { margin:0; font-size:20px; color:#b9c0d6; line-height:1.9; } #demoStart b { color:#fff; }
    #demoStart .go { margin-top:22px; padding:12px 34px; border-radius:99px; font-size:22px; font-weight:800; background:#5b4bdb; color:#fff; }`;
  document.head.appendChild(css);
  const mk = (tag, id, html = "") => { const e = document.createElement(tag); e.id = id; e.innerHTML = html; document.body.appendChild(e); return e; };
  mk("div", "demoBlock");
  const capEl = mk("div", "demoCap"), cardEl = mk("div", "demoCard"), ffEl = mk("div", "demoFF", "快轉 ▶▶");
  const curEl = mk("div", "demoCur", `<svg viewBox="0 0 28 28" width="34" height="34"><path d="M4 2 L4 21 L9 16.500 L12.500 24 L16 22.500 L12.500 15 L19.500 15 Z" fill="#fff" stroke="#111" stroke-width="1.600" stroke-linejoin="round"/></svg>`);
  curEl.style.transform = `translate(${innerWidth * 0.62}px,${innerHeight * 0.72}px)`;
  const startEl = mk("div", "demoStart", `<h2>影片示範頁</h2>
    <p>1. 瀏覽器按 <b>F11</b> 全螢幕，並用 <b>Ctrl ＋</b> 放大到 <b>150%</b></p>
    <p>2. 開始錄影（Windows：<b>Win ＋ Alt ＋ R</b>）</p>
    <p>3. 按下 <b>空白鍵</b> 開始自動播放（約 1 分 50 秒）</p>
    <button class="go" id="demoGo">按空白鍵（或點這裡）開始</button>`);

  /* ---------- 操作工具 ---------- */
  const q = async (sel, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const e = document.querySelector(sel); if (e) return e; await realWait(100); } throw new Error("找不到畫面元素：" + sel); };
  const cap = async text => { capEl.classList.remove("on"); await realWait(260 / SPEED); const [a, b] = String(text || "").split("\n"); capEl.innerHTML = `${a || ""}${b ? `<span class="l2">${b}</span>` : ""}`; if (text) capEl.classList.add("on"); };
  const card = async (title, sub, ms, line, url) => { cardEl.innerHTML = `${orbHtml("orb-big")}<h1>${title}</h1><p class="sub">${sub || ""}</p>${line ? `<p class="line">${line}</p>` : ""}${url ? `<p class="url">${url}</p>` : ""}`; cardEl.classList.add("on"); await wait(ms); };
  const cardOff = async () => { cardEl.classList.remove("on"); await wait(700); };
  const reveal = async el => { const r = el.getBoundingClientRect(); if (r.top < 90 || r.bottom > innerHeight - 150) { window.scrollTo({ top: Math.max(0, scrollY + r.top - innerHeight / 2 + r.height / 2), behavior: "smooth" }); await wait(900); } };
  const moveTo = async (el, o = {}) => { await reveal(el); const r = el.getBoundingClientRect(), x = r.left + r.width * (o.fx ?? 0.5), y = r.top + r.height * (o.fy ?? 0.5), d = o.dur ?? 0.8;
    curEl.style.transitionDuration = d / SPEED + "s"; curEl.style.transform = `translate(${x}px,${y}px)`; await wait(d * 1000 + 60); };
  const ripple = () => { const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(curEl.style.transform); if (!m) return; const e = document.createElement("i"); e.className = "demoRip"; e.style.left = m[1] + "px"; e.style.top = m[2] + "px"; document.body.appendChild(e); setTimeout(() => e.remove(), 700); };
  const click = async (el, o = {}) => { await moveTo(el, o); ripple(); await wait(140); el.click(); await wait(o.after ?? 450); };
  const scrollTo = async (y, ms = 1200) => { window.scrollTo({ top: y, behavior: "smooth" }); await wait(ms); };
  const home = async () => { const b = document.querySelector('.wrap a[href="#/"]'); if (b) await click(b, { dur: 0.6 }); else location.hash = "#/"; await q(".feature"); await wait(500); };
  const ff = async on => { ffEl.classList.toggle("on", on); };
  const cp = async n => { if (P.get("hold") === n) await new Promise(() => {}); }; // 測試用：?hold=名稱 會停在該畫面

  /* ---------- 分鏡 ---------- */
  async function run() {
    await card(T.openTitle, T.openSub, 3200); await cardOff();
    // 首頁
    location.hash = "#/"; await q(".feature"); await cap(T.home); await wait(1500);
    for (const id of ["tools", "self", "others", "adapt"]) { await moveTo(await q(`.feature[data-f="${id}"]`), { dur: 0.55 }); await wait(260); }

    // ① 解密工具
    await cap(T.tools1); await click(await q('.feature[data-f="tools"]'), { after: 600 });
    await q(".article-item"); await wait(1500); await cap(T.tools2);
    await click(await q(".article-item"), { after: 900 });
    await scrollTo(Math.min(640, document.documentElement.scrollHeight), 1400); await wait(1100); await scrollTo(0, 900);
    await home();

    // ② 看懂自己（課前已測過，直接看結果）
    await cap(T.self1); await click(await q('.feature[data-f="self"]'), { after: 700 });
    await q(".res-split, .tips"); await wait(2600);
    await scrollTo(520, 1300); await wait(900); await scrollTo(0, 900);
    await cap(T.self2); const dl = document.querySelector("#dlCard");
    if (dl) { await click(dl, { after: 700 }); await q(".cardpv"); await wait(2600); await click(await q("#cardClose"), { dur: 0.6 }); }
    await home();

    // ③ 識別他人
    await cap(T.others1); await click(await q('.feature[data-f="others"]'), { after: 700 });
    await q("#go"); await wait(2200); await cap(T.others2); await click(await q("#go"), { after: 600 });
    await q(".pick"); await cp("others-quiz");
    const total = othersRun.qs.length;
    for (let i = 0; i < total; i++) {
      const fast = i >= 2; if (fast && i === 2) await ff(true);
      const idx = othersRun.qs[othersRun.cur].options.findIndex(o => o.type === OTHERS_PICK[i % OTHERS_PICK.length]);
      await click(await q(`.pick[data-i="${Math.max(0, idx)}"]`), fast ? { dur: 0.22, after: 120 } : { dur: 0.7, after: 500 });
      await click(await q("#next"), fast ? { dur: 0.22, after: 200 } : { dur: 0.6, after: 600 });
      if (i === total - 1) await ff(false);
    }
    await q(".styleBadge"); await cap(T.others3); await cp("others-result"); await wait(3000);
    await scrollTo(420, 1200); await wait(1600); await scrollTo(0, 900);
    await home();

    // ④ 彈性調適
    await cap(T.adapt1); await click(await q('.feature[data-f="adapt"]'), { after: 800 });
    await cap(T.adapt2); await q(".mk-pick, .chip"); await cp("adapt-types");
    for (const t of ["D"]) { const b = document.querySelector(`[data-tsel="${t}"]`); if (b) { await click(b, { after: 1600 }); } }
    await scrollTo(330, 1100); await wait(1500); await scrollTo(0, 800);
    await click(await q('[data-tab="tool"]'), { after: 700 });
    await cap(T.adapt3);
    await click(await q('.chip[data-w="me"][data-p="D"]'), { dur: 0.6, after: 250 });
    await click(await q('.chip[data-w="me"][data-s="I"]'), { dur: 0.5, after: 250 });
    await click(await q('.chip[data-w="other"][data-p="S"]'), { dur: 0.6, after: 250 });
    await click(await q('.chip[data-w="other"][data-s="C"]'), { dur: 0.5, after: 350 });
    await click(await q("#queryBtn"), { after: 1200 });
    const duo = await q(".mk-duo, #adaptBody .card:last-child"); await scrollTo(scrollY + duo.getBoundingClientRect().top - 120, 1100); await cp("adapt-tool"); await wait(2600);
    await scrollTo(scrollY + 420, 1300); await wait(1500);
    await cap(T.adapt4); await scrollTo(0, 900);
    await click(await q('.chip[data-w="other"][data-p="C"]', 4000), { dur: 0.6, after: 400 });
    await click(await q("#queryBtn"), { after: 1200 });
    const duo2 = await q(".mk-duo, #adaptBody .card:last-child"); await scrollTo(scrollY + duo2.getBoundingClientRect().top - 120, 1100); await wait(2400);

    // 結尾
    await cp("close"); await cap(""); await card(T.closeTitle, T.closeSub, 5200, T.closeLine, T.url);
  }

  /* ---------- 開始：等前台載入完成 ➜ 等使用者按空白鍵 ---------- */
  const begin = async () => {
    startEl.remove();
    try { while (document.getElementById("splash")) await realWait(100); window.scrollTo(0, 0); await realWait(400); await run(); window.__demoDone = true; }
    catch (e) { console.error(e); capEl.textContent = "示範中斷：" + e.message; capEl.classList.add("on"); window.__demoError = e.message; }
  };
  let started = false; const start = () => { if (!started) { started = true; begin(); } };
  document.addEventListener("keydown", e => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); start(); } });
  document.getElementById("demoGo").onclick = start;
  window.__demoStart = start; // 測試用
})();
