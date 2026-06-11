alter table public.messages
  add column if not exists client_message_id text;

create unique index if not exists idx_messages_client_message_id
  on public.messages(room_id, sender_id, client_message_id)
  where client_message_id is not null;
