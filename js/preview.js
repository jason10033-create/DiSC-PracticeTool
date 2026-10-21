/* 吉祥物預覽專用（只在網址帶 ?preview 時載入）：
   - 左下角「吉祥物 開／關」切換列：關 ＝ 沒有任何吉祥物的原本樣子
   - #/demo：用範例資料展示各個版面（不會寫入資料庫、也不需要輸入功能解鎖密碼）*/
(function () {
  const here = (k, v) => { const u = new URL(location.href); u.searchParams.set(k, v); return u.toString(); };
  const sw = document.createElement("div"); sw.id = "mkSwitch";
  sw.innerHTML = `吉祥物 <a href="${here("mascot", "on")}" class="${MASCOT_ON ? "on" : ""}">開</a><a href="${here("mascot", "off")}" class="${MASCOT_ON ? "" : "on"}">關（原本樣子）</a><a href="${location.pathname}${location.search}#/demo">版面示範</a>`;
  document.body.appendChild(sw);

  const SC = {
    D: { D: 78, I: 55, S: 30, C: 37 }, I: { D: 40, I: 80, S: 52, C: 28 }, S: { D: 30, I: 50, S: 78, C: 42 }, C: { D: 35, I: 28, S: 52, C: 82 },
    Di: { D: 70, I: 62, S: 40, C: 28 }, IS: { D: 38, I: 74, S: 66, C: 24 }, SC: { D: 24, I: 40, S: 72, C: 64 }, CD: { D: 62, I: 28, S: 38, C: 72 },
    dual: { D: 68, I: 65, S: 40, C: 27 }, diag: { D: 66, I: 45, S: 63, C: 26 }, triple: { D: 62, I: 60, S: 20, C: 58 }, quad: { D: 52, I: 50, S: 49, C: 49 }
  };
  const LABEL = {
    D: "單一主型 D", I: "單一主型 i", S: "單一主型 S", C: "單一主型 C", Di: "主型＋輔型 Di", IS: "主型＋輔型 iS", SC: "主型＋輔型 SC", CD: "主型＋輔型 CD",
    dual: "雙型並重（D、i 接近）", diag: "雙型並重（對角 D、S）", triple: "三型並重（D、i、C）", quad: "四型均衡"
  };
  const OTH = {
    one: { label: "單一最可能（D）", cnt: { D: 7, I: 1, S: 1, C: 1 } },
    two: { label: "兩型接近（D 或 C）", cnt: { D: 4, I: 1, S: 1, C: 4 } },
    sub: { label: "兩型接近（S 或 i）", cnt: { D: 0, I: 4, S: 5, C: 1 } }
  };
  const btn = (h, t) => `<a class="btn ghost" href="${h}" style="margin:4px 6px 4px 0">${t}</a>`;

  window.demoRoute = async parts => {
    const [kind, key] = parts;
    if (kind === "self" && SC[key]) {
      const j = judgeStyle(SC[key], cfg.secondary_gap);
      return selfResult({ user_name: "小明", scores: SC[key], style: j.style, updated_at: new Date().toISOString(), accuracy_feedback: null }, true, true);
    }
    if (kind === "others" && OTH[key]) {
      othersRun = { qs: Object.entries(OTH[key].cnt).flatMap(([t, n]) => Array.from({ length: n }, (_, i) => ({ id: t + i, options: [{ type: t }] }))), cur: 0, ans: {} };
      othersRun.qs.forEach(q => othersRun.ans[q.id] = 0);
      return othersResult();
    }
    if (kind === "adapt") { adaptMap = await loadAdaptMap(); adaptTab = key === "types" ? "types" : "tool"; typesSel = typesSel || "I"; adaptSel = adaptSel || { me: { p: "D", s: "I" }, other: { p: "S", s: "C" } };
      if (key === "tool") { adaptSel = { me: { p: "D", s: "I" }, other: { p: "S", s: "C" } }; toolQuery = { my: "Di", ot: "SC", direction: "peer" }; }
      return renderAdapt(); }
    app.innerHTML = `<p><a href="#/">← 回首頁</a></p><h1>吉祥物版面示範</h1><p class="muted">以下都使用範例資料，不會寫入資料庫。目前吉祥物：<b>${MASCOT_ON ? "開" : "關（原本的樣子）"}</b>（左下角可切換）。</p>
      <div class="card"><h2>看懂自己：結果頁</h2>${Object.keys(SC).map(k => btn("#/demo/self/" + k, LABEL[k])).join("")}</div>
      <div class="card"><h2>識別他人：結果頁</h2>${Object.keys(OTH).map(k => btn("#/demo/others/" + k, OTH[k].label)).join("")}</div>
      <div class="card"><h2>彈性調適</h2>${btn("#/demo/adapt/types", "基本應對原則（選一隻吉祥物）")}${btn("#/demo/adapt/tool", "風格應對神器（雙方面對面）")}</div>
      <div class="card"><h2>其他</h2><p class="muted">結果小卡：進入任一「看懂自己」結果頁，按「下載結果小卡」。</p></div>`;
  };
})();
