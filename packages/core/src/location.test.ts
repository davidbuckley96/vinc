import { describe, expect, it } from "vitest";

import {
  APPROX_MAX_METERS,
  APPROX_MIN_METERS,
  approximateLocation,
  deriveAreaLabel,
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
