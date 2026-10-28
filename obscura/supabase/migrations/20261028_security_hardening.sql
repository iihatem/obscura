-- Security hardening — 2026-10-28
-- Brings an existing database in line with schema.sql. Safe to re-run.

begin;

-- 1. Link-shared sets were selectable by anyone: the policy never checked a
--    token, so PostgREST listed every link set *with* its share_token. Link
--    sets are served only by the API's token lookup (GET /sets/share/{token}).
drop policy if exists "sets_select_by_token" on public.sets;

-- 2. Row policies limit *which* sets a user may write, not *which columns*.
--    Without column grants a user could set their own star_count, card_count,
--    share_token or forked_from directly. The API writes with the service role
--    and is unaffected.
revoke insert, update on public.sets from anon, authenticated;
grant insert (owner_id, title, description, subject, visibility) on public.sets to authenticated;
grant update (title, description, subject, visibility) on public.sets to authenticated;

-- The counters are now maintained only by these triggers, which therefore run
-- as their owner rather than as the user whose write fired them.
alter function public.update_card_count() security definer set search_path = public, pg_temp;
alter function public.update_star_count() security definer set search_path = public, pg_temp;

-- 3. Security-definer function without a fixed search_path, taking an
--    unbounded display name from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(new.raw_user_meta_data->>'display_name', 80));
  return new;
end;
$$;

alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles
  add constraint profiles_display_name_len check (char_length(display_name) <= 80) not valid;

-- 4. A user could open a study session — and so see the title in their history
--    — for any set id, including someone else's private set. Sessions and stars
--    may only point at sets the user can see.
drop policy if exists "sessions_own" on public.study_sessions;
drop policy if exists "sessions_select_own" on public.study_sessions;
drop policy if exists "sessions_insert_own" on public.study_sessions;
drop policy if exists "sessions_update_own" on public.study_sessions;
drop policy if exists "sessions_delete_own" on public.study_sessions;

create policy "sessions_select_own" on public.study_sessions
  for select using (user_id = auth.uid());
create policy "sessions_insert_own" on public.study_sessions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.sets s
      where s.id = set_id and (s.visibility = 'public' or s.owner_id = auth.uid())
    )
  );
create policy "sessions_update_own" on public.study_sessions
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.sets s
      where s.id = set_id and (s.visibility = 'public' or s.owner_id = auth.uid())
    )
  );
create policy "sessions_delete_own" on public.study_sessions
  for delete using (user_id = auth.uid());

drop policy if exists "stars_insert" on public.set_stars;
create policy "stars_insert" on public.set_stars
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.sets s
      where s.id = set_id and (s.visibility = 'public' or s.owner_id = auth.uid())
    )
  );

commit;
