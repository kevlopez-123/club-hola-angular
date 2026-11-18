import { describe, expect, it } from "vitest";
import { alternar, interesesVacios, sanearIntereses } from "./intereses";

describe("intereses", () => {
  it("empiezan vacíos y sin push", () => {
    expect(interesesVacios()).toEqual({ beneficios: [], push: false });
  });
  it("sanea: descarta categorías que no existen, repetidas y valores raros", () => {
    const r = sanearIntereses({ beneficios: ["moda", "moda", "inventada", 3], push: true }, ["moda", "viajes"]);
    expect(r).toEqual({ beneficios: ["moda"], push: true });
  });
  it("una entrada inválida da la lista vacía", () => {
    expect(sanearIntereses(null, ["a"])).toEqual(interesesVacios());
    expect(sanearIntereses({ beneficios: "moda", push: "si" }, ["moda"])).toEqual(interesesVacios());
  });
  it("alterna un slug", () => {
    expect(alternar(["a"], "b")).toEqual(["a", "b"]);
    expect(alternar(["a", "b"], "a")).toEqual(["b"]);
  });
});
