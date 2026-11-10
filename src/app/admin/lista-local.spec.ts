import { describe, expect, it } from "vitest";
import { ListaLocal } from "./lista-local";

type Fila = { id: number; texto: string; tipo: string; fecha: string; n: number };
const datos: Fila[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, texto: i % 2 ? "Compra de puntos" : "Canje de café", tipo: i % 2 ? "compra" : "canje", fecha: `2026-0${(i % 9) + 1}-10`, n: i }));
const crear = (extra = {}) => new ListaLocal<Fila>(() => datos, {
  texto: (x) => x.texto, filtros: { tipo: (x) => x.tipo }, campos: { n: (x) => x.n, fecha: (x) => x.fecha }, fecha: (x) => x.fecha, tamano: 10, ...extra,
});

describe("ListaLocal", () => {
  it("pagina de a 10 y calcula el total y las páginas", () => {
    const l = crear();
    expect(l.total()).toBe(25);
    expect(l.paginas()).toBe(3);
    expect(l.items()).toHaveLength(10);
    l.ir(3);
    expect(l.items()).toHaveLength(5);
    l.ir(99); // no pasa de la última
    expect(l.page()).toBe(3);
  });
  it("busca sin distinguir mayúsculas ni tildes y vuelve a la primera página", () => {
    const l = crear();
    l.ir(2);
    l.buscar("CAFE");
    expect(l.page()).toBe(1);
    expect(l.total()).toBe(13);
    expect(l.items().every((x) => x.tipo === "canje")).toBe(true);
  });
  it("filtra por igualdad, filtra por fechas y se limpia", () => {
    const l = crear();
    l.filtrar("tipo", "compra");
    expect(l.total()).toBe(12);
    l.fechas("2026-03-01", "2026-04-30");
    expect(l.filtrados().every((x) => x.fecha >= "2026-03-01" && x.fecha <= "2026-04-30")).toBe(true);
    expect(l.activo()).toBe(true);
    l.limpiar();
    expect(l.total()).toBe(25);
    expect(l.activo()).toBe(false);
  });
  it("ordena por columna y alterna el sentido al repetir", () => {
    const l = crear();
    l.ordenar("n");
    expect(l.items()[0]!.n).toBe(0);
    l.ordenar("n");
    expect(l.items()[0]!.n).toBe(24);
    expect(l.dir()).toBe("desc");
  });
  it("respeta el orden inicial y reparte las opciones de un filtro", () => {
    const l = crear({ orden: { k: "n", dir: "desc" } });
    expect(l.items()[0]!.n).toBe(24);
    expect(l.opcionesDe("tipo")).toEqual(["canje", "compra"]);
  });
  it("lo que se exporta es todo lo filtrado, no solo la página visible", () => {
    const l = crear();
    l.filtrar("tipo", "canje");
    expect(l.items()).toHaveLength(10);
    expect(l.filtrados()).toHaveLength(13);
  });
});
