import { describe, expect, it } from "vitest";
import { haceTiempo } from "./tiempo";

const ahora = new Date("2026-11-04T12:00:00").getTime();
const hace = (min: number) => new Date(ahora - min * 60_000).toISOString();

describe("haceTiempo", () => {
  it("minutos, horas, ayer y días", () => {
    expect(haceTiempo(hace(0), ahora)).toBe("ahora");
    expect(haceTiempo(hace(5), ahora)).toBe("hace 5 min");
    expect(haceTiempo(hace(180), ahora)).toBe("hace 3 h");
    expect(haceTiempo(hace(60 * 24), ahora)).toBe("ayer");
    expect(haceTiempo(hace(60 * 24 * 4), ahora)).toBe("hace 4 días");
  });
  it("una fecha inválida no rompe", () => {
    expect(haceTiempo("no-es-fecha", ahora)).toBe("");
  });
});