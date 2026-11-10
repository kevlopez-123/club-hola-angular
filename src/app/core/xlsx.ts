/**
 * Escritor de libros de Excel (.xlsx) sin dependencias: varias hojas con texto y números, con el formato de la plataforma
 * (encabezado con el color de la marca, bordes, filas fijas, filtro, celdas combinadas, listas desplegables y estilos para
 * instrucciones y ejemplos). El .xlsx es un ZIP de archivos XML; aquí se arma sin compresión ("stored").
 */
export type EstiloCelda = "normal" | "encabezado" | "obligatorio" | "titulo" | "nota" | "ejemplo" | "etiqueta" | "texto" | "borde" | "codigo" | "codigoEjemplo";
export type Celda = string | number | null | undefined | { v: string | number | null; e: EstiloCelda };

export interface ListaDesplegable {
  /** Columna (0 = A). */
  columna: number;
  /** Primera y última fila (1 = primera fila de la hoja). */
  desde: number;
  hasta: number;
  /** Opciones en línea (suman como máximo ~250 caracteres) o un rango de otra hoja ("Listas!$A$1:$A$24"). */
  opciones?: string[];
  ref?: string;
  /** Mensaje si el valor no está en la lista. */
  mensaje?: string;
}

export interface HojaXlsx {
  nombre: string;
  filas: Celda[][];
  /** Fila (0 = primera) que es el encabezado de la tabla: se pinta con el color de la marca, queda fija y lleva filtro. */
  encabezado?: number;
  /** Anchos de columna en caracteres; las que falten se calculan por el contenido. */
  anchos?: number[];
  /** Rangos a combinar ("A1:F1"). */
  combinar?: string[];
  listas?: ListaDesplegable[];
  /** Si es true, las celdas sin estilo propio no llevan borde (hojas de texto como Instrucciones). */
  sinBordes?: boolean;
  /** Alto fijo (en puntos) de filas concretas (0 = primera). Las celdas combinadas no ajustan solas su alto. */
  altos?: Record<number, number>;
}

const enc = new TextEncoder();

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of datos) c = TABLA_CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const columna = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
/** Excel no admite nombres de hoja con : \ / ? * [ ] ni más de 31 caracteres. */
const nombreHoja = (n: string, i: number) => (n.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || `Hoja ${i + 1}`);

/* ---- colores ---- */
const argb = (hex: string) => "FF" + (/^#?[0-9a-f]{6}$/i.test(hex.trim()) ? hex.trim().replace("#", "") : "00bdd2").toUpperCase();
const mezcla = (hex: string, con: [number, number, number], t: number) => {
  const h = argb(hex).slice(2);
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return "FF" + c.map((x, i) => Math.round(x + (con[i]! - x) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
};

/** Índices de estilo (cellXfs) en styles.xml; mantener sincronizado con `estilosXml`. */
const XF: Record<EstiloCelda, number> = { normal: 0, encabezado: 1, titulo: 2, nota: 3, ejemplo: 4, etiqueta: 5, texto: 6, borde: 7, obligatorio: 8, codigo: 9, codigoEjemplo: 10 };

function estilosXml(color: string): string {
  const marca = argb(color);
  const claro = mezcla(color, [255, 255, 255], 0.88);
  const oscuro = mezcla(color, [0, 0, 0], 0.35);
  const fuente = (extra: string, sz = 11) => `<font>${extra}<sz val="${sz}"/><name val="Calibri"/></font>`;
  const fuentes = [
    fuente(""), // 0
    fuente("<b/>"), // 1
    fuente(`<b/><color rgb="FFFFFFFF"/>`), // 2 blanco en negrita
    fuente(`<b/><color rgb="${marca}"/>`, 16), // 3 título
    fuente(`<i/><color rgb="FF6B7280"/>`, 10), // 4 nota
  ];
  const relleno = (c: string) => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`;
  const rellenos = [`<fill><patternFill patternType="none"/></fill>`, `<fill><patternFill patternType="gray125"/></fill>`, relleno(marca), relleno(claro), relleno("FFF3F4F6"), relleno(oscuro)];
  const lado = (n: string) => `<${n} style="thin"><color rgb="FFD1D5DB"/></${n}>`;
  const bordes = [`<border><left/><right/><top/><bottom/><diagonal/></border>`, `<border>${lado("left")}${lado("right")}${lado("top")}${lado("bottom")}<diagonal/></border>`];
  const xf = (fuenteId: number, relleno: number, borde: number, alin = "") =>
    `<xf numFmtId="0" fontId="${fuenteId}" fillId="${relleno}" borderId="${borde}" xfId="0" applyFont="1"${relleno ? ' applyFill="1"' : ""}${borde ? ' applyBorder="1"' : ""}${alin ? ' applyAlignment="1"' : ""}>${alin}</xf>`;
  const centro = `<alignment horizontal="center" vertical="center" wrapText="1"/>`;
  const arriba = `<alignment vertical="top" wrapText="1"/>`;
  const xfs = [
    xf(0, 0, 0), // 0 normal
    xf(2, 2, 1, centro), // 1 encabezado
    xf(3, 0, 0, `<alignment vertical="center"/>`), // 2 título
    xf(4, 0, 0, arriba), // 3 nota
    xf(0, 3, 1, arriba), // 4 ejemplo
    xf(1, 4, 1, arriba), // 5 etiqueta
    xf(0, 0, 1, arriba), // 6 texto con borde
    xf(0, 0, 1, `<alignment vertical="top"/>`), // 7 borde
    xf(2, 5, 1, centro), // 8 obligatorio
    `<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>`, // 9 código: se guarda como texto (conserva ceros a la izquierda)
    `<xf numFmtId="49" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>`, // 10 código de ejemplo (con fondo)
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fuentes.length}">${fuentes.join("")}</fonts><fills count="${rellenos.length}">${rellenos.join("")}</fills><borders count="${bordes.length}">${bordes.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs></styleSheet>`;
}

const valorDe = (c: Celda) => (c !== null && typeof c === "object" ? c.v : c);
const estiloDe = (c: Celda): EstiloCelda | undefined => (c !== null && typeof c === "object" ? c.e : undefined);

function xmlHoja(h: HojaXlsx, color: string): string {
  const ancho: number[] = [];
  const hdr = h.encabezado;
  const ultimaColumna = Math.max(0, ...h.filas.map((f) => f.length)) - 1;
  const filas = h.filas
    .map((fila, r) => {
      const esEncabezado = hdr !== undefined && r === hdr;
      const celdas = fila
        .map((c, i) => {
          const v = valorDe(c);
          const e = estiloDe(c) ?? (esEncabezado ? "encabezado" : hdr !== undefined && r > hdr ? "borde" : h.sinBordes ? "normal" : r === 0 && hdr === undefined ? "encabezado" : "borde");
          const s = XF[e];
          const ref = `${columna(i)}${r + 1}`;
          if (v === null || v === undefined || v === "") return e === "normal" ? "" : `<c r="${ref}" s="${s}"/>`;
          if (e !== "nota" && e !== "titulo") ancho[i] = Math.max(ancho[i] ?? 8, Math.min(60, String(v).length + 2));
          return typeof v === "number" && Number.isFinite(v) ? `<c r="${ref}" s="${s}"><v>${v}</v></c>` : `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
        })
        .join("");
      const ht = h.altos?.[r] ?? (esEncabezado ? 24 : 0);
      const alto = ht ? ` ht="${ht}" customHeight="1"` : "";
      return `<row r="${r + 1}"${alto}>${celdas}</row>`;
    })
    .join("");
  const anchos = Array.from({ length: Math.max(ancho.length, h.anchos?.length ?? 0) }, (_, i) => h.anchos?.[i] ?? ancho[i] ?? 10);
  const cols = anchos.length ? `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  const vista = hdr !== undefined ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${hdr + 1}" topLeftCell="A${hdr + 2}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/></sheetView></sheetViews>` : "";
  const filtro = hdr !== undefined && ultimaColumna >= 0 && h.filas.length > hdr + 1 ? `<autoFilter ref="A${hdr + 1}:${columna(ultimaColumna)}${h.filas.length}"/>` : "";
  const combinar = h.combinar?.length ? `<mergeCells count="${h.combinar.length}">${h.combinar.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
  const listas = (h.listas ?? [])
    .map((l) => {
      const f = l.ref ?? `"${(l.opciones ?? []).map((o) => o.replace(/"/g, "'").replace(/,/g, " ")).join(",")}"`;
      const sq = `${columna(l.columna)}${l.desde}:${columna(l.columna)}${l.hasta}`;
      return `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Valor no válido" error="${esc(l.mensaje ?? "Elige un valor de la lista.")}" sqref="${sq}"><formula1>${esc(f)}</formula1></dataValidation>`;
    })
    .join("");
  const validaciones = listas ? `<dataValidations count="${(h.listas ?? []).length}">${listas}</dataValidations>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><tabColor rgb="${argb(color)}"/></sheetPr>${vista}${cols}<sheetData>${filas}</sheetData>${filtro}${combinar}${validaciones}</worksheet>`;
}

/** Arma los archivos del .xlsx (nombre → contenido). `color` es el de la marca (#rrggbb). */
export function archivosXlsx(hojas: HojaXlsx[], color = "#00bdd2"): Record<string, string> {
  const h = hojas.length ? hojas : [{ nombre: "Hoja 1", filas: [[""]] }];
  const archivos: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${h.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${h.map((x, i) => `<sheet name="${esc(nombreHoja(x.nombre, i))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${h.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${h.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": estilosXml(color),
  };
  h.forEach((x, i) => (archivos[`xl/worksheets/sheet${i + 1}.xml`] = xmlHoja(x, color)));
  return archivos;
}

/** ZIP sin compresión (método 0) con los archivos dados. */
export function zipAlmacenado(archivos: Record<string, string>): Uint8Array {
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;
  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
  const unir = (...a: Uint8Array[]) => {
    const t = new Uint8Array(a.reduce((s, x) => s + x.length, 0));
    let o = 0;
    for (const x of a) { t.set(x, o); o += x.length; }
    return t;
  };
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const n = enc.encode(nombre);
    const d = enc.encode(contenido);
    const crc = crc32(d);
    const local = unir(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(d.length), u32(d.length), u16(n.length), u16(0), n, d);
    central.push(unir(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(d.length), u32(d.length), u16(n.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(desplazamiento), n));
    partes.push(local);
    desplazamiento += local.length;
  }
  const dirCentral = unir(...central);
  const fin = unir(u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(dirCentral.length), u32(desplazamiento), u16(0));
  return unir(...partes, dirCentral, fin);
}

export const crearXlsx = (hojas: HojaXlsx[], color = "#00bdd2"): Uint8Array => zipAlmacenado(archivosXlsx(hojas, color));