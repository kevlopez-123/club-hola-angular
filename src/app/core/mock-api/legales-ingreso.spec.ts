import { describe, expect, it } from "vitest";
import { db } from "./db";
import { claveDocumento, pendientesPorDocumento, registrarAceptacionIngreso } from "./legales";

describe("aceptación legal por documento en el ingreso", () => {
  it("un documento que nunca aceptó tiene pendientes los dos textos", () => {
    expect(pendientesPorDocumento(claveDocumento("dni", "70000001")).sort()).toEqual(["privacidad", "terminos"]);
  });
  it("el documento no distingue mayúsculas ni espacios", () => {
    expect(claveDocumento("pasaporte", " ab12345 ")).toBe("pasaporte:AB12345");
  });
  it("al registrar la aceptación deja de estar pendiente y guarda la evidencia", () => {
    const clave = claveDocumento("dni", "70000002");
    registrarAceptacionIngreso(clave, "DNI ****0002", "Chrome en Windows");
    expect(pendientesPorDocumento(clave)).toEqual([]);
    const ac = (db as any).aceptaciones.p1.terminos;
    expect(ac).toMatchObject({ canal: "Web", documento: "DNI ****0002", dispositivo: "Chrome en Windows" });
    expect(typeof ac.version).toBe("number");
    expect(ac.fecha).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it("solo se registra lo que se aceptó: si falta uno, ese sigue pendiente", () => {
    const clave = claveDocumento("dni", "70000004");
    registrarAceptacionIngreso(clave, "DNI ****0004", "Firefox en Linux", ["terminos"]);
    expect(pendientesPorDocumento(clave)).toEqual(["privacidad"]);
  });
  it("otro documento nuevo sigue pendiente aunque este ya aceptó", () => {
    expect(pendientesPorDocumento(claveDocumento("dni", "70000003")).length).toBe(2);
  });
});
