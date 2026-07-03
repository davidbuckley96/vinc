/**
 * Validation for a gig being created (docs/02 §2). Pure and language-neutral:
 * returns error codes; the app maps them to pt-BR messages. The same rules
 * run in the form (instant feedback) and in the backend before insert.
 */

export interface GigDraft {
  categoryId: string;
  title: string;
  description: string;
  /** ISO 8601 timestamps. */
  startsAt: string;
  endsAt: string;
  priceCents: number;
  address: string;
}

export type GigDraftError =
  | "category_required"
  | "title_too_short"
  | "title_too_long"
  | "description_too_long"
  | "starts_in_past"
  | "ends_before_starts"
  | "price_required"
  | "price_too_low"
  | "address_required";

export const GIG_TITLE_MIN = 3;
export const GIG_TITLE_MAX = 80;
export const GIG_DESCRIPTION_MAX = 2000;
/**
 * No gig may pay less than R$ 10 (D-019): blocks malicious near-free
 * postings (e.g. using gigs as ads) and matches the fine floor.
 */
export const GIG_MIN_PRICE_CENTS = 1000;

export function validateGigDraft(draft: GigDraft, now: Date): GigDraftError[] {
  const errors: GigDraftError[] = [];
  const title = draft.title.trim();

  if (!draft.categoryId) errors.push("category_required");
  if (title.length < GIG_TITLE_MIN) errors.push("title_too_short");
  if (title.length > GIG_TITLE_MAX) errors.push("title_too_long");
  if (draft.description.length > GIG_DESCRIPTION_MAX) errors.push("description_too_long");
  if (new Date(draft.startsAt) <= now) errors.push("starts_in_past");
  if (draft.endsAt <= draft.startsAt) errors.push("ends_before_starts");
  if (!Number.isInteger(draft.priceCents) || draft.priceCents <= 0) {
    errors.push("price_required");
  } else if (draft.priceCents < GIG_MIN_PRICE_CENTS) {
    errors.push("price_too_low");
  }
  if (!draft.address.trim()) errors.push("address_required");

  return errors;
}
