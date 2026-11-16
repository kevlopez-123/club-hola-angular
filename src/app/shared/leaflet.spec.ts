import { describe, expect, it } from "vitest";
import { cargarLeaflet } from "./leaflet";

describe("cargarLeaflet", () => {
  it("devuelve Leaflet con sus funciones en la raíz (map, tileLayer, marker)", async () => {
    const L = await cargarLeaflet();
    expect(typeof L.map).toBe("function");
    expect(typeof L.tileLayer).toBe("function");
    expect(typeof L.marker).toBe("function");
  });
});
