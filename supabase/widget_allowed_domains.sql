-- Additive, idempotent. Run in Supabase SQL editor before saving a widget
-- with allowed domains, or saving will fall back to dropping the field
-- (see db.py upsert_widget) until this migration runs. No existing data
-- is changed, and empty list means "allow all origins" for backward
-- compatibility.
alter table public.chat_widgets
  add column if not exists allowed_domains text[] not null default '{}';
notify pgrst, 'reload schema';
