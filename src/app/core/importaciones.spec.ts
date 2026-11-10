import { describe, expect, it } from "vitest";
import { filasReporteErrores } from "./importaciones";

describe("reporte de errores de importación", () => {
  it("lleva fila, motivo y los datos originales en las columnas del archivo", () => {
    const f = filasReporteErrores(["documento", "nombre"], [{ fila: 3, motivo: "Documento inválido", datos: ["17182", "Mónica"] }]);
    expect(f[0]).toEqual(["fila", "motivo", "documento", "nombre"]);
    expect(f[1]).toEqual([3, "Documento inválido", "17182", "Mónica"]);
  });
  it("completa con vacío los datos que faltan y no falla sin errores", () => {
    expect(filasReporteErrores(["a", "b", "c"], [{ fila: "—", motivo: "m", datos: ["x"] }])[1]).toEqual(["—", "m", "x", "", ""]);
    expect(filasReporteErrores(["a"], [])).toEqual([["fila", "motivo", "a"]]);
  });
});