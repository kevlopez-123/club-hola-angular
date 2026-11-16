import { describe, expect, it } from "vitest";
import { ofuscarCorreo, ofuscarTelefono } from "./ofuscar-contacto";

describe("ofuscar contacto", () => {
  it("correo: 2 letras y el dominio", () => {
    expect(ofuscarCorreo("ana.torres@dominio.com")).toBe("an********@dominio.com");
    expect(ofuscarCorreo("jo@x.pe")).toBe("jo***@x.pe");
  });
  it("teléfono: prefijo y últimos 3 dígitos", () => {
    expect(ofuscarTelefono("+51 987 654 321")).toBe("+51 *** *** 321");
    expect(ofuscarTelefono("987654321")).toBe("*** *** 321");
  });
});
