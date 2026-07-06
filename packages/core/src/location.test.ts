import { describe, expect, it } from "vitest";

import {
  APPROX_MAX_METERS,
  APPROX_MIN_METERS,
  approximateLocation,
  boundingBox,
  deriveAreaLabel,
  distanceMeters,
  formatDistanceLabel,
  GENERIC_AREA_LABEL,
} from "./location";

describe("deriveAreaLabel", () => {
  it("keeps only the area part of a geocoder label", () => {
    expect(deriveAreaLabel("Rua das Flores, 120 — Boa Vista, Recife")).toBe(
      "Boa Vista, Recife",
    );
  });

  it("never leaks the street when there is no area part", () => {
    expect(deriveAreaLabel("Rua das Flores, 120")).toBe(GENERIC_AREA_LABEL);
    expect(deriveAreaLabel("Ponto marcado no mapa")).toBe(GENERIC_AREA_LABEL);
    expect(deriveAreaLabel("")).toBe(GENERIC_AREA_LABEL);
  });

  it("ignores a dangling separator", () => {
    expect(deriveAreaLabel("Rua das Flores, 120 —  ")).toBe(GENERIC_AREA_LABEL);
  });
});

describe("distanceMeters", () => {
  it("measures a known pair (Recife → Olinda ≈ 6.2 km)", () => {
    const d = distanceMeters({ lat: -8.0578, lng: -34.8829 }, { lat: -8.0089, lng: -34.8553 });
    expect(d).toBeGreaterThan(5500);
    expect(d).toBeLessThan(7000);
  });

  it("is zero for the same point", () => {
    expect(distanceMeters({ lat: -8, lng: -34 }, { lat: -8, lng: -34 })).toBe(0);
  });
});

describe("boundingBox", () => {
  it("contains every point within the radius", () => {
    const center = { lat: -8.05, lng: -34.9 };
    const box = boundingBox(center, 30);
    const inside = { lat: -8.05 + 29 / 111.32, lng: -34.9 };
    expect(inside.lat).toBeLessThanOrEqual(box.maxLat);
    expect(inside.lat).toBeGreaterThanOrEqual(box.minLat);
    expect(box.maxLng).toBeGreaterThan(box.minLng);
  });
});

describe("formatDistanceLabel", () => {
  it("shows meters below 1000 m and km from 1000 m on (David's rule)", () => {
    expect(formatDistanceLabel(80)).toBe("≈ 100 m");
    expect(formatDistanceLabel(840)).toBe("≈ 850 m");
    expect(formatDistanceLabel(990)).toBe("≈ 950 m");
    expect(formatDistanceLabel(1000)).toBe("≈ 1 km");
    expect(formatDistanceLabel(1400)).toBe("≈ 1 km");
    expect(formatDistanceLabel(3200)).toBe("≈ 3 km");
  });
});

describe("approximateLocation", () => {
  it("always offsets the pin by 250–600 m", () => {
    const lat = -8.0632;
    const lng = -34.8711;
    for (let index = 0; index < 200; index += 1) {
      const approx = approximateLocation(lat, lng);
      const dLat = (approx.lat - lat) * 111_320;
      const dLng = (approx.lng - lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
      const distance = Math.hypot(dLat, dLng);
      expect(distance).toBeGreaterThanOrEqual(APPROX_MIN_METERS - 1);
      expect(distance).toBeLessThanOrEqual(APPROX_MAX_METERS + 1);
    }
  });
});
