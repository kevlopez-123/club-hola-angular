import { describe, expect, it } from "vitest";
import { limpiarNumeroDocumento, ofuscarDocumento, validarNumeroDocumento } from "./documento";

describe("ofuscarDocumento", () => {
  it("deja solo los 4 últimos caracteres", () => {
    expect(ofuscarDocumento("41234567")).toBe("****4567");
    expect(ofuscarDocumento("0923456781")).toBe("******6781");
  });
  it("no revela nada si es muy corto o está vacío", () => {
    expect(ofuscarDocumento("")).toBe("");
    expect(ofuscarDocumento(undefined)).toBe("");
    expect(ofuscarDocumento("123")).toBe("****123");
  });
});

describe("número de documento según su tipo", () => {
  const dni = { label: "DNI", digitos: 8, numerico: true };
  const pasaporte = { label: "Pasaporte", digitos: 12, numerico: false };
  const otro = { label: "Otro documento", digitos: 15, numerico: false };

  it("DNI: exactamente 8 dígitos", () => {
    expect(validarNumeroDocumento(dni, "41234567")).toBe("");
    expect(validarNumeroDocumento(dni, "4123456")).toMatch(/debe tener 8 dígitos/);
    expect(validarNumeroDocumento(dni, "412345678")).toMatch(/debe tener 8 dígitos/);
    expect(validarNumeroDocumento(dni, "4123456A")).toMatch(/solo números/);
  });
  it("los no numéricos aceptan de 6 al máximo, solo letras y números", () => {
    expect(validarNumeroDocumento(pasaporte, "AB123456")).toBe("");
    expect(validarNumeroDocumento(pasaporte, "AB12")).toMatch(/de 6 a 12 caracteres/);
    expect(validarNumeroDocumento(pasaporte, "AB1234567890X")).toMatch(/de 6 a 12 caracteres/);
    expect(validarNumeroDocumento(otro, "AB-123456")).toMatch(/solo letras y números/);
  });
  it("vacío o sin tipo", () => {
    expect(validarNumeroDocumento(dni, "  ")).toMatch(/Ingresa/);
    expect(validarNumeroDocumento(undefined, "123")).toMatch(/Elige/);
  });
  it("limpia lo que se escribe según el tipo y corta al largo", () => {
    expect(limpiarNumeroDocumento(dni, "41a2-34567 89")).toBe("41234567");
    expect(limpiarNumeroDocumento(pasaporte, "ab-12 3456")).toBe("AB123456");
    expect(limpiarNumeroDocumento(otro, "x".repeat(20))).toBe("X".repeat(15));
  });
});
