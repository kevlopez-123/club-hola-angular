import { describe, expect, it } from "vitest";
import { aplicarPromo, promoVigente } from "./promo";

const base = { precio: 20 };

describe("promociones", () => {
  it("sin promoción devuelve el artículo tal cual", () => {
    expect(aplicarPromo(base)).toEqual(base);
  });

  it("porcentaje rebaja el precio y conserva el original para tacharlos", () => {
    const r = aplicarPromo({ ...base, promoTipo: "porcentaje", promoValor: 20 }, "2026-06-01");
    expect(r.precio).toBe(16);
    expect(r.precioOriginal).toBe(20);
    expect(r.promoEtiqueta).toBe("-20%");
  });

  it("fuera de vigencia no se aplica", () => {
    const p = { promoTipo: "porcentaje" as const, promoValor: 10, promoDesde: "2026-07-01", promoHasta: "2026-07-31" };
    expect(promoVigente(p, "2026-06-30")).toBe(false);
    expect(promoVigente(p, "2026-07-01")).toBe(true);
    expect(promoVigente(p, "2026-07-31")).toBe(true);
    expect(promoVigente(p, "2026-08-01")).toBe(false);
    expect(aplicarPromo({ ...base, ...p }, "2026-08-01")).toEqual({ ...base, ...p });
  });

  it("un valor 0 o sin tipo no cuenta como promoción", () => {
    expect(promoVigente({ promoTipo: "porcentaje", promoValor: 0 })).toBe(false);
    expect(promoVigente({ promoValor: 10 })).toBe(false);
  });
});