import { describe, expect, it } from "vitest";
import { faltanParaSiguiente, nivelPorPuntos, progresoNivel, siguienteNivel } from "./format";

const niveles = [
  { id: "bronce", nombre: "Bronce", desde: 0, hasta: 49999, color: "#a", beneficios: [] },
  { id: "plata", nombre: "Plata", desde: 50000, hasta: 149999, color: "#b", beneficios: [] },
  { id: "oro", nombre: "Oro", desde: 150000, hasta: null, color: "#c", beneficios: [] },
] as any[];

describe("niveles", () => {
  it("el nivel cambia exactamente en el umbral", () => {
    expect(nivelPorPuntos(niveles, 0).id).toBe("bronce");
    expect(nivelPorPuntos(niveles, 49999).id).toBe("bronce");
    expect(nivelPorPuntos(niveles, 50000).id).toBe("plata");
    expect(nivelPorPuntos(niveles, 999999).id).toBe("oro");
  });

  it("siguiente nivel y puntos que faltan", () => {
    expect(siguienteNivel(niveles, 60000)?.id).toBe("oro");
    expect(siguienteNivel(niveles, 200000)).toBeNull();
    expect(faltanParaSiguiente(niveles, 60000)).toBe(90000);
    expect(faltanParaSiguiente(niveles, 200000)).toBe(0);
  });

  it("el progreso va de 0 a 100 dentro del nivel", () => {
    expect(progresoNivel(niveles, 50000)).toBe(0);
    expect(progresoNivel(niveles, 100000)).toBe(50);
    expect(progresoNivel(niveles, 200000)).toBe(100);
  });
});