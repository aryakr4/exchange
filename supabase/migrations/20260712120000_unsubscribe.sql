-- ============================================================================
-- RateWatch — email unsubscribe
-- A global opt-out that suppresses alert email while preserving alerts, plus
-- a per-user token so an unsubscribe link works from a mail client with no
-- session (and no login the user will never perform).
-- ============================================================================

alter table public.profiles
  add column email_opt_out     boolean not null default false,
  add column unsubscribe_token uuid    not null default gen_random_uuid();

-- Unique: the token is the sole credential on the unsubscribe path, and the
-- lookup must resolve to exactly one profile.
create unique index profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);
