import { deflateRawSync, deflateSync } from "node:zlib";

/** Libro de Excel con los archivos comprimidos con deflate y textos compartidos, como lo guarda Excel de verdad. */
export function xlsxDeExcel(filas: string[][]): Buffer {
  const archivos: Record<string, string> = {
    "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    "xl/workbook.xml": '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Instrucciones" sheetId="1" r:id="rId1"/><sheet name="Datos" sheetId="2" r:id="rId2"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x" Target="worksheets/sheet2.xml"/></Relationships>',
  };
  const textos: string[] = [];
  const idx = (s: string) => (textos.includes(s) ? textos.indexOf(s) : textos.push(s) - 1);
  archivos["xl/worksheets/sheet1.xml"] = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>${idx("Esta hoja no se importa")}</v></c></row></sheetData></worksheet>`;
  const col = (i: number) => String.fromCharCode(65 + i);
  archivos["xl/worksheets/sheet2.xml"] = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filas.map((f, r) => `<row r="${r + 1}">${f.map((v, c) => `<c r="${col(c)}${r + 1}" t="s"><v>${idx(v)}</v></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
  archivos["xl/sharedStrings.xml"] = `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${textos.map((t) => `<si><t>${t}</t></si>`).join("")}</sst>`;

  const u16 = (n: number) => [n & 255, (n >> 8) & 255];
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  const crc32 = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const locales: number[] = [];
  const centrales: number[] = [];
  for (const [nombre, texto] of Object.entries(archivos)) {
    const n = [...Buffer.from(nombre)];
    const crudo = Buffer.from(texto);
    const comp = [...deflateRawSync(crudo)];
    const crc = crc32(crudo);
    const pos = locales.length;
    locales.push(...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(8), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(comp.length), ...u32(crudo.length), ...u16(n.length), ...u16(0), ...n, ...comp);
    centrales.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(8), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(comp.length), ...u32(crudo.length), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos), ...n);
  }
  const total = Object.keys(archivos).length;
  return Buffer.from([...locales, ...centrales, ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(total), ...u16(total), ...u32(centrales.length), ...u32(locales.length), ...u16(0)]);
}

const crcZip = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };

/** ZIP (comprimido con deflate, como los de Windows o Mac) con los archivos dados. */
export function zipDe(archivos: { nombre: string; datos: Buffer }[]): Buffer {
  const u16 = (n: number) => [n & 255, (n >> 8) & 255];
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  const locales: number[] = [];
  const centrales: number[] = [];
  for (const a of archivos) {
    const n = [...Buffer.from(a.nombre)];
    const comp = [...deflateRawSync(a.datos)];
    const crc = crcZip(a.datos);
    const pos = locales.length;
    locales.push(...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(8), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(comp.length), ...u32(a.datos.length), ...u16(n.length), ...u16(0), ...n, ...comp);
    centrales.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(8), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(comp.length), ...u32(a.datos.length), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos), ...n);
  }
  return Buffer.from([...locales, ...centrales, ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(archivos.length), ...u16(archivos.length), ...u32(centrales.length), ...u32(locales.length), ...u16(0)]);
}

/** PNG válido (rojo sólido) de `ancho` × `alto`: los PNG diminutos de otras pruebas no se pueden decodificar de verdad. */
export function pngValido(ancho = 40, alto = 30): Buffer {
  const trozo = (tipo: string, datos: Buffer) => {
    const t = Buffer.concat([Buffer.from(tipo), datos]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(datos.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcZip(t));
    return Buffer.concat([len, t, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
  const fila = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: ancho }, () => [220, 40, 40]).flat())]);
  const crudo = Buffer.concat(Array.from({ length: alto }, () => fila));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo("IHDR", ihdr), trozo("IDAT", deflateSync(crudo)), trozo("IEND", Buffer.alloc(0))]);
}