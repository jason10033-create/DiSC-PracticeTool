// 後台上傳／刪除教材圖片（Supabase Edge Function：admin-media）
// 由正式環境匯出（2026-11-27）。金鑰一律由 Supabase 環境變數提供，程式中不含任何密碼或金鑰。
// 部署：supabase functions deploy admin-media --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const BUCKET = "disc-media";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    if (req.method === "POST") {
      const form = await req.formData();
      const pw = String(form.get("password") ?? "");
      const file = form.get("file");
      const { data: ok } = await sb.rpc("admin_login", { pw });
      if (!ok) return json({ error: "unauthorized" }, 401);
      if (!(file instanceof File)) return json({ error: "no file" }, 400);
      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) return json({ error: error.message }, 400);
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
      return json({ url: data.publicUrl, path, name: file.name, type: file.type, size: file.size });
    }

    if (req.method === "DELETE") {
      const body = await req.json();
      const { data: ok } = await sb.rpc("admin_login", { pw: String(body.password ?? "") });
      if (!ok) return json({ error: "unauthorized" }, 401);
      const { error } = await sb.storage.from(BUCKET).remove([String(body.path)]);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
