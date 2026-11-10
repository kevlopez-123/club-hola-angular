import { describe, expect, it } from "vitest";
import { diferencias } from "./diff";

describe("diferencias", () => {
  it("lista solo los campos que cambian, con su ruta", () => {
    const d = diferencias({ precio: 0.02, min: 500, nivel: { oro: 1 } }, { precio: 0.05, min: 500, nivel: { oro: 2 } });
    expect(d).toEqual([
      { campo: "precio", antes: "0.02", despues: "0.05" },
      { campo: "nivel.oro", antes: "1", despues: "2" },
    ]);
  });
  it("campos nuevos y quitados se marcan con —", () => {
    expect(diferencias({ a: 1 }, { a: 1, b: "x" })).toEqual([{ campo: "b", antes: "—", despues: "x" }]);
    expect(diferencias({ a: 1, b: 2 }, { a: 1 })).toEqual([{ campo: "b", antes: "2", despues: "—" }]);
  });
  it("una creación (sin antes) y una eliminación (sin después) muestran todos los campos", () => {
    expect(diferencias(undefined, { nombre: "X", activo: true })).toEqual([
      { campo: "nombre", antes: "—", despues: "X" },
      { campo: "activo", antes: "—", despues: "Sí" },
    ]);
    expect(diferencias({ nombre: "X" }, undefined)).toEqual([{ campo: "nombre", antes: "X", despues: "—" }]);
  });
  it("listas simples se comparan completas; listas de objetos, elemento a elemento", () => {
    expect(diferencias({ paquetes: [1, 2] }, { paquetes: [1, 2, 3] })).toEqual([{ campo: "paquetes", antes: "1, 2", despues: "1, 2, 3" }]);
    expect(diferencias({ n: [{ v: 1 }, { v: 2 }] }, { n: [{ v: 1 }, { v: 9 }] })).toEqual([{ campo: "n[1].v", antes: "2", despues: "9" }]);
  });
  it("sin cambios no devuelve nada", () => {
    expect(diferencias({ a: { b: [1] } }, { a: { b: [1] } })).toEqual([]);
  });
});