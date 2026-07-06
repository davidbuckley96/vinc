import { useMemo, useRef } from 'react';
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
  style,
}: LocationMapProps) {
  const webviewRef = useRef<WebView>(null);
  const lastSent = useRef({ lat, lng });

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
  });
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

  // External recenter (search pick): push into the WebView.
  if (Math.abs(lastSent.current.lat - lat) > 1e-7 || Math.abs(lastSent.current.lng - lng) > 1e-7) {
    lastSent.current = { lat, lng };
    webviewRef.current?.postMessage(JSON.stringify({ jumpTo: { lat, lng, zoom } }));
  }

  return (
    <View style={style}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as { lat: number; lng: number };
            lastSent.current = { lat: data.lat, lng: data.lng };
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
