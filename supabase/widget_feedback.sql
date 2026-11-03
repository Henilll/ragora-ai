-- Additive, idempotent. Run in Supabase SQL editor to enable widget feedback
-- and the analytics SQL function. If you skip it, feedback counts fall back
-- to 0 in analytics and feedback POSTs will fail with a generic error until
-- the table exists, so run this before announcing feedback.
create table if not exists public.widget_feedback (
  id uuid primary key default gen_random_uuid(),
  widget_id text not null,
  owner_user_id text not null,
  visitor_id text not null,
  rating text not null check (rating in ('helpful', 'not_helpful')),
  bot_message text not null default '',
  question text not null default '',
  created_at timestamptz not null default now()
);
alter table public.widget_feedback enable row level security;
create index if not exists widget_feedback_owner_idx on public.widget_feedback (owner_user_id, created_at desc);
create index if not exists widget_feedback_widget_idx on public.widget_feedback (widget_id, created_at desc);
alter table public.chat_widgets add column if not exists chat_model text not null default '';
notify pgrst, 'reload schema';
