import { describe, expect, it } from "vitest";
import { porcentaje, visitasPorPaso, type TipoEvento } from "./analitica";

const v = (...t: TipoEvento[]) => new Set<TipoEvento>(t);

describe("embudo", () => {
  it("cuenta cada visita solo hasta el último paso consecutivo que hizo", () => {
    const n = visitasPorPaso([
      v("ver_item"),
      v("ver_item", "agregar_carrito"),
      v("ver_item", "agregar_carrito", "inicio_pago", "canje"),
      v("canje"), // sin haber visto nada: no cuenta
      v("ver_item", "inicio_pago"), // se saltó el carrito: se corta en el primer paso
    ]);
    expect(n).toEqual([4, 2, 1, 1]);
  });
  it("sin visitas, todo en cero", () => {
    expect(visitasPorPaso([])).toEqual([0, 0, 0, 0]);
  });
  it("porcentaje con un decimal y sin dividir por cero", () => {
    expect(porcentaje(1, 3)).toBe(33.3);
    expect(porcentaje(5, 0)).toBe(0);
  });
});
