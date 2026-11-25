/* 評審版 Demo（judge.html）前台專用：攔截網路請求
   - 不寫入資料庫：submit_result／submit_feedback 不送出，只把這次作答的結果暫存在記憶體
   - 不需要輸入功能解鎖密碼（get_config 回傳時把 locks 清空）
   - 「看懂自己」一開始視為尚未作答（從頭示範 15 題），作答完成後顯示「剛剛作答」算出的真實結果
   其他資料（教材、題目、四型內容、144 種組合建議）都讀取正式網站的真實內容。*/
window.DEMO = true;
(() => {
  const realFetch = window.fetch.bind(window);
  const json = v => new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } });
  let mine = null; // 本次示範的作答結果（只存在這個分頁的記憶體）
  window.fetch = async (url, opts) => {
    const u = String(url), body = () => { try { return JSON.parse(opts && opts.body || "{}"); } catch { return {}; } };
    if (/\/rpc\/get_config/.test(u)) { const j = await (await realFetch(url, opts)).json(); return json({ ...j, locks: {}, show_results: true }); }
    if (/\/rpc\/submit_result/.test(u)) { const b = body(); mine = { user_name: b.p_name, scores: b.p_scores, style: b.p_style, accuracy_feedback: null, hidden: false, updated_at: new Date().toISOString() }; return json(null); }
    if (/\/rpc\/submit_feedback/.test(u)) { if (mine) mine.accuracy_feedback = body().p_rating; return json(null); }
    if (/\/rpc\/get_my_result/.test(u)) return json(mine);
    return realFetch(url, opts);
  };
})();
