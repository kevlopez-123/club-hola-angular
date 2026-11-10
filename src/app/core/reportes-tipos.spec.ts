import { describe, expect, it } from "vitest";
import { formatear, variacion } from "./reportes-tipos";
import { altaISO } from "./mock-api/reportes-tipos";

describe("formato de indicadores", () => {
  it("números enteros con separador de miles, porcentajes y decimales", () => {
    expect(formatear("n", 1234567)).toBe("1.234.567");
    expect(formatear("n", -48000)).toBe("-48.000");
    expect(formatear("n", 9600)).toBe("9.600"); // los de cuatro cifras también llevan separador
    expect(formatear("pct", 18.14)).toContain("%");
    expect(formatear("dec", 2.25)).toBe((2.25).toLocaleString("es", { maximumFractionDigits: 1 }));
  });
  it("dinero con el símbolo de dólar", () => {
    expect(formatear("usd", 310)).toContain("310");
    expect(formatear("usd", 310)).toContain("$");
  });
});

describe("variación contra el período anterior", () => {
  it("sin comparación (reportes de estado actual) no muestra nada", () => {
    expect(variacion(10, null)).toBe("");
  });
  it("si antes era 0 dice 'nuevo' o 'sin cambio'", () => {
    expect(variacion(5, 0)).toBe("nuevo");
    expect(variacion(0, 0)).toBe("sin cambio");
  });
  it("sube y baja con su signo", () => {
    expect(variacion(150, 100)).toContain("▲ +50");
    expect(variacion(50, 100)).toContain("▼ ");
    expect(variacion(100, 100)).not.toContain("▲");
  });
});

describe("fecha de alta de los participantes", () => {
  it("convierte dd/mm/aaaa a ISO y acepta ISO; lo demás queda vacío", () => {
    expect(altaISO("05/03/2026")).toBe("2026-03-05");
    expect(altaISO("2026-03-05T10:00:00Z")).toBe("2026-03-05");
    expect(altaISO("ayer")).toBe("");
    expect(altaISO(undefined)).toBe("");
  });
});
