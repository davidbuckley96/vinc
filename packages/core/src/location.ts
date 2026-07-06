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

export interface LatLng {
  lat: number;
  lng: number;
}

/** Haversine distance in meters — good enough at city scale (D-029). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const EARTH_RADIUS = 6_371_000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

/**
 * Bounding box for a radius search (D-029): a cheap server-side filter
 * (two range conditions the database can index); the exact circle is
 * refined client-side with distanceMeters.
 */
export function boundingBox(center: LatLng, radiusKm: number) {
  const dLat = (radiusKm * 1000) / METERS_PER_DEGREE_LAT;
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180);
  const dLng = (radiusKm * 1000) / Math.max(metersPerDegreeLng, 1);
  return {
    minLat: center.lat - dLat,
    maxLat: center.lat + dLat,
    minLng: center.lng - dLng,
    maxLng: center.lng + dLng,
  };
}

/** "≈ 800 m" / "≈ 3 km" — shown on gig cards (D-029). */
export function formatDistanceLabel(meters: number): string {
  const roundedMeters = Math.max(100, Math.round(meters / 100) * 100);
  if (roundedMeters < 1000) return `≈ ${roundedMeters} m`;
  return `≈ ${Math.max(1, Math.round(meters / 1000))} km`;
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
