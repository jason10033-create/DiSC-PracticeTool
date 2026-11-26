/* 評審版 Demo 影片共用工具（judge.html／judge-admin.html）：字幕列、字卡、假滑鼠、點擊光圈、快轉標示、擋住真實點擊的透明層。
   與課後邀請影片（demo.html／demo.js）互不影響。
   網址參數：?speed=1.25（播放速度）、?theme=light|dark、?auto=1（不等空白鍵，直接開始；從前台接續到後台時使用）*/
window.DK = (() => {
  const P = new URLSearchParams(location.search), SPEED = Math.max(0.3, +P.get("speed") || 1.25);
  if (P.get("theme") === "light" || P.get("theme") === "dark") applyTheme(P.get("theme"));
  const wait = ms => new Promise(r => setTimeout(r, ms / SPEED));
  const realWait = ms => new Promise(r => setTimeout(r, ms));
  const pass = (k => [...P].filter(([n]) => k.includes(n)).map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join("&"))(["speed", "theme", "voice", "rate"]);

  /* ---------- AI 旁白（瀏覽器內建語音朗讀字幕與字卡）----------
     ?voice=1 開啟（自動挑台灣中文的自然語音，建議用 Edge）；?voice=YunJhe 指定聲音名稱的一部分；?rate=1.1 語速（預設 1.1；1 ＝ 正常語速）
     開啟後：每句字幕／字卡會唸出來，而且「上一句唸完」才會換下一句，聲音不會被切斷。*/
  const VOICE = P.get("voice") || "", RATE = Math.min(4, Math.max(0.5, +P.get("rate") || 1.1));
  const SAY = !!VOICE && VOICE !== "0" && "speechSynthesis" in window;
  let voiceObj = null; const speaking = new Set();
  const zhVoices = () => speechSynthesis.getVoices().filter(v => /^zh[-_](TW|HK|CN)/i.test(v.lang)).sort((a, b) => /TW/i.test(b.lang) - /TW/i.test(a.lang));
  const voicesReady = () => new Promise(r => { if (speechSynthesis.getVoices().length) return r(); speechSynthesis.addEventListener("voiceschanged", r, { once: true }); setTimeout(r, 3000); });
  const pickVoice = () => { const vs = zhVoices(), tw = vs.filter(v => /TW/i.test(v.lang));
    return (VOICE !== "1" && vs.find(v => v.name.toLowerCase().includes(VOICE.toLowerCase()))) || tw.find(v => /HsiaoChen/i.test(v.name) && /Natural|Online/i.test(v.name)) || tw.find(v => /Natural|Online/i.test(v.name)) || tw[0] || vs[0] || null; };
  /* 把字幕文字轉成好唸的口語：去掉圈號、箭頭改成停頓、英文縮寫改成逐字母 */
  const spoken = s => String(s || "").replace(/[①②③④]/g, "").replace(/\n/g, "。").replace(/\s*→\s*/g, "，").replace(/[／]/g, "、").replace(/[（(]/g, "，").replace(/[）)]/g, "，")
    .replace(/DiSC/g, "D I S C").replace(/\bi 型/g, "I 型").replace(/×/g, "乘").replace(/＝|=/g, "等於").replace(/1-on-1/gi, "one on one").replace(/[「」]/g, "").replace(/，\s*([。，]|$)/g, "$1").trim();
  /* 唸出一句。出錯時自動補救：先把語速降到 2 倍，再不行就換成電腦內建（非線上）的中文聲音；錯誤會顯示在 console 與 window.__voiceErr */
  let rateNow = RATE;
  const utter = (text, voice, rate) => new Promise(r => { const u = new SpeechSynthesisUtterance(text); u.lang = voice ? voice.lang : "zh-TW"; if (voice) u.voice = voice; u.rate = rate;
    let done = false; const fin = v => { if (!done) { done = true; utter.keep.delete(u); r(v); } };
    u.onend = () => fin(true); u.onerror = e => { window.__voiceErr = `${voice && voice.name}｜語速 ${rate}｜${e.error}`; console.warn("AI 旁白出錯：", window.__voiceErr); fin(e.error === "interrupted" || e.error === "canceled" ? true : false); };
    utter.keep.add(u); speechSynthesis.speak(u); setTimeout(() => fin(true), 4000 + text.length * 420 / rate); });
  utter.keep = new Set();   // 保留引用，避免 Chrome／Edge 把還沒唸完的語音回收掉
  const speak = text => { if (!SAY || !(text = spoken(text))) return Promise.resolve();
    const p = (async () => {
      if (await utter(text, voiceObj, rateNow)) return;
      if (rateNow > 2) { rateNow = 2; if (await utter(text, voiceObj, rateNow)) return; }
      const local = zhVoices().find(v => v.localService && v !== voiceObj); if (local) { voiceObj = local; await utter(text, voiceObj, rateNow); }
    })().finally(() => speaking.delete(p));
    speaking.add(p); return p; };
  const spoke = () => Promise.all([...speaking]);   // 等目前的旁白唸完

  const css = document.createElement("style");
  css.textContent = `
    html { scrollbar-width:none; } ::-webkit-scrollbar { display:none; }
    #siteFooter { display:none; }
    #demoBlock { position:fixed; inset:0; z-index:9000; }
    #demoCap { position:fixed; left:50%; bottom:5vh; transform:translate(-50%,12px); z-index:9100; width:max-content; max-width:min(1180px,92vw); padding:16px 34px; border-radius:22px; text-align:center;
      font-size:clamp(22px,2.6vw,34px); font-weight:800; line-height:1.5; letter-spacing:.04em; color:#fff; background:rgba(14,16,30,.84); border:1px solid rgba(255,255,255,.18);
      box-shadow:0 14px 40px rgba(0,0,0,.4); opacity:0; transition:opacity .35s ease, transform .35s ease; pointer-events:none; -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); }
    #demoCap.on { opacity:1; transform:translate(-50%,0); }
    #demoCap .l2 { display:block; font-size:.74em; font-weight:700; opacity:.92; }
    #demoTag { position:fixed; top:74px; left:22px; z-index:9100; padding:6px 16px; border-radius:99px; font-weight:800; font-size:16px; letter-spacing:.06em; color:#fff; background:rgba(14,16,30,.82); opacity:0; transition:opacity .3s; pointer-events:none; }
    #demoTag.on { opacity:1; }
    #demoCard { position:fixed; inset:0; z-index:9300; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; text-align:center; padding:0 6vw; background:var(--bg);
      opacity:0; pointer-events:none; transition:opacity .6s ease; }
    #demoCard.on { opacity:1; } #demoCard.instant { transition:none; }
    #demoCard::before { content:""; position:absolute; inset:0; z-index:-1;
      background:radial-gradient(38% 38% at 16% 20%, color-mix(in srgb, var(--D) 30%, transparent), transparent 70%), radial-gradient(36% 36% at 84% 16%, color-mix(in srgb, var(--I) 32%, transparent), transparent 70%),
        radial-gradient(40% 40% at 86% 84%, color-mix(in srgb, var(--C) 30%, transparent), transparent 70%), radial-gradient(38% 38% at 14% 86%, color-mix(in srgb, var(--S) 32%, transparent), transparent 70%); }
    #demoCard .kick { margin:0; font-size:clamp(16px,1.8vw,24px); font-weight:800; letter-spacing:.2em; color:var(--muted); }
    #demoCard h1 { margin:6px 0 0; font-size:clamp(38px,5.4vw,72px); font-weight:900; letter-spacing:.05em; line-height:1.25; }
    #demoCard .sub { margin:0; font-size:clamp(22px,2.6vw,36px); font-weight:700; color:var(--muted); line-height:1.5; }
    #demoCard .line { margin:6px 0 0; font-size:clamp(18px,2.1vw,28px); font-weight:700; line-height:1.6; }
    #demoCard .src { margin:4px 0 0; font-size:clamp(13px,1.2vw,17px); color:var(--muted); }
    #demoCard .url { margin:18px 0 0; padding:8px 26px; border-radius:99px; font-size:clamp(16px,2vw,26px); font-weight:800; letter-spacing:.04em; background:var(--surface); border:1px solid var(--line); }
    #demoCard .pts { display:flex; flex-direction:column; gap:12px; margin:14px 0 0; text-align:left; }
    #demoCard .pt { display:flex; gap:16px; align-items:center; padding:14px 24px; border-radius:18px; background:color-mix(in srgb, var(--surface) 82%, transparent); border:1px solid var(--line);
      font-size:clamp(18px,2vw,27px); font-weight:700; line-height:1.45; opacity:0; transform:translateY(10px); transition:opacity .5s ease, transform .5s ease; }
    #demoCard .pt.on { opacity:1; transform:none; }
    #demoCard .pt i { flex:none; width:16px; height:16px; border-radius:50%; }
    #demoCard .stats { display:flex; gap:18px; flex-wrap:wrap; justify-content:center; margin-top:16px; }
    #demoCard .stat { min-width:190px; padding:18px 22px; border-radius:20px; background:color-mix(in srgb, var(--surface) 82%, transparent); border:1px solid var(--line);
      opacity:0; transform:translateY(10px); transition:opacity .5s ease, transform .5s ease; }
    #demoCard .stat.on { opacity:1; transform:none; }
    #demoCard .stat b { display:block; font-size:clamp(34px,4.2vw,60px); font-weight:900; line-height:1.1; }
    #demoCard .stat span { display:block; margin-top:6px; font-size:clamp(15px,1.5vw,21px); font-weight:700; color:var(--muted); }
    .dk-orb { width:110px; height:110px; }
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
  const capEl = mk("div", "demoCap"), cardEl = mk("div", "demoCard"), ffEl = mk("div", "demoFF", "快轉 ▶▶"), tagEl = mk("div", "demoTag");
  const curEl = mk("div", "demoCur", `<svg viewBox="0 0 28 28" width="34" height="34"><path d="M4 2 L4 21 L9 16.500 L12.500 24 L16 22.500 L12.500 15 L19.500 15 Z" fill="#fff" stroke="#111" stroke-width="1.600" stroke-linejoin="round"/></svg>`);
  curEl.style.transform = `translate(${innerWidth * 0.62}px,${innerHeight * 0.72}px)`;
  const ORB = `<svg viewBox="0 0 120 120" class="dk-orb" aria-hidden="true"><path d="M60 60V6A54 54 0 0 0 6 60Z" fill="var(--D)"/><path d="M60 60H114A54 54 0 0 0 60 6Z" fill="var(--I)"/><path d="M60 60V114A54 54 0 0 0 114 60Z" fill="var(--S)"/><path d="M60 60H6A54 54 0 0 0 60 114Z" fill="var(--C)"/></svg>`;
  const COLORS = ["var(--D)", "var(--I)", "var(--S)", "var(--C)"];
  const br = s => String(s || "").replace(/\n/g, "<br>");

  /* ---------- 字幕／字卡 ---------- */
  /* cap(字幕, 旁白)：旁白不填就唸字幕本身；開啟 AI 旁白時，會先等上一句唸完才換字幕 */
  const cap = async (text, say) => { await spoke(); speak(say ?? text); capEl.classList.remove("on"); await realWait(260 / SPEED); const [a, b] = String(text || "").split("\n"); capEl.innerHTML = `${a || ""}${b ? `<span class="l2">${b}</span>` : ""}`; if (text) capEl.classList.add("on"); };
  const tag = text => { tagEl.textContent = text || ""; tagEl.classList.toggle("on", !!text); };
  /* 字卡：c = { kick, title, sub, line, src, url, points:[…], stats:[[數字, 說明]…], orb:true }，ms＝停留時間（o.real 為 true 時是實際毫秒）；points / stats 會逐一出現 */
  /* AI 旁白：唸 title＋sub（或 c.say 指定的話），points／stats 出現時逐一唸；kick、src、url 不唸。o.silent：不唸 */
  const card = async (c, ms, o = {}) => {
    if (!o.silent) { await spoke(); speak(c.say ?? [c.title, c.sub].filter(Boolean).join("。")); }
    cardEl.classList.toggle("instant", !!o.instant);
    cardEl.innerHTML = `${c.orb === false ? "" : ORB}${c.kick ? `<p class="kick">${c.kick}</p>` : ""}${c.title ? `<h1>${br(c.title)}</h1>` : ""}${c.sub ? `<p class="sub">${br(c.sub)}</p>` : ""}
      ${c.points ? `<div class="pts">${c.points.map((p, i) => `<div class="pt"><i style="background:${COLORS[i % 4]}"></i><span>${br(p)}</span></div>`).join("")}</div>` : ""}
      ${c.stats ? `<div class="stats">${c.stats.map(([n, t]) => `<div class="stat"><b>${n}</b><span>${br(t)}</span></div>`).join("")}</div>` : ""}
      ${c.line ? `<p class="line">${br(c.line)}</p>` : ""}${c.src ? `<p class="src">${c.src}</p>` : ""}${c.url ? `<p class="url">${c.url}</p>` : ""}`;
    cardEl.classList.add("on"); if (o.instant) { cardEl.offsetHeight; cardEl.classList.remove("instant"); }
    const items = [...cardEl.querySelectorAll(".pt, .stat")];
    const say = o.silent ? [] : [...(c.points || []), ...(c.stats || []).map(([n, t]) => `${n}，${String(t).split("\n")[0]}`)];
    if (items.length) { await Promise.all([wait(900), spoke()]); for (const [i, e] of items.entries()) { e.classList.add("on"); speak(say[i]); await Promise.all([wait(o.step ?? 1500), spoke()]); } }
    await Promise.all([(o.real ? realWait : wait)(ms), spoke()]);   // o.real：ms 是實際毫秒，不受 ?speed 影響；開啟旁白時至少停到唸完
  };
  const cardOff = async () => { cardEl.classList.remove("on"); await wait(700); };

  /* ---------- 操作 ---------- */
  const q = async (sel, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const e = document.querySelector(sel); if (e) return e; await realWait(100); } throw new Error("找不到畫面元素：" + sel); };
  const reveal = async el => { const r = el.getBoundingClientRect(); if (r.top < 90 || r.bottom > innerHeight - 150) { window.scrollTo({ top: Math.max(0, scrollY + r.top - innerHeight / 2 + r.height / 2), behavior: "smooth" }); await wait(900); } };
  const moveTo = async (el, o = {}) => { await reveal(el); const r = el.getBoundingClientRect(), x = r.left + r.width * (o.fx ?? 0.5), y = r.top + r.height * (o.fy ?? 0.5), d = o.dur ?? 0.8;
    curEl.style.transitionDuration = d / SPEED + "s"; curEl.style.transform = `translate(${x}px,${y}px)`; await wait(d * 1000 + 60); };
  const ripple = () => { const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(curEl.style.transform); if (!m) return; const e = document.createElement("i"); e.className = "demoRip"; e.style.left = m[1] + "px"; e.style.top = m[2] + "px"; document.body.appendChild(e); setTimeout(() => e.remove(), 700); };
  const click = async (el, o = {}) => { await moveTo(el, o); ripple(); await wait(140); el.click(); await wait(o.after ?? 450); };
  /* 切換 checkbox 並觸發 change（後台開關用）*/
  const toggle = async (el, o = {}) => { await moveTo(el, o); ripple(); await wait(140); el.checked = !el.checked; el.dispatchEvent(new Event("change", { bubbles: true })); await wait(o.after ?? 600); };
  /* 逐字輸入 */
  const type = async (el, text, o = {}) => { await click(el, { after: 200 }); el.value = ""; for (const ch of text) { el.value += ch; el.dispatchEvent(new Event("input", { bubbles: true })); await wait(o.per ?? 110); } await wait(o.after ?? 300); };
  const scrollTo = async (y, ms = 1200) => { window.scrollTo({ top: y, behavior: "smooth" }); await wait(ms); };
  const scrollToEl = async (el, offset = 110, ms = 1100) => scrollTo(scrollY + el.getBoundingClientRect().top - offset, ms);
  const ff = on => ffEl.classList.toggle("on", on);
  const cp = async n => { if (P.get("hold") === n) await new Promise(() => {}); }; // 測試用：?hold=名稱 會停在該畫面

  /* ---------- 開始：等頁面載入 ➜ 等空白鍵（auto=1 時直接開始）---------- */
  function start(run, { intro = "", ready = () => !document.getElementById("splash"), coverFirst = null } = {}) {
    const auto = P.get("auto") === "1";
    if (coverFirst) card(coverFirst, 0, { instant: true, silent: true }); // 從上一頁接續時，先蓋上同一張字卡，避免看到頁面載入的過程
    const begin = async () => {
      document.getElementById("demoStart")?.remove();
      try { if (SAY) { await voicesReady(); voiceObj = voiceObj || pickVoice(); speechSynthesis.cancel(); }
        while (!ready()) await realWait(100); window.scrollTo(0, 0); await realWait(400); await run(); window.__demoDone = true; }
      catch (e) { console.error(e); capEl.textContent = "示範中斷：" + e.message; capEl.classList.add("on"); window.__demoError = e.message; }
    };
    let started = false; const go = () => { if (!started) { started = true; begin(); } };
    document.addEventListener("keydown", e => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); go(); } });
    window.__demoStart = go; // 測試用
    if (auto && !SAY) return begin();
    // 瀏覽器規定「換頁後要再按一次鍵」才能發出語音：開啟旁白時，接續到後台會停在字卡上，等你再按一次空白鍵
    if (auto) { document.addEventListener("click", go); return; }
    mk("div", "demoStart", `<h2>評審版 Demo 影片</h2>${intro}
      <p>1. 瀏覽器按 <b>F11</b> 全螢幕，並用 <b>Ctrl ＋</b> 放大到 <b>125%～150%</b></p>
      <p>2. 開始錄影（Windows：<b>Win ＋ Alt ＋ R</b>，或 Clipchamp 螢幕錄製）${SAY ? "，記得<b>錄進系統聲音</b>" : ""}</p>
      <p>3. 按下 <b>空白鍵</b> 開始自動播放，前台播完會自動接續到後台${SAY ? "<br>（AI 旁白開啟時：換到後台後畫面會停在字卡，<b>再按一次空白鍵</b>繼續）" : ""}</p>
      ${SAY ? `<p id="dkVoice" style="color:#ffd27a">🔊 AI 旁白：讀取聲音中…</p>` : `<p style="color:#8a93ad">想加 AI 旁白：網址後面加 <b>?voice=1</b>（建議用 Edge）</p>`}
      ${SAY ? `<button class="go" id="dkTest" style="background:#2c3350;font-size:18px;padding:8px 26px">🔈 先試聽（用滑鼠點）</button><p id="dkTestMsg" style="font-size:16px;min-height:1.9em"></p>` : ""}
      <button class="go" id="demoGo">按空白鍵（或點這裡）開始</button>`);
    document.getElementById("demoGo").onclick = go;
    if (SAY) voicesReady().then(() => { const v = voiceObj = pickVoice(), el = document.getElementById("dkVoice"); if (!el) return;
      el.innerHTML = v ? `🔊 AI 旁白：<b>${v.name}</b>　語速 ${RATE}<br><span style="font-size:15px;color:#8a93ad">可換聲音：${zhVoices().filter(x => /TW/i.test(x.lang)).map(x => x.name.replace(/^Microsoft\s+|\s+-\s+.*$/g, "")).join("、") || "（無）"}</span>` : "⚠ 找不到中文語音，請改用 Edge 開啟"; });
    if (SAY) document.getElementById("dkTest").onclick = async () => { const m = document.getElementById("dkTestMsg"); m.style.color = "#b9c0d6"; m.textContent = "播放中…（如果沒聽到，請檢查喇叭／音量）";
      window.__voiceErr = ""; speechSynthesis.cancel(); await voicesReady(); voiceObj = voiceObj || pickVoice(); await speak("這是 AI 旁白的試聽，聽得到就可以開始錄影了");
      m.style.color = window.__voiceErr ? "#ff9b8a" : "#9be3a8";
      m.textContent = window.__voiceErr ? `語音出錯：${window.__voiceErr}${voiceObj ? `　→ 已自動改用「${voiceObj.name}」、語速 ${rateNow}，請再試聽一次` : ""}` : `✓ 播放完成（${voiceObj ? voiceObj.name : "預設聲音"}，語速 ${rateNow}）`; };
  }
  /* 換頁（前台 → 後台），保留速度與主題參數 */
  const goPage = (href, extra = "") => { location.href = `${href}?auto=1${pass ? "&" + pass : ""}${extra}`; };

  return { P, SPEED, SAY, speak, spoke, wait, realWait, cap, tag, card, cardOff, q, moveTo, click, toggle, type, scrollTo, scrollToEl, ff, cp, start, goPage };
})();
