import { describe, expect, it } from "vitest";
import { crearXlsx, zipAlmacenado } from "./xlsx";
import { leerXlsx, serialAFecha } from "./xlsx-lector";

const buffer = (u: Uint8Array) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

describe("leerXlsx", () => {
  it("lee de vuelta lo que escribe crearXlsx (textos, números, vacíos y acentos)", async () => {
    const z = crearXlsx([{ nombre: "Datos", encabezado: 0, filas: [["Código", "Nombre", "Puntos"], ["A-1", "Ñandú & <Cía>", 1200], ["", "Sin código", ""]] }, { nombre: "Otra", filas: [["x"]] }]);
    const h = await leerXlsx(buffer(z));
    expect(h.map((x) => x.nombre)).toEqual(["Datos", "Otra"]);
    expect(h[0]!.filas).toEqual([["Código", "Nombre", "Puntos"], ["A-1", "Ñandú & <Cía>", "1200"], ["", "Sin código"]]);
  });

  it("lee textos compartidos, texto con formato y filas salteadas, como los guarda Excel", async () => {
    const z = zipAlmacenado({
      "xl/workbook.xml": '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Productos" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/sharedStrings.xml": '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>SKU</t></si><si><r><t>Laptop </t></r><r><t>Pavilion</t></r></si></sst>',
      "xl/worksheets/sheet1.xml": '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="3"><c r="B3"><v>45.5</v></c></row></sheetData></worksheet>',
    });
    const h = await leerXlsx(buffer(z));
    expect(h[0]!.nombre).toBe("Productos");
    expect(h[0]!.filas[0]).toEqual(["SKU", "", "Laptop Pavilion"]);
    expect(h[0]!.filas[1]).toEqual([]); // fila sin celdas
    expect(h[0]!.filas[2]).toEqual(["", "45.5"]);
  });

  it("rechaza archivos que no son un Excel", async () => {
    await expect(leerXlsx(new TextEncoder().encode("a,b\n1,2").buffer as ArrayBuffer)).rejects.toThrow();
  });

  it("convierte un número de serie de Excel en fecha", () => {
    expect(serialAFecha(45292)).toBe("2024-01-01");
  });
});
