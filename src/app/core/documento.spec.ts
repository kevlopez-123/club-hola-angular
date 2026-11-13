import { describe, expect, it } from "vitest";
import { ofuscarDocumento } from "./documento";

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
