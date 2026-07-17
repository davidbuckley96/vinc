import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { reverseGeocode } from '@/lib/geocoding';

/**
 * The user's search region (D-029): suggested by GPS, adjustable on the
 * map, persisted on the device. Used ONLY to filter the search — never
 * shown to anyone else.
 */
export interface Region {
  lat: number;
  lng: number;
  /** Human label, e.g. "Boa Vista, Recife". */
  label: string;
  radiusKm: number;
}

// Raio padrão generoso (H-03 / D-074): principalmente no início há poucas vagas,
// então um raio pequeno faria o app parecer "morto". 50 km mostra bastante e o
// usuário ajusta de 10 a 100 km pelo slider na busca.
export const DEFAULT_RADIUS_KM = 50;
export const RADIUS_OPTIONS_KM = [5, 10, 30, 50, 100];
/** Limites do slider de distância na busca (H-03). */
export const MIN_RADIUS_KM = 10;
export const MAX_RADIUS_KM = 100;

const STORAGE_KEY = 'vinc.region';

async function loadRegion(): Promise<Region | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Region>;
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null;
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      label: parsed.label ?? 'Minha região',
      radiusKm: typeof parsed.radiusKm === 'number' ? parsed.radiusKm : DEFAULT_RADIUS_KM,
    };
  } catch {
    return null;
  }
}

/** Persisted region state; null until set (search shows everything). */
export function useRegion() {
  const [region, setRegionState] = useState<Region | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRegion().then((stored) => {
      if (cancelled) return;
      setRegionState(stored);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setRegion = useCallback((next: Region | null) => {
    setRegionState(next);
    if (next) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return { region, setRegion, loaded };
}

export type LocateResult =
  | { ok: true; lat: number; lng: number; label: string }
  | { ok: false; reason: 'denied' | 'unavailable' };

/**
 * Device location → region center (D-029). Denied/unavailable falls back
 * to picking on the map — never a dead end.
 */
export async function locateDevice(): Promise<LocateResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied' };
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude: lat, longitude: lng } = position.coords;
    const label = (await reverseGeocode(lat, lng))?.label ?? 'Minha região';
    return { ok: true, lat, lng, label };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
