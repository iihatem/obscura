-- ── Exam plans ────────────────────────────────────────────────────────────
-- A student sets an exam date for a set, and the app spreads their reviews
-- out before it. One plan per set per student. Which cards are due each day
-- is worked out in the app from card_results, so this table only holds the
-- date and the daily limit.

create table if not exists public.exam_plans (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  set_id uuid not null references public.sets(id) on delete cascade,
  exam_date date not null,
  daily_cap int not null default 30 check (daily_cap between 5 and 200),
  -- New cards are spread out from the day the plan was made.
  created_at timestamptz not null default now(),
  primary key (user_id, set_id)
);

alter table public.exam_plans enable row level security;

drop policy if exists "exam_plans_select_own" on public.exam_plans;
create policy "exam_plans_select_own" on public.exam_plans
  for select to authenticated
  using (user_id = auth.uid());

-- Only on a set the student can see, like study sessions.
drop policy if exists "exam_plans_insert_own" on public.exam_plans;
create policy "exam_plans_insert_own" on public.exam_plans
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.sets s
      where s.id = set_id and (s.visibility = 'public' or s.owner_id = auth.uid())
    )
  );

drop policy if exists "exam_plans_update_own" on public.exam_plans;
create policy "exam_plans_update_own" on public.exam_plans
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "exam_plans_delete_own" on public.exam_plans;
create policy "exam_plans_delete_own" on public.exam_plans
  for delete to authenticated
  using (user_id = auth.uid());

-- Students change only the date and the limit; the owner and set stay put.
revoke all on public.exam_plans from anon;
revoke insert, update on public.exam_plans from authenticated;
grant select, delete on public.exam_plans to authenticated;
grant insert (set_id, exam_date, daily_cap) on public.exam_plans to authenticated;
grant update (exam_date, daily_cap) on public.exam_plans to authenticated;
