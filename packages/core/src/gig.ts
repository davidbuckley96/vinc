/**
 * Gig lifecycle state machine.
 * See docs/02-especificacao-produto.md §2 for the business rules.
 */

export const GIG_STATUSES = [
  "open",
  "accepted",
  "in_progress",
  "completed",
  "cancelled_by_poster",
  "cancelled_by_worker",
  "expired",
] as const;

export type GigStatus = (typeof GIG_STATUSES)[number];

const TRANSITIONS: Record<GigStatus, readonly GigStatus[]> = {
  open: ["accepted", "expired"],
  accepted: ["in_progress", "cancelled_by_poster", "cancelled_by_worker"],
  in_progress: ["completed", "cancelled_by_poster", "cancelled_by_worker"],
  completed: [],
  cancelled_by_poster: [],
  cancelled_by_worker: [],
  expired: [],
};

export function canTransition(from: GigStatus, to: GigStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Cancelling after acceptance is an act of bad faith by the poster and
 * incurs a fine (docs/02 §3). Fine amount is an open question (docs/07 #1).
 */
export function posterCancellationIncursFine(status: GigStatus): boolean {
  return status === "accepted" || status === "in_progress";
}
