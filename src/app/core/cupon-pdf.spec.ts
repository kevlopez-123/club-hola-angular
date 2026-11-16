import { describe, expect, it } from "vitest";
import { cuponComoPdf } from "./cupon-pdf";
import type { DatosCupon } from "./cupon-datos";

const datos = (): DatosCupon => ({
  programa: "Club Hola", banco: "BanBif", beneficio: "30% dscto. en pollo a la brasa familiar", comercio: "Pardos Chicken", descuento: "30%",
  codigo: "MOT-VYN44V1H", documentoEtiqueta: "DNI", documento: "****4567", venceEl: "16/11/26, 4:29 a. m.", vigenciaHasta: "31/12/2026",
  locales: [{ nombre: "Pardos Chicken Miraflores", direccion: "Av. Larco 620", distrito: "Miraflores", horario: "Lun a Dom 11:00 a 23:00" }],
  terminos: "Promoción válida en todos los locales participantes. No acumulable con otras promociones.",
});
const sinCabecera = { cabecera: async () => null };
const conCabecera = { cabecera: async () => ({ jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), w: 1920, h: 232 }) };

async function leer(b: Blob) {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let t = "";
  for (const x of bytes) t += String.fromCharCode(x);
  return t;
}

describe("cuponComoPdf", () => {
  it("es un PDF con texto (no una imagen): el código y el DNI ofuscado están como texto", async () => {
    const b = await cuponComoPdf(datos(), sinCabecera);
    expect(b.type).toBe("application/pdf");
    const t = await leer(b);
    expect(t.startsWith("%PDF-1.4")).toBe(true);
    expect(t).toContain("(MOT-VYN44V1H) Tj");
    expect(t).toContain("(DNI ****4567) Tj");
    expect(t).toContain("(PARDOS CHICKEN) Tj");
    expect(t).not.toContain("/DCTDecode");
  });
  it("nunca incluye el documento completo", async () => {
    expect(await leer(await cuponComoPdf(datos(), sinCabecera))).not.toContain("41234567");
  });
  it("el QR va como vectores (muchos rectángulos), no como imagen", async () => {
    const t = await leer(await cuponComoPdf(datos(), sinCabecera));
    expect((t.match(/ re f/g) ?? []).length).toBeGreaterThan(200);
  });
  it("con cabecera incluye una sola imagen y la dibuja", async () => {
    const t = await leer(await cuponComoPdf(datos(), conCabecera));
    expect((t.match(/\/DCTDecode/g) ?? []).length).toBe(1);
    expect(t).toContain("/Im0 Do");
  });
  it("el índice de objetos apunta donde debe", async () => {
    const t = await leer(await cuponComoPdf(datos(), conCabecera));
    const inicio = Number(/startxref\n(\d+)/.exec(t)![1]);
    expect(t.slice(inicio, inicio + 4)).toBe("xref");
    const lineas = t.slice(inicio).split("\n").filter((l) => / n $/.test(l));
    expect(lineas).toHaveLength(8);
    lineas.forEach((l, i) => expect(t.slice(Number(l.slice(0, 10)), Number(l.slice(0, 10)) + 7)).toBe(`${i + 1} 0 obj`));
  });
  it("los acentos y la ñ salen codificados para Helvetica (WinAnsi)", async () => {
    const t = await leer(await cuponComoPdf({ ...datos(), beneficio: "Promoción de añejo" }, sinCabecera));
    expect(t).toContain("Promoci\\363n de a\\361ejo");
  });
});
