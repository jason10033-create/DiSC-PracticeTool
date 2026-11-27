# 自行架設一套 DiSC 人際風格實踐平台

這個資料夾放的是建立後端（Supabase）需要的全部腳本。依下列步驟，約半天即可在新的環境架好一套，供其他部門或課程使用。

| 檔案 | 用途 |
|---|---|
| `schema.sql` | 建立資料表、Row Level Security、前台與後台 RPC、教材圖片儲存空間、初始設定 |
| `functions/admin-media/index.ts` | 後台上傳／刪除教材圖片用的 Edge Function |

以上檔案皆不含任何學員資料、密碼或金鑰。

## 步驟

1. **網站**：Fork 本 repo，在 GitHub 的 Settings → Pages 選擇 `main` 分支發佈。
2. **資料庫**：到 [supabase.com](https://supabase.com) 建立新專案 → SQL Editor。
   - 先把 `schema.sql` 最下方的『請改成你的管理員密碼』換成自己的密碼。
   - 貼上全部內容後按 Run。
3. **Edge Function**：用 Supabase CLI 部署圖片上傳功能。
   ```
   supabase functions deploy admin-media --no-verify-jwt
   ```
4. **連線設定**：修改 `js/common.js` 最上方兩行：
   - `SUPABASE_URL`：你的專案網址（Project Settings → API）
   - `SUPABASE_KEY`：publishable／anon 公開金鑰（不要放 service_role 金鑰）
5. **防止閒置暫停**（免費方案）：修改 `.github/workflows/keepalive.yml` 裡的專案網址與金鑰，每 3 天自動讀取一次。
6. **內容**：開啟 `admin.html`，以管理員密碼登入後：
   - 新增「看懂自己」15 題與「識別他人」10 題
   - 新增教材分類與文章
   - 設定首頁文字、功能解鎖密碼與結果公開時機
   - 「彈性調適」144 × 3 組建議可先使用程式內建的預設內容，之後再逐組改寫。

## 安全設計重點

- 所有資料表都開啟 Row Level Security；前台只能讀取題目、教材、網站文字等公開內容。
- 學員結果只能透過 `submit_result`／`get_my_result` 寫入與讀取，而且每位學員只讀得到自己的結果（依瀏覽器隨機產生的 client_id）。
- 所有 `admin_*` 函式都需要管理員密碼；密碼以 bcrypt hash 儲存，輸入錯誤時會延遲回應，避免被暴力嘗試。
