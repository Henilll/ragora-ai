-- Optional SQL analytics. If this function is not installed, the backend
-- falls back to the existing Python analytics, so this is safe to run later.
-- Run in Supabase SQL editor.
create or replace function public.ragora_widget_analytics(owner_user_id text)
returns table (
  total_messages bigint,
  user_messages bigint,
  bot_messages bigint,
  unique_visitors bigint,
  unanswered_count bigint,
  total_tokens bigint,
  average_latency_ms numeric
)
language sql
stable
as $$
  select
    count(*),
    count(*) filter (where role = 'user'),
    count(*) filter (where role = 'bot'),
    count(distinct visitor_id),
    count(*) filter (where role = 'bot' and had_answer = false),
    coalesce(sum(token_count), 0),
    coalesce(avg(latency_ms) filter (where latency_ms is not null), 0)
  from public.widget_chats
  where widget_chats.owner_user_id = ragora_widget_analytics.owner_user_id;
$$;
notify pgrst, 'reload schema';
