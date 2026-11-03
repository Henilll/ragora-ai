-- Suggested questions for the chatbot widget (Ragora Widget v2).
-- Run once in the Supabase SQL editor. Idempotent: safe to run twice.
-- The widget owner edits these in the Chatbot Builder; visitors see them
-- as chips under the welcome message. The backend caps them at 4, so this
-- column only needs to hold a short list, not a full document.
alter table public.chat_widgets
  add column if not exists suggested_questions text[] not null default '{}';

notify pgrst, 'reload schema';
