import { describe, expect, it } from "vitest";
import { estadoRealCupon, vencimientoMs } from "./cupon-estado";

const ahora = new Date(2026, 10, 16, 12, 0).getTime();

describe("vencimientoMs", () => {
  it("lee fecha y hora", () => expect(vencimientoMs("16/11/2026 13:30")).toBe(new Date(2026, 10, 16, 13, 30).getTime()));
  it("sin hora vale hasta el final del día", () => expect(vencimientoMs("16/11/2026")).toBe(new Date(2026, 10, 16, 23, 59).getTime()));
  it("texto ilegible → 0", () => expect(vencimientoMs("mañana")).toBe(0));
});

describe("estadoRealCupon", () => {
  it("activo con hora futura sigue activo", () => expect(estadoRealCupon("activo", "16/11/2026 13:00", ahora)).toBe("activo"));
  it("activo cuya hora pasó ya está vencido", () => expect(estadoRealCupon("activo", "16/11/2026 11:59", ahora)).toBe("vencido"));
  it("cambia a vencido al cruzar la hora, sin recargar", () => {
    const vence = "16/11/2026 12:30";
    expect(estadoRealCupon("activo", vence, ahora)).toBe("activo");
    expect(estadoRealCupon("activo", vence, ahora + 31 * 60000)).toBe("vencido");
  });
  it("un cupón usado sigue usado aunque haya vencido", () => expect(estadoRealCupon("usado", "01/01/2026 10:00", ahora)).toBe("usado"));
  it("vencido guardado sigue vencido", () => expect(estadoRealCupon("vencido", "31/12/2030", ahora)).toBe("vencido"));
});
