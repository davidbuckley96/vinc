import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { MAP_STYLE_URL, type LocationMapProps } from './config';

/**
 * Native (iOS/Android) implementation: MapLibre inside a WebView — same
 * rendering stack as the web, no native map module (works in Expo Go).
 * Swapping to @maplibre/maplibre-react-native later only touches this file.
 */
export function LocationMap({
  lat,
  lng,
  zoom,
  interactive = false,
  onCenterChange,
  circleMeters,
  marker = false,
  style,
}: LocationMapProps) {
  const webviewRef = useRef<WebView>(null);
  // Last center we PUSHED into the map from props. Kept separate from wherever
  // the user has panned to — otherwise a parent re-render would compare the
  // prop against the user's panned center and "recenter" back, snapping the
  // map on every drag (V-01: only the gig view had this, since it has no
  // onCenterChange to keep the prop in sync). Only a real prop change
  // (a search pick) recenters now.
  const lastPushed = useRef({ lat, lng });

  const html = useMemo(
    () => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css" rel="stylesheet">
<script src="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"></script>
<style>html,body,#map{margin:0;height:100%;width:100%}</style>
</head><body><div id="map"></div><script>
  const map = new maplibregl.Map({
    container: 'map',
    style: ${JSON.stringify(MAP_STYLE_URL)},
    center: [${lng}, ${lat}],
    zoom: ${zoom},
    interactive: ${interactive},
    attributionControl: { compact: true },
    ${
      // The approximate-region view is meant to explore a neighbourhood, not
      // the whole country: clamp the zoom so a stray pinch can't zoom out to a
      // blank country-wide view (V-01). The exact-location view is unclamped.
      circleMeters ? 'minZoom: 11, maxZoom: 18,' : ''
    }
  });
  ${
    circleMeters
      ? `map.on('load', () => {
    if (map.getSource('area')) return; // draw the circle once
    // Polygon approximating a ${circleMeters} m circle anchored at the point,
    // so it stays over the place while the map is panned/zoomed.
    const cx = ${lng}, cy = ${lat}, r = ${circleMeters};
    const coords = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * 2 * Math.PI;
      const dx = (r * Math.cos(a)) / (111320 * Math.cos(cy * Math.PI / 180));
      const dy = (r * Math.sin(a)) / 110540;
      coords.push([cx + dx, cy + dy]);
    }
    map.addSource('area', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } } });
    map.addLayer({ id: 'area-fill', type: 'fill', source: 'area', paint: { 'fill-color': '#7C3AED', 'fill-opacity': 0.16 } });
    map.addLayer({ id: 'area-line', type: 'line', source: 'area', paint: { 'line-color': '#7C3AED', 'line-width': 2 } });
  });`
      : ''
  }
  ${marker ? `new maplibregl.Marker({ color: '#7C3AED' }).setLngLat([${lng}, ${lat}]).addTo(map);` : ''}
  map.on('moveend', () => {
    const c = map.getCenter();
    window.ReactNativeWebView?.postMessage(JSON.stringify({ lat: c.lat, lng: c.lng }));
  });
  document.addEventListener('message', handle);
  window.addEventListener('message', handle);
  function handle(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.jumpTo) map.jumpTo({ center: [data.jumpTo.lng, data.jumpTo.lat], zoom: data.jumpTo.zoom });
    } catch (e) {}
  }
</script></body></html>`,
    // The WebView is created once; recentering goes through postMessage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Recenter ONLY when the incoming coordinates actually change (e.g. a search
  // pick), inside an effect keyed on lat/lng — never as a render-time side
  // effect. A bare re-render must not move the map, or the user's pan is undone.
  useEffect(() => {
    if (
      Math.abs(lastPushed.current.lat - lat) < 1e-7 &&
      Math.abs(lastPushed.current.lng - lng) < 1e-7
    ) {
      return;
    }
    lastPushed.current = { lat, lng };
    webviewRef.current?.postMessage(JSON.stringify({ jumpTo: { lat, lng, zoom } }));
  }, [lat, lng, zoom]);

  return (
    <View style={style}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        // Android: let the map own its pan/pinch instead of the parent
        // container stealing the gesture. No-op on iOS.
        nestedScrollEnabled
        overScrollMode="never"
        // WebGL (MapLibre) inside a WebView needs a hardware layer on Android
        // for smooth pan/zoom — without it the canvas repaints poorly and the
        // gestures feel stuck (V-01 investigation). No-op on iOS.
        androidLayerType="hardware"
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as { lat: number; lng: number };
            // Do NOT touch lastPushed here — that's the user's pan, not a
            // prop-driven recenter (see the ref comment above).
            onCenterChange?.(data.lat, data.lng);
          } catch {
            // ignore malformed messages
          }
        }}
        style={{ flex: 1 }}
      />
    </View>
  );
}
