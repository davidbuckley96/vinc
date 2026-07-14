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
  /** Human-readable label of the map pin (docs/02 §2.1). */
  address: string;
  /** Map pin (D-023). Optional during rollout; the form always sends it. */
  lat?: number | null;
  lng?: number | null;
}

export type GigDraftError =
  | "category_required"
  | "title_too_short"
  | "title_too_long"
  | "description_too_long"
  | "starts_in_past"
  | "ends_before_starts"
  | "duration_too_long"
  | "price_required"
  | "price_too_low"
  | "price_too_high"
  | "address_required"
  | "location_invalid"
  | "location_outside_brazil";

export const GIG_TITLE_MIN = 3;
export const GIG_TITLE_MAX = 80;
export const GIG_DESCRIPTION_MAX = 2000;
/**
 * No gig may pay less than R$ 10 (D-019): blocks malicious near-free
 * postings (e.g. using gigs as ads) and matches the fine floor.
 */
export const GIG_MIN_PRICE_CENTS = 1000;
/**
 * Upper bound per gig (D-057, provisório — confirmar valor com o David):
 * evita valores absurdos (ex.: 8h por R$ 50.000) e o erro genérico em
 * entradas gigantes (ex.: 10 milhões). R$ 10.000,00.
 */
export const GIG_MAX_PRICE_CENTS = 1_000_000;
/**
 * Máximo de horas de um serviço (D-058): jornada de trabalho. Permite virar
 * o dia (ex.: babá 22h–03h = 5h), mas nunca passar de 8h por motivo legal.
 */
export const GIG_MAX_DURATION_HOURS = 8;

/**
 * Brazil bounding box (padded), the backend's coarse "is it in Brazil"
 * guard (D-023). The app also checks the country via reverse geocoding
 * before letting the pin be confirmed — this rejects the obvious
 * out-of-range cases (other continents, mid-ocean beyond the coast).
 */
export const BRAZIL_BBOX = { minLat: -34.0, maxLat: 5.5, minLng: -74.5, maxLng: -34.0 };

export function insideBrazilBbox(lat: number, lng: number): boolean {
  return (
    lat >= BRAZIL_BBOX.minLat &&
    lat <= BRAZIL_BBOX.maxLat &&
    lng >= BRAZIL_BBOX.minLng &&
    lng <= BRAZIL_BBOX.maxLng
  );
}

export function validateGigDraft(draft: GigDraft, now: Date): GigDraftError[] {
  const errors: GigDraftError[] = [];
  const title = draft.title.trim();

  if (!draft.categoryId) errors.push("category_required");
  if (title.length < GIG_TITLE_MIN) errors.push("title_too_short");
  if (title.length > GIG_TITLE_MAX) errors.push("title_too_long");
  if (draft.description.length > GIG_DESCRIPTION_MAX) errors.push("description_too_long");
  if (new Date(draft.startsAt) <= now) errors.push("starts_in_past");
  if (draft.endsAt <= draft.startsAt) {
    errors.push("ends_before_starts");
  } else {
    const hours = (new Date(draft.endsAt).getTime() - new Date(draft.startsAt).getTime()) / 3_600_000;
    if (hours > GIG_MAX_DURATION_HOURS) errors.push("duration_too_long");
  }
  if (!Number.isInteger(draft.priceCents) || draft.priceCents <= 0) {
    errors.push("price_required");
  } else if (draft.priceCents < GIG_MIN_PRICE_CENTS) {
    errors.push("price_too_low");
  } else if (draft.priceCents > GIG_MAX_PRICE_CENTS) {
    errors.push("price_too_high");
  }
  if (!draft.address.trim()) errors.push("address_required");
  const hasLat = draft.lat !== undefined && draft.lat !== null;
  const hasLng = draft.lng !== undefined && draft.lng !== null;
  if (hasLat !== hasLng) errors.push("location_invalid");
  if (hasLat && hasLng) {
    const validLat = Number.isFinite(draft.lat) && Math.abs(draft.lat!) <= 90;
    const validLng = Number.isFinite(draft.lng) && Math.abs(draft.lng!) <= 180;
    if (!validLat || !validLng) {
      errors.push("location_invalid");
    } else if (!insideBrazilBbox(draft.lat!, draft.lng!)) {
      errors.push("location_outside_brazil");
    }
  }

  return errors;
}
