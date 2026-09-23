-- Phase 3: which checkout session already received the confirmation email.
-- Run after 002_portal_foundation.sql.

alter table public.access_grants
  add column if not exists confirmation_session_id text;
