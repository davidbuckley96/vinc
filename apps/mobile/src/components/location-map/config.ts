/**
 * Map provider configuration (D-023). Everything map-related is isolated
 * in this folder so swapping providers is cheap (docs/03).
 *
 * Tiles: OpenFreeMap (open, keyless) during the MVP; swap MAP_STYLE_URL to
 * a MapTiler style with an own key before launch (pre-launch checklist).
 */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Brazil overview — the picker's starting point before any search. */
export const BRAZIL_CENTER = { lat: -14.235, lng: -51.9253, zoom: 3.4 };

export interface LocationMapProps {
  lat: number;
  lng: number;
  zoom: number;
  /** Picker mode: map can be dragged and reports its center. */
  interactive?: boolean;
  onCenterChange?: (lat: number, lng: number) => void;
  /** Container style (RN). The map fills it. */
  style?: object;
}
