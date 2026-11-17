import { describe, expect, it } from "vitest";
import { nivelesDe, sugerenciasDe } from "./ubicaciones";
import { camposIniciales } from "./mock-api/seed/admin";

describe("ubicación en Perú: departamento y distrito", () => {
  it("sugiere los 43 distritos de Lima y los 7 del Callao", () => {
    expect(sugerenciasDe("PE", "Lima")).toHaveLength(43);
    expect(sugerenciasDe("PE", "Lima")).toContain("Miraflores");
    expect(sugerenciasDe("PE", "Callao")).toHaveLength(7);
  });
  it("no sugiere nada fuera de Lima y Callao ni en otros países", () => {
    expect(sugerenciasDe("PE", "Cusco")).toEqual([]);
    expect(sugerenciasDe("EC", "Pichincha")).toEqual([]);
  });
  it("los nombres de los niveles dependen del país", () => {
    expect(nivelesDe("PE").region).toBe("Departamento");
    expect(nivelesDe("PE").local).toBe("Distrito");
    expect(nivelesDe("EC").region).toBe("Provincia");
    expect(nivelesDe("EC").local).toBe("Ciudad");
  });
  it("el formulario de datos habla de departamento y distrito", () => {
    expect(camposIniciales.find((c) => c.mapeo === "provincia")!.etiqueta).toBe("Departamento");
    expect(camposIniciales.find((c) => c.mapeo === "ciudad")!.etiqueta).toBe("Distrito");
  });
});
