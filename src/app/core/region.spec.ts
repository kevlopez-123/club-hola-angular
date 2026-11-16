import { describe, expect, it } from "vitest";
import { regionInicial } from "./region";

const DISPONIBLES = ["Arequipa", "Cusco", "La Libertad", "Lima"];

describe("regionInicial", () => {
  it("usa el departamento del perfil", () => {
    expect(regionInicial("Cusco", [], DISPONIBLES)).toBe("Cusco");
  });
  it("no distingue mayúsculas ni tildes y devuelve el nombre de la lista", () => {
    expect(regionInicial("  AREQUIPA ", [], DISPONIBLES)).toBe("Arequipa");
    expect(regionInicial("ancash", [], ["Áncash", "Lima"])).toBe("Áncash");
  });
  it("si el perfil no tiene establecimientos, prueba con sus direcciones guardadas", () => {
    expect(regionInicial("Tumbes", [{ provincia: "Piura" }, { provincia: "Arequipa" }], DISPONIBLES)).toBe("Arequipa");
  });
  it("sin perfil ni direcciones útiles, todo el país", () => {
    expect(regionInicial(undefined, [], DISPONIBLES)).toBe("");
    expect(regionInicial("Tumbes", [{ provincia: undefined }, {}], DISPONIBLES)).toBe("");
    expect(regionInicial("Lima", [], [])).toBe("");
  });
});
