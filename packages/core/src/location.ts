/**
 * Approximate location shown BEFORE the poster chooses a candidate
 * (docs/02 §2.1/§3 — D-028): candidates see only the area label and a
 * fuzzed pin; the exact address is revealed to the chosen worker. Pure
 * and self-contained — used by the app and by the Edge Functions.
 */

/** Fuzz distance range applied to the exact pin, in meters. */
export const APPROX_MIN_METERS = 250;
export const APPROX_MAX_METERS = 600;

const METERS_PER_DEGREE_LAT = 111_320;

/** Fallback label when the address has no area part to extract. */
export const GENERIC_AREA_LABEL = "Região aproximada no mapa";

/**
 * Extracts the public area label from an address label. Geocoding labels
 * are "Rua das Flores, 120 — Boa Vista, Recife" (see the app's
 * shortLabel); everything before the "—" identifies the exact spot and
 * must NOT leak, so the area is the part after it.
 */
export function deriveAreaLabel(address: string): string {
  const parts = address.split(" — ");
  const area = (parts[1] ?? "").trim();
  return area || GENERIC_AREA_LABEL;
}

/**
 * Offsets the exact pin by a random 250–600 m in a random direction.
 * Computed ONCE at creation and stored — recomputing per request would
 * let someone average many readings back to the exact point.
 */
export function approximateLocation(
  lat: number,
  lng: number,
): { lat: number; lng: number } {
  const distance = APPROX_MIN_METERS + Math.random() * (APPROX_MAX_METERS - APPROX_MIN_METERS);
  const bearing = Math.random() * 2 * Math.PI;
  const deltaLat = (distance * Math.sin(bearing)) / METERS_PER_DEGREE_LAT;
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);
  const deltaLng = (distance * Math.cos(bearing)) / Math.max(metersPerDegreeLng, 1);
  return { lat: lat + deltaLat, lng: lng + deltaLng };
}
