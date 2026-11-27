-- =====================================================================
-- DiSC 人際風格實踐平台（DiSC Practice Tool）— Supabase 資料庫建立腳本
-- 由正式環境匯出結構（2026-11-27），不含任何學員資料、密碼或金鑰。
--
-- 使用方式：
--   1. 建立新的 Supabase 專案 → SQL Editor → 貼上本檔全部內容 → Run。
--   2. 執行前，先把最下方「初始設定」裡的『請改成你的管理員密碼』換成你自己的密碼。
--   3. 部署 Edge Function：supabase/functions/admin-media（後台上傳教材圖片用）。
--   4. 修改 js/common.js 的 SUPABASE_URL 與 SUPABASE_KEY（publishable / anon 公開金鑰）。
--   詳細步驟見 supabase/README.md。
--
-- 安全設計：
--   - 所有資料表都開啟 Row Level Security；前台（anon）只能「讀」公開內容。
--   - 學員結果的寫入／讀取、以及所有後台操作，一律透過 SECURITY DEFINER 函式（RPC）；
--     後台函式第一行都會先驗證管理員密碼（密碼以 bcrypt hash 儲存，錯誤時延遲回應防暴力嘗試）。
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 資料表
-- ---------------------------------------------------------------------

-- 全站設定（只有一列 id = 1）：管理員密碼 hash、結果是否公開、題目是否隨機、輔型差距門檻、功能解鎖密碼
create table if not exists public.app_config (
  id integer default 1 not null,
  admin_pw_hash text not null,
  show_results boolean default true not null,
  randomize boolean default false not null,
  secondary_gap integer default 10 not null,
  locks jsonb default '{}'::jsonb not null,
  constraint app_config_pkey primary key (id),
  constraint app_config_id_check check ((id = 1)),
  constraint app_config_secondary_gap_check check (((secondary_gap >= 0) and (secondary_gap <= 50)))
);

-- 題目：kind = 'self'（看懂自己）或 'others'（識別他人）
create table if not exists public.questions (
  id uuid default gen_random_uuid() not null,
  kind text not null,
  sort integer default 0 not null,
  prompt text not null,
  options jsonb default '[]'::jsonb not null,
  updated_at timestamp with time zone default now() not null,
  constraint questions_pkey primary key (id),
  constraint questions_kind_check check ((kind = any (array['self'::text, 'others'::text])))
);

-- 教材分類與文章（解密工具）
create table if not exists public.article_categories (
  id uuid default gen_random_uuid() not null,
  name text not null,
  sort integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  constraint article_categories_pkey primary key (id),
  constraint article_categories_name_check check (((char_length(btrim(name)) >= 1) and (char_length(btrim(name)) <= 40)))
);

create table if not exists public.articles (
  id uuid default gen_random_uuid() not null,
  title text not null,
  summary text default ''::text not null,
  sort integer default 0 not null,
  published boolean default true not null,
  blocks jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  category_id uuid,
  constraint articles_pkey primary key (id),
  constraint articles_category_id_fkey foreign key (category_id) references article_categories(id) on delete set null
);

-- 彈性調適內容覆寫：key = 'combo:<我的風格>:<對方風格>[:down|:up]' 等
create table if not exists public.adapt_content (
  key text not null,
  data jsonb not null,
  updated_at timestamp with time zone default now() not null,
  constraint adapt_content_pkey primary key (key)
);

-- 首頁、結果類型說明等網站文字覆寫
create table if not exists public.site_content (
  key text not null,
  data jsonb not null,
  updated_at timestamp with time zone default now() not null,
  constraint site_content_pkey primary key (key)
);

-- 填答者群組（上課梯次）
create table if not exists public.result_groups (
  id uuid default gen_random_uuid() not null,
  name text not null,
  created_at timestamp with time zone default now() not null,
  constraint result_groups_pkey primary key (id),
  constraint result_groups_name_check check (((char_length(btrim(name)) >= 1) and (char_length(btrim(name)) <= 40)))
);

-- 學員測評結果：只收姓名與作答；client_id 為瀏覽器隨機產生，用來辨識同一位學員（不需帳號）
create table if not exists public.disc_results (
  id uuid default gen_random_uuid() not null,
  user_name text not null,
  score_d smallint not null,
  score_i smallint not null,
  score_s smallint not null,
  score_c smallint not null,
  primary_types text[] not null,
  created_at timestamp with time zone default now() not null,
  client_id text,
  style text,
  answers jsonb,
  updated_at timestamp with time zone default now() not null,
  accuracy_feedback smallint,
  group_id uuid,
  constraint disc_results_pkey primary key (id),
  constraint disc_results_client_uq unique (client_id),
  constraint disc_results_group_id_fkey foreign key (group_id) references result_groups(id) on delete set null,
  constraint disc_results_accuracy_feedback_check check (((accuracy_feedback >= 1) and (accuracy_feedback <= 5))),
  constraint disc_results_primary_types_check check (((cardinality(primary_types) >= 1) and (cardinality(primary_types) <= 2))),
  constraint disc_results_score_c_check check (((score_c >= 0) and (score_c <= 100))),
  constraint disc_results_score_d_check check (((score_d >= 0) and (score_d <= 100))),
  constraint disc_results_score_i_check check (((score_i >= 0) and (score_i <= 100))),
  constraint disc_results_score_s_check check (((score_s >= 0) and (score_s <= 100))),
  constraint disc_results_user_name_check check (((char_length(btrim(user_name)) >= 1) and (char_length(btrim(user_name)) <= 30)))
);

create index if not exists disc_results_group_idx on public.disc_results using btree (group_id);

-- ---------------------------------------------------------------------
-- Row Level Security：全部開啟；前台只開放讀取公開內容
-- （app_config、disc_results、result_groups 沒有任何 policy → 前台完全無法直接讀寫，只能走 RPC）
-- ---------------------------------------------------------------------
alter table public.app_config         enable row level security;
alter table public.questions          enable row level security;
alter table public.article_categories enable row level security;
alter table public.articles           enable row level security;
alter table public.adapt_content      enable row level security;
alter table public.site_content       enable row level security;
alter table public.result_groups      enable row level security;
alter table public.disc_results       enable row level security;

create policy "public read questions"          on public.questions          for select to anon using (true);
create policy "public read article categories" on public.article_categories for select to anon using (true);
create policy "public read published articles" on public.articles           for select to anon using (published);
create policy "public read adapt content"      on public.adapt_content      for select to anon using (true);
create policy "public read site content"       on public.site_content       for select to anon using (true);

-- ---------------------------------------------------------------------
-- 內部函式：驗證管理員密碼（不開放前台直接呼叫）
-- ---------------------------------------------------------------------
create or replace function public._admin_ok(pw text)
 returns boolean language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare h text;
begin
  select admin_pw_hash into h from app_config where id = 1;
  if h is not null and crypt(coalesce(pw,''), h) = h then return true; end if;
  perform pg_sleep(0.6);
  return false;
end $function$;

create or replace function public._admin_guard(pw text)
 returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
begin
  if not public._admin_ok(pw) then raise exception 'unauthorized' using errcode = '28000'; end if;
end $function$;

revoke execute on function public._admin_ok(text)    from public, anon, authenticated;
revoke execute on function public._admin_guard(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 前台 RPC
-- ---------------------------------------------------------------------

-- 前台讀取設定（不含任何密碼 hash，只回傳各功能是否上鎖）
create or replace function public.get_config()
 returns jsonb language sql security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'show_results', show_results, 'randomize', randomize, 'secondary_gap', secondary_gap,
    'locks', (select coalesce(jsonb_object_agg(k, coalesce((v->>'on')::boolean,false)), '{}'::jsonb) from jsonb_each(locks) as t(k,v)))
  from app_config where id = 1 $function$;

-- 功能解鎖密碼驗證
create or replace function public.check_unlock(feature text, pw text)
 returns boolean language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare l jsonb;
begin
  select locks->feature into l from app_config where id = 1;
  if l is null or not coalesce((l->>'on')::boolean, false) then return true; end if;
  if crypt(coalesce(pw,''), l->>'hash') = l->>'hash' then return true; end if;
  perform pg_sleep(0.4);
  return false;
end $function$;

-- 交卷：同一個 client_id 重測時覆寫舊結果
create or replace function public.submit_result(p_client text, p_name text, p_answers jsonb, p_scores jsonb, p_style text, p_primary text[])
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if p_client is null or char_length(p_client) < 8 then raise exception 'invalid client'; end if;
  insert into disc_results (client_id, user_name, answers, style, primary_types, score_d, score_i, score_s, score_c, created_at, updated_at)
  values (p_client, btrim(p_name), p_answers, p_style, p_primary,
          (p_scores->>'D')::smallint, (p_scores->>'I')::smallint, (p_scores->>'S')::smallint, (p_scores->>'C')::smallint, now(), now())
  on conflict (client_id) do update set
    user_name = excluded.user_name, answers = excluded.answers, style = excluded.style,
    primary_types = excluded.primary_types, score_d = excluded.score_d, score_i = excluded.score_i,
    score_s = excluded.score_s, score_c = excluded.score_c, accuracy_feedback = null, created_at = now(), updated_at = now();
end $function$;

-- 學員只能讀到自己的結果（依瀏覽器的 client_id）；講師設定「不公開結果」時只回傳姓名
create or replace function public.get_my_result(p_client text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare r disc_results; show boolean;
begin
  select * into r from disc_results where client_id = p_client;
  if not found then return null; end if;
  select show_results into show from app_config where id = 1;
  if not show then return jsonb_build_object('hidden', true, 'user_name', r.user_name); end if;
  return jsonb_build_object('hidden', false, 'user_name', r.user_name, 'style', r.style, 'primary_types', r.primary_types,
    'scores', jsonb_build_object('D', r.score_d, 'I', r.score_i, 'S', r.score_s, 'C', r.score_c),
    'updated_at', r.updated_at, 'accuracy_feedback', r.accuracy_feedback);
end $function$;

-- 結果準確度回饋（1–5 分，每次測驗限填一次）
create or replace function public.submit_feedback(p_client text, p_rating integer)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare n int;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'invalid rating'; end if;
  update disc_results set accuracy_feedback = p_rating, updated_at = updated_at
  where client_id = p_client and accuracy_feedback is null;
  get diagnostics n = row_count;
  if n = 0 then
    if exists (select 1 from disc_results where client_id = p_client and accuracy_feedback is not null) then
      raise exception 'already submitted';
    end if;
    raise exception 'result not found';
  end if;
end $function$;

-- ---------------------------------------------------------------------
-- 後台 RPC（第一個參數皆為管理員密碼）
-- ---------------------------------------------------------------------
create or replace function public.admin_login(pw text)
 returns boolean language sql security definer set search_path to 'public'
as $function$ select public._admin_ok(pw) $function$;

create or replace function public.admin_get_config(pw text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare c app_config;
begin
  perform public._admin_guard(pw);
  select * into c from app_config where id = 1;
  return jsonb_build_object(
    'show_results', c.show_results, 'randomize', c.randomize, 'secondary_gap', c.secondary_gap,
    'admin_pw_blank', crypt('', c.admin_pw_hash) = c.admin_pw_hash,
    'locks', (select jsonb_object_agg(k, jsonb_build_object('on', coalesce((v->>'on')::boolean,false), 'blank', crypt('', v->>'hash') = v->>'hash'))
              from jsonb_each(c.locks) as t(k,v)));
end $function$;

create or replace function public.admin_update_config(pw text, patch jsonb)
 returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare k text;
begin
  perform public._admin_guard(pw);
  update app_config set
    show_results  = coalesce((patch->>'show_results')::boolean, show_results),
    randomize     = coalesce((patch->>'randomize')::boolean, randomize),
    secondary_gap = coalesce((patch->>'secondary_gap')::int, secondary_gap),
    admin_pw_hash = case when patch ? 'new_admin_pw' then crypt(coalesce(patch->>'new_admin_pw',''), gen_salt('bf')) else admin_pw_hash end
  where id = 1;
  for k in select jsonb_object_keys(coalesce(patch->'locks_on', '{}'::jsonb)) loop
    update app_config set locks = jsonb_set(locks, array[k,'on'], to_jsonb((patch->'locks_on'->>k)::boolean), true) where id = 1;
  end loop;
  for k in select jsonb_object_keys(coalesce(patch->'lock_pw', '{}'::jsonb)) loop
    update app_config set locks = jsonb_set(locks, array[k,'hash'], to_jsonb(crypt(coalesce(patch->'lock_pw'->>k,''), gen_salt('bf'))), true) where id = 1;
  end loop;
end $function$;

create or replace function public.admin_list_results(pw text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
begin
  perform public._admin_guard(pw);
  return coalesce((select jsonb_agg(to_jsonb(r) - 'answers' order by r.created_at desc) from disc_results r), '[]'::jsonb);
end $function$;

create or replace function public.admin_delete_result(pw text, p_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin perform public._admin_guard(pw); delete from disc_results where id = p_id; end $function$;

create or replace function public.admin_list_groups(pw text)
 returns setof result_groups language plpgsql security definer set search_path to 'public'
as $function$
begin perform public._admin_guard(pw); return query select * from result_groups order by created_at, name; end $function$;

create or replace function public.admin_upsert_group(pw text, r jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v uuid;
begin
  perform public._admin_guard(pw);
  insert into result_groups (id, name) values (coalesce((r->>'id')::uuid, gen_random_uuid()), btrim(r->>'name'))
  on conflict (id) do update set name = excluded.name
  returning id into v;
  return v;
end $function$;

create or replace function public.admin_delete_group(pw text, p_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin perform public._admin_guard(pw); delete from result_groups where id = p_id; end $function$;

create or replace function public.admin_set_results_group(pw text, p_ids uuid[], p_group uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  perform public._admin_guard(pw);
  update disc_results set group_id = p_group where id = any(p_ids);
end $function$;

create or replace function public.admin_upsert_question(pw text, r jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v uuid;
begin
  perform public._admin_guard(pw);
  insert into questions (id, kind, sort, prompt, options, updated_at)
  values (coalesce((r->>'id')::uuid, gen_random_uuid()), r->>'kind', coalesce((r->>'sort')::int, 0), coalesce(r->>'prompt',''), coalesce(r->'options','[]'::jsonb), now())
  on conflict (id) do update set kind = excluded.kind, sort = excluded.sort, prompt = excluded.prompt, options = excluded.options, updated_at = now()
  returning id into v;
  return v;
end $function$;

create or replace function public.admin_delete_question(pw text, p_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin perform public._admin_guard(pw); delete from questions where id = p_id; end $function$;

create or replace function public.admin_list_articles(pw text)
 returns setof articles language plpgsql security definer set search_path to 'public'
as $function$
begin perform public._admin_guard(pw); return query select * from articles order by sort, created_at; end $function$;

create or replace function public.admin_upsert_article(pw text, r jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v uuid;
begin
  perform public._admin_guard(pw);
  insert into articles (id, title, summary, sort, published, blocks, category_id, updated_at)
  values (coalesce((r->>'id')::uuid, gen_random_uuid()), coalesce(r->>'title','未命名'), coalesce(r->>'summary',''),
          coalesce((r->>'sort')::int, 0), coalesce((r->>'published')::boolean, true), coalesce(r->'blocks','[]'::jsonb),
          nullif(r->>'category_id','')::uuid, now())
  on conflict (id) do update set title = excluded.title, summary = excluded.summary, sort = excluded.sort,
    published = excluded.published, blocks = excluded.blocks, category_id = excluded.category_id, updated_at = now()
  returning id into v;
  return v;
end $function$;

create or replace function public.admin_delete_article(pw text, p_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin perform public._admin_guard(pw); delete from articles where id = p_id; end $function$;

create or replace function public.admin_upsert_category(pw text, r jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v uuid;
begin
  perform public._admin_guard(pw);
  insert into article_categories (id, name, sort)
  values (coalesce((r->>'id')::uuid, gen_random_uuid()), btrim(r->>'name'), coalesce((r->>'sort')::int, 0))
  on conflict (id) do update set name = excluded.name, sort = excluded.sort
  returning id into v;
  return v;
end $function$;

create or replace function public.admin_delete_category(pw text, p_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin perform public._admin_guard(pw); delete from article_categories where id = p_id; end $function$;

create or replace function public.admin_upsert_adapt(pw text, p_key text, p_data jsonb)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  perform public._admin_guard(pw);
  insert into adapt_content (key, data, updated_at) values (p_key, p_data, now())
  on conflict (key) do update set data = excluded.data, updated_at = now();
end $function$;

create or replace function public.admin_delete_adapt(pw text, p_key text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin perform public._admin_guard(pw); delete from adapt_content where key = p_key; end $function$;

create or replace function public.admin_upsert_site(pw text, p_key text, p_data jsonb)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  perform public._admin_guard(pw);
  insert into site_content (key, data, updated_at) values (p_key, p_data, now())
  on conflict (key) do update set data = excluded.data, updated_at = now();
end $function$;

create or replace function public.admin_delete_site(pw text, p_key text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin perform public._admin_guard(pw); delete from site_content where key = p_key; end $function$;

-- ---------------------------------------------------------------------
-- 教材圖片儲存空間（公開讀取；上傳／刪除只能透過 admin-media Edge Function，需管理員密碼）
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('disc-media', 'disc-media', true, 52428800)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 初始設定：建立唯一一列設定，並設定管理員密碼
-- ⚠️ 執行前請把『請改成你的管理員密碼』換成你自己的密碼；之後可在後台「基本設定」修改。
-- ---------------------------------------------------------------------
insert into public.app_config (id, admin_pw_hash)
values (1, extensions.crypt('請改成你的管理員密碼', extensions.gen_salt('bf')))
on conflict (id) do nothing;

-- 題目、教材、結果說明與 144×3 組應對建議：請登入後台（admin.html）新增；
-- 未新增的「彈性調適」組合會由前台程式內建的預設產生器自動提供內容。
