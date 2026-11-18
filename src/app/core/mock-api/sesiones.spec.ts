import { describe, expect, it } from "vitest";
import { SESION_MAX_DIAS, SESION_MAX_MS, cerrarSesion, cerrarTodasLasSesiones, nuevaSesion, usarSesion, type Sesion } from "./sesiones";

const T0 = 5_000_000;

describe("sesiones del participante", () => {
  it("el tope de la sesión web es de 5 días", () => {
    expect(SESION_MAX_DIAS).toBe(5);
    expect(SESION_MAX_MS).toBe(5 * 24 * 60 * 60_000);
  });
  it("una sesión nueva está vigente y usarla solo anota el último uso", () => {
    const l: Sesion[] = [];
    const s = nuevaSesion(l, "Chrome en Windows", T0, "a1");
    expect(usarSesion(l, s.id, T0 + 1000)).toBe(true);
    expect(l[0]!.ultimoUso).toBe(T0 + 1000);
    expect(l[0]!.creada).toBe(T0);
  });
  it("usarla seguido no la alarga: a los 5 días vence aunque se haya usado hace un momento", () => {
    const l: Sesion[] = [];
    nuevaSesion(l, "Chrome", T0, "a1");
    expect(usarSesion(l, "a1", T0 + SESION_MAX_MS - 1000)).toBe(true);
    expect(usarSesion(l, "a1", T0 + SESION_MAX_MS + 1)).toBe(false);
    expect(l).toHaveLength(0);
  });
  it("antes de los 5 días sigue vigente aunque lleve 4 días sin usarse", () => {
    const l: Sesion[] = [];
    nuevaSesion(l, "Chrome", T0, "a1");
    expect(usarSesion(l, "a1", T0 + 4 * 24 * 60 * 60_000)).toBe(true);
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
