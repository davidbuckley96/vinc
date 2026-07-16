import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BRAZIL_CENTER, MAP_STYLE_URL, type LocationMapProps } from './config';

/**
 * A5 (docs/13): a non-finite lat/lng/zoom would be interpolated into the map
 * HTML as `center: [NaN, NaN]` and silently break the WebView with no error
 * crossing the bridge. Fall back to the Brazil overview so the map still shows.
 */
function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

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
  marker = false,
  style,
}: LocationMapProps) {
  // Sanitize before anything reaches the map HTML (A5, docs/13).
  const safeLat = finiteOr(lat, BRAZIL_CENTER.lat);
  const safeLng = finiteOr(lng, BRAZIL_CENTER.lng);
  const safeZoom = finiteOr(zoom, BRAZIL_CENTER.zoom);

  const webviewRef = useRef<WebView>(null);
  // Last center we PUSHED into the map from props. Kept separate from wherever
  // the user has panned to — otherwise a parent re-render would compare the
  // prop against the user's panned center and "recenter" back, snapping the
  // map on every drag (V-01: only the gig view had this, since it has no
  // onCenterChange to keep the prop in sync). Only a real prop change
  // (a search pick) recenters now.
  const lastPushed = useRef({ lat: safeLat, lng: safeLng });

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
    center: [${safeLng}, ${safeLat}],
    zoom: ${safeZoom},
    interactive: ${interactive},
    attributionControl: { compact: true }
  });
  ${marker ? `new maplibregl.Marker({ color: '#7C3AED' }).setLngLat([${safeLng}, ${safeLat}]).addTo(map);` : ''}
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
      Math.abs(lastPushed.current.lat - safeLat) < 1e-7 &&
      Math.abs(lastPushed.current.lng - safeLng) < 1e-7
    ) {
      return;
    }
    lastPushed.current = { lat: safeLat, lng: safeLng };
    webviewRef.current?.postMessage(
      JSON.stringify({ jumpTo: { lat: safeLat, lng: safeLng, zoom: safeZoom } }),
    );
  }, [safeLat, safeLng, safeZoom]);

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
            if (onCenterChange) {
              // Picker mode (G-03): the parent mirrors this panned center back
              // into the lat/lng props. Record it as the last pushed center so
              // that mirrored prop update is seen as already-applied — otherwise
              // the recenter effect re-pushes it with the prop's zoom and the
              // map's zoom/pin snaps back after every drag/search. The gig view
              // has NO onCenterChange (its props stay put), so we must NOT touch
              // lastPushed there, or a re-render would snap it back to the
              // original center (V-01). Mirrors the web version, which reads the
              // live map center instead of tracking it in a ref.
              lastPushed.current = { lat: data.lat, lng: data.lng };
              onCenterChange(data.lat, data.lng);
            }
          } catch {
            // ignore malformed messages
          }
        }}
        style={{ flex: 1 }}
      />
    </View>
  );
}
