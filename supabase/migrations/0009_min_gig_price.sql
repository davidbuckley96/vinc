-- Vinc — minimum gig price of R$ 10 (D-019)
-- Near-free gigs enable malicious use (e.g. posting "gigs" as free ads),
-- so no service may pay less than R$ 10 — which also matches the
-- cancellation-fine floor (D-018). Enforced in validateGigDraft (form +
-- create-gig/update-gig functions); this constraint is defence in depth.

alter table public.gigs drop constraint gigs_price_cents_check;
alter table public.gigs add constraint gigs_price_cents_check
  check (price_cents >= 1000);
