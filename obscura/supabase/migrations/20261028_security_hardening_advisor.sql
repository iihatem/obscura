-- Follow-up to 20261028_security_hardening.sql, from the Supabase security advisor.
-- NOT yet applied to production — run it in the Supabase SQL Editor.

-- Trigger functions are never meant to be called over the API. Firing a
-- trigger doesn't check EXECUTE, so revoking it changes nothing for the
-- triggers themselves.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_card_count() from public, anon, authenticated;
revoke execute on function public.update_star_count() from public, anon, authenticated;

alter function public.touch_updated_at() set search_path = public, pg_temp;
