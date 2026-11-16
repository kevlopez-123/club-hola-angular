import { beforeEach, describe, expect, it } from "vitest";
import { limitar, reiniciarLimites } from "./limite";

const T0 = 10_000;
const intento = (t: number, clave = "a") => {
  try {
    limitar(clave, 3, 60_000, t);
    return "ok";
  } catch (e) {
    return (e as Error).message;
  }
};

describe("limitar consultas", () => {
  beforeEach(reiniciarLimites);

  it("deja pasar hasta el máximo y luego responde 429", () => {
    expect([intento(T0), intento(T0 + 1), intento(T0 + 2)]).toEqual(["ok", "ok", "ok"]);
    expect(intento(T0 + 3)).toBe("Demasiadas consultas. Espera un momento.");
  });
  it("pasada la ventana vuelve a permitir", () => {
    intento(T0);
    intento(T0 + 1);
    intento(T0 + 2);
    expect(intento(T0 + 60_001)).toBe("ok");
  });
  it("cada clave cuenta por separado", () => {
    intento(T0);
    intento(T0 + 1);
    intento(T0 + 2);
    expect(intento(T0 + 3, "b")).toBe("ok");
  });
});
