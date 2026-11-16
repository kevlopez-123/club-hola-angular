import { beforeEach, describe, expect, it } from "vitest";
import { OTP_ESPERA_MS, OTP_VIDA_MS, emitirOtp, reiniciarOtp, verificarOtp } from "./otp";

const T0 = 1_000_000;
const fijo = (c: string) => () => c;
const mensaje = (f: () => void) => {
  try {
    f();
    return "";
  } catch (e) {
    return (e as Error).message;
  }
};
const falla = () => mensaje(() => verificarOtp("000000", T0));

describe("código de ingreso", () => {
  beforeEach(reiniciarOtp);

  it("sin pedir código no se puede verificar", () => {
    expect(mensaje(() => verificarOtp("123456", T0))).toMatch(/Primero pide/);
  });
  it("el código correcto entra y se consume (no sirve dos veces)", () => {
    emitirOtp(T0, fijo("111111"));
    expect(mensaje(() => verificarOtp("111111", T0 + 1000))).toBe("");
    expect(mensaje(() => verificarOtp("111111", T0 + 2000))).toMatch(/Primero pide/);
  });
  it("uno incorrecto dice cuántos intentos quedan y a los 5 se invalida", () => {
    emitirOtp(T0, fijo("111111"));
    expect(falla()).toBe("Código incorrecto. Te quedan 4 intentos.");
    falla();
    falla();
    expect(falla()).toBe("Código incorrecto. Te queda 1 intento.");
    expect(falla()).toMatch(/Superaste los intentos/);
    expect(mensaje(() => verificarOtp("111111", T0))).toMatch(/Primero pide/);
  });
  it("vence a los 10 minutos", () => {
    emitirOtp(T0, fijo("111111"));
    expect(mensaje(() => verificarOtp("111111", T0 + OTP_VIDA_MS + 1))).toMatch(/venció/);
  });
  it("hay que esperar 30 s para pedir otro y el nuevo reemplaza al anterior", () => {
    emitirOtp(T0, fijo("111111"));
    expect(mensaje(() => emitirOtp(T0 + 10_000, fijo("222222")))).toBe("Espera 20 s para pedir otro código.");
    emitirOtp(T0 + OTP_ESPERA_MS, fijo("222222"));
    expect(mensaje(() => verificarOtp("111111", T0 + OTP_ESPERA_MS))).toMatch(/incorrecto/);
    expect(mensaje(() => verificarOtp("222222", T0 + OTP_ESPERA_MS))).toBe("");
  });
});
