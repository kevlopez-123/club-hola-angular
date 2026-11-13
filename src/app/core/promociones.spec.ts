import { describe, expect, it } from "vitest";
import { hojasPromociones, promocionesCompletas } from "./promociones";

const beneficios = [
  { id: "b1", marca: "Bembos", nombre: "2x1 en hamburguesas", categoria: "Restaurante", descuento: "2x1", tipo: "cupon", activo: true, terminos: "Válido de lunes a jueves.", hasta: "2099-12-31", cupon: { horas: 24, limite: 1, meses: 3 } },
  { id: "b2", marca: "Bembos", nombre: "Combo", categoria: "Restaurante", descuento: "20%", tipo: "cupon", activo: false },
];
const marcas = [{ nombre: "Bembos", web: "https://bembos.pe", descripcion: "Hamburguesas" }];
const locales = [
  { id: "l1", marca: "Bembos", nombre: "Bembos Miraflores", direccion: "Av. Larco 345", distrito: "Miraflores", provincia: "Lima", lat: -12.12, lng: -77.03, horario: "11 a 23", telefono: "01 111", activo: true },
  { id: "l2", marca: "Bembos", nombre: "Cerrado", direccion: "x", distrito: "y", provincia: "Lima", lat: 0, lng: 0, activo: false },
];

describe("promocionesCompletas", () => {
  const r = promocionesCompletas(beneficios, marcas, locales, "2026-11-13");
  it("une el beneficio con la marca y solo sus locales activos", () => {
    expect(r[0]!.comercioWeb).toBe("https://bembos.pe");
    expect(r[0]!.locales.map((l) => l.id)).toEqual(["l1"]);
    expect(r[0]!.terminosYCondiciones).toBe("Válido de lunes a jueves.");
  });
  it("calcula el estado y la regla del cupón", () => {
    expect(r[0]!.estado).toBe("vigente");
    expect(r[1]!.estado).toBe("inactivo");
    expect(r[0]!.cupon).toMatchObject({ duracionHoras: 24, limiteCanjesPorPersona: 1, esperaMeses: 3 });
  });
  it("arma el Excel con una fila por beneficio y otra por local", () => {
    const h = hojasPromociones(r);
    expect(h.map((x) => x.nombre)).toEqual(["Promociones", "Locales"]);
    expect(h[0]!.filas.length).toBe(3);
    expect(h[1]!.filas.length).toBe(1 + 2); // un local activo por cada uno de los 2 beneficios de la marca
  });
});
