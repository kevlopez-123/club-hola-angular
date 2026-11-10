import { describe, expect, it } from "vitest";
import { anchosColumnas, pdfTabla } from "./pdf-tabla";

const base = { programa: "Banco Solidario Puntos", titulo: "Pedidos", generado: "09/11/2026 10:00", color: "#00bdd2" };

async function texto(b: Blob) {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (const x of buf) s += String.fromCharCode(x);
  return s;
}

describe("pdfTabla", () => {
  it("genera un PDF válido con título, encabezados en mayúscula y filas", async () => {
    const pdf = await texto(pdfTabla({ ...base, columnas: ["Código", "Cliente", "Puntos"], filas: [["PED-1", "Ana Torres", 1200], ["PED-2", "Luis", 300]] }));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("%%EOF");
    expect(pdf).toContain("(C\\323DIGO)"); // CÓDIGO en Latin-1
    expect(pdf).toContain("(PED-1)");
    expect(pdf).toContain("(1.200)"); // números con separador de miles
    expect(pdf).toContain("2 registros");
    expect(pdf).toContain("/MediaBox [0 0 595 842]"); // pocas columnas: vertical
  });

  it("usa hoja apaisada con muchas columnas y pagina con encabezado repetido", async () => {
    const filas = Array.from({ length: 120 }, (_, i) => [`C${i}`, "a", "b", "c", "d", "e", i]);
    const pdf = await texto(pdfTabla({ ...base, columnas: ["A", "B", "C", "D", "E", "F", "G"], filas }));
    expect(pdf).toContain("/MediaBox [0 0 842 595]");
    const paginas = (pdf.match(/\/Type \/Page /g) ?? []).length;
    expect(paginas).toBeGreaterThan(2);
    expect(pdf).toContain(`P\\341gina 1 de ${paginas}`);
    expect(pdf).toContain("continuaci");
  });

  it("sin filas avisa que no hay registros", async () => {
    const pdf = await texto(pdfTabla({ ...base, columnas: ["A"], filas: [] }));
    expect(pdf).toContain("No hay registros para mostrar.");
  });

  it("escapa paréntesis y barras del texto", async () => {
    const pdf = await texto(pdfTabla({ ...base, columnas: ["A"], filas: [["a (b) \\ c"]] }));
    expect(pdf).toContain("a \\(b\\) \\\\ c");
  });

  it("reparte el ancho útil sin pasarse", () => {
    const a = anchosColumnas(["Código", "Detalle"], [["X", "un texto bastante más largo que el código"]], 500, 8.5);
    expect(Math.round(a[0]! + a[1]!)).toBe(500);
    expect(a[1]!).toBeGreaterThan(a[0]!);
  });
});
