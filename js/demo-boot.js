/* 影片示範頁（demo.html）專用：攔截網路請求
   - 不寫入資料庫（submit_result／submit_feedback 直接略過）
   - 不需要輸入功能解鎖密碼（get_config 回傳時把 locks 清空）
   - 「看懂自己」直接顯示一份範例結果（get_my_result 回傳範例資料）
   其他資料（教材、題目、四型內容…）仍讀取真實內容，所以影片裡看到的就是學員實際會看到的畫面。*/
window.DEMO = true;
(() => {
  const realFetch = window.fetch.bind(window);
  const json = (v) => new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } });
  // 範例結果：D 為主、帶有 i 傾向（單一主型＋輔型，吉祥物會並排出現）
  const DEMO_RESULT = { user_name: "王小明", scores: { D: 70, I: 62, S: 40, C: 28 }, style: "Di", accuracy_feedback: null, hidden: false };
  window.fetch = async (url, opts) => {
    const u = String(url);
    if (/\/rpc\/get_config/.test(u)) { const j = await (await realFetch(url, opts)).json(); return json({ ...j, locks: {} }); }
    if (/\/rpc\/(submit_result|submit_feedback)/.test(u)) return json(null);
    if (/\/rpc\/get_my_result/.test(u)) return json({ ...DEMO_RESULT, updated_at: new Date().toISOString() });
    return realFetch(url, opts);
  };
})();
