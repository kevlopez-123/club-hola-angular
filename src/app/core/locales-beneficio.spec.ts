import { describe, expect, it } from "vitest";
import { aplicaEnLocal, localesAplicables } from "./locales-beneficio";

const locales = [
  { id: "a1", marca: "A", activo: true },
  { id: "a2", marca: "A", activo: true },
  { id: "a3", marca: "A", activo: false },
  { id: "b1", marca: "B", activo: true },
];

describe("localesAplicables", () => {
  it("sin locales elegidos vale en todos los publicados de la marca", () => {
    expect(localesAplicables({ marca: "A" }, locales).map((l) => l.id)).toEqual(["a1", "a2"]);
    expect(localesAplicables({ marca: "A", localesIds: [] }, locales).map((l) => l.id)).toEqual(["a1", "a2"]);
  });
  it("con locales elegidos vale solo en esos", () => {
    expect(localesAplicables({ marca: "A", localesIds: ["a2"] }, locales).map((l) => l.id)).toEqual(["a2"]);
  });
  it("ignora locales de otra marca y los ocultos", () => {
    expect(localesAplicables({ marca: "A", localesIds: ["a2", "b1", "a3"] }, locales).map((l) => l.id)).toEqual(["a2"]);
  });
  it("si los elegidos ya no existen o están ocultos, vuelve a todos los de la marca", () => {
    expect(localesAplicables({ marca: "A", localesIds: ["a3", "zzz"] }, locales).map((l) => l.id)).toEqual(["a1", "a2"]);
  });
});

describe("aplicaEnLocal", () => {
  it("responde si el beneficio se canjea en ese local", () => {
    const b = { marca: "A", localesIds: ["a1"] };
    expect(aplicaEnLocal(b, locales[0]!, locales)).toBe(true);
    expect(aplicaEnLocal(b, locales[1]!, locales)).toBe(false);
  });
});
