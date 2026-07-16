// Shared server-side geo glue (D-066). Kept OUT of packages/core because it
// does network I/O (Nominatim) — core stays pure. Both create-gig and
// update-gig import this so the public map point is computed the SAME way in
// both paths; letting them drift is exactly what caused G-10 (docs/16), where
// an edited gig lost its neighbourhood centroid and the approximate map link
// disappeared.

import { GENERIC_AREA_LABEL } from "../../../packages/core/src/location.ts";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const GEO_HEADERS = {
  "Accept-Language": "pt-BR",
  "User-Agent": "VincApp/1.0 (marketplace de servicos; contato@vinc.app)",
};

/**
 * Public map point = the NEIGHBOURHOOD CENTROID (D-066), not a fuzzed pin.
 * Showing the whole bairro centred (no circle) preserves anonymity — everyone
 * in "Manaíra, João Pessoa" maps to the same public centre — and lets the map
 * render layer-free (the WebGL circle janked the pan gesture on Android, V-01).
 *
 * The search is biased by a viewbox around the EXACT point so it picks the
 * RIGHT "Centro"/"Boa Vista" (there are many in Brazil). Any failure (no match,
 * timeout, network) returns null and the caller falls back to the fixed-offset
 * fuzz — publishing must never depend on the geocoder being up.
 */
export async function neighbourhoodCenter(
  areaLabel: string,
  lat: number,
  lng: number,
): Promise<{ lat: number; lng: number } | null> {
  if (areaLabel === GENERIC_AREA_LABEL) return null;
  const d = 0.15; // ~16 km box around the exact point — the bairro is well inside
  const viewbox = `&viewbox=${lng - d},${lat + d},${lng + d},${lat - d}&bounded=1`;
  const url =
    `${NOMINATIM}/search?format=jsonv2&limit=1&countrycodes=br` +
    `&q=${encodeURIComponent(areaLabel)}${viewbox}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { headers: GEO_HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const clat = Number(row?.lat);
    const clng = Number(row?.lon);
    if (!Number.isFinite(clat) || !Number.isFinite(clng)) return null;
    return { lat: clat, lng: clng };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
