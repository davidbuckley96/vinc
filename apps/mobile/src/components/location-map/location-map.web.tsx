import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { MAP_STYLE_URL, type LocationMapProps } from './config';

/** Web implementation: maplibre-gl rendering into a plain div. */
export function LocationMap({
  lat,
  lng,
  zoom,
  interactive = false,
  onCenterChange,
  style,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const centerChangeRef = useRef(onCenterChange);
  centerChangeRef.current = onCenterChange;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [lng, lat],
      zoom,
      interactive,
      attributionControl: { compact: true },
    });
    map.on('moveend', () => {
      const center = map.getCenter();
      centerChangeRef.current?.(center.lat, center.lng);
    });
    mapRef.current = map;
    return () => {
      mapRef.current = null;
      map.remove();
    };
    // The map is created once; later prop changes go through jumpTo below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    // Only recenter on EXTERNAL changes (e.g. a search pick) — the user
    // dragging reports this same center back, and jumping would fight them.
    if (Math.abs(center.lat - lat) > 1e-7 || Math.abs(center.lng - lng) > 1e-7) {
      map.jumpTo({ center: [lng, lat], zoom });
    }
  }, [lat, lng, zoom]);

  return (
    <View style={style}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
