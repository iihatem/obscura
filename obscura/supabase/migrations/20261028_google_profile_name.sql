-- Google sign-in — 2026-10-28
-- Google users arrive without the display_name the email signup form sends;
-- take their Google name instead of leaving the profile blank. Safe to re-run.

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

revoke execute on function public.handle_new_user() from public, anon, authenticated;
