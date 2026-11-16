import { describe, expect, it } from "vitest";
import { fechaCorta, slideDeEvento, type EventoParaBanner } from "./banner-evento";

const ev = (extra: Partial<EventoParaBanner> = {}): EventoParaBanner => ({ id: "ev1", nombre: "Cena maridaje en Central", tipo: "cenas", imagen: "img/e-cena.jpg", fechaISO: "2026-12-12", lugar: "Central Restaurante", distrito: "Barranco, Lima", ...extra });
const CATS = [{ slug: "cenas", label: "Cenas exclusivas" }];
const HOY = "2026-11-16";

describe("slideDeEvento", () => {
  it("usa la foto del evento, enlaza a su ficha y lleva categoría, nombre, fecha y lugar (sin logo)", () => {
    const s = slideDeEvento({ id: "b1" }, ev(), CATS, HOY)!;
    expect(s.imagen).toBe("img/e-cena.jpg");
    expect(s.to).toBe("/eventos/ev1");
    expect(s.evento).toEqual({ nombre: "Cena maridaje en Central", categoria: "Cenas exclusivas", fecha: "12 dic", lugar: "Central Restaurante · Barranco, Lima" });
    expect(s.beneficio).toBeUndefined();
  });
  it("sin evento, despublicado o ya realizado no hay banner", () => {
    expect(slideDeEvento({ id: "x" }, undefined, CATS, HOY)).toBeNull();
    expect(slideDeEvento({ id: "x" }, ev({ activo: false }), CATS, HOY)).toBeNull();
    expect(slideDeEvento({ id: "x" }, ev({ fechaISO: "2026-11-15" }), CATS, HOY)).toBeNull();
  });
  it("el día del evento todavía se anuncia", () => {
    expect(slideDeEvento({ id: "x" }, ev({ fechaISO: HOY }), CATS, HOY)).not.toBeNull();
  });
  it("si la categoría ya no existe usa su identificador", () => {
    expect(slideDeEvento({ id: "x" }, ev({ tipo: "otra" }), CATS, HOY)!.evento!.categoria).toBe("otra");
  });
});

describe("fechaCorta", () => {
  it("abrevia el mes", () => {
    expect(fechaCorta("2026-12-03")).toBe("3 dic");
    expect(fechaCorta("2026-01-20")).toBe("20 ene");
  });
});
