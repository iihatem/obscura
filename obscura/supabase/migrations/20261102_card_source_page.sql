-- The lecture page a generated card came from (1-based), shown as "p. 12" on
-- the card so students can check it against their slides. Hand-made cards
-- have none.
alter table public.cards
  add column if not exists source_page integer
  check (source_page is null or source_page between 1 and 10000);
