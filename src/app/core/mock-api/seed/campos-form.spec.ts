import { describe, expect, it } from "vitest";
import { camposIniciales } from "./admin";

describe("formulario de datos inicial (Perú)", () => {
  it("la ciudad se escribe: no trae opciones de otro país", () => {
    const ciudad = camposIniciales.find((c) => c.mapeo === "ciudad")!;
    expect(ciudad.tipo).toBe("texto");
    expect(JSON.stringify(camposIniciales)).not.toMatch(/Quito|Guayaquil|Cuenca/);
  });
});
