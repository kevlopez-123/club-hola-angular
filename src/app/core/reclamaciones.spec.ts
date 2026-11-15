import { describe, expect, it } from "vitest";
import { hojaReclamacion, reclamacionInicial, validarReclamacion, type Reclamacion } from "./reclamaciones";

const completa = (): Reclamacion => ({
  ...reclamacionInicial(), nombre: "Ana Torres", documento: "41234567", domicilio: "Av. Larco 345, Miraflores, Lima", telefono: "987654321",
  correo: "ana@correo.com", descripcion: "Cupón de descuento", detalle: "No me aceptaron el cupón", pedido: "Que se respete el descuento", conformidad: true,
});

describe("validarReclamacion", () => {
  it("una hoja completa no tiene errores", () => {
    expect(validarReclamacion(completa())).toEqual({});
  });
  it("pide los campos obligatorios y la conformidad", () => {
    const e = validarReclamacion(reclamacionInicial());
    expect(Object.keys(e)).toEqual(expect.arrayContaining(["nombre", "documento", "domicilio", "telefono", "correo", "descripcion", "detalle", "pedido", "conformidad"]));
  });
  it("el DNI lleva 8 dígitos y el correo debe ser válido", () => {
    expect(validarReclamacion({ ...completa(), documento: "123" })["documento"]).toContain("8 dígitos");
    expect(validarReclamacion({ ...completa(), tipoDocumento: "CE", documento: "ABC123" })["documento"]).toBeUndefined();
    expect(validarReclamacion({ ...completa(), correo: "no-es-correo" })["correo"]).toContain("válido");
  });
  it("un menor necesita representante y el monto debe ser numérico", () => {
    expect(validarReclamacion({ ...completa(), menor: true })["representante"]).toBeDefined();
    expect(validarReclamacion({ ...completa(), monto: "12,5" })["monto"]).toBeDefined();
    expect(validarReclamacion({ ...completa(), monto: "12.50" })["monto"]).toBeUndefined();
  });
});

describe("hojaReclamacion", () => {
  it("incluye el número, los datos y el aviso de Indecopi", () => {
    const t = hojaReclamacion(completa(), "000001", "13/11/2026", "Motiva Soluciones S.A.C.");
    expect(t).toContain("HOJA 000001");
    expect(t).toContain("DNI: 41234567");
    expect(t).toContain("Indecopi");
  });
});

import { diasParaVencer, sumarDiasHabiles } from "./reclamaciones";

describe("plazo de respuesta", () => {
  it("suma días hábiles saltando los fines de semana", () => {
    // viernes 13/11/2026 + 1 día hábil = lunes 16/11
    expect(sumarDiasHabiles("2026-11-13", 1)).toBe("2026-11-16");
    // lunes 02/11/2026 + 15 días hábiles = lunes 23/11
    expect(sumarDiasHabiles("2026-11-02", 15)).toBe("2026-11-23");
  });
  it("calcula cuántos días faltan", () => {
    expect(diasParaVencer("2026-11-20", "2026-11-17")).toBe(3);
    expect(diasParaVencer("2026-11-16", "2026-11-17")).toBe(-1);
  });
});
