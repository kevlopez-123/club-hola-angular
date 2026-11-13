import { describe, expect, it } from "vitest";
import { errorRemitente, formatoRemitente, REMITENTE_BASE } from "./correos";

describe("remitente de los correos", () => {
  it("el remitente de fábrica es válido y sale de @clubhola.com.pe", () => {
    expect(errorRemitente(REMITENTE_BASE, "BanBif")).toBe("");
    expect(formatoRemitente(REMITENTE_BASE)).toBe("Club Hola <beneficios@clubhola.com.pe>");
  });
  it("no deja usar un dominio del banco", () => {
    expect(errorRemitente({ nombre: "Club Hola", correo: "hola@banbif.com.pe", responderA: "" }, "BanBif")).toContain("no puede ser de un dominio de BanBif");
    expect(errorRemitente({ nombre: "Club Hola", correo: "hola@mail.banbif.pe", responderA: "" }, "BanBif")).not.toBe("");
  });
  it("pide nombre y un correo válido", () => {
    expect(errorRemitente({ nombre: "", correo: "a@b.com", responderA: "" }, "BanBif")).toContain("nombre");
    expect(errorRemitente({ nombre: "X", correo: "no-es-correo", responderA: "" }, "BanBif")).toContain("válido");
    expect(errorRemitente({ nombre: "X", correo: "a@clubhola.com.pe", responderA: "malo" }, "BanBif")).toContain("respuestas");
  });
});
