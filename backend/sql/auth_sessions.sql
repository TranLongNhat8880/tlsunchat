create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  user_agent text,
  ip_address text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_user_id
  on public.auth_sessions(user_id);

create index if not exists idx_auth_sessions_active
  on public.auth_sessions(user_id, expires_at)
  where revoked_at is null;
