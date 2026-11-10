import { describe, expect, it } from "vitest";
import { archivosXlsx, crc32, crearXlsx } from "./xlsx";

/** Lee un ZIP almacenado (sin compresión) y devuelve sus archivos, comprobando el CRC de cada uno. */
function leerZip(z: Uint8Array): Record<string, string> {
  const dv = new DataView(z.buffer, z.byteOffset, z.byteLength);
  const out: Record<string, string> = {};
  let p = 0;
  while (dv.getUint32(p, true) === 0x04034b50) {
    const crc = dv.getUint32(p + 14, true), tam = dv.getUint32(p + 22, true), nn = dv.getUint16(p + 26, true), ne = dv.getUint16(p + 28, true);
    const nombre = new TextDecoder().decode(z.slice(p + 30, p + 30 + nn));
    const datos = z.slice(p + 30 + nn + ne, p + 30 + nn + ne + tam);
    expect(crc32(datos), `CRC de ${nombre}`).toBe(crc);
    out[nombre] = new TextDecoder().decode(datos);
    p += 30 + nn + ne + tam;
  }
  return out;
}

describe("xlsx", () => {
  it("crc32 de un valor conocido", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("el libro es un ZIP válido con las partes que Excel exige", () => {
    const zip = crearXlsx([{ nombre: "Resumen", filas: [["Métrica", "Valor"], ["Emitidos", 1500]] }]);
    expect(String.fromCharCode(zip[0]!, zip[1]!)).toBe("PK");
    const a = leerZip(zip);
    for (const k of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"]) expect(a[k], k).toBeTruthy();
    expect(a["xl/workbook.xml"]).toContain('name="Resumen"');
  });

  it("guarda números como números y textos como texto, con el encabezado en negrita", () => {
    const x = archivosXlsx([{ nombre: "H", filas: [["Nombre", "Puntos"], ["Ana", 2500]] }])["xl/worksheets/sheet1.xml"]!;
    expect(x).toContain('<c r="B2" s="7"><v>2500</v></c>');
    expect(x).toContain('t="inlineStr"><is><t xml:space="preserve">Ana</t>');
    expect(x).toContain('<c r="A1" s="1"'); // encabezado con el estilo de la marca
  });

  it("escapa caracteres especiales y recorta/limpia nombres de hoja", () => {
    const a = archivosXlsx([{ nombre: "Ventas: [2026]/Q1 con un nombre larguísimo de más de 31", filas: [["<b>&</b>"]] }]);
    expect(a["xl/worksheets/sheet1.xml"]).toContain("&lt;b&gt;&amp;&lt;/b&gt;");
    const nombre = /sheet name="([^"]*)"/.exec(a["xl/workbook.xml"]!)![1]!;
    expect(nombre.length).toBeLessThanOrEqual(31);
    expect(nombre).not.toMatch(/[:\\/?*[\]]/);
  });

  it("varias hojas, columnas con letras más allá de Z y celdas vacías", () => {
    const fila = Array.from({ length: 30 }, (_, i) => (i === 28 ? "AC" : i === 5 ? "" : i));
    const a = archivosXlsx([{ nombre: "A", filas: [fila] }, { nombre: "B", filas: [["x"]] }]);
    expect(Object.keys(a).filter((k) => k.startsWith("xl/worksheets/"))).toHaveLength(2);
    expect(a["xl/worksheets/sheet1.xml"]).toContain('r="AC1"');
  });

  it("el encabezado lleva el color de la marca, fila fija, filtro y nombres en el libro", () => {
    const a = archivosXlsx([{ nombre: "Datos", encabezado: 0, filas: [["A", "B"], ["x", 1], ["y", 2]] }], "#e11d48");
    expect(a["xl/styles.xml"]).toContain('rgb="FFE11D48"');
    const h = a["xl/worksheets/sheet1.xml"]!;
    expect(h).toContain('state="frozen"');
    expect(h).toContain('<autoFilter ref="A1:B3"/>');
    expect(h).toContain('<tabColor rgb="FFE11D48"/>');
  });

  it("estilos de instrucciones, celdas combinadas y listas desplegables", () => {
    const a = archivosXlsx([{
      nombre: "Instrucciones", sinBordes: true, combinar: ["A1:D1"],
      filas: [[{ v: "Plantilla", e: "titulo" }], [{ v: "Nota", e: "nota" }], [{ v: "Estado", e: "etiqueta" }, { v: "Activo", e: "ejemplo" }]],
      listas: [{ columna: 1, desde: 3, hasta: 50, opciones: ["Activo", "Inactivo"] }],
    }]);
    const h = a["xl/worksheets/sheet1.xml"]!;
    expect(h).toContain('<mergeCell ref="A1:D1"/>');
    expect(h).toContain('<c r="A1" s="2"');
    expect(h).toContain('<c r="B3" s="4"');
    expect(h).toContain('sqref="B3:B50"');
    expect(h).toContain('<formula1>&quot;Activo,Inactivo&quot;</formula1>');
  });

  it("las columnas de código se guardan como texto", () => {
    const h = archivosXlsx([{ nombre: "H", filas: [["Doc"], [{ v: "0912345678", e: "codigo" }]] }])["xl/worksheets/sheet1.xml"]!;
    expect(h).toContain('<c r="A2" s="9" t="inlineStr">');
  });
});