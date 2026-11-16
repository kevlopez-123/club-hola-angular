import { describe, expect, it } from "vitest";
import { SESION_INACTIVIDAD_MS, cerrarSesion, cerrarTodasLasSesiones, nuevaSesion, usarSesion, type Sesion } from "./sesiones";

const T0 = 5_000_000;

describe("sesiones del participante", () => {
  it("una sesión nueva está vigente y usarla la renueva", () => {
    const l: Sesion[] = [];
    const s = nuevaSesion(l, "Chrome en Windows", T0, "a1");
    expect(usarSesion(l, s.id, T0 + 1000)).toBe(true);
    expect(l[0]!.ultimoUso).toBe(T0 + 1000);
  });
  it("con uso frecuente nunca vence, aunque pasen más de 30 días en total", () => {
    const l: Sesion[] = [];
    nuevaSesion(l, "Chrome", T0, "a1");
    let t = T0;
    for (let i = 0; i < 5; i++) {
      t += SESION_INACTIVIDAD_MS - 1000;
      expect(usarSesion(l, "a1", t)).toBe(true);
    }
  });
  it("sin usarse 30 días vence y se elimina", () => {
    const l: Sesion[] = [];
    nuevaSesion(l, "Chrome", T0, "a1");
    expect(usarSesion(l, "a1", T0 + SESION_INACTIVIDAD_MS + 1)).toBe(false);
    expect(l).toHaveLength(0);
  });
  it("una sesión desconocida no vale", () => {
    expect(usarSesion([], "nada", T0)).toBe(false);
  });
  it("cerrar una deja las demás; cerrar todas las quita todas", () => {
    const l: Sesion[] = [];
    nuevaSesion(l, "Chrome", T0, "a1");
    nuevaSesion(l, "iPhone", T0, "a2");
    cerrarSesion(l, "a1");
    expect(l.map((s) => s.id)).toEqual(["a2"]);
    cerrarTodasLasSesiones(l);
    expect(l).toHaveLength(0);
  });
});
