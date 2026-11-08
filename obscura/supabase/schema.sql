-- Obscura — Supabase schema
-- Run this in the Supabase SQL editor after creating your project

-- profiles: extends auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  created_at timestamptz default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Email signups send display_name; Google sends full_name / name.
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  ), 80));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- sets
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  subject text,
  visibility text not null default 'private' check (visibility in ('public', 'link', 'private')),
  share_token text unique default encode(gen_random_bytes(6), 'hex'),
  forked_from uuid references public.sets(id) on delete set null,
  card_count int not null default 0,
  star_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- cards
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete cascade,
  type text not null check (type in ('diagram', 'flashcard')),
  position int not null default 0,
  -- flashcard fields
  front text,
  back text,
  -- diagram fields
  image_url text,
  labels jsonb,
  -- the lecture page a generated card came from (1-based)
  source_page integer check (source_page is null or source_page between 1 and 10000),
  created_at timestamptz default now()
);

-- study sessions
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.sets(id) on delete cascade,
  mode text not null check (mode in ('flashcard', 'diagram', 'mixed')),
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- card results
create table public.card_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  grade text not null check (grade in ('correct', 'close', 'wrong', 'empty')),
  time_taken_ms int,
  answered_at timestamptz default now()
);

-- stars
create table public.set_stars (
  user_id uuid references public.profiles(id) on delete cascade,
  set_id uuid references public.sets(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, set_id)
);

-- keep card_count in sync. Security definer: users can't write the counter
-- columns themselves (see the column grants below), only these triggers can.
create or replace function update_card_count()
returns trigger
security definer
set search_path = public, pg_temp
as $$
begin
  update public.sets
  set card_count = (
    select count(*) from public.cards
    where set_id = coalesce(new.set_id, old.set_id)
  )
  where id = coalesce(new.set_id, old.set_id);
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger card_count_trigger
after insert or delete on public.cards
for each row execute function update_card_count();

-- keep star_count in sync
create or replace function update_star_count()
returns trigger
security definer
set search_path = public, pg_temp
as $$
begin
  update public.sets
  set star_count = (
    select count(*) from public.set_stars
    where set_id = coalesce(new.set_id, old.set_id)
  )
  where id = coalesce(new.set_id, old.set_id);
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger star_count_trigger
after insert or delete on public.set_stars
for each row execute function update_star_count();

-- keep updated_at in sync
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sets_updated_at
before update on public.sets
for each row execute function touch_updated_at();

alter function touch_updated_at() set search_path = public, pg_temp;

-- Trigger functions aren't API endpoints. Firing a trigger doesn't check
-- EXECUTE, so this only stops direct calls over /rest/v1/rpc.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function update_card_count() from public, anon, authenticated;
revoke execute on function update_star_count() from public, anon, authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.sets enable row level security;
alter table public.cards enable row level security;
alter table public.study_sessions enable row level security;
alter table public.card_results enable row level security;
alter table public.set_stars enable row level security;

-- profiles
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- sets
create policy "sets_select" on public.sets for select using (
  visibility = 'public'
  or owner_id = auth.uid()
);
create policy "sets_insert" on public.sets for insert with check (owner_id = auth.uid());
create policy "sets_update" on public.sets for update using (owner_id = auth.uid());
create policy "sets_delete" on public.sets for delete using (owner_id = auth.uid());

-- Link-shared sets have no select policy on purpose: a policy can't see the
-- token, so it would expose every link set. The API serves them by token.

-- Row policies limit which sets a user may write; these limit which columns.
-- Counters, share_token and forked_from are maintained server-side only.
revoke insert, update on public.sets from anon, authenticated;
grant insert (owner_id, title, description, subject, visibility) on public.sets to authenticated;
grant update (title, description, subject, visibility) on public.sets to authenticated;

-- cards
create policy "cards_select" on public.cards for select using (
  exists (
    select 1 from public.sets s
    where s.id = cards.set_id
    and (s.visibility = 'public' or s.owner_id = auth.uid())
  )
);
create policy "cards_insert" on public.cards for insert with check (
  exists (
    select 1 from public.sets s
    where s.id = set_id and s.owner_id = auth.uid()
  )
);
create policy "cards_update" on public.cards for update using (
  exists (
    select 1 from public.sets s
    where s.id = set_id and s.owner_id = auth.uid()
  )
);
create policy "cards_delete" on public.cards for delete using (
  exists (
    select 1 from public.sets s
    where s.id = set_id and s.owner_id = auth.uid()
  )
);

-- sessions — only on sets the user can see, or their history would leak the
-- titles of other users' private sets.
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

-- results
create policy "results_own" on public.card_results for all using (
  exists (
    select 1 from public.study_sessions sess
    where sess.id = session_id and sess.user_id = auth.uid()
  )
);

-- stars
create policy "stars_select" on public.set_stars for select using (true);
create policy "stars_insert" on public.set_stars for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.sets s
    where s.id = set_id and (s.visibility = 'public' or s.owner_id = auth.uid())
  )
);
create policy "stars_delete" on public.set_stars for delete using (user_id = auth.uid());

-- ── AI generation quota ──────────────────────────────────────────────────────
-- One row per user per UTC day, capping how many Claude generations a single
-- account can trigger against the server-owned API key. Users who supply their
-- own key bypass this entirely and are never metered here.

create table public.generation_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.generation_usage enable row level security;

-- Rows are written server-side with the service role, which bypasses RLS.
-- Users only need read access to show their own remaining allowance.
create policy "generation_usage_select_own" on public.generation_usage
  for select using (user_id = auth.uid());

-- Atomically claim one generation against the caller's daily allowance.
-- Returns the new count, or null if the limit was already reached.
--
-- The insert and the limit check happen in a single statement so that
-- concurrent requests can't both read "29 used" and both proceed.
create or replace function public.claim_generation(p_user_id uuid, p_limit int)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  if p_limit <= 0 then
    return null;
  end if;

  insert into public.generation_usage as gu (user_id, day, count)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update
    set count = gu.count + 1
    where gu.count < p_limit
  returning gu.count into v_count;

  return v_count;
end;
$$;

-- Functions are executable by PUBLIC by default. Left open, any logged-in user
-- could call this with someone else's id and burn their daily allowance.
-- Only the backend (service role) may claim generations.
revoke all on function public.claim_generation(uuid, int) from public;
revoke all on function public.claim_generation(uuid, int) from anon;
revoke all on function public.claim_generation(uuid, int) from authenticated;
grant execute on function public.claim_generation(uuid, int) to service_role;

-- Storage buckets (run in Supabase dashboard Storage section or via API)
-- bucket: card-images, public: false, allowed mime types: image/jpeg image/png image/webp
-- RLS policy: authenticated users can upload to their own folder ({user_id}/*)
-- RLS policy: anyone can read images in sets that are public

-- ── Trying without an account ────────────────────────────────────────────
create table if not exists public.trial_usage (
  ip_hash text not null,
  day date not null default (now() at time zone 'utc')::date,
  count int not null default 0,
  primary key (ip_hash, day)
);

-- Only the backend (service role) touches this table.
alter table public.trial_usage enable row level security;

create or replace function public.claim_trial_page(p_ip_hash text, p_limit int)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  if p_limit <= 0 then
    return null;
  end if;

  insert into public.trial_usage as tu (ip_hash, day, count)
  values (p_ip_hash, (now() at time zone 'utc')::date, 1)
  on conflict (ip_hash, day) do update
    set count = tu.count + 1
    where tu.count < p_limit
  returning tu.count into v_count;

  return v_count;
end;
$$;

revoke all on function public.claim_trial_page(text, int) from public;
revoke all on function public.claim_trial_page(text, int) from anon;
revoke all on function public.claim_trial_page(text, int) from authenticated;
grant execute on function public.claim_trial_page(text, int) to service_role;

-- ── Suggested fixes ──────────────────────────────────────────────────────
-- Students studying someone else's public or link-shared set can suggest a
-- fix to a card. Only the suggestion's author and the set's owner can see it,
-- and only the owner can apply or dismiss it. Applying edits the card through
-- the API (PATCH /cards/{id}); this table only records the suggestion.

create table if not exists public.card_suggestions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('wording', 'wrong_answer', 'label', 'other')),
  -- Flashcards: the proposed question and answer.
  suggested_front text check (char_length(suggested_front) <= 5000),
  suggested_back text check (char_length(suggested_back) <= 5000),
  -- Diagrams: the proposed label text, in the card's label order.
  suggested_labels text[] check (cardinality(suggested_labels) <= 100),
  note text check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'applied', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint card_suggestions_not_empty check (
    suggested_front is not null or suggested_back is not null
    or suggested_labels is not null or note is not null
  )
);

-- The owner's "N suggestions" count, and the per-author daily limit.
create index if not exists card_suggestions_set_open_idx
  on public.card_suggestions (set_id) where status = 'open';
create index if not exists card_suggestions_author_created_idx
  on public.card_suggestions (author_id, created_at desc);
create index if not exists card_suggestions_card_idx
  on public.card_suggestions (card_id);

-- Whether the caller may suggest a fix to this card: it belongs to this set,
-- the set is public or link-shared, and the caller doesn't own it.
-- Security definer because the sets policy hides link-shared sets from
-- everyone but their owner, so a plain subquery in the policy would never
-- see them. It only answers yes or no about ids the caller already has.
create or replace function public.can_suggest_on_card(p_set_id uuid, p_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.cards c
    join public.sets s on s.id = c.set_id
    where c.id = p_card_id
      and s.id = p_set_id
      and s.visibility in ('public', 'link')
      and s.owner_id <> auth.uid()
  );
$$;

revoke all on function public.can_suggest_on_card(uuid, uuid) from public, anon;
grant execute on function public.can_suggest_on_card(uuid, uuid) to authenticated;

-- Limits each author to 20 suggestions in any 24 hours, and pins the fields
-- the author doesn't get to choose.
create or replace function public.card_suggestions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recent int;
begin
  -- One author's inserts take turns, so two at once can't both slip under the cap.
  perform pg_advisory_xact_lock(hashtextextended('card_suggestions:' || new.author_id::text, 0));

  select count(*) into v_recent
  from public.card_suggestions
  where author_id = new.author_id
    and created_at > now() - interval '24 hours';

  if v_recent >= 20 then
    raise exception 'suggestion_rate_limit'
      using detail = 'You can send up to 20 suggestions a day.';
  end if;

  if new.suggested_labels is not null and exists (
    select 1 from unnest(new.suggested_labels) as l(label) where char_length(l.label) > 200
  ) then
    raise exception 'suggestion_label_too_long'
      using detail = 'Each label can be up to 200 characters.';
  end if;

  new.status := 'open';
  new.created_at := now();
  new.resolved_at := null;
  return new;
end;
$$;

-- Stamps resolved_at, and counts an applied fix as an update to the set, so
-- Explore's "updated" date reflects it.
create or replace function public.card_suggestions_before_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    new.resolved_at := case when new.status = 'open' then null else now() end;
    if new.status = 'applied' then
      update public.sets set updated_at = now() where id = new.set_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists card_suggestions_before_insert on public.card_suggestions;
create trigger card_suggestions_before_insert
  before insert on public.card_suggestions
  for each row execute function public.card_suggestions_before_insert();

drop trigger if exists card_suggestions_before_update on public.card_suggestions;
create trigger card_suggestions_before_update
  before update on public.card_suggestions
  for each row execute function public.card_suggestions_before_update();

revoke execute on function public.card_suggestions_before_insert() from public, anon, authenticated;
revoke execute on function public.card_suggestions_before_update() from public, anon, authenticated;

alter table public.card_suggestions enable row level security;

-- Any signed-in student, on a card in a public or link-shared set they don't own.
drop policy if exists "suggestions_insert" on public.card_suggestions;
create policy "suggestions_insert" on public.card_suggestions
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_suggest_on_card(set_id, card_id)
  );

-- Authors see what they sent.
drop policy if exists "suggestions_select_author" on public.card_suggestions;
create policy "suggestions_select_author" on public.card_suggestions
  for select to authenticated
  using (author_id = auth.uid());

-- Owners see suggestions on their sets…
drop policy if exists "suggestions_select_owner" on public.card_suggestions;
create policy "suggestions_select_owner" on public.card_suggestions
  for select to authenticated
  using (exists (
    select 1 from public.sets s
    where s.id = card_suggestions.set_id and s.owner_id = auth.uid()
  ));

-- …and are the only ones who can change their status.
drop policy if exists "suggestions_update_owner" on public.card_suggestions;
create policy "suggestions_update_owner" on public.card_suggestions
  for update to authenticated
  using (exists (
    select 1 from public.sets s
    where s.id = card_suggestions.set_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sets s
    where s.id = card_suggestions.set_id and s.owner_id = auth.uid()
  ));

-- No delete policy: suggestions go when their card or set does.

-- Policies limit which rows; these limit which columns. Authors can't set
-- status, and owners can change nothing but status.
revoke all on public.card_suggestions from anon;
revoke insert, update, delete on public.card_suggestions from authenticated;
grant select on public.card_suggestions to authenticated;
grant insert (set_id, card_id, kind, suggested_front, suggested_back, suggested_labels, note)
  on public.card_suggestions to authenticated;
grant update (status) on public.card_suggestions to authenticated;
