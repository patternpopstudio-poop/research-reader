-- Phase 0: paper portal fields, library access grants, billing settings.
-- Does not drop or rewrite invites. Run after 001_init.sql.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Papers: public-facing copy for the access portal
-- ---------------------------------------------------------------------------

alter table public.papers
  add column if not exists description text,
  add column if not exists cover_path text,
  add column if not exists contents text[] not null default '{}',
  add column if not exists highlights text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Access grants (invite or purchase). Library-wide, not per-paper SKUs.
-- Per-paper invites remain on public.invites.
-- ---------------------------------------------------------------------------

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references public.profiles (id) on delete set null,
  source text not null check (source in ('invite', 'purchase')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  access_id text not null default ('RR-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10))),
  created_at timestamptz not null default now()
);

create unique index if not exists access_grants_access_id_idx
  on public.access_grants (access_id);

create unique index if not exists access_grants_stripe_session_idx
  on public.access_grants (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists access_grants_email_invite_idx
  on public.access_grants (lower(email))
  where source = 'invite';

create unique index if not exists access_grants_email_purchase_idx
  on public.access_grants (lower(email))
  where source = 'purchase';

create index if not exists access_grants_email_idx on public.access_grants (lower(email));
create index if not exists access_grants_user_idx on public.access_grants (user_id);

-- ---------------------------------------------------------------------------
-- Billing (single row)
-- ---------------------------------------------------------------------------

create table if not exists public.billing_settings (
  id int primary key default 1 check (id = 1),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'INR',
  billing_interval text not null default 'year' check (billing_interval in ('year', 'month')),
  included_copy text not null default 'This document and future research from the practice for the subscription period.',
  support_email text,
  company_name text not null default 'Dr. Prathiba Reddy',
  updated_at timestamptz not null default now()
);

insert into public.billing_settings (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Attach grants when a profile is created
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

  update public.access_grants
  set user_id = new.id
  where user_id is null
    and lower(email) = lower(new.email);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Access helper used by RLS (invite OR unexpired grant)
-- ---------------------------------------------------------------------------

create or replace function public.has_library_grant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.access_grants g
    where (g.user_id = auth.uid() or exists (
      select 1 from auth.users u
      where u.id = auth.uid() and lower(u.email) = lower(g.email)
    ))
      and g.starts_at <= now()
      and (g.expires_at is null or g.expires_at > now())
  );
$$;

create or replace function public.has_paper_access(target_paper_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or public.has_library_grant()
    or public.has_paper_invite(target_paper_id);
$$;

drop policy if exists "papers_select_invited" on public.papers;
create policy "papers_select_invited"
  on public.papers for select
  to authenticated
  using (
    published = true
    and public.has_paper_access(id)
  );

alter table public.access_grants enable row level security;
alter table public.billing_settings enable row level security;

drop policy if exists "access_grants_admin_all" on public.access_grants;
create policy "access_grants_admin_all"
  on public.access_grants for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "access_grants_select_own" on public.access_grants;
create policy "access_grants_select_own"
  on public.access_grants for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from auth.users u
      where u.id = auth.uid() and lower(u.email) = lower(access_grants.email)
    )
  );

drop policy if exists "billing_settings_select" on public.billing_settings;
create policy "billing_settings_select"
  on public.billing_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "billing_settings_admin_write" on public.billing_settings;
create policy "billing_settings_admin_write"
  on public.billing_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Public cover images (portal). PDFs stay in the private papers bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "covers_public_read" on storage.objects;
create policy "covers_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'covers');
