import { describe, expect, it } from "vitest";
import { htmlCuponImpreso, type DatosCuponImpreso } from "./cupon-impreso";

const base = (): DatosCuponImpreso => ({
  programa: "Club Hola", banco: "BanBif", logo: "img/club-hola-dark.svg", beneficio: "30% dscto. en pollo a la brasa", comercio: "Pardos Chicken", descuento: "30%",
  codigo: "MOT-VYN44V1H", qr: "data:image/png;base64,AAAA", documentoEtiqueta: "DNI", documento: "****4567", venceEl: "16/11/2026 04:30",
  locales: [{ nombre: "Pardos Miraflores", direccion: "Av. Larco 620", distrito: "Miraflores", horario: "11:00 a 23:00" }],
});

describe("htmlCuponImpreso", () => {
  it("lleva el código, el QR y el documento ofuscado", () => {
    const h = htmlCuponImpreso(base());
    expect(h).toContain("MOT-VYN44V1H");
    expect(h).toContain("DNI ****4567");
    expect(h).toContain('src="data:image/png;base64,AAAA"');
    expect(h).toContain("Pardos Miraflores");
    expect(h).toContain("Cupón personal");
  });
  it("nunca incluye el documento completo", () => {
    expect(htmlCuponImpreso(base())).not.toContain("41234567");
  });
  it("escapa el texto para que no se inyecte HTML", () => {
    const h = htmlCuponImpreso({ ...base(), beneficio: "<script>alert(1)</script>", comercio: 'A"B' });
    expect(h).not.toContain("<script>alert(1)</script>");
    expect(h).toContain("&lt;script&gt;");
  });
  it("descarta imágenes con esquemas peligrosos", () => {
    const h = htmlCuponImpreso({ ...base(), qr: "javascript:alert(1)", logo: "javascript:alert(2)" });
    expect(h).not.toContain("javascript:");
  });
  it("sin QR sale solo con el código", () => {
    const h = htmlCuponImpreso({ ...base(), qr: undefined });
    expect(h).not.toContain('class="qr"');
    expect(h).toContain("MOT-VYN44V1H");
  });
});
