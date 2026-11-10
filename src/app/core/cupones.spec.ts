import { describe, expect, it } from "vitest";
import { agregarMeses, disponibleEn, errorReglasBeneficio, estadoVigencia, evaluarCanje, listaTexto, reglaDe } from "./cupones";

const t = (iso: string) => new Date(`${iso}T12:00:00`).getTime();

describe("vigencia del beneficio", () => {
  it("es programado antes de la fecha de inicio, vigente dentro (extremos incluidos) y vencido después", () => {
    const b = { desde: "2026-11-10", hasta: "2026-11-20" };
    expect(estadoVigencia(b, "2026-11-09")).toBe("programado");
    expect(estadoVigencia(b, "2026-11-10")).toBe("vigente");
    expect(estadoVigencia(b, "2026-11-20")).toBe("vigente");
    expect(estadoVigencia(b, "2026-11-21")).toBe("vencido");
  });
  it("sin fechas siempre está vigente; con una sola, solo limita ese lado", () => {
    expect(estadoVigencia({}, "2030-01-01")).toBe("vigente");
    expect(estadoVigencia({ hasta: "2026-01-01" }, "2026-02-01")).toBe("vencido");
    expect(estadoVigencia({ desde: "2027-01-01" }, "2026-02-01")).toBe("programado");
  });
});

describe("regla del cupón", () => {
  it("la regla propia manda sobre la general, campo por campo", () => {
    const general = { horas: 3, limite: 0, meses: 3 };
    expect(reglaDe(undefined, general)).toEqual({ horas: 3, limite: 0, meses: 3 });
    expect(reglaDe({ horas: 24, limite: 1 }, general)).toEqual({ horas: 24, limite: 1, meses: 3 });
    expect(reglaDe({ meses: 6 }, { horas: 5, limite: 2 })).toEqual({ horas: 5, limite: 2, meses: 6 });
  });
  it("suma meses de calendario sin pasarse de fin de mes", () => {
    const r = new Date(agregarMeses(new Date(2026, 0, 31, 10).getTime(), 1));
    expect([r.getFullYear(), r.getMonth(), r.getDate()]).toEqual([2026, 1, 28]);
    const s = new Date(agregarMeses(new Date(2026, 10, 9, 10).getTime(), 3));
    expect([s.getFullYear(), s.getMonth(), s.getDate()]).toEqual([2027, 1, 9]);
  });
});

describe("límite de canjes y espera desde el último canje", () => {
  const regla = { horas: 24, limite: 1, meses: 3 };
  it("sin límite siempre se puede canjear", () => {
    expect(evaluarCanje([t("2026-01-01"), t("2026-01-02")], { horas: 3, limite: 0, meses: 3 }, t("2026-01-03")).permitido).toBe(true);
  });
  it("límite 1: tras canjear, queda bloqueado 3 meses desde ese canje", () => {
    const e = evaluarCanje([t("2026-11-09")], regla, t("2026-11-10"));
    expect(e.permitido).toBe(false);
    expect(new Date(e.hasta!).toISOString().slice(0, 10)).toBe("2027-02-09");
    expect(evaluarCanje([t("2026-11-09")], regla, t("2027-02-08")).permitido).toBe(false);
    expect(evaluarCanje([t("2026-11-09")], regla, t("2027-02-10")).permitido).toBe(true);
  });
  it("sin canjes se puede canjear y quedan los canjes del límite", () => {
    expect(evaluarCanje([], regla, t("2026-11-09"))).toEqual({ permitido: true, canjeados: 0, restantes: 1 });
  });
  it("límite 2: el segundo canje se puede hacer cuando se quiera y la espera cuenta desde el segundo", () => {
    const r2 = { horas: 24, limite: 2, meses: 3 };
    const uno = evaluarCanje([t("2026-01-10")], r2, t("2026-01-11"));
    expect(uno).toEqual({ permitido: true, canjeados: 1, restantes: 1 });
    const dos = evaluarCanje([t("2026-01-10"), t("2026-02-20")], r2, t("2026-03-01"));
    expect(dos.permitido).toBe(false);
    expect(new Date(dos.hasta!).toISOString().slice(0, 10)).toBe("2026-05-20"); // 3 meses desde el último, no desde el primero
  });
  it("pasada la espera empieza un ciclo nuevo", () => {
    const e = evaluarCanje([t("2026-01-10"), t("2026-06-01")], regla, t("2026-06-02"));
    expect(e.permitido).toBe(false); // el segundo canje (junio) abrió otra espera
    expect(evaluarCanje([t("2026-01-10")], regla, t("2026-06-02"))).toEqual({ permitido: true, canjeados: 0, restantes: 1 });
  });
});

describe("provincias del beneficio", () => {
  it("lista vacía es todo el país; con lista depende de la provincia (sin tildes ni mayúsculas)", () => {
    expect(disponibleEn([], "Guayas")).toBe("si");
    expect(disponibleEn(undefined, undefined)).toBe("si");
    expect(disponibleEn(["Pichincha", "Guayas"], "guayas")).toBe("si");
    expect(disponibleEn(["Pichincha"], "Guayas")).toBe("no");
    expect(disponibleEn(["Pichincha"], undefined)).toBe("desconocida");
    expect(disponibleEn(["Los Ríos"], "Los Rios")).toBe("si");
  });
  it("arma el texto de la lista", () => {
    expect(listaTexto(["Pichincha"])).toBe("Pichincha");
    expect(listaTexto(["Pichincha", "Guayas", "Azuay"])).toBe("Pichincha, Guayas y Azuay");
  });
});

describe("validación de las reglas", () => {
  it("fechas coherentes", () => {
    expect(errorReglasBeneficio({ desde: "2026-11-10", hasta: "2026-11-01" })).toContain("anterior");
    expect(errorReglasBeneficio({ desde: "10/11/2026" })).toContain("inicio");
    expect(errorReglasBeneficio({ desde: "2026-11-01", hasta: "2026-11-01" })).toBe("");
  });
  it("cupón: horas, límite y meses dentro de rango", () => {
    expect(errorReglasBeneficio({ cupon: { horas: 0 } })).toContain("horas");
    expect(errorReglasBeneficio({ cupon: { limite: -1 } })).toContain("límite");
    expect(errorReglasBeneficio({ cupon: { meses: 0 } })).toContain("meses");
    expect(errorReglasBeneficio({ cupon: { horas: 24, limite: 1, meses: 3 } })).toBe("");
  });
  it("código compartido: obligatorio, sin espacios, con máximo de usos entero", () => {
    expect(errorReglasBeneficio({ modoCodigo: "compartido" })).toContain("código compartido");
    expect(errorReglasBeneficio({ modoCodigo: "compartido", codigoCompartido: "A B" })).toContain("espacios");
    expect(errorReglasBeneficio({ modoCodigo: "compartido", codigoCompartido: "PROMO20", usosMaximos: 1.5 })).toContain("máximo");
    expect(errorReglasBeneficio({ modoCodigo: "compartido", codigoCompartido: "PROMO20", usosMaximos: 0 })).toBe("");
  });
  it("provincias: solo las de la lista oficial", () => {
    expect(errorReglasBeneficio({ provincias: ["Narnia"] }, ["Pichincha"])).toContain("Narnia");
    expect(errorReglasBeneficio({ provincias: ["Pichincha"] }, ["Pichincha"])).toBe("");
  });
});
