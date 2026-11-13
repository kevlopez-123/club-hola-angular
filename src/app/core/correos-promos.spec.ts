import { describe, expect, it } from "vitest";
import { promocionesDestacadas } from "./correos-promos";

const b = (id: string, marca: string, extra: object = {}) => ({ id, marca, nombre: `Promo ${id}`, descuento: "20%", imagen: "img/x.jpg", tipo: "cupon", ...extra });

describe("promocionesDestacadas", () => {
  const lista = [b("1", "A"), b("2", "A"), b("3", "B", { tipo: "compra" }), b("4", "C"), b("5", "D")];
  it("toma una por comercio y salta las de compra", () => {
    expect(promocionesDestacadas(lista, 6, "https://x.test/").map((p) => p.comercio)).toEqual(["A", "C", "D"]);
  });
  it("respeta la cantidad pedida", () => {
    expect(promocionesDestacadas(lista, 2, "https://x.test/")).toHaveLength(2);
    expect(promocionesDestacadas(lista, 0, "https://x.test/")).toHaveLength(0);
  });
  it("arma imagen y enlace absolutos a partir de la dirección del sitio", () => {
    const [p] = promocionesDestacadas(lista, 1, "https://x.test/app/");
    expect(p!.imagen).toBe("https://x.test/app/img/x.jpg");
    expect(p!.url).toBe("https://x.test/app/beneficios/1");
  });
});
