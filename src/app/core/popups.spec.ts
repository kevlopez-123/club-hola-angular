import { describe, expect, it } from "vitest";
import { debeMostrar, errorPopup, popupVacio, popupsVisibles, publicoDe, type Popup } from "./popups";

const base = (o: Partial<Popup> = {}): Popup => ({ ...popupVacio(), id: "p1", nombre: "Bienvenida", web: { activo: true, titulo: "Hola", mensaje: "Mira esto" }, ...o });
const HOY = "2026-11-09";

describe("validación del pop-up", () => {
  it("lo básico: nombre, algún canal activo y título", () => {
    expect(errorPopup(base({ nombre: " " }))).toContain("nombre");
    expect(errorPopup(base({ web: undefined, app: undefined }))).toContain("Activa el contenido");
    expect(errorPopup(base({ web: { activo: true, titulo: "", mensaje: "x" } }))).toBe("En la web: escribe el título.");
    expect(errorPopup(base())).toBe("");
  });
  it("cada canal se valida con su propio nombre en el mensaje", () => {
    const p = base({ app: { activo: true, titulo: "T", mensaje: "", imagen: undefined } });
    expect(errorPopup(p)).toBe("En la app: escribe un mensaje o agrega una imagen.");
    expect(errorPopup(base({ app: { activo: false, titulo: "", mensaje: "" } }))).toBe(""); // una variante apagada no se valida
  });
  it("el botón y el enlace van juntos y el enlace es una ruta o https", () => {
    const v = (boton?: string, enlace?: string) => base({ web: { activo: true, titulo: "T", mensaje: "m", boton, enlace } });
    expect(errorPopup(v("Ver", undefined))).toContain("necesita un enlace");
    expect(errorPopup(v(undefined, "/beneficios"))).toContain("texto del botón");
    expect(errorPopup(v("Ver", "javascript:alert(1)"))).toContain("ruta como /beneficios");
    expect(errorPopup(v("Ver", "http://inseguro.com"))).toContain("https");
    expect(errorPopup(v("Ver", "/beneficios?ver=b1"))).toBe("");
    expect(errorPopup(v("Ver", "https://www.banco.com/promo"))).toBe("");
  });
  it("fechas, días y prioridad", () => {
    expect(errorPopup(base({ desde: "2026-12-10", hasta: "2026-12-01" }))).toContain("anterior");
    expect(errorPopup(base({ frecuencia: "dias" }))).toContain("cuántos días");
    expect(errorPopup(base({ frecuencia: "dias", dias: 7 }))).toBe("");
    expect(errorPopup(base({ prioridad: 100 }))).toContain("0 a 99");
  });
  it("respeta los límites de caracteres", () => {
    expect(errorPopup(base({ web: { activo: true, titulo: "x".repeat(101), mensaje: "m" } }))).toContain("100 caracteres");
    expect(errorPopup(base({ web: { activo: true, titulo: "t", mensaje: "x".repeat(2001) } }))).toContain("2000 caracteres");
  });
});

describe("formato solo imagen", () => {
  const solo = (o: object) => base({ web: { activo: true, formato: "imagen", titulo: "Promo", mensaje: "", imagen: "data:image/png;base64,AAA", ...o } });
  it("la imagen es obligatoria y el título hace de texto alternativo", () => {
    expect(errorPopup(solo({ imagen: undefined }))).toContain("sube la imagen");
    expect(errorPopup(solo({ titulo: "" }))).toContain("texto alternativo");
    expect(errorPopup(solo({}))).toBe("");
  });
  it("el enlace va solo (sin botón) y se valida igual", () => {
    expect(errorPopup(solo({ enlace: "/beneficios" }))).toBe("");
    expect(errorPopup(solo({ enlace: "javascript:alert(1)" }))).toContain("ruta como /beneficios");
  });
  it("el canal público recibe el formato (mixto por defecto)", () => {
    expect(publicoDe(solo({}), "web")?.formato).toBe("imagen");
    expect(publicoDe(base(), "web")?.formato).toBe("mixto");
  });
});

describe("qué pop-ups salen", () => {
  const lista = [
    base({ id: "a", prioridad: 10 }),
    base({ id: "b", prioridad: 90, paginas: "todas", app: { activo: true, titulo: "App", mensaje: "m" } }),
    base({ id: "c", prioridad: 50, desde: "2026-12-01" }), // programado
    base({ id: "d", prioridad: 50, hasta: "2026-11-01" }), // vencido
    base({ id: "e", prioridad: 60, activo: false }), // pausado
  ];
  it("solo vigentes y activos, el de mayor prioridad primero", () => {
    expect(popupsVisibles(lista, "web", HOY, "inicio").map((p) => p.id)).toEqual(["b", "a"]);
  });
  it("fuera del inicio solo salen los de «todas las páginas»", () => {
    expect(popupsVisibles(lista, "web", HOY, "otra").map((p) => p.id)).toEqual(["b"]);
  });
  it("cada canal ve solo su variante, y el canal sin variante no lo muestra", () => {
    expect(popupsVisibles(lista, "app", HOY, "inicio").map((p) => [p.id, p.titulo])).toEqual([["b", "App"]]);
    expect(publicoDe(lista[0]!, "app")).toBeUndefined();
    expect(publicoDe(lista[1]!, "web")?.titulo).toBe("Hola");
  });
  it("no filtra lo interno al canal público", () => {
    const pub = popupsVisibles(lista, "web", HOY, "inicio")[0]!;
    expect(Object.keys(pub).sort()).toEqual(["boton", "dias", "enlace", "formato", "frecuencia", "id", "imagen", "mensaje", "paginas", "titulo"]);
  });
});

describe("frecuencia", () => {
  const dia = 86_400_000;
  const ahora = Date.parse("2026-11-09T12:00:00Z");
  const pop = (frecuencia: any, dias?: number) => ({ id: "x", frecuencia, dias });
  it("sesión: una vez por sesión aunque ya la haya visto antes", () => {
    expect(debeMostrar(pop("sesion"), { x: { ultima: ahora - 5 * dia } }, ahora, new Set())).toBe(true);
    expect(debeMostrar(pop("sesion"), {}, ahora, new Set(["x"]))).toBe(false);
  });
  it("una sola vez: nunca más después de verlo", () => {
    expect(debeMostrar(pop("una_vez"), {}, ahora, new Set())).toBe(true);
    expect(debeMostrar(pop("una_vez"), { x: { ultima: ahora - 400 * dia } }, ahora, new Set())).toBe(false);
  });
  it("cada N días: de nuevo pasado el plazo", () => {
    expect(debeMostrar(pop("dias", 7), { x: { ultima: ahora - 6 * dia } }, ahora, new Set())).toBe(false);
    expect(debeMostrar(pop("dias", 7), { x: { ultima: ahora - 7 * dia } }, ahora, new Set())).toBe(true);
    expect(debeMostrar(pop("dias", 7), {}, ahora, new Set())).toBe(true);
  });
  it("siempre: cada vez", () => {
    expect(debeMostrar(pop("siempre"), { x: { ultima: ahora } }, ahora, new Set(["x"]))).toBe(true);
  });
});
