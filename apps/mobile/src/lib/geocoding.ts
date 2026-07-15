/**
 * Address search / reverse geocoding. As de 2026-07-15 as chamadas passam pela
 * Edge Function `geocode` (proxy do Nominatim), NÃO mais direto do aparelho: no
 * 4G o IP compartilhado da operadora era bloqueado/limitado pelo Nominatim e o
 * User-Agent era ignorado no Android — "não encontrava nada". No servidor o IP
 * é estável e o User-Agent é honrado. Falhas degradam para um rótulo genérico.
 */

import { supabase } from '@/lib/supabase';

/** Chama a Edge Function geocode e devolve o payload `data` (ou null). */
async function invokeGeocode(body: {
  op: 'search' | 'region' | 'reverse';
  q?: string;
  lat?: number;
  lng?: number;
  near?: { lat: number; lng: number };
}): Promise<unknown> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('geocode', { body });
    if (error) return null;
    return (data as { data?: unknown })?.data ?? null;
  } catch {
    return null;
  }
}

export interface GeoResult {
  lat: number;
  lng: number;
  label: string;
  /**
   * The public neighbourhood label ("Boa Vista, Recife") derived from the
   * STRUCTURED Nominatim parts (A2, docs/13) — independent of whether `label`
   * has a road. Empty only when the provider gives no area at all. Carried all
   * the way to create-gig so the bairro centroid (D-066) runs even for a
   * road-less pick, instead of re-parsing the display string.
   */
  area: string;
}

export interface ReverseResult {
  label: string;
  /** true only when the point resolves to an address inside Brazil. */
  inBrazil: boolean;
}

/**
 * Reverse-geocode outcome (D-059): distinguishing "resolved to an address"
 * from "the provider says there's nothing here" (ocean/no-man's-land) from
 * "the request failed" (network) lets the picker reject the sea without
 * blocking a valid pin when the network hiccups.
 */
export type ReverseOutcome =
  | { kind: 'address'; label: string; area: string; inBrazil: boolean }
  | { kind: 'no_address' } // Nominatim responded but there's no address (sea, etc.)
  | { kind: 'error' }; // network / HTTP failure — ambiguous

interface NominatimRow {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
}

/**
 * Public neighbourhood label ("Boa Vista, Recife") from the STRUCTURED parts —
 * never includes the road/number, so it's safe to show before the poster picks
 * a worker (D-028). Empty when the provider gives no suburb/city at all.
 */
function areaLabel(row: NominatimRow): string {
  const parts = row.address ?? {};
  const area = parts.suburb ?? parts.neighbourhood ?? parts.city_district ?? '';
  const city = parts.city ?? parts.town ?? parts.village ?? parts.municipality ?? '';
  return [area, city].filter(Boolean).join(', ');
}

/** "Rua das Flores, 120 — Boa Vista, Recife" from a Nominatim row. */
function shortLabel(row: NominatimRow): string {
  const parts = row.address ?? {};
  const road = parts.road ?? parts.pedestrian ?? parts.square ?? row.name ?? '';
  const number = parts.house_number ? `, ${parts.house_number}` : '';
  const head = road ? `${road}${number}` : '';
  const tail = areaLabel(row);
  if (head && tail) return `${head} — ${tail}`;
  return head || tail || row.display_name?.split(',').slice(0, 3).join(',') || 'Local no mapa';
}

/**
 * Region/place search biased toward the user's location (B-08, D-062): a
 * viewbox around `near` makes the results LOCALLY relevant and dynamic — no
 * hard-coded lists. Typing "centro" in Aracaju surfaces Aracaju's centro
 * first; in Rio, Rio's. Without `near` it's a plain Brazil-wide search.
 */
/**
 * Maps Nominatim rows to GeoResult, dropping any row whose lat/lng isn't a
 * finite number (A5, docs/13): a malformed coordinate would become NaN and,
 * once fed into the map center, render as `[NaN, NaN]` and break the WebView
 * map with no error.
 */
function toGeoResults(rows: NominatimRow[] | null): GeoResult[] {
  if (!Array.isArray(rows)) return [];
  const out: GeoResult[] = [];
  for (const row of rows) {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ lat, lng, label: shortLabel(row), area: areaLabel(row) });
  }
  return out;
}

export async function searchRegions(
  query: string,
  near?: { lat: number; lng: number },
): Promise<GeoResult[]> {
  return toGeoResults((await invokeGeocode({ op: 'region', q: query, near })) as NominatimRow[] | null);
}

export async function searchAddress(query: string): Promise<GeoResult[]> {
  return toGeoResults((await invokeGeocode({ op: 'search', q: query })) as NominatimRow[] | null);
}

/** Full outcome (address / no_address / error) — used by the map picker. */
export async function reverseGeocodeDetailed(lat: number, lng: number): Promise<ReverseOutcome> {
  const row = (await invokeGeocode({ op: 'reverse', lat, lng })) as
    | (NominatimRow & { error?: string })
    | null;
  if (!row) return { kind: 'error' };
  // Ocean / no-man's-land: Nominatim responds but with an error / no address.
  if (row.error || !row.address) return { kind: 'no_address' };
  return {
    kind: 'address',
    label: shortLabel(row),
    area: areaLabel(row),
    inBrazil: row.address.country_code === 'br',
  };
}

/** Convenience wrapper: just the label + inBrazil, or null (kept for callers). */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult | null> {
  const outcome = await reverseGeocodeDetailed(lat, lng);
  return outcome.kind === 'address' ? { label: outcome.label, inBrazil: outcome.inBrazil } : null;
}
