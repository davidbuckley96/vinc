/**
 * Address search / reverse geocoding via Nominatim (OpenStreetMap) —
 * free, keyless (D-023). Fair-use policy: search fires only on submit
 * (no per-keystroke autocomplete) and reverse lookups are debounced by
 * the picker. Failures degrade to a generic label — the pin is what
 * matters; the label is a convenience.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org';
// Nominatim's usage policy requires an identifying User-Agent; requests
// without one can be throttled or blocked.
const UA = 'VincApp/1.0 (marketplace de serviços; contato@vinc.app)';
const HEADERS = { 'Accept-Language': 'pt-BR', 'User-Agent': UA };

export interface GeoResult {
  lat: number;
  lng: number;
  label: string;
}

export interface ReverseResult {
  label: string;
  /** true only when the point resolves to an address inside Brazil. */
  inBrazil: boolean;
}

interface NominatimRow {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
}

/** "Rua das Flores, 120 — Boa Vista, Recife" from a Nominatim row. */
function shortLabel(row: NominatimRow): string {
  const parts = row.address ?? {};
  const road = parts.road ?? parts.pedestrian ?? parts.square ?? row.name ?? '';
  const number = parts.house_number ? `, ${parts.house_number}` : '';
  const area = parts.suburb ?? parts.neighbourhood ?? parts.city_district ?? '';
  const city = parts.city ?? parts.town ?? parts.village ?? parts.municipality ?? '';
  const tail = [area, city].filter(Boolean).join(', ');
  const head = road ? `${road}${number}` : '';
  if (head && tail) return `${head} — ${tail}`;
  return head || tail || row.display_name?.split(',').slice(0, 3).join(',') || 'Local no mapa';
}

export async function searchAddress(query: string): Promise<GeoResult[]> {
  try {
    const response = await fetch(
      `${NOMINATIM}/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(query)}`,
      { headers: HEADERS },
    );
    if (!response.ok) return [];
    const rows = (await response.json()) as NominatimRow[];
    return rows.map((row) => ({
      lat: Number(row.lat),
      lng: Number(row.lon),
      label: shortLabel(row),
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult | null> {
  try {
    const response = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`,
      { headers: HEADERS },
    );
    if (!response.ok) return null;
    const row = (await response.json()) as NominatimRow & { error?: string };
    // Ocean / no-man's-land: Nominatim returns an error and no address.
    if (row.error || !row.address) return null;
    return {
      label: shortLabel(row),
      inBrazil: row.address.country_code === 'br',
    };
  } catch {
    return null;
  }
}
