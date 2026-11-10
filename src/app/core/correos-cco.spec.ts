import { describe, expect, it } from "vitest";
import { AJUSTES_BASE, ccoPara, correoValido, type AjustesCorreo } from "./correos";

const con = (c: Partial<AjustesCorreo["cco"]>): AjustesCorreo => ({ cco: { ...AJUSTES_BASE.cco, activo: true, direcciones: ["audit@banco.com", "archivo@banco.com"], ...c } });

describe("copia oculta (CCO)", () => {
  it("apagada o sin ajustes no copia a nadie", () => {
    expect(ccoPara(undefined, "sistema", "ana@x.com")).toEqual([]);
    expect(ccoPara(AJUSTES_BASE, "sistema", "ana@x.com")).toEqual([]);
    expect(ccoPara(con({ activo: false }), "sistema", "ana@x.com")).toEqual([]);
  });
  it("respeta a qué tipo de correo aplica", () => {
    expect(ccoPara(con({ campanas: false }), "campana", "ana@x.com")).toEqual([]);
    expect(ccoPara(con({ campanas: false }), "sistema", "ana@x.com")).toHaveLength(2);
    expect(ccoPara(con({ sistema: false }), "sistema", "ana@x.com")).toEqual([]);
  });
  it("no repite al destinatario aunque cambie mayúsculas", () => {
    expect(ccoPara(con({}), "sistema", "AUDIT@banco.com")).toEqual(["archivo@banco.com"]);
  });
  it("valida direcciones", () => {
    for (const ok of ["a@b.co", "auditoria@banco.com", " x.y@dom.ec "]) expect(correoValido(ok), ok).toBe(true);
    for (const mal of ["", "sin-arroba", "a@b", "a b@c.com", "a@b.c", "a@b.com,otra@c.com"]) expect(correoValido(mal), mal).toBe(false);
  });
});

describe("copia oculta por plantilla", () => {
  it("'propio' reemplaza la general, aunque esté apagada", () => {
    const pl = { cco: { modo: "propio" as const, direcciones: ["comercial@banco.com"] } };
    expect(ccoPara(AJUSTES_BASE, "sistema", "ana@x.com", pl)).toEqual(["comercial@banco.com"]);
    expect(ccoPara(con({}), "sistema", "ana@x.com", pl)).toEqual(["comercial@banco.com"]);
  });
  it("'ninguno' anula la general; 'global' o sin dato la sigue", () => {
    expect(ccoPara(con({}), "sistema", "ana@x.com", { cco: { modo: "ninguno", direcciones: [] } })).toEqual([]);
    expect(ccoPara(con({}), "sistema", "ana@x.com", { cco: { modo: "global", direcciones: [] } })).toHaveLength(2);
    expect(ccoPara(con({}), "sistema", "ana@x.com", {})).toHaveLength(2);
  });
  it("no repite al destinatario ni deja pasar direcciones inválidas", () => {
    const pl = { cco: { modo: "propio" as const, direcciones: ["ANA@x.com", "mala", "ok@banco.com"] } };
    expect(ccoPara(AJUSTES_BASE, "sistema", "ana@x.com", pl)).toEqual(["ok@banco.com"]);
  });
  it("en campañas no aplica la copia de plantilla", () => {
    expect(ccoPara(AJUSTES_BASE, "campana", "ana@x.com", { cco: { modo: "propio", direcciones: ["comercial@banco.com"] } })).toEqual([]);
  });
});