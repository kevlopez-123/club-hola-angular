import { describe, expect, it } from "vitest";
import { categoriasDe, errorGuia, GUIAS_INICIALES, guiaEsPara, guiasPara, guiaVacia, type Guia } from "./ayuda";

const g = (o: Partial<Guia>): Guia => ({ ...guiaVacia(), id: "x", titulo: "T", categoria: "A", contenido: "c", ...o });

describe("guías por rol", () => {
  const lista = [
    g({ id: "1", titulo: "Para todos", roles: [] }),
    g({ id: "2", titulo: "Solo admin", roles: ["Administrador"] }),
    g({ id: "3", titulo: "Catálogo y operaciones", roles: ["Catálogo", "Operaciones"] }),
    g({ id: "4", titulo: "Borrador", roles: [], publicada: false }),
  ];
  it("cada rol ve las suyas y las de todos; los borradores no se ven", () => {
    expect(guiasPara(lista, "Administrador").map((x) => x.id)).toEqual(["1", "2"]);
    expect(guiasPara(lista, "Catálogo").map((x) => x.id)).toEqual(["3", "1"]); // mismo orden: por título
    expect(guiasPara(lista, "Solo lectura").map((x) => x.id)).toEqual(["1"]);
  });
  it("un rol personalizado ve las de todos y las que se le asignaron", () => {
    expect(guiaEsPara({ roles: ["Mi rol"] }, "Mi rol")).toBe(true);
    expect(guiaEsPara({ roles: ["Mi rol"] }, "Otro")).toBe(false);
  });
});

describe("búsqueda y orden", () => {
  const lista = [
    g({ id: "1", titulo: "Cargar productos con Excel", categoria: "Carga masiva", orden: 2, resumen: "plantilla" }),
    g({ id: "2", titulo: "Imágenes en masa", categoria: "Carga masiva", orden: 1, contenido: "Sube un ZIP" }),
    g({ id: "3", titulo: "Roles", categoria: "Administración", orden: 1 }),
  ];
  it("ordena por categoría y luego por orden", () => {
    expect(guiasPara(lista, "x").map((x) => x.id)).toEqual(["3", "2", "1"]);
  });
  it("busca sin importar tildes ni mayúsculas, en título, resumen, categoría y contenido, con todas las palabras", () => {
    expect(guiasPara(lista, "x", { q: "IMAGENES" }).map((x) => x.id)).toEqual(["2"]);
    expect(guiasPara(lista, "x", { q: "zip" }).map((x) => x.id)).toEqual(["2"]);
    expect(guiasPara(lista, "x", { q: "carga excel" }).map((x) => x.id)).toEqual(["1"]);
    expect(guiasPara(lista, "x", { q: "administracion" }).map((x) => x.id)).toEqual(["3"]);
    expect(guiasPara(lista, "x", { q: "nada de esto" })).toEqual([]);
  });
  it("filtra por categoría y lista las categorías", () => {
    expect(guiasPara(lista, "x", { categoria: "Carga masiva" })).toHaveLength(2);
    expect(categoriasDe(lista)).toEqual(["Administración", "Carga masiva"]);
  });
});

describe("validación de la guía", () => {
  it("título, categoría y contenido son obligatorios", () => {
    expect(errorGuia(g({ titulo: " " }))).toContain("título");
    expect(errorGuia(g({ categoria: "" }))).toContain("categoría");
    expect(errorGuia(g({ contenido: "" }))).toContain("contenido");
    expect(errorGuia(g({}))).toBe("");
  });
  it("orden y límites de caracteres", () => {
    expect(errorGuia(g({ orden: -1 }))).toContain("0 a 999");
    expect(errorGuia(g({ titulo: "x".repeat(101) }))).toContain("100 caracteres");
    expect(errorGuia(g({ resumen: "x".repeat(201) }))).toContain("200 caracteres");
  });
});

describe("guías iniciales", () => {
  it("son válidas, tienen ids únicos y cubren a cada rol del sistema", () => {
    expect(GUIAS_INICIALES.every((x) => errorGuia(x) === "")).toBe(true);
    expect(new Set(GUIAS_INICIALES.map((x) => x.id)).size).toBe(GUIAS_INICIALES.length);
    for (const rol of ["Administrador", "Catálogo", "Operaciones", "Atención", "Solo lectura"]) expect(guiasPara(GUIAS_INICIALES, rol).length, rol).toBeGreaterThan(1);
  });
  it("Atención no ve guías que no le tocan", () => {
    const t = guiasPara(GUIAS_INICIALES, "Atención").map((x) => x.id);
    expect(t).toContain("pedidos");
    expect(t).not.toContain("roles");
    expect(t).not.toContain("cargas-excel");
  });
});
