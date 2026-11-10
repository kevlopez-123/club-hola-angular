import { describe, expect, it } from "vitest";
import { esImagenUtil, mapaImagenes, nombreDe } from "./imagenes-carga";

describe("imágenes de las cargas", () => {
  it("el nombre se normaliza: sin carpetas y en minúsculas", () => {
    expect(nombreDe("Fotos/Laptop-1.JPG")).toBe("laptop-1.jpg");
    expect(nombreDe("C:\\x\\Logo.PNG")).toBe("logo.png");
  });
  it("solo sirven imágenes; se ignoran ocultos y la carpeta del sistema de Mac", () => {
    expect(esImagenUtil("a/b.jpg")).toBe(true);
    expect(esImagenUtil("logo.SVG")).toBe(true);
    expect(esImagenUtil("notas.txt")).toBe(false);
    expect(esImagenUtil("__MACOSX/._foto.jpg")).toBe(false);
    expect(esImagenUtil(".oculta.png")).toBe(false);
  });
  it("arma el mapa nombre → url", () => {
    const m = mapaImagenes([{ nombre: "a.jpg", original: "A.jpg", url: "data:x", bytes: 6 }]);
    expect(m.get("a.jpg")).toBe("data:x");
  });
});
