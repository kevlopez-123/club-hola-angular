import { describe, expect, it } from "vitest";
import { COMERCIOS_CUOTAS, CUOTAS_DISPONIBLES, URL_PROGRAMA_CUOTAS, filtrarComercios, tieneDetalleExacto } from "./cuotas-sin-intereses";

const TODOS = { texto: "", categoria: "", cuotas: 0 as const, modalidad: "" as const };

describe("cuotas sin intereses", () => {
  it("tiene los 92 comercios, sin repetidos", () => {
    expect(COMERCIOS_CUOTAS).toHaveLength(92);
    expect(new Set(COMERCIOS_CUOTAS.map((c) => c.nombre)).size).toBe(92);
  });
  it("cada comercio ofrece un número de cuotas válido y tiene logo y categoría", () => {
    for (const c of COMERCIOS_CUOTAS) {
      expect(CUOTAS_DISPONIBLES).toContain(c.cuotas);
      expect(c.logo.startsWith("https://content.banbif.com.pe/")).toBe(true);
      expect(c.categorias.length).toBeGreaterThan(0);
    }
  });
  it("el detalle va a la página del comercio en BanBif o, si no se conoce, a la del programa", () => {
    const ishop = COMERCIOS_CUOTAS.find((c) => c.nombre === "Ishop")!;
    const decameron = COMERCIOS_CUOTAS.find((c) => c.nombre === "Decameron")!;
    expect(ishop.detalle).toBe("https://www.banbif.com.pe/comercio/ishop");
    expect(decameron.detalle).toBe("https://www.banbif.com.pe/comercio/decameron");
    expect(tieneDetalleExacto(ishop)).toBe(true);
    const sinEnlace = COMERCIOS_CUOTAS.find((c) => c.nombre === "Grillcorp")!;
    expect(sinEnlace.detalle).toBe(URL_PROGRAMA_CUOTAS);
  });
  it("filtra por modalidad, cuotas, categoría y texto (sin tildes)", () => {
    expect(filtrarComercios(COMERCIOS_CUOTAS, TODOS)).toHaveLength(92);
    expect(filtrarComercios(COMERCIOS_CUOTAS, { ...TODOS, modalidad: "online" }).map((c) => c.nombre)).toEqual(["BanBifMall"]);
    expect(filtrarComercios(COMERCIOS_CUOTAS, { ...TODOS, cuotas: 18 }).map((c) => c.nombre).sort()).toEqual(["A&M Viajes", "CARATI", "Grillcorp"]);
    expect(filtrarComercios(COMERCIOS_CUOTAS, { ...TODOS, categoria: "Calzado" }).every((c) => c.categorias.includes("Calzado"))).toBe(true);
    expect(filtrarComercios(COMERCIOS_CUOTAS, { ...TODOS, texto: "JOYERIA" }).map((c) => c.nombre)).toContain("Joyería Murguía");
  });
});
