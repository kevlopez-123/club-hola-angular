import { describe, expect, it } from "vitest";
import { partirLineas } from "./cupon-imagen";

// Un contexto de mentira donde cada carácter mide 10 px.
const ctx = { measureText: (t: string) => ({ width: t.length * 10 }) } as unknown as Pick<CanvasRenderingContext2D, "measureText">;

describe("partirLineas", () => {
  it("reparte las palabras en líneas que caben", () => {
    expect(partirLineas(ctx, "uno dos tres cuatro", 80)).toEqual(["uno dos", "tres", "cuatro"]);
  });
  it("una palabra más larga que la línea queda sola", () => {
    expect(partirLineas(ctx, "extraordinariamente corta", 80)).toEqual(["extraordinariamente", "corta"]);
  });
  it("recorta con puntos suspensivos si hay más líneas que el máximo", () => {
    const l = partirLineas(ctx, "aaa bbb ccc ddd eee fff", 40, 2);
    expect(l).toHaveLength(2);
    expect(l[1]!.endsWith("…")).toBe(true);
  });
  it("texto vacío no produce líneas", () => {
    expect(partirLineas(ctx, "   ", 80)).toEqual([]);
  });
});
