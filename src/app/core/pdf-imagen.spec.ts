import { describe, expect, it } from "vitest";
import { pdfDeJpeg } from "./pdf-imagen";

const jpegFalso = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);

async function leer(b: Blob) {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let t = "";
  for (const x of bytes) t += String.fromCharCode(x);
  return t;
}

describe("pdfDeJpeg", () => {
  it("es un PDF con la imagen JPEG incrustada", async () => {
    const b = pdfDeJpeg(jpegFalso(), 900, 1264, "Cupón ABC");
    expect(b.type).toBe("application/pdf");
    const t = await leer(b);
    expect(t.startsWith("%PDF-1.4")).toBe(true);
    expect(t).toContain("/DCTDecode");
    expect(t).toContain("/Width 900 /Height 1264");
    expect(t.trimEnd().endsWith("%%EOF")).toBe(true);
  });
  it("el índice de objetos apunta donde debe", async () => {
    const t = await leer(pdfDeJpeg(jpegFalso(), 900, 1264, "x"));
    const inicio = Number(/startxref\n(\d+)/.exec(t)![1]);
    expect(t.slice(inicio, inicio + 4)).toBe("xref");
    const offs = [...t.slice(inicio).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    expect(offs).toHaveLength(6);
    offs.forEach((o, i) => expect(t.slice(o, o + 7)).toBe(`${i + 1} 0 obj`));
  });
  it("el título no puede romper el documento", async () => {
    const t = await leer(pdfDeJpeg(jpegFalso(), 100, 100, "a) /Evil (b\\"));
    expect(t).toContain("/Title (a  /Evil  b )");
  });
  it("la imagen cabe en la página", async () => {
    const t = await leer(pdfDeJpeg(jpegFalso(), 900, 5000, "x"));
    const [, w, h] = /q ([\d.]+) 0 0 ([\d.]+) /.exec(t)!.map(Number) as [number, number, number];
    expect(h).toBeLessThanOrEqual(841.89);
    expect(w).toBeLessThanOrEqual(595.28);
  });
});
