import { describe, expect, it } from "vitest";
import { inicialesDeMarca, sinRepetidos, slideDeBeneficio, type BeneficioParaBanner } from "./banner-beneficio";

const b = (extra: Partial<BeneficioParaBanner> = {}): BeneficioParaBanner => ({ id: "b9", marca: "Edo Sushi Bar", nombre: "35% dscto. en tablas para compartir", descuento: "35%", imagen: "img/b-sushi.jpg", ...extra });
const HOY = "2026-11-16";

describe("slideDeBeneficio", () => {
  it("usa la imagen del beneficio, enlaza a su ficha y lleva marca, nombre y descuento", () => {
    const s = slideDeBeneficio({ id: "x1" }, b(), "img/logo.png", HOY)!;
    expect(s.id).toBe("x1");
    expect(s.imagen).toBe("img/b-sushi.jpg");
    expect(s.to).toBe("/beneficios/b9");
    expect(s.beneficio).toEqual({ marca: "Edo Sushi Bar", nombre: "35% dscto. en tablas para compartir", descuento: "35%", logo: "img/logo.png" });
  });
  it("sin beneficio, inactivo o fuera de vigencia no hay banner", () => {
    expect(slideDeBeneficio({ id: "x" }, undefined, "", HOY)).toBeNull();
    expect(slideDeBeneficio({ id: "x" }, b({ activo: false }), "", HOY)).toBeNull();
    expect(slideDeBeneficio({ id: "x" }, b({ hasta: "2026-11-15" }), "", HOY)).toBeNull();
    expect(slideDeBeneficio({ id: "x" }, b({ desde: "2026-11-17" }), "", HOY)).toBeNull();
  });
  it("la vigencia incluye el primer y el último día", () => {
    expect(slideDeBeneficio({ id: "x" }, b({ desde: HOY, hasta: HOY }), "", HOY)).not.toBeNull();
  });
  it("sin id propio usa la clave del banner", () => {
    expect(slideDeBeneficio({ key: "k7" }, b(), "", HOY)!.id).toBe("k7");
  });
});

describe("sinRepetidos", () => {
  const s = (id: string, to: string) => ({ id, imagen: "", alt: "", to, beneficio: { marca: "M", nombre: "N", descuento: "", logo: "" } });
  it("deja el primero de cada beneficio y conserva el orden", () => {
    const r = sinRepetidos([s("a", "/beneficios/b29"), s("b", "/beneficios/b31"), s("c", "/beneficios/b29")]);
    expect(r.map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("las imágenes propias nunca se descartan", () => {
    const img = { id: "i1", imagen: "x.jpg", alt: "", to: "/canjea" };
    expect(sinRepetidos([img, { ...img, id: "i2" }])).toHaveLength(2);
  });
});

describe("inicialesDeMarca", () => {
  it("toma las dos primeras palabras", () => {
    expect(inicialesDeMarca("Edo Sushi Bar")).toBe("ES");
    expect(inicialesDeMarca("Starbucks")).toBe("S");
    expect(inicialesDeMarca("  pf changs ")).toBe("PC");
  });
});
