/* 評審版 Demo（judge-admin.html）後台專用：攔截網路請求
   - 免登入：直接視為已登入（不需要、也不會用到真正的管理員密碼）
   - 學員資料全部是「虛構的示範班級」，畫面上不會出現任何真實學員的姓名或分數
   - 所有寫入（admin_upsert_*／admin_delete_*／admin_set_*／上傳圖片）都不送出
   教材、題目、四型內容、144 種組合建議等內容，讀取正式網站的真實資料。*/
window.DEMO = true;
try { sessionStorage.setItem("admin_pw", "demo"); } catch {}
(() => {
  const realFetch = window.fetch.bind(window);
  const json = v => new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } });

  /* ---------- 虛構的示範班級 ---------- */
  const GROUPS = [{ id: "demo-g1", name: "主管溝通工作坊（示範）", created_at: "2026-11-10T02:00:00Z" }, { id: "demo-g2", name: "新進同仁訓練（示範）", created_at: "2026-11-12T02:00:00Z" }];
  const NAMES1 = ["Amy", "Ben", "Cindy", "David", "Eric", "Fiona", "Grace", "Henry", "Ivy", "Jack", "Kelly", "Leo", "Mia", "Nick", "Olivia", "Peter", "Queenie", "Ryan", "Sandy", "Tom", "Una", "Vincent", "Wendy", "Zoe"];
  const NAMES2 = ["Alan", "Bella", "Chris", "Daisy", "Evan", "Flora", "Gary", "Hannah"];
  // 每個人的「風格傾向」權重 [D, I, S, C]，用來模擬 15 題作答（與正式計分規則相同）
  const PROFILES = [[5, 2, 1, 1], [1, 5, 2, 1], [1, 2, 5, 1], [1, 1, 2, 5], [5, 4, 1, 1], [4, 1, 1, 4], [1, 4, 4, 1], [1, 1, 4, 4], [3, 3, 3, 3], [5, 1, 1, 2], [2, 5, 1, 1], [1, 1, 5, 2]];
  let seed = 20261125; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pickW = w => { let s = w.reduce((a, b) => a + b, 0), r = rnd() * s; for (let i = 0; i < w.length; i++) { if ((r -= w[i]) < 0) return i; } return w.length - 1; };
  const T4 = ["D", "I", "S", "C"];
  function fakeRow(name, gi, i) {
    const w = PROFILES[(i * 7 + gi * 3) % PROFILES.length], raw = { D: 0, I: 0, S: 0, C: 0 }, n = 15;
    for (let k = 0; k < n; k++) { const m = pickW(w); let l = pickW(w.map(x => 6 - x)); if (l === m) l = (l + 2) % 4; raw[T4[m]]++; raw[T4[l]]--; }
    const sc = {}; T4.forEach(t => sc[t] = Math.round((raw[t] + n) / (2 * n) * 100));
    const j = judgeStyle(sc, 10), day = gi ? 12 : 10;
    return { id: `demo-${gi}-${i}`, user_name: name, score_d: sc.D, score_i: sc.I, score_s: sc.S, score_c: sc.C, primary_types: j.secondary ? [j.primary, j.secondary] : [j.primary], style: j.style,
      accuracy_feedback: rnd() < 0.7 ? (rnd() < 0.55 ? 5 : 4) : (rnd() < 0.5 ? 3 : null), group_id: GROUPS[gi].id, client_id: null,
      created_at: new Date(Date.UTC(2026, 10, day, 1, 5 + i * 2)).toISOString(), updated_at: new Date(Date.UTC(2026, 10, day, 1, 5 + i * 2)).toISOString() };
  }
  let ROWS = null; const rows = () => ROWS || (ROWS = [...NAMES1.map((n, i) => fakeRow(n, 0, i)), ...NAMES2.map((n, i) => fakeRow(n, 1, i))]);

  window.fetch = async (url, opts) => {
    const u = String(url), m = /\/rpc\/([a-z_]+)/.exec(u), fn = m && m[1];
    if (/\/functions\/v1\//.test(u)) return json(null); // 上傳圖片等：不送出
    if (fn === "admin_login") return json(true);
    if (fn === "admin_get_config") { const j = await (await realFetch(u.replace("admin_get_config", "get_config"), { ...opts, body: "{}" })).json(); return json({ show_results: true, randomize: false, secondary_gap: 10, ...j, locks: j.locks || {} }); }
    if (fn === "admin_list_results") return json(rows());
    if (fn === "admin_list_groups") return json(GROUPS);
    if (fn === "admin_list_articles") return realFetch(`${SUPABASE_URL}/rest/v1/articles?select=*&order=sort.asc`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (fn && fn.startsWith("admin_")) return json(null); // 其他後台寫入：不送出
    return realFetch(url, opts);
  };
})();
