import { describe, expect, it } from "vitest";
import { distanciaKm, textoDistancia } from "./geo";

describe("distanciaKm", () => {
  it("es 0 entre el mismo punto", () => {
    expect(distanciaKm({ lat: -12.12, lng: -77.03 }, { lat: -12.12, lng: -77.03 })).toBe(0);
  });
  it("Miraflores a San Isidro está a unos 3 km", () => {
    const d = distanciaKm({ lat: -12.1219, lng: -77.0297 }, { lat: -12.0977, lng: -77.0365 });
    expect(d).toBeGreaterThan(2.4);
    expect(d).toBeLessThan(3.2);
  });
});

describe("textoDistancia", () => {
  it("usa metros por debajo de 1 km y kilómetros desde ahí", () => {
    expect(textoDistancia(0.45)).toBe("450 m");
    expect(textoDistancia(3.24)).toBe("3,2 km");
    expect(textoDistancia(18.4)).toBe("18 km");
  });
});
