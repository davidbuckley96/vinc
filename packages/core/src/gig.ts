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
  "disputed",
  "completed",
  "cancelled_by_poster",
  "cancelled_by_worker",
  "expired",
] as const;

export type GigStatus = (typeof GIG_STATUSES)[number];

const TRANSITIONS: Record<GigStatus, readonly GigStatus[]> = {
  // The gig stays OPEN collecting candidates (D-024); choosing one moves
  // it straight to accepted. Deletion (net refund, fee kept) and
  // expiration also leave from open. pending_approval is LEGACY (D-012's
  // one-at-a-time flow) — kept only so old rows remain valid.
  open: ["accepted", "pending_approval", "cancelled_by_poster", "expired"],
  pending_approval: ["accepted", "open", "cancelled_by_poster", "expired"],
  accepted: ["in_progress", "cancelled_by_poster", "cancelled_by_worker"],
  // The poster may CONFIRM straight from in_progress (D-032 layer 2):
  // the happy path never depends on the worker's phone surviving.
  in_progress: ["awaiting_confirmation", "completed", "cancelled_by_poster", "cancelled_by_worker"],
  // Instead of confirming, the poster may DISPUTE (docs/02 §6 — D-028):
  // the escrow freezes (the 48h auto-release only touches
  // awaiting_confirmation) until the platform resolves it.
  awaiting_confirmation: ["completed", "disputed"],
  disputed: ["completed"],
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
  "disputed",
];

/**
 * Statuses that occupy the worker's schedule for conflict checks. Since
 * D-024, PENDING CANDIDACIES DO NOT BLOCK — a worker may apply to many
 * gigs; only being chosen occupies the slot (the choice re-checks).
 */
export const SCHEDULE_BLOCKING_STATUSES: readonly GigStatus[] = [
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
  // Confirming is allowed from in_progress too (D-032 layer 2): if the
  // worker's phone died, the poster can still finish the flow alone.
  if (role === "poster" && (status === "in_progress" || status === "awaiting_confirmation")) {
    return "confirm";
  }
  return null;
}
