-- Research reader schema: papers, invites, profiles, private storage.
-- Run this in the Supabase SQL editor (or via supabase db push).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'reader' check (role in ('admin', 'reader')),
  created_at timestamptz not null default now()
);

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  storage_path text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  paper_id uuid references public.papers (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists invites_email_all_papers_idx
  on public.invites (lower(email))
  where paper_id is null;

create unique index if not exists invites_email_paper_idx
  on public.invites (lower(email), paper_id)
  where paper_id is not null;

create index if not exists invites_email_idx on public.invites (lower(email));

-- ---------------------------------------------------------------------------
-- New-user profile
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'reader')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Access helper (used by RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.has_paper_invite(target_paper_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invites i
    join auth.users u on lower(u.email) = lower(i.email)
    where u.id = auth.uid()
      and (i.expires_at is null or i.expires_at > now())
      and (i.paper_id is null or i.paper_id = target_paper_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.papers enable row level security;
alter table public.invites enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "papers_select_invited" on public.papers;
create policy "papers_select_invited"
  on public.papers for select
  to authenticated
  using (
    published = true
    and (public.is_admin() or public.has_paper_invite(id))
  );

drop policy if exists "papers_admin_write" on public.papers;
create policy "papers_admin_write"
  on public.papers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "invites_admin_all" on public.invites;
create policy "invites_admin_all"
  on public.invites for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Private storage bucket (service role bypasses RLS for the PDF proxy)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'papers',
  'papers',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage policies: clients never talk to Storage. The Next.js Route Handler
-- uses the service role to stream PDFs after invite checks.

-- ---------------------------------------------------------------------------
-- Seed papers matching the clinic Research Library cards
-- ---------------------------------------------------------------------------

insert into public.papers (slug, title, subtitle, published)
values
  ('allergy-blueprint', 'The Allergy Blueprint', 'Preventing allergies across generations', true),
  ('understanding-vertigo', 'Understanding Vertigo', 'A practical patient guide', true),
  ('the-healthy-ear', 'The Healthy Ear', 'Care from childhood onward', true),
  ('clearer-breathing', 'Clearer Breathing', 'Everyday sinus health', true),
  ('allergy-care-at-home', 'Allergy Care at Home', 'Simple evidence-based steps', true),
  ('balance-and-recovery', 'Balance & Recovery', 'Living well with dizziness', true),
  ('voice-health', 'Voice Health', 'Protecting your everyday voice', true),
  ('pediatric-ent-notes', 'Pediatric ENT Notes', 'A parent’s companion', true),
  ('sleep-and-breathing', 'Sleep & Breathing', 'What families should know', true),
  ('clinical-research-digest', 'Clinical Research Digest', 'Selected work from the practice', true)
on conflict (slug) do nothing;
