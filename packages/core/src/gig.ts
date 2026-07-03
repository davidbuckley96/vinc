/**
 * Gig lifecycle state machine.
 * See docs/02-especificacao-produto.md §2/§4 for the business rules.
 *
 * Happy path: open → accepted → in_progress → awaiting_confirmation →
 * completed. The worker starts and finishes the service; the poster's
 * confirmation (awaiting_confirmation → completed) is what releases the
 * escrowed payment (docs/02 §5).
 */

export const GIG_STATUSES = [
  "open",
  "pending_approval",
  "accepted",
  "in_progress",
  "awaiting_confirmation",
  "completed",
  "cancelled_by_poster",
  "cancelled_by_worker",
  "expired",
] as const;

export type GigStatus = (typeof GIG_STATUSES)[number];

const TRANSITIONS: Record<GigStatus, readonly GigStatus[]> = {
  // deletion by the poster (net refund, fee kept — docs/02 §5.1) is
  // modelled as open/pending_approval → cancelled_by_poster, without fine
  open: ["pending_approval", "cancelled_by_poster", "expired"],
  // approval -> accepted; refusal -> back to open (docs/02 §3)
  pending_approval: ["accepted", "open", "cancelled_by_poster"],
  accepted: ["in_progress", "cancelled_by_poster", "cancelled_by_worker"],
  in_progress: ["awaiting_confirmation", "cancelled_by_poster", "cancelled_by_worker"],
  awaiting_confirmation: ["completed"],
  completed: [],
  cancelled_by_poster: [],
  cancelled_by_worker: [],
  expired: [],
};

export function canTransition(from: GigStatus, to: GigStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Statuses with escrow held for the worker (wallet "a receber"). */
export const ACTIVE_WORKER_STATUSES: readonly GigStatus[] = [
  "accepted",
  "in_progress",
  "awaiting_confirmation",
];

/**
 * Statuses that occupy the worker's schedule for conflict checks: a pending
 * candidacy also blocks the slot (docs/02 §3), even though no escrow exists.
 */
export const SCHEDULE_BLOCKING_STATUSES: readonly GigStatus[] = [
  "pending_approval",
  ...ACTIVE_WORKER_STATUSES,
];

/**
 * Cancelling after acceptance is an act of bad faith by the poster and
 * incurs a fine (docs/02 §3). Fine amount is an open question (docs/07 #1).
 */
export function posterCancellationIncursFine(status: GigStatus): boolean {
  return status === "accepted" || status === "in_progress";
}

/**
 * Poster may DELETE the gig (net amount refunded, fee kept — docs/02 §5.1)
 * only before approving anyone. After approval it becomes a cancellation,
 * which incurs a fine (docs/07 #1).
 */
export function posterCanDelete(status: GigStatus): boolean {
  return status === "open" || status === "pending_approval";
}

/**
 * Poster may EDIT the gig only while open with no pending candidate — a
 * candidate applied to specific terms, so deciding comes first. The price
 * is never editable (D-017): change it by deleting and re-creating.
 */
export function posterCanEdit(status: GigStatus): boolean {
  return status === "open";
}

/** Which lifecycle action each role may perform at a given status. */
export function allowedLifecycleAction(
  status: GigStatus,
  role: "worker" | "poster",
): "start" | "complete" | "confirm" | null {
  if (role === "worker" && status === "accepted") return "start";
  if (role === "worker" && status === "in_progress") return "complete";
  if (role === "poster" && status === "awaiting_confirmation") return "confirm";
  return null;
}
