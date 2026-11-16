import { describe, expect, it } from "vitest";
import { nombreDispositivo } from "./dispositivo";

describe("nombreDispositivo", () => {
  it("reconoce navegador y sistema", () => {
    expect(nombreDispositivo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")).toBe("Chrome en Windows");
    expect(nombreDispositivo("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0")).toBe("Edge en Windows");
    expect(nombreDispositivo("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBe("Safari en iPhone");
    expect(nombreDispositivo("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36")).toBe("Chrome en Android");
    expect(nombreDispositivo("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0")).toBe("Firefox en Linux");
  });
  it("si no reconoce nada, un nombre genérico", () => {
    expect(nombreDispositivo("")).toBe("Navegador");
  });
});
