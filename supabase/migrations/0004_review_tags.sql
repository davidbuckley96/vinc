-- Vinc — quick-feedback tags on reviews (D-009): predefined praise/issue
-- markers chosen by tapping, adapted to the star rating and the reviewee's
-- role. Stored alongside the optional free comment.
alter table public.reviews add column tags text[] not null default '{}';
