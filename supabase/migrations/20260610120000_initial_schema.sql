-- ============================================================================
-- RateWatch — initial schema
-- Tables: profiles, alerts, daily_rates, notifications
-- Plus: enums, a currency-code domain, constraints, indexes, audit triggers,
-- and the auth.users -> profiles sync triggers.
-- ============================================================================

-- gen_random_uuid(); pre-enabled on Supabase, harmless elsewhere.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Types
-- ----------------------------------------------------------------------------

create type public.alert_condition as enum ('greater_than', 'less_than');

-- Edge-trigger state machine: an alert only notifies on the transition
-- armed -> triggered. It re-arms when the condition stops being met, which is
-- what allows a future notification after the rate moves away and crosses the
-- threshold again.
create type public.alert_trigger_state as enum ('armed', 'triggered');

-- Exactly three uppercase ASCII letters (ISO-4217 shape). A domain enforces
-- length AND case in one reusable place instead of repeating CHECKs per column.
create domain public.currency_code as text
  check (value ~ '^[A-Z]{3}$');

-- ----------------------------------------------------------------------------
-- Shared audit trigger: keeps updated_at honest on every UPDATE.
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles — one row per auth user, created by trigger (never by app code).
-- ----------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- alerts — user-owned alert definitions.
-- ----------------------------------------------------------------------------

create table public.alerts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  from_currency     public.currency_code not null,
  to_currency       public.currency_code not null,
  -- numeric(18,8): exact decimal (never float for money/rates); 8 fractional
  -- digits covers FX precision, 10 integer digits covers high-denomination
  -- pairs (e.g. USD->IDR).
  target_rate       numeric(18,8) not null,
  condition         public.alert_condition not null,
  active            boolean not null default true,
  trigger_state     public.alert_trigger_state not null default 'armed',
  last_triggered_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint alerts_target_rate_positive  check (target_rate > 0),
  constraint alerts_distinct_currencies   check (from_currency <> to_currency)
);

create index alerts_user_id_idx       on public.alerts (user_id);
create index alerts_active_idx        on public.alerts (active);
create index alerts_currency_pair_idx on public.alerts (from_currency, to_currency);

create trigger set_alerts_updated_at
  before update on public.alerts
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- daily_rates — market data snapshots, written only by the cron (service role).
-- One row per (base, quote, day); re-runs upsert instead of duplicating.
-- ----------------------------------------------------------------------------

create table public.daily_rates (
  id             uuid primary key default gen_random_uuid(),
  base_currency  public.currency_code not null,
  quote_currency public.currency_code not null,
  rate           numeric(18,8) not null,
  rate_date      date not null default current_date,
  fetched_at     timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint daily_rates_rate_positive check (rate > 0),
  -- Idempotency: a duplicate cron run updates today's row rather than
  -- inserting a second one (the service upserts on this constraint).
  constraint daily_rates_one_per_day unique (base_currency, quote_currency, rate_date)
);

create index daily_rates_pair_idx       on public.daily_rates (base_currency, quote_currency);
create index daily_rates_fetched_at_idx on public.daily_rates (fetched_at);

create trigger set_daily_rates_updated_at
  before update on public.daily_rates
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- notifications — history of triggered alerts, written only by the cron.
-- The unique (alert_id, trigger_date) constraint IS the idempotency lock:
-- the cron inserts here BEFORE sending email, so a concurrent or repeated
-- run cannot claim the same alert twice on the same day.
-- ----------------------------------------------------------------------------

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  alert_id     uuid not null references public.alerts (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  rate         numeric(18,8) not null,
  email_sent   boolean not null default false,
  sent_at      timestamptz,
  trigger_date date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint notifications_once_per_alert_per_day unique (alert_id, trigger_date)
);

create index notifications_alert_id_idx on public.notifications (alert_id);
create index notifications_user_id_idx  on public.notifications (user_id);
-- Partial index for the retry sweep: "find notifications whose email failed".
create index notifications_unsent_idx   on public.notifications (email_sent)
  where email_sent = false;

create trigger set_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- auth.users -> profiles sync.
-- SECURITY DEFINER because the auth admin role that fires the trigger has no
-- direct grant on public.profiles; search_path pinned to '' to prevent
-- search-path hijacking of the unqualified names inside.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync if the user later changes their auth email.
create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = new.email
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_updated();
