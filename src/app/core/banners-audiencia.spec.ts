import { describe, expect, it } from "vitest";
import { bannerVisible, ordenarPorAudiencia, textoAudiencia } from "./banners-audiencia";

describe("bannerVisible", () => {
  it("un banner general lo ve cualquiera, también sin sesión", () => {
    expect(bannerVisible({}, { intereses: [] })).toBe(true);
  });
  it("un banner de segmento solo lo ve quien tiene ese nivel", () => {
    const b = { segmentos: ["Oro", "Diamante"] };
    expect(bannerVisible(b, { nivel: "Oro", intereses: [] })).toBe(true);
    expect(bannerVisible(b, { nivel: "Clásico", intereses: [] })).toBe(false);
    expect(bannerVisible(b, { intereses: [] })).toBe(false);
  });
  it("un banner por interés pide que la persona tenga alguno de esos intereses", () => {
    const b = { intereses: ["Entretenimiento"] };
    expect(bannerVisible(b, { nivel: "Plata", intereses: ["entretenimiento"] })).toBe(true);
    expect(bannerVisible(b, { nivel: "Plata", intereses: ["Moda"] })).toBe(false);
  });
  it("si pide nivel e interés, se deben cumplir los dos", () => {
    const b = { segmentos: ["Diamante"], intereses: ["Viajes"] };
    expect(bannerVisible(b, { nivel: "Diamante", intereses: ["Viajes"] })).toBe(true);
    expect(bannerVisible(b, { nivel: "Oro", intereses: ["Viajes"] })).toBe(false);
  });
});

describe("ordenarPorAudiencia", () => {
  it("pone primero los dirigidos y conserva el orden dentro de cada grupo", () => {
    const r = ordenarPorAudiencia([{ id: "a" }, { id: "b", segmentos: ["Oro"] }, { id: "c" }, { id: "d", intereses: ["Moda"] }]);
    expect(r.map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });
});

describe("textoAudiencia", () => {
  it("resume la audiencia", () => {
    expect(textoAudiencia({})).toBe("Todos");
    expect(textoAudiencia({ segmentos: ["Oro", "Diamante"] })).toBe("Oro, Diamante");
    expect(textoAudiencia({ segmentos: ["Oro"], intereses: ["Cine"] })).toBe("Oro · Interés: Cine");
  });
});
