-- Vinc — initial schema (Fase 1 MVP)
-- Data model reference: docs/03-arquitetura.md
-- Business rules reference: docs/02-especificacao-produto.md

-- ============================================================ profiles
-- One row per authenticated user, auto-created on signup (trigger below).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles are public inside the app (reputation must be visible to all).
create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Auto-create the profile row on signup, taking the name from user metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Sem nome'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================ categories
-- Managed by the platform (not user-editable); expandable without deploys.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  parent_id uuid references public.categories (id),
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories are readable by authenticated users"
  on public.categories for select to authenticated using (true);

-- Initial categories (docs/02 §2; final list is open question docs/07 #9).
insert into public.categories (name, icon) values
  ('Serviços domésticos', 'home'),
  ('Saúde', 'medkit'),
  ('Entretenimento', 'musical-notes'),
  ('Cuidado de crianças', 'happy'),
  ('Eventos', 'restaurant'),
  ('Outros', 'ellipsis-horizontal');

-- ============================================================ gigs
-- A gig is a job offer for a specific time range with a fixed price.
-- Lifecycle (docs/02 §2): open -> accepted -> in_progress -> completed,
-- with cancellation/expiry branches. Transitions are enforced by edge
-- functions using the same rules as packages/core (gig.ts).
create table public.gigs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles (id),
  category_id uuid not null references public.categories (id),
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_cents integer not null check (price_cents > 0),
  address text not null,
  status text not null default 'open' check (status in (
    'open', 'accepted', 'in_progress', 'completed',
    'cancelled_by_poster', 'cancelled_by_worker', 'expired'
  )),
  worker_id uuid references public.profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- status/worker coherence: an open/expired gig has no worker
  check ((status in ('open', 'expired')) = (worker_id is null))
);

create index gigs_status_starts_at on public.gigs (status, starts_at);
create index gigs_poster on public.gigs (poster_id);
create index gigs_worker on public.gigs (worker_id);

alter table public.gigs enable row level security;

create policy "gigs are readable by authenticated users"
  on public.gigs for select to authenticated using (true);

create policy "posters create their own gigs"
  on public.gigs for insert to authenticated
  with check (poster_id = (select auth.uid()) and status = 'open');

-- Posters may edit only their still-open gigs; accepting/cancelling/completing
-- goes through edge functions (service role) so fines and escrow can't be
-- bypassed by clients (docs/03 principle 3).
create policy "posters edit their open gigs"
  on public.gigs for update to authenticated
  using (poster_id = (select auth.uid()) and status = 'open')
  with check (poster_id = (select auth.uid()) and status = 'open');
