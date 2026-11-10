import { describe, expect, it } from "vitest";
import { tokenBaja } from "./novedades";

describe("token de baja", () => {
  it("es estable por participante y distinto entre participantes", () => {
    expect(tokenBaja("p1")).toBe(tokenBaja("p1"));
    expect(tokenBaja("p1")).not.toBe(tokenBaja("p2"));
  });
  it("lleva el id y una firma que no se puede reutilizar para otro id", () => {
    const [id, firma] = tokenBaja("p7").split(".");
    expect(id).toBe("p7");
    expect(firma).toBeTruthy();
    expect(tokenBaja("p8").endsWith(firma!)).toBe(false);
  });
});
