import { afterEach, describe, expect, it, vi } from "vitest";
import { salirSinGuardar } from "./salir-sin-guardar.guard";

const salir = (sucio: boolean) => salirSinGuardar({ sucio: () => sucio }, null as never, null as never, null as never);

describe("salirSinGuardar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sin cambios deja salir sin preguntar", () => {
    const confirmar = vi.fn(() => false);
    vi.stubGlobal("window", { confirm: confirmar });
    expect(salir(false)).toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
  });
  it("con cambios pregunta y respeta la respuesta", () => {
    vi.stubGlobal("window", { confirm: vi.fn(() => false) });
    expect(salir(true)).toBe(false);
    vi.stubGlobal("window", { confirm: vi.fn(() => true) });
    expect(salir(true)).toBe(true);
  });
});
