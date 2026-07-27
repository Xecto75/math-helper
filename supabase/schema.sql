-- math-engine — auth + quota schema
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- SECURITY MODEL, in one line: the browser may READ a profile but may never
-- write plan or usage. Both are written only by the server using the service
-- role key, after it has verified the caller's JWT. Everything below exists to
-- make that true even if someone calls the database directly with a stolen
-- anon key — the anon key is public by design, it ships in the JS bundle.

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per auth user. `plan` and the usage counters are the money-relevant
-- fields, so nothing client-side is allowed to set them.
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null,
  display_name        text,
  plan                text not null default 'free' check (plan in ('free', 'pro')),
  -- Rolling monthly window for the free custom-lesson allowance.
  lessons_used        integer not null default 0 check (lessons_used >= 0),
  period_start        date    not null default date_trunc('month', now())::date,
  -- Set by Stripe later; kept here so the webhook has somewhere to write.
  stripe_customer_id  text unique,
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user may read ONLY their own profile.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- A user may update ONLY their own display_name. plan / lessons_used /
-- period_start / stripe_customer_id are deliberately NOT writable from the
-- browser: the WITH CHECK clause re-reads the stored row and rejects the
-- update if any of them differ, so a crafted request cannot self-upgrade.
drop policy if exists "update own display_name" on public.profiles;
create policy "update own display_name"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and plan         = (select p.plan         from public.profiles p where p.id = auth.uid())
    and lessons_used = (select p.lessons_used from public.profiles p where p.id = auth.uid())
    and period_start = (select p.period_start from public.profiles p where p.id = auth.uid())
    and stripe_customer_id is not distinct from
        (select p.stripe_customer_id from public.profiles p where p.id = auth.uid())
  );

-- No INSERT or DELETE policy on purpose: rows are created by the trigger below
-- (which runs as the definer, bypassing RLS) and removed by the auth cascade.

-- ── auto-create a profile on signup ─────────────────────────────────────────
-- Without this, a user could sign up and have no profile row, and the server
-- would have to create one on first use — a race worth avoiding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── quota consumption ───────────────────────────────────────────────────────
-- Called by the SERVER only (service role). Does the month-rollover, the limit
-- check and the increment in ONE statement so two concurrent generate requests
-- cannot both read "2 used" and both proceed — the row is locked for the
-- duration of the update.
create or replace function public.consume_lesson_credit(
  p_user_id uuid,
  p_free_limit integer
)
returns table (allowed boolean, plan text, lessons_used integer, free_limit integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_plan  text;
  v_used  integer;
  v_start date;
  v_month date := date_trunc('month', now())::date;
begin
  select p.plan, p.lessons_used, p.period_start
    into v_plan, v_used, v_start
    from public.profiles p
   where p.id = p_user_id
     for update;                      -- row lock: serialises concurrent calls

  if not found then
    return query select false, 'free'::text, 0, p_free_limit;
    return;
  end if;

  -- New calendar month → reset the counter before deciding.
  if v_start < v_month then
    v_used  := 0;
    v_start := v_month;
  end if;

  if v_plan = 'pro' then
    update public.profiles
       set lessons_used = v_used + 1, period_start = v_start
     where id = p_user_id;
    return query select true, v_plan, v_used + 1, p_free_limit;
    return;
  end if;

  if v_used >= p_free_limit then
    -- Persist the rollover even when refusing, so the reset isn't lost.
    update public.profiles set lessons_used = v_used, period_start = v_start
     where id = p_user_id;
    return query select false, v_plan, v_used, p_free_limit;
    return;
  end if;

  update public.profiles
     set lessons_used = v_used + 1, period_start = v_start
   where id = p_user_id;
  return query select true, v_plan, v_used + 1, p_free_limit;
end;
$$;

-- The browser must not be able to call it directly (it would let a user burn
-- or manipulate their own counter outside the server's checks).
revoke all on function public.consume_lesson_credit(uuid, integer) from public, anon, authenticated;
