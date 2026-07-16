-- D-073: the worker no-show becomes a REAL refund dispute (the service was
-- already paid). The poster's "não apareceu" opens a `no_show` dispute (money
-- frozen), the worker can DEFEND, and support decides. Refund + debt + offense
-- move from the instant cancel (D-071) to the dispute resolution.

-- New dispute kind.
alter table public.disputes drop constraint if exists disputes_kind_check;
alter table public.disputes add constraint disputes_kind_check
  check (kind in ('pre_release', 'post_release', 'no_show'));

-- The worker's defense (text) on a dispute — for no_show especially, but
-- harmless for any kind. Photos go in dispute_photos tagged by `by`.
alter table public.disputes
  add column if not exists worker_response text,
  add column if not exists worker_responded_at timestamptz;

-- Tag dispute photos by who added them, so support sees both sides.
alter table public.dispute_photos
  add column if not exists by text not null default 'poster'
    check (by in ('poster', 'worker'));

-- The worker may WRITE their own defense photos into the bucket policy path.
-- (Read policy already covers participants; storage RLS is enforced in the
-- edge function by requiring the path to start with the caller's id.)
