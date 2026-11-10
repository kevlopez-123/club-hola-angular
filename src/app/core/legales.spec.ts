import { describe, expect, it } from "vitest";
import { debeAceptar, diferenciasTexto, resumenDiff, versionEnVigor, versionProgramada, type DocLegal, type VersionLegal } from "./legales";

const v = (version: number, vigenteDesde: string, exigeAceptacion = true): VersionLegal => ({
  version, texto: `t${version}`, intro: "", notas: "n", exigeAceptacion, vigenteDesde, publicadaEl: vigenteDesde, publicadaPor: "x",
});
const doc: DocLegal = { versiones: [v(1, "2026-01-01"), v(2, "2026-06-01"), v(3, "2027-01-01")], borrador: null };

describe("textos legales: versiones", () => {
  it("rige la más nueva cuya fecha ya llegó", () => {
    expect(versionEnVigor(doc, "2026-07-01")?.version).toBe(2);
    expect(versionEnVigor(doc, "2027-01-01")?.version).toBe(3);
    expect(versionEnVigor(doc, "2025-12-31")).toBeUndefined();
  });
  it("la programada es la primera que todavía no llega", () => {
    expect(versionProgramada(doc, "2026-07-01")?.version).toBe(3);
    expect(versionProgramada(doc, "2027-02-01")).toBeUndefined();
  });
});

describe("textos legales: quién debe aceptar", () => {
  const ac = (version: number) => ({ version, fecha: "2026-01-01T00:00:00Z", canal: "Web" });
  it("quien nunca aceptó debe aceptar (primer ingreso)", () => expect(debeAceptar(v(1, "2026-01-01"), undefined)).toBe(true));
  it("quien aceptó una versión anterior NO debe aceptar la nueva: se pide solo en el primer ingreso", () => expect(debeAceptar(v(2, "2026-01-01"), ac(1))).toBe(false));
  it("tampoco si la versión nueva viene marcada como exigente (campo en desuso)", () => expect(debeAceptar(v(3, "2026-01-01", true), ac(1))).toBe(false));
  it("quien ya aceptó la vigente está al día", () => expect(debeAceptar(v(2, "2026-01-01"), ac(2))).toBe(false));
  it("sin versión en vigor no hay nada que aceptar", () => expect(debeAceptar(undefined, undefined)).toBe(false));
});

describe("textos legales: comparación", () => {
  it("marca líneas agregadas y quitadas", () => {
    const d = diferenciasTexto("a\nb\nc", "a\nc\nd");
    expect(resumenDiff(d)).toEqual({ agregadas: 1, quitadas: 1 });
    expect(d.find((x) => x.tipo === "quitada")?.texto).toBe("b");
    expect(d.find((x) => x.tipo === "agregada")?.texto).toBe("d");
  });
  it("textos iguales no tienen diferencias", () => expect(resumenDiff(diferenciasTexto("x\ny", "x\ny"))).toEqual({ agregadas: 0, quitadas: 0 }));
});
