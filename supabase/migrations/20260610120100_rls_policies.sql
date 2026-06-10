-- ============================================================================
-- RateWatch — Row Level Security
--
-- Model:
--   * RLS is ENABLED on every table. With RLS on, "no policy" means "no
--     access" — so anything not explicitly granted below is denied.
--   * The service role (cron path only) bypasses RLS by design; it is the
--     only writer for daily_rates, notifications, and profiles.
--   * Policies target the `authenticated` role only: anonymous visitors have
--     no business reading any of these tables.
--   * auth.uid() is wrapped in (select ...) so Postgres evaluates it once per
--     statement (InitPlan) instead of once per row.
-- ============================================================================

alter table public.profiles      enable row level security;
alter table public.alerts        enable row level security;
alter table public.daily_rates   enable row level security;
alter table public.notifications enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- Users may read their own profile (the dashboard shows their email).
-- No insert/update/delete policies: rows are created and synced exclusively
-- by the auth triggers, so client-side writes would only create drift.
-- ----------------------------------------------------------------------------

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- ----------------------------------------------------------------------------
-- alerts — the only table users write to. Full CRUD, strictly own rows.
-- ----------------------------------------------------------------------------

-- Read: a user can list only their own alerts; other users' rows are
-- invisible even with a hand-crafted query.
create policy "alerts_select_own"
  on public.alerts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Create: WITH CHECK pins user_id to the caller's session, so a tampered
-- request body cannot create an alert on someone else's account.
create policy "alerts_insert_own"
  on public.alerts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Update: USING restricts which rows can be targeted (only your own);
-- WITH CHECK restricts what they may become (still your own), which blocks
-- "re-homing" an alert to another user via UPDATE ... SET user_id = ...
create policy "alerts_update_own"
  on public.alerts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Delete: only your own rows are deletable; deleting cascades to that
-- alert's notification history, which belongs to the same user.
create policy "alerts_delete_own"
  on public.alerts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- notifications
-- Read-only for owners: users may audit what was sent to them, but the rows
-- are system facts ("we emailed you at rate X") — letting users insert,
-- edit, or delete them would falsify delivery history and break the
-- idempotency lock. Only the cron (service role) writes here.
-- ----------------------------------------------------------------------------

create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- daily_rates
-- NO policies at all: RLS enabled + zero policies = no user access. This is
-- internal market data consumed by the cron evaluator (service role, which
-- bypasses RLS). The UI never queries it in the MVP, so least privilege says
-- nobody else can either. If a rate-history chart is added later, a single
-- select policy (`using (true)` for authenticated) is the only change needed.
-- ----------------------------------------------------------------------------
