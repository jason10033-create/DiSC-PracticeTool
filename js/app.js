/* 學員前台 */
const app = $("#app");
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  sget(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  sset(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
let cfg = { show_results: true, randomize: false, secondary_gap: 10, locks: {} };
let adaptMap = {};
let clientId = store.get("disc_client");
if (!clientId) { clientId = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); store.set("disc_client", clientId); }

const FEATURES = [
  { id: "tools", no: "01", name: "解密工具", desc: "掌握 DiSC 的原理與應用：教材、圖文、影音一次看。", t: "D", icon: "📖" },
  { id: "self", no: "02", name: "看懂自己", desc: "15 題自我測評，發現「原來我在別人眼中是這樣！」", t: "I", icon: "🪞" },
  { id: "others", no: "03", name: "識別他人", desc: "從生活中的行為線索，觀察他人的風格與溝通偏好。", t: "S", icon: "🔍" },
  { id: "adapt", no: "04", name: "彈性調適", desc: "依對方風格調整溝通，讓你的想法更容易被接受。", t: "C", icon: "🧭" }
];
/* 解鎖後永久記住：標記存在學員瀏覽器的 localStorage（不含密碼）；之後同一個瀏覽器不會再要求輸入密碼。
   localStorage 無法使用時（例如部分無痕模式）退回只在目前分頁有效的 sessionStorage */
const isUnlocked = f => !cfg.locks[f] || store.get("disc_unlocked_" + f) === "1" || store.sget("unlocked_" + f) === true;
const rememberUnlock = f => { store.set("disc_unlocked_" + f, "1"); store.sset("unlocked_" + f, true); };

/* 首頁文字（可由後台「首頁內容」編輯）*/
let SITE = {};           // site_content 全部資料（home / intro_self / intro_others）
let HOME = getHome({});
function applyHome() {
  FEATURES.forEach(f => Object.assign(f, HOME.features[f.id]));
  $("#brandName").textContent = HOME.siteName; document.title = HOME.siteName;
  renderFooter();
}
/* 頁尾版權文字：首頁（主頁面）與其他功能頁面各用一種，可在後台「首頁內容」分別修改 */
let footerHome = true;
function renderFooter() {
  const c = footerHome ? HOME.copyrightHome : HOME.copyright;
  $("#siteFooter").innerHTML =
    (c.enabled && (c.title || c.text) ? `<div class="copyright-plain">${c.title ? `<b>${esc(c.title)}</b> ` : ""}${md(c.text || "")}</div>` : "") +
    `<p class="muted small" style="text-align:center"><a href="admin.html">${esc(HOME.adminLinkText)}</a></p>`;
}

/* ---------- 路由 ---------- */
async function route() {
  const [, page, arg] = (location.hash || "#/").split("/");
  window.scrollTo(0, 0); setImm(false);
  const pf = FEATURES.find(x => x.id === page);
  footerHome = !pf || !isUnlocked(pf.id); // 首頁，或被鎖住而退回首頁畫面時，都用首頁的版權文字
  renderFooter();
  try {
    if (!page) return home();
    const f = pf;
    if (!f) return home();
    if (!isUnlocked(f.id)) { home(); return askUnlock(f); }
    if (page === "tools") return arg ? toolsArticle(arg) : toolsList();
    if (page === "self") return selfPage();
    if (page === "others") return othersPage();
    if (page === "adapt") return adaptPage();
  } catch (e) { console.error(e); app.innerHTML = `<div class="card"><h2>載入失敗</h2><p class="muted">${esc(e.message)}</p><button onclick="route()">重試</button></div>`; }
}
window.addEventListener("hashchange", route);

function askUnlock(f) {
  const m = document.createElement("div"); m.className = "modal";
  m.innerHTML = `<div class="card"><h2>🔒 ${esc(f.name)}</h2><p class="muted">${esc(HOME.lockTitleHint)}</p>
    <input type="password" id="pw" placeholder="密碼" autofocus><p class="small" id="err" style="color:var(--danger);min-height:1.4em"></p>
    <div class="row between"><button class="ghost" id="cancel">取消</button><button id="ok">解鎖</button></div></div>`;
  document.body.appendChild(m);
  const go = async () => {
    $("#ok", m).disabled = true;
    try {
      if (await rpc("check_unlock", { feature: f.id, pw: $("#pw", m).value })) { rememberUnlock(f.id); m.remove(); location.hash = "#/" + f.id; route(); }
      else { $("#err", m).textContent = "密碼不正確"; }
    } catch (e) { $("#err", m).textContent = "驗證失敗：" + e.message; }
    $("#ok", m).disabled = false;
  };
  $("#ok", m).onclick = go; $("#cancel", m).onclick = () => m.remove();
  $("#pw", m).onkeydown = e => { if (e.key === "Enter") go(); };
  setTimeout(() => $("#pw", m).focus(), 50);
}

/* ---------- 首頁 ---------- */
function home() {
  app.innerHTML = `
  <section class="hero"><h1>${esc(HOME.heroTitle)}</h1>
    <p>${esc(HOME.heroText)}</p></section>
  <div class="grid c2" style="margin-top:20px">${FEATURES.map(f => {
    const locked = !isUnlocked(f.id);
    return `<button class="feature t-${f.t} ${locked ? "locked" : ""}" data-f="${f.id}">
      <span class="lock">${locked ? "🔒" : ""}</span><div class="no">${esc(HOME.stepLabel)} ${f.no}</div>
      <h3>${f.icon} ${esc(f.name)}</h3><p class="muted" style="margin:0">${esc(f.desc)}</p></button>`;
  }).join("")}</div>`;
  $$(".feature").forEach(b => b.onclick = () => {
    const f = FEATURES.find(x => x.id === b.dataset.f);
    if (!isUnlocked(f.id)) askUnlock(f); else location.hash = "#/" + f.id;
  });
}
const back = (t = "← 回首頁", h = "#/") => `<p><a href="${h}">${t}</a></p>`;

/* ---------- 01 解密工具 ---------- */
let articles = [], artCats = [], toolsLoaded = false;
async function loadTools() {
  [articles, artCats] = await Promise.all([
    select("articles", "order=sort.asc,created_at.asc"),
    select("article_categories", "order=sort.asc,created_at.asc")]);
  toolsLoaded = true;
}
/* 依分類分組（分類順序 → 教材順序）；沒有分類的教材放最後 */
function artGroups() {
  const gs = artCats.map((c, i) => ({ id: c.id, name: c.name, color: TYPES[i % 4], items: articles.filter(a => a.category_id === c.id) }));
  const rest = articles.filter(a => !artCats.some(c => c.id === a.category_id));
  if (rest.length) gs.push({ id: "other", name: artCats.length ? "其他教材" : "", color: TYPES[artCats.length % 4], items: rest });
  return gs.filter(g => g.items.length);
}
function renderToolsList() {
  const gs = artGroups();
  app.innerHTML = back() + `<h1>📖 解密工具</h1><p class="muted">掌握全球最廣泛使用的人際風格工具 DiSC 的原理與應用。</p>
    ${gs.length ? gs.map(g => `${g.name ? `<h2 style="margin:28px 0 10px;color:var(--c)" class="t-${g.color}">${esc(g.name)}</h2>` : `<div style="margin-top:16px"></div>`}
      <div class="grid">${g.items.map((a, i) => `
        <button class="article-item" data-id="${a.id}"><span class="pill t-${g.color}">${i + 1}</span> <strong style="display:inline">${esc(a.title)}</strong>
        <div class="muted small">${esc(a.summary)}</div></button>`).join("")}</div>`).join("")
      : `<p class="muted" style="margin-top:20px">目前尚無教材。</p>`}`;
  $$(".article-item").forEach(b => b.onclick = () => location.hash = "#/tools/" + b.dataset.id);
}
async function toolsList() {
  app.innerHTML = back() + `<h1>📖 解密工具</h1><p class="muted">掌握 DiSC 的原理與應用。</p><p class="muted">載入中…</p>`;
  await loadTools();
  renderToolsList();
}
async function toolsArticle(id) {
  if (!toolsLoaded) await loadTools();
  const ordered = artGroups().flatMap(g => g.items);
  const i = ordered.findIndex(a => a.id === id), a = ordered[i];
  if (!a) return toolsList();
  const prev = ordered[i - 1], next = ordered[i + 1];
  const cat = artGroups().find(g => g.items.some(x => x.id === id));
  app.innerHTML = `<div class="narrow" style="margin:auto">${back("← 所有教材", "#/tools")}
    <div class="card">${cat && cat.name ? `<span class="pill t-${cat.color}">${esc(cat.name)}</span>` : ""}<h1 style="margin-top:8px">${esc(a.title)}</h1><p class="muted">${esc(a.summary)}</p>${(a.blocks || []).map(renderBlock).join("")}</div>
    <div class="row between" style="margin-top:16px">
      ${prev ? `<a class="btn ghost" href="#/tools/${prev.id}">← ${esc(prev.title)}</a>` : "<span></span>"}
      ${next ? `<a class="btn" href="#/tools/${next.id}">${esc(next.title)} →</a>` : ""}</div></div>`;
}

/* ---------- 02 看懂自己 ---------- */
let selfQs = [], selfRun = null;
async function selfPage() {
  app.innerHTML = `<p class="muted">載入中…</p>`;
  const prev = await rpc("get_my_result", { p_client: clientId });
  if (prev) return selfShowSaved(prev);
  selfIntro();
}
function selfShowSaved(r, reveal) {
  setImm(false);
  if (r.hidden) {
    app.innerHTML = `<div class="narrow" style="margin:auto">${back()}<div class="card" style="text-align:center">
      <div style="font-size:48px">✅</div><h2>${esc(r.user_name)}，你已完成測評</h2>
      <p class="muted">講師目前尚未公開測評結果，請於課堂中一起揭曉！</p>
      <button class="ghost" id="redo">重新測驗</button></div></div>`;
  } else return selfResult(r, true, false, reveal);
  $("#redo").onclick = () => { if (confirm("重新測驗會覆蓋原本的紀錄，確定嗎？")) selfIntro(); };
}
/* 測評開頭區塊（看懂自己／識別他人共用，文字由後台「開頭文字」編輯）*/
const introHtml = I => `<h1>${esc(I.title)}</h1><p class="muted">${esc(I.subtitle)}</p>
  ${I.notices.length ? `<div class="notice">${I.noticeTitle ? `<b>${esc(I.noticeTitle)}</b>` : ""}<ul>${I.notices.map(n => `<li>${md(n).replace(/^<p>|<\/p>$/g, "")}</li>`).join("")}</ul></div>` : ""}
  ${I.howTitle ? `<h3 style="margin-top:16px">${esc(I.howTitle)}</h3>` : ""}${I.howText ? md(I.howText) : ""}`;
/* ---------- 看懂自己：沉浸式畫面（開場須知 → 準備儀式 → 逐題作答 → 結算）---------- */
const setImm = on => document.body.classList.toggle("imm", !!on);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ORB_SVG = `<svg viewBox="0 0 120 120" class="orb-svg" aria-hidden="true">
  <g class="oq oq-d"><path d="M60 60V6A54 54 0 0 0 6 60Z" fill="var(--D)"/><text x="32" y="43">D</text></g>
  <g class="oq oq-i"><path d="M60 60H114A54 54 0 0 0 60 6Z" fill="var(--I)"/><text x="88" y="43">i</text></g>
  <g class="oq oq-s"><path d="M60 60V114A54 54 0 0 0 114 60Z" fill="var(--S)"/><text x="88" y="90">S</text></g>
  <g class="oq oq-c"><path d="M60 60H6A54 54 0 0 0 60 114Z" fill="var(--C)"/><text x="32" y="90">C</text></g></svg>`;
const orbHtml = (cls = "") => `<div class="orb ${cls}" aria-hidden="true"><i class="orb-glow"></i>${ORB_SVG}</div>`;

function selfIntro() {
  setImm(true);
  const I = getIntro(SITE, "self"), notices = I.notices || [], exOpts = I.exampleOptions || [];
  const title = String(I.title || "看懂自己").replace(/^[^\p{L}\p{N}]+/u, "").trim() || "看懂自己";
  const inline = s => md(s).replace(/^<p>|<\/p>$/g, "");
  app.innerHTML = `<div class="imm-wrap">
    <a class="imm-back" href="#/">← 回首頁</a>
    <header class="imm-hero">${orbHtml()}<p class="imm-kicker">DiSC SELF-DISCOVERY</p><h1>${esc(title)}</h1><p class="imm-sub">${esc(I.subtitle)}</p></header>
    ${notices.length ? `<section class="imm-card imm-step" id="stepNotice">
      <div class="imm-head"><span class="imm-n">1</span><div><h2>${esc(I.noticeTitle || "施測前請留意")}</h2><p class="small muted">請逐項點選確認，表示你已理解</p></div><span class="imm-count" id="chkCount">0 / ${notices.length}</span></div>
      <div class="imm-checks">${notices.map((n, i) => `<label class="imm-check"><span class="imm-num">${i + 1}</span><span class="imm-txt">${inline(n)}</span><input type="checkbox"><span class="imm-box" aria-hidden="true"></span></label>`).join("")}</div>
      <p class="imm-hint" id="chkHint">全部確認後，才能繼續往下作答 ↓</p></section>` : ""}
    <section class="imm-card imm-step imm-lock" id="stepHow">
      <div class="imm-head"><span class="imm-n">${notices.length ? 2 : 1}</span><div><h2>${esc(I.howTitle || "作答方式")}</h2></div></div>
      ${I.howText ? `<div class="imm-how">${md(I.howText)}</div>` : ""}
      ${exOpts.length ? `<div class="imm-ex"><span class="imm-ex-tag">${esc(I.exampleTitle || "填答範例")}</span><h3>${esc(I.examplePrompt || "")}</h3>
        ${exOpts.map((t, i) => `<div class="opt imm-opt"><span class="lbl">${esc(t)}</span>
          <button type="button" class="mark most" data-k="most" data-i="${i}">最像我</button><button type="button" class="mark least" data-k="least" data-i="${i}">最不像我</button></div>`).join("")}
        <p class="imm-ex-status" id="exStatus"></p>${I.exampleNote ? `<p class="small muted" style="margin:6px 0 0">${esc(I.exampleNote)}</p>` : ""}</div>` : ""}
    </section>
    <section class="imm-card imm-step imm-lock" id="stepName">
      <div class="imm-head"><span class="imm-n">${notices.length ? 3 : 2}</span><div><h2>${esc(I.nameLabel || "你的姓名")}</h2></div></div>
      <input type="text" id="nm" maxlength="30" placeholder="${esc(I.namePlaceholder)}" value="${esc(store.get("disc_name", ""))}" aria-label="${esc(I.nameLabel || "你的姓名")}">
      <div class="imm-gorow"><button id="go" class="imm-go" disabled>${esc(I.startBtn)}</button><p class="imm-gohint small muted" id="goHint"></p></div>
    </section></div>`;
  const nm = $("#nm"), go = $("#go"), checks = $$(".imm-check input"), stepsLocked = $$(".imm-lock");
  let opened = !notices.length;
  const refresh = () => {
    const ok = checks.filter(c => c.checked).length, all = ok === checks.length;
    $$(".imm-check").forEach((l, i) => l.classList.toggle("on", checks[i].checked));
    if (checks.length) { $("#chkCount").textContent = `${ok} / ${checks.length}`; $("#chkCount").classList.toggle("done", all); $("#chkHint").textContent = all ? "✓ 已全部確認，請繼續往下" : "全部確認後，才能繼續往下作答 ↓"; $("#stepNotice").classList.toggle("done", all); }
    if (all && !opened) { opened = true; stepsLocked.forEach(s => s.classList.remove("imm-lock")); setTimeout(() => $("#stepHow").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" }), 250); }
    if (!opened) stepsLocked.forEach(s => s.classList.add("imm-lock"));
    const hasName = !!nm.value.trim();
    go.disabled = !(all && hasName);
    $("#goHint").textContent = !all ? "請先確認上方所有要點" : !hasName ? "請輸入姓名後開始" : "";
  };
  checks.forEach(c => c.onchange = refresh); nm.oninput = refresh;
  nm.onkeydown = e => { if (e.key === "Enter" && !go.disabled) go.click(); };
  // 填答範例：可以實際點點看（只是示範，不會記錄）
  const ex = { most: exOpts.length > 1 ? 1 : null, least: exOpts.length > 2 ? 2 : null };
  const drawEx = () => {
    $$(".imm-ex .opt").forEach((row, i) => { row.classList.toggle("has-most", ex.most === i); row.classList.toggle("has-least", ex.least === i);
      $(".most", row).classList.toggle("on", ex.most === i); $(".least", row).classList.toggle("on", ex.least === i);
      $(".most", row).disabled = ex.least === i; $(".least", row).disabled = ex.most === i; });
    const st = $("#exStatus"); if (!st) return;
    st.className = "imm-ex-status" + (ex.most !== null && ex.least !== null ? " ok" : "");
    st.textContent = ex.most !== null && ex.least !== null ? "✓ 各選一個「最像我」與「最不像我」，這一題就完成了" : `還差一步：請再選出${ex.most === null ? "「最像我」" : "「最不像我」"}`;
  };
  $$(".imm-ex .mark").forEach(b => b.onclick = () => { const k = b.dataset.k, i = +b.dataset.i; ex[k] = ex[k] === i ? null : i; drawEx(); });
  drawEx(); refresh();
  go.onclick = () => { store.set("disc_name", nm.value.trim()); selfStart(I, nm.value.trim()); };
}
/* 準備儀式（約 4 秒，可略過）：同時在背景載入題目 */
async function selfStart(I, name) {
  const loading = select("questions", "kind=eq.self&order=sort.asc,updated_at.asc").catch(e => e);
  await selfReady();
  const rows = await loading;
  if (!Array.isArray(rows) || rows.length < 3) { toast(Array.isArray(rows) ? "題目數量不足，請聯絡講師" : "載入失敗：" + rows.message); return selfIntro(); }
  selfQs = rows;
  const qs = (cfg.randomize ? shuffle(selfQs) : selfQs).map(q => ({ ...q, options: shuffle(q.options) }));
  selfRun = { name, qs, cur: 0, ans: {} };
  selfQuestion(true);
}
function selfReady() {
  return new Promise(resolve => {
    setImm(true);
    app.innerHTML = `<div class="imm-ready">${orbHtml("orb-big breathe")}
      <p class="imm-line l1">深呼吸，放鬆一下</p><p class="imm-line l2">想著「平常工作中，最自然的你」</p><p class="imm-line l3">不用多想，依第一直覺作答</p>
      <button type="button" class="ghost sm imm-skip" id="skip">略過</button></div>`;
    const done = () => { clearTimeout(t); resolve(); }, t = setTimeout(done, reduceMotion() ? 1200 : 4200);
    $("#skip").onclick = done;
  });
}
function selfQuestion(fresh) {
  setImm(true);
  const r = selfRun, q = r.qs[r.cur], a = r.ans[q.id] || (r.ans[q.id] = { most: null, least: null }), n = r.qs.length;
  app.innerHTML = `<div class="imm-q">
    <div class="imm-top"><a class="imm-exit" href="#/" id="exit">離開</a>
      <div class="imm-pips" role="img" aria-label="第 ${r.cur + 1} / ${n} 題">${r.qs.map((_, i) => `<i class="pip pc${i % 4} ${i < r.cur ? "done" : i === r.cur ? "now" : ""}"></i>`).join("")}</div>
      <span class="imm-no">${r.cur + 1}<small> / ${n}</small></span></div>
    <div class="imm-card imm-qcard${fresh ? " fresh" : ""}">
      <p class="imm-qlabel">第 ${r.cur + 1} 題</p><h2>${esc(q.prompt)}</h2>
      <p class="imm-tip">請從下面四個描述中，各選一個「最像我」與「最不像我」</p>
      ${q.options.map((o, i) => `<div class="opt imm-opt ${a.most === i ? "has-most" : ""} ${a.least === i ? "has-least" : ""}"><span class="lbl">${esc(o.text)}</span>
        <button class="mark most ${a.most === i ? "on" : ""}" data-k="most" data-i="${i}" ${a.least === i ? "disabled" : ""}>最像我</button>
        <button class="mark least ${a.least === i ? "on" : ""}" data-k="least" data-i="${i}" ${a.most === i ? "disabled" : ""}>最不像我</button></div>`).join("")}
      <div class="row between" style="margin-top:22px"><button class="ghost" id="prev" ${r.cur === 0 ? "disabled" : ""}>上一題</button>
        <button id="next" class="imm-next" ${a.most === null || a.least === null ? "disabled" : ""}>${r.cur === n - 1 ? "完成，查看結果" : "下一題"}</button></div></div></div>`;
  $("#exit").onclick = e => { if (!confirm("離開後，目前的作答不會保留，確定要離開嗎？")) e.preventDefault(); };
  $$(".mark").forEach(b => b.onclick = () => { const k = b.dataset.k, i = +b.dataset.i; a[k] = a[k] === i ? null : i; selfQuestion(); });
  $("#prev").onclick = () => { r.cur--; selfQuestion(true); };
  $("#next").onclick = () => { if (r.cur < n - 1) { r.cur++; selfQuestion(true); } else selfSubmit(); };
}
async function selfSubmit() {
  const r = selfRun;
  const { scores } = scoreAnswers(r.qs, r.ans);
  const j = judgeStyle(scores, cfg.secondary_gap);
  const answers = {}; r.qs.forEach(q => { const a = r.ans[q.id]; answers[q.id] = [q.options[a.most].type, q.options[a.least].type]; });
  setImm(true);
  const lines = ["正在整理你的作答…", "計算四種風格的分數…", "繪製專屬於你的 DiSC 圖…"];
  app.innerHTML = `<div class="imm-ready">${orbHtml("orb-big assemble")}<p class="imm-line show" id="calcLine">${lines[0]}</p></div>`;
  let li = 0; const tick = setInterval(() => { li = Math.min(li + 1, lines.length - 1); const el = $("#calcLine"); if (el) el.textContent = lines[li]; }, 900);
  const t0 = performance.now();
  try {
    await rpc("submit_result", { p_client: clientId, p_name: r.name, p_answers: answers, p_scores: scores, p_style: j.style, p_primary: j.secondary ? [j.primary, j.secondary] : [j.primary] });
  } catch (e) {
    clearInterval(tick); setImm(false);
    app.innerHTML = `<div class="card"><h2>⚠️ 結果儲存失敗</h2><p class="muted">${esc(e.message)}</p><button id="retry">重試</button></div>`;
    $("#retry").onclick = selfSubmit; return;
  }
  const res = await rpc("get_my_result", { p_client: clientId });
  await sleep(Math.max(0, (reduceMotion() ? 600 : 2700) - (performance.now() - t0))); // 讓「繪製專屬於你的 DiSC 圖」的過場至少播完
  clearInterval(tick);
  selfShowSaved(res, true);
}
function feedbackBlock(r) {
  const val = r.accuracy_feedback || 3, locked = !!r.accuracy_feedback;
  return `<div class="rate-box">
    <h3>評估結果的準確度回饋（與你對自己的理解相比）</h3>
    <div class="rate-current" id="rateVal">${val}・${RATE_LABELS[val]}</div>
    <input type="range" id="rateInput" min="1" max="5" step="1" value="${val}" ${locked ? "disabled" : ""}>
    <div class="rate-labels"><span>1 非常不準確</span><span>5 非常準確</span></div>
    <div class="row between" style="margin-top:14px"><span class="muted small" id="rateMsg">${locked ? "✅ 已送出回饋，如需更改請重新測驗" : ""}</span><button id="rateSubmit" ${locked ? "disabled" : ""}>送出回饋</button></div></div>`;
}
function bindFeedback(clientId) {
  const input = $("#rateInput"), val = $("#rateVal"), btn = $("#rateSubmit"), msg = $("#rateMsg");
  input.oninput = () => { val.textContent = `${input.value}・${RATE_LABELS[input.value]}`; };
  const lock = text => { input.disabled = true; btn.disabled = true; msg.textContent = text; };
  btn.onclick = async () => {
    const t = btn.textContent; btn.disabled = true; btn.textContent = "送出中…";
    try {
      await rpc("submit_feedback", { p_client: clientId, p_rating: +input.value });
      lock("✅ 已送出回饋，如需更改請重新測驗"); toast("已送出回饋");
    } catch (e) {
      if (/already submitted/.test(e.message)) lock("✅ 已送出過回饋，如需更改請重新測驗");
      else { toast("送出失敗：" + e.message); btn.disabled = false; }
    } finally { btn.textContent = t; }
  };
}
/* 結果小卡（1080×1350 PNG）：用 canvas 畫出來，不經過伺服器 */
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
async function resultCard(c) {
  const W = 1080, F = `"Noto Sans TC","Microsoft JhengHei","PingFang TC",system-ui,sans-serif`;
  const COL = { D: "#e0463d", I: "#f2a93b", S: "#3da35d", C: "#3f7fd1" }, SOFT = { D: "#fde8e6", I: "#fef3dc", S: "#e2f4e8", C: "#e3edfa" };
  const cv = document.createElement("canvas"); const g = cv.getContext("2d");
  const imgs = await Promise.all(c.types.map(t => loadImg(`assets/mascot/${t}.webp`)));
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const wrap = (text, maxW, font, maxLines) => { g.font = font; const out = []; let cur = ""; for (const ch of text) { if (g.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; } if (cur) out.push(cur); if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].slice(0, -1) + "…"; } return out; };
  const main = c.equal ? "#5b4bdb" : COL[c.types[0]];
  // 先量好版面：標題風格與說明文字在左、吉祥物在右，放在同一個色塊裡；色塊高度與整張小卡高度依文字行數決定
  const base = 205, sc = i => c.equal ? 0.62 : i === 0 ? 1 : 0.62, gap = -17;
  const ws = imgs.map((im, i) => base * sc(i) * im.width / im.height);
  const mkW = ws.reduce((a, b) => a + b, 0) + gap * (imgs.length - 1);
  const tw = Math.max(380, 888 - 40 - mkW - 56);
  const titleL = wrap(c.title, tw, `800 38px ${F}`, 3), tagL = wrap(c.tagline, tw, `500 26px ${F}`, 3);
  const tileY = 252, titleY = tileY + 196, tagY = titleY + (titleL.length - 1) * 48 + 46, lastY = tagY + (tagL.length - 1) * 36;
  const tileH = Math.max(base + 48, lastY - tileY + 34), by = tileY + tileH + 72, footY = by + 3 * 48 + 76, HH = footY + 74;
  cv.width = W; cv.height = HH;
  g.fillStyle = "#f4f5fb"; g.fillRect(0, 0, W, HH);
  g.save(); g.shadowColor = "rgba(30,40,90,.14)"; g.shadowBlur = 40; g.shadowOffsetY = 12; g.fillStyle = "#fff"; rr(40, 40, 1000, HH - 80, 44); g.fill(); g.restore();
  g.save(); rr(40, 40, 1000, HH - 80, 44); g.clip();
  ["D", "I", "S", "C"].forEach((t, i) => { g.fillStyle = COL[t]; g.fillRect(40 + i * 250, 40, 250, 16); });
  g.restore();
  // 標頭
  [["D", 0, 0], ["I", 1, 0], ["C", 0, 1], ["S", 1, 1]].forEach(([t, x, y]) => { g.fillStyle = COL[t]; rr(96 + x * 24, 92 + y * 24, 22, 22, 6); g.fill(); });
  g.textBaseline = "alphabetic"; g.fillStyle = "#667085"; g.font = `700 30px ${F}`; g.fillText("DiSC 人際風格工作坊", 156, 128);
  let nm = `${c.name} 的 DiSC 風格`, fs = 50; g.fillStyle = "#1d2233";
  do { g.font = `800 ${fs}px ${F}`; fs -= 2; } while (g.measureText(nm).width > 880 && fs > 28);
  g.fillText(nm, 96, 218);
  // 色塊：左＝風格代號、標題、說明；右＝吉祥物
  g.fillStyle = c.equal ? "#eef0f8" : SOFT[c.types[0]]; rr(96, tileY, 888, tileH, 40); g.fill();
  g.textAlign = "left"; g.fillStyle = main; g.font = `900 112px ${F}`; g.fillText(c.label, 136, tileY + 140);
  g.fillStyle = "#1d2233"; g.font = `800 38px ${F}`; titleL.forEach((l, i) => g.fillText(l, 136, titleY + i * 48));
  g.fillStyle = "#667085"; g.font = `500 26px ${F}`; tagL.forEach((l, i) => g.fillText(l, 136, tagY + i * 36));
  let x = 984 - 36 - mkW;
  imgs.forEach((im, i) => { const h = base * sc(i); g.drawImage(im, x, tileY + tileH - 18 - h, ws[i], h); x += ws[i] + gap; });
  // 四個分數
  CIRCLE.forEach((t, i) => {
    const y = by + i * 48, v = c.scores[t];
    g.fillStyle = COL[t]; g.font = `800 28px ${F}`; g.fillText(`${TLABEL[t]} ${TNAME[t]}`, 96, y + 8);
    g.fillStyle = "#eef0f8"; rr(330, y - 18, 560, 26, 13); g.fill();
    g.fillStyle = COL[t]; rr(330, y - 18, Math.max(26, 560 * v / 100), 26, 13); g.fill();
    g.fillStyle = "#1d2233"; g.font = `800 28px ${F}`; g.fillText(String(v), 912, y + 8);
  });
  g.fillStyle = "#98a2b3"; g.font = `500 22px ${F}`; g.textAlign = "center"; g.fillText("DiSC 描述的是行為傾向，會隨情境變化，結果僅供參考。", W / 2, footY); g.textAlign = "left";
  const url = cv.toDataURL("image/png"), fn = `DiSC-${c.name.replace(/[\\/:*?"<>|\s]+/g, "") || "結果"}.png`;
  const m = document.createElement("div"); m.className = "modal";
  m.innerHTML = `<div class="card wide"><h2>我的 DiSC 結果小卡</h2><img class="cardpv" src="${url}" alt="${esc(c.name)} 的 DiSC 結果小卡">
    <p class="muted small">手機請長按圖片儲存；電腦可按下方按鈕下載。</p>
    <div class="row between"><button class="ghost" id="cardClose">關閉</button><a class="btn" href="${url}" download="${esc(fn)}">⬇ 下載圖片</a></div></div>`;
  document.body.appendChild(m);
  $("#cardClose", m).onclick = () => m.remove(); m.onclick = e => { if (e.target === m) m.remove(); };
}
async function selfResult(r, saved, demo, reveal) {
  setImm(false);
  adaptMap = await loadAdaptMap();
  if (!demo) store.sset("my_style", r.style);
  const sr = getSelfResult(SITE), hl = (sr.highlight || "").trim(); // 後台「看懂自己 → 題目與設定」可調整
  // 結果頁內容（含後台「結果類型內容」的文字覆寫）由 selfResultHtml 產生（common.js）
  const { html, card } = selfResultHtml(r, adaptMap, SITE["self_results"]);
  card.name = r.user_name;
  app.innerHTML = `<div class="narrow" style="margin:auto">${back()}<div class="card${reveal ? " reveal" : ""}">
    <p class="muted">${esc(r.user_name)} 的 DiSC 風格</p>
    ${html}
    <p class="muted small" style="margin-top:14px">最後測評時間：${new Date(r.updated_at).toLocaleString("zh-TW")}。DiSC 描述的是行為傾向，會隨情境變化，結果僅供參考。</p>
    ${sr.feedbackEnabled && !demo ? feedbackBlock(r) : ""}
    ${hl ? `<div class="hl-note">${md(hl)}</div>` : ""}
    <div class="row between" style="margin-top:16px"><button class="ghost" id="redo">重新測驗</button>
      <span class="row">${MASCOT_ON ? `<button class="soft" id="dlCard">🖼 下載結果小卡</button>` : ""}<a class="btn" href="#/adapt">前往彈性調適 →</a></span></div></div></div>`;
  $("#redo").onclick = () => { if (confirm("重新測驗會覆蓋原本的紀錄，確定嗎？")) selfIntro(); };
  if (MASCOT_ON) $("#dlCard").onclick = e => { const b = e.currentTarget; b.disabled = true; resultCard(card).catch(err => { console.error(err); toast("小卡產生失敗，請稍後再試"); }).finally(() => b.disabled = false); };
  if (sr.feedbackEnabled && !demo) bindFeedback(clientId);
}

/* ---------- 03 識別他人 ---------- */
let othersRun = null;
async function othersPage() {
  const I = getIntro(SITE, "others");
  app.innerHTML = `<div class="narrow" style="margin:auto">${back()}<div class="card">${introHtml(I)}
    <div class="row between" style="margin-top:16px"><span></span><button id="go">${esc(I.startBtn)}</button></div></div></div>`;
  $("#go").onclick = async () => {
    const qs = await select("questions", "kind=eq.others&order=sort.asc,updated_at.asc");
    if (qs.length < 1) return toast("目前沒有題目");
    othersRun = { qs: qs.map(q => ({ ...q, options: shuffle(q.options) })), cur: 0, ans: {} };
    othersQ();
  };
}
function othersQ() {
  const r = othersRun, q = r.qs[r.cur], a = r.ans[q.id];
  app.innerHTML = `<div class="narrow" style="margin:auto"><div class="card">
    <div class="row between small muted"><span>第 ${r.cur + 1} / ${r.qs.length} 題</span><span>這個人…</span></div>
    <div class="progress" style="margin:8px 0 16px"><i style="width:${r.cur / r.qs.length * 100}%"></i></div>
    <h2>${esc(q.prompt)}</h2>
    ${q.options.map((o, i) => `<button class="opt pick ${a === i ? "on" : ""}" data-i="${i}" style="display:block;width:100%;font-weight:inherit;color:var(--text)">${esc(o.text)}</button>`).join("")}
    <div class="row between" style="margin-top:18px"><button class="ghost" id="prev" ${r.cur === 0 ? "disabled" : ""}>上一題</button>
      <span><button class="ghost" id="skip">略過</button> <button id="next" ${a === undefined || a === null ? "disabled" : ""}>${r.cur === r.qs.length - 1 ? "查看結果" : "下一題"}</button></span></div></div></div>`;
  $$(".pick").forEach(b => b.onclick = () => { r.ans[q.id] = +b.dataset.i; othersQ(); });
  const nextStep = () => { if (r.cur < r.qs.length - 1) { r.cur++; othersQ(); } else othersResult(); };
  $("#prev").onclick = () => { r.cur--; othersQ(); };
  $("#skip").onclick = () => { delete r.ans[q.id]; nextStep(); };
  $("#next").onclick = nextStep;
}
function othersResult() {
  const r = othersRun, cnt = { D: 0, I: 0, S: 0, C: 0 }; let n = 0;
  r.qs.forEach(q => { const a = r.ans[q.id]; if (a !== undefined && a !== null) { cnt[q.options[a].type]++; n++; } });
  if (!n) { toast("至少要回答一題喔"); return othersQ(); }
  // 比重與最高者相差 ≤ OTHERS_CLOSE_GAP（百分點）的類型都列為「可能」；文字內容（含後台可編輯的覆寫）由 othersResultHtml 產生（common.js）
  const { html } = othersResultHtml(cnt, SITE["others_results"], getIntro(SITE, "others").resultNote);
  app.innerHTML = `<div class="narrow" style="margin:auto">${back()}<div class="card">
    ${html}
    <div class="row between" style="margin-top:16px"><button class="ghost" id="redo">重新識別另一個人</button><a class="btn" href="#/adapt">用「風格應對神器」找出相處之道 →</a></div></div></div>`;
  $("#redo").onclick = othersPage;
}

/* ---------- 04 彈性調適 ---------- */
async function loadAdaptMap() {
  const rows = await select("adapt_content", "select=key,data");
  return Object.fromEntries(rows.map(r => [r.key, r.data]));
}
let adaptTab = "types", adaptSel = null, typesSel = null, toolQuery = null, toolDirection = "peer";
async function adaptPage() {
  app.innerHTML = `<p class="muted">載入中…</p>`;
  adaptMap = await loadAdaptMap();
  if (!adaptSel) adaptSel = { me: { p: "D", s: null }, other: { p: "I", s: null } };
  if (!typesSel) { const my = store.sget("my_style"); if (my) typesSel = styleParts(my).p; }
  renderAdapt();
}
function renderAdapt() {
  app.innerHTML = `${back()}<h1>🧭 彈性調適</h1><p class="muted">依據不同的風格調整溝通方式，讓對方更容易買單你的想法。</p>
    <div class="row" style="margin:12px 0"><button class="${adaptTab === "types" ? "" : "ghost"}" data-tab="types">基本應對原則</button>
    <button class="${adaptTab === "tool" ? "" : "ghost"}" data-tab="tool">風格應對神器</button></div><div id="adaptBody"></div>`;
  $$("[data-tab]").forEach(b => b.onclick = () => { adaptTab = b.dataset.tab; renderAdapt(); });
  adaptTab === "types" ? renderTypes() : renderTool();
}
function renderTypes() {
  const typeCard = t => { const d = getType(adaptMap, t); return `<div class="card t-${t}" style="border-top:6px solid var(--c);margin-top:16px">${MASCOT_ON
    ? `<div class="row between" style="flex-wrap:nowrap;align-items:center;margin-bottom:6px"><h2 class="mk-title" style="color:var(--c);margin:0">${TLABEL[t]} ${TNAME[t]}</h2><div class="mk-chat">${mkSay(t, "r")}${mk(t, { size: "tp" })}</div></div>`
    : `<h2 style="color:var(--c)">${TLABEL[t]} ${TNAME[t]}</h2>`}<p>${esc(d.summary)}</p>
      <p><b>在乎：</b>${esc(d.want)}<br><b>壓力來源：</b>${esc(d.stress)}</p>
      <h3>✅ 這樣溝通</h3><ul>${d.dos.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3>⚠️ 避免</h3><ul>${d.donts.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="box"><b>💡 ${esc(d.tip)}</b></div></div>`; };
  $("#adaptBody").innerHTML = `<div class="card"><p class="muted" style="margin:0 0 10px">請選擇一種 DiSC 風格，查看基本應對原則：</p>
    ${MASCOT_ON ? `<div class="mk-picks">${TYPES.map(t => `<button class="mk-pick t-${t} ${typesSel === t ? "on" : ""}" data-tsel="${t}">${mk(t, { size: "tp" })}<b>${TLABEL[t]} ${TNAME[t]}</b></button>`).join("")}</div>`
      : `<div class="row" style="gap:8px">${TYPES.map(t => `<button class="chip t-${t} ${typesSel === t ? "on" : ""}" data-tsel="${t}">${TLABEL[t]} ${TNAME[t]}</button>`).join("")}</div>`}</div>
    ${typesSel ? typeCard(typesSel) : `<div class="card" style="margin-top:16px;text-align:center"><p class="muted">請先在上方選擇一種風格。</p></div>`}`;
  $$("[data-tsel]").forEach(b => b.onclick = () => { typesSel = b.dataset.tsel; renderTypes(); });
}
const pickStyle = sel => STYLES.find(x => x.toLowerCase() === (sel.p + (sel.s || "")).toLowerCase()) || sel.p;
function chips(who) {
  const sel = adaptSel[who];
  return `<div class="row" style="gap:8px">${TYPES.map(t => `<button class="chip t-${t} ${sel.p === t ? "on" : ""}" data-w="${who}" data-p="${t}">${TLABEL[t]}</button>`).join("")}</div>
    <div class="small muted" style="margin:10px 0 6px">輔型（可選）</div>
    <div class="row" style="gap:8px"><button class="chip none ${!sel.s ? "on" : ""}" data-w="${who}" data-s="">無</button>
      ${ADJ[sel.p].map(t => `<button class="chip t-${t} ${sel.s === t ? "on" : ""}" data-w="${who}" data-s="${t}">${TLABEL[t]}</button>`).join("")}</div>`;
}
function renderTool() {
  const myLive = pickStyle(adaptSel.me), otLive = pickStyle(adaptSel.other);
  const list = a => `<ul>${(a || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const selHead = (title, t, flip) => MASCOT_ON ? `<div class="row between" style="flex-wrap:nowrap;margin-bottom:8px"><h2 style="margin:0">${title}</h2>${mk(t, { size: "sm", flip })}</div>` : `<h2>${title}</h2>`;
  let resultHtml;
  if (!toolQuery) {
    resultHtml = `<div class="card" style="margin-top:16px;text-align:center"><p class="muted">選好雙方的風格與關係方向後，按下「查詢應對之道」查看建議。</p></div>`;
  } else {
    const my = toolQuery.my, ot = toolQuery.ot, dir = toolQuery.direction, c = getCombo(adaptMap, my, ot, dir);
    const dirInfo = DIRECTIONS.find(d => d.id === dir);
    // 雙方吉祥物面對面：我（左，朝右）與對方（右，朝左）；有輔型時，輔型小隻站在外側
    const sideOf = (st, who, mine) => { const sp = styleParts(st); return `<div class="side">${mkStage(sp.s ? [sp.p, sp.s] : [sp.p], { rev: mine, flip: !mine })}<span class="pill t-${sp.p}">${who} ${styleLabel(st)}</span></div>`; };
    const duo = MASCOT_ON ? `<div class="mk-duo">${sideOf(my, "你", true)}<div class="mid" aria-hidden="true">⇄</div>${sideOf(ot, "對方", false)}</div>` : "";
    resultHtml = `<div class="card" style="margin-top:16px">${duo}
      <div class="row" style="gap:10px"><span class="pill t-${styleParts(my).p}">你 ${styleLabel(my)}</span><span>→</span><span class="pill t-${styleParts(ot).p}">對方 ${styleLabel(ot)}</span>${dir !== "peer" ? `<span class="pill" style="background:var(--brand)">${esc(dirInfo.label)}</span>` : ""}</div>
      <h2 style="margin-top:12px">💬 一句話重點</h2><p style="font-size:17px">${esc(c.summary)}</p>
      <div class="grid c2"><div><div class="box t-${styleParts(ot).p}"><h3>🎯 配合對方：這樣說、這樣做</h3>${list(c.adapt)}</div>
        <div class="box"><h3>⚠️ 避免踩雷</h3>${list(c.avoid)}</div></div>
      <div><div class="box t-${styleParts(my).p}"><h3>💪 善用你的優勢</h3>${list(c.leverage)}</div>
        <div class="box"><h3>🤝 找到雙方都能接受的共識</h3>${list(c.ground)}</div></div></div>
      <div class="box" style="margin-top:12px;--cs:var(--I-soft);--c:var(--I)"><h3>🚀 需要對方買單時（如對方較有話語權）</h3>${list(c.ask)}</div></div>`;
  }
  $("#adaptBody").innerHTML = `<div class="card"><p class="muted" style="margin:0 0 10px">你和對方的關係：</p>
    <div class="row" style="gap:8px">${DIRECTIONS.map(d => `<button class="chip ${toolDirection === d.id ? "on" : ""}" data-dir="${d.id}">${d.label}</button>`).join("")}</div>
    <p class="muted small" style="margin:8px 0 0">${esc(DIRECTIONS.find(d => d.id === toolDirection).hint)}</p></div>
    <div class="grid c2" style="margin-top:16px">
    <div class="card">${selHead(`我的風格：<span style="color:var(--D)">${styleLabel(myLive)}</span>`, adaptSel.me.p, false)}${chips("me")}</div>
    <div class="card">${selHead(`對方的風格：<span style="color:var(--C)">${styleLabel(otLive)}</span>`, adaptSel.other.p, true)}${chips("other")}</div></div>
    <div class="row" style="justify-content:center;margin-top:16px"><button id="queryBtn">🔍 查詢應對之道</button></div>
    ${resultHtml}`;
  $$("[data-dir]").forEach(b => b.onclick = () => { toolDirection = b.dataset.dir; toolQuery = null; renderTool(); });
  $$(".chip[data-w]").forEach(b => b.onclick = () => {
    const sel = adaptSel[b.dataset.w];
    if (b.dataset.p) { sel.p = b.dataset.p; if (sel.s && !ADJ[sel.p].includes(sel.s)) sel.s = null; }
    else sel.s = b.dataset.s || null;
    toolQuery = null; renderTool();
  });
  $("#queryBtn").onclick = () => {
    toolQuery = { my: pickStyle(adaptSel.me), ot: pickStyle(adaptSel.other), direction: toolDirection };
    renderTool();
    $("#adaptBody").lastElementChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
}

/* ---------- 啟動 ---------- */
(async () => {
  const t0 = performance.now();
  applyHome();
  try {
    const [c, rows] = await Promise.all([rpc("get_config"), select("site_content", "select=key,data")]);
    cfg = c; SITE = Object.fromEntries(rows.map(r => [r.key, r.data])); HOME = getHome(SITE); mascotInit(SITE); applyHome();
  } catch (e) { console.error(e); mascotInit({}); }
  await route();
  // 載入動畫至少播完一輪（拆開→重組；吉祥物開啟時再多等一下讓四隻吉祥物登場），再淡出
  const wait = Math.max(0, 1900 - (performance.now() - t0));
  setTimeout(() => { const s = $("#splash"); s.classList.add("done"); setTimeout(() => s.remove(), 600); }, wait);
})();
