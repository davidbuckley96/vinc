/**
 * Schedule conflict rules — the core guarantee that a worker never accepts
 * two gigs at the same time (docs/02-especificacao-produto.md §3).
 * Pure functions: the same code runs in the app (instant feedback) and in
 * the accept Edge Function (authoritative check).
 */

export interface TimeRange {
  /** ISO 8601 timestamps (UTC). */
  startsAt: string;
  endsAt: string;
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function hasScheduleConflict(
  candidate: TimeRange,
  committed: readonly TimeRange[],
): boolean {
  return committed.some((range) => rangesOverlap(candidate, range));
}
