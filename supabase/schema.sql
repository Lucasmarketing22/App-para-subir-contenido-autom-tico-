-- My Work OS — Supabase schema
-- Run in Supabase Dashboard > SQL Editor. Safe to re-run.
-- Every row belongs to the authenticated user (RLS: user_id = auth.uid()).

create extension if not exists "pgcrypto";

-- ---------- businesses (clients) ----------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'other'
    check (type in ('hotel','restaurant','clinic','gym','store','agency','other')),
  language text not null,          -- ISO 639-1 (ES, EN, PT, FR...)
  currency text not null,          -- ISO 4217 (EUR, USD, ARS...)
  timezone text not null,          -- IANA (Europe/Madrid...)
  country_code text,               -- ISO 3166-1 alpha-2, optional
  brand_tone text not null default 'casual'
    check (brand_tone in ('formal','casual','fun','premium')),
  ad_pause_threshold numeric not null default 50,
  knowledge text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- leads ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  source text not null default '',
  status text not null default 'new' check (status in ('new','contacted','booked','lost')),
  value numeric not null default 0,
  contact text not null default '',
  notes text not null default '',
  lead_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- reviews ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  author text not null default '',
  rating int not null check (rating between 1 and 5),
  content text not null,
  detected_language text not null default '',
  replies jsonb not null default '[]'::jsonb,
  chosen_reply text not null default '',
  status text not null default 'pending' check (status in ('pending','replied')),
  created_at timestamptz not null default now()
);

-- ---------- gbp_posts ----------
create table if not exists public.gbp_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null default '',
  body text not null,
  cta text not null default '',
  image_idea text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  scheduled_for date,
  created_at timestamptz not null default now()
);

-- ---------- ad_reports ----------
create table if not exists public.ad_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  raw_input text not null,
  period text not null default '',
  campaigns jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  report text not null default '',
  total_spend numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- social_posts ----------
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null default 'post' check (type in ('reel','carousel','story','post')),
  title text not null default '',
  copy text not null default '',
  hashtags text[] not null default '{}',
  status text not null default 'todo' check (status in ('todo','in_production','published')),
  scheduled_for date,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index if not exists leads_business_idx on public.leads (business_id, created_at desc);
create index if not exists reviews_business_idx on public.reviews (business_id, created_at desc);
create index if not exists gbp_posts_business_idx on public.gbp_posts (business_id, created_at desc);
create index if not exists ad_reports_business_idx on public.ad_reports (business_id, created_at desc);
create index if not exists social_posts_business_idx on public.social_posts (business_id, created_at desc);

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['businesses','leads','reviews','gbp_posts','ad_reports','social_posts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format(
      'create policy "owner_all" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ---------- Storage (client assets: photos, logos) ----------
insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

drop policy if exists "assets_owner_rw" on storage.objects;
create policy "assets_owner_rw" on storage.objects for all to authenticated
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
