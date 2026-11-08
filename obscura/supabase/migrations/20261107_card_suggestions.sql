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
