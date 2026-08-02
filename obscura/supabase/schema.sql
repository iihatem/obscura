-- Obscura — Supabase schema
-- Run this in the Supabase SQL editor after creating your project

-- profiles: extends auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

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

-- keep card_count in sync
create or replace function update_card_count()
returns trigger as $$
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
returns trigger as $$
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

-- sets with share token (link sharing) — additional policy
create policy "sets_select_by_token" on public.sets for select using (
  visibility = 'link'
); -- tokens validated at application layer

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

-- sessions
create policy "sessions_own" on public.study_sessions for all using (user_id = auth.uid());

-- results
create policy "results_own" on public.card_results for all using (
  exists (
    select 1 from public.study_sessions sess
    where sess.id = session_id and sess.user_id = auth.uid()
  )
);

-- stars
create policy "stars_select" on public.set_stars for select using (true);
create policy "stars_insert" on public.set_stars for insert with check (user_id = auth.uid());
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
returns int as $$
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
$$ language plpgsql security definer;

-- Storage buckets (run in Supabase dashboard Storage section or via API)
-- bucket: card-images, public: false, allowed mime types: image/jpeg image/png image/webp
-- RLS policy: authenticated users can upload to their own folder ({user_id}/*)
-- RLS policy: anyone can read images in sets that are public
