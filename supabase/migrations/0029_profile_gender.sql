-- Vinc — D-043: optional gender on the profile (dúvida #20).
-- Gender helps the poster choose (D-024), but it is OPTIONAL (LGPD) and
-- only shown when the person opts in — anonymized card stays consent-first.
--
-- Also FIXES a privilege-escalation hole: the profile UPDATE grant was
-- table-wide, so a user could set is_admin = true on their own row. The
-- grant is now restricted to the self-editable columns only.

alter table public.profiles
  add column gender text check (gender in ('female', 'male', 'other')),
  add column show_gender boolean not null default true;

-- Lock down what the owner may write (RLS still pins the row to them).
-- is_admin, id and created_at are intentionally excluded.
revoke update on public.profiles from authenticated;
grant update (name, avatar_url, bio, gender, show_gender)
  on public.profiles to authenticated;
