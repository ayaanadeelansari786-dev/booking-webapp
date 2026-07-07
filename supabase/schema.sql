create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id text primary key,
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id) on delete cascade,
  customer_name text not null,
  phone text not null,
  email text,
  issue_description text,
  booking_date date not null,
  booking_time time not null,
  status text not null default 'new' check (status in ('new', 'scheduled', 'completed', 'cancelled', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists bookings_business_created_idx
  on public.bookings (business_id, created_at desc);

create index if not exists bookings_business_slot_idx
  on public.bookings (business_id, booking_date, booking_time);

insert into public.businesses (id, name, logo_url)
values ('demo-service-co', 'Demo Service Co.', null)
on conflict (id) do nothing;

alter table public.businesses enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Public can read businesses" on public.businesses;
create policy "Public can read businesses"
  on public.businesses for select
  using (true);

drop policy if exists "Public can create bookings" on public.bookings;
create policy "Public can create bookings"
  on public.bookings for insert
  with check (true);

drop policy if exists "Public can read bookings for MVP" on public.bookings;
create policy "Public can read bookings for MVP"
  on public.bookings for select
  using (true);

drop policy if exists "Public can update booking status for MVP" on public.bookings;
create policy "Public can update booking status for MVP"
  on public.bookings for update
  using (true)
  with check (true);

