create table if not exists public.business_auth (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.business_auth enable row level security;

drop policy if exists "Owners can read their own business auth" on public.business_auth;
create policy "Owners can read their own business auth"
  on public.business_auth
  for select
  to authenticated
  using (auth.uid() = id);
