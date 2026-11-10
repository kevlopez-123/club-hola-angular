import { describe, expect, it } from "vitest";
import { errorLargo, errorLargosFila, LIMITES } from "./limites";

describe("límites de caracteres", () => {
  it("acepta el texto que cabe y rechaza el que se pasa", () => {
    expect(errorLargo("a".repeat(LIMITES.nombre), "nombre", "El nombre")).toBe("");
    expect(errorLargo("a".repeat(LIMITES.nombre + 1), "nombre", "El nombre")).toBe(`El nombre no puede tener más de ${LIMITES.nombre} caracteres (tiene ${LIMITES.nombre + 1}).`);
  });
  it("ignora valores que no son texto", () => {
    expect(errorLargo(5, "nombre", "x")).toBe("");
    expect(errorLargo(undefined, "nombre", "x")).toBe("");
  });
  it("revisa los campos conocidos de una fila y deja pasar los demás", () => {
    expect(errorLargosFila({ nombre: "Ok", otro: "x".repeat(5000) })).toBe("");
    expect(errorLargosFila({ nombre: "x".repeat(81) }, "el producto")).toContain("«nombre» de el producto");
    expect(errorLargosFila({ etiqueta: "x".repeat(31) })).toContain("30 caracteres");
    expect(errorLargosFila(null)).toBe("");
  });
});
