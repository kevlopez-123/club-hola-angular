/**
 * Lector de libros de Excel (.xlsx) sin dependencias, para las cargas masivas: abre el ZIP, descomprime con `DecompressionStream`
 * (lo trae el navegador) y devuelve cada hoja como una matriz de textos. No evalúa fórmulas: lee el último valor guardado.
 */
export interface HojaLeida {
  nombre: string;
  /** Filas con todas las columnas como texto (vacío si la celda no tiene valor). */
  filas: string[][];
}

const u16 = (d: DataView, o: number) => d.getUint16(o, true);
const u32 = (d: DataView, o: number) => d.getUint32(o, true);
const dec = new TextDecoder("utf-8");

interface EntradaZip {
  nombre: string;
  metodo: number;
  comprimido: number;
  desplazamiento: number;
}

/** Entradas del directorio central del ZIP. */
function entradas(buf: Uint8Array): Map<string, EntradaZip> {
  const d = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (u32(d, i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error("zip");
  const total = u16(d, fin + 10);
  let o = u32(d, fin + 16);
  const mapa = new Map<string, EntradaZip>();
  for (let n = 0; n < total; n++) {
    if (u32(d, o) !== 0x02014b50) throw new Error("zip");
    const metodo = u16(d, o + 10);
    const comprimido = u32(d, o + 20);
    const nombreLen = u16(d, o + 28);
    const extraLen = u16(d, o + 30);
    const comentLen = u16(d, o + 32);
    const desplazamiento = u32(d, o + 42);
    const nombre = dec.decode(buf.subarray(o + 46, o + 46 + nombreLen));
    mapa.set(nombre, { nombre, metodo, comprimido, desplazamiento });
    o += 46 + nombreLen + extraLen + comentLen;
  }
  return mapa;
}

async function bytesDe(buf: Uint8Array, e: EntradaZip): Promise<Uint8Array> {
  const d = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (u32(d, e.desplazamiento) !== 0x04034b50) throw new Error("zip");
  const ini = e.desplazamiento + 30 + u16(d, e.desplazamiento + 26) + u16(d, e.desplazamiento + 28);
  const datos = buf.subarray(ini, ini + e.comprimido);
  if (e.metodo === 0) return datos;
  if (e.metodo !== 8) throw new Error("zip");
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}
const contenido = async (buf: Uint8Array, e: EntradaZip) => dec.decode(await bytesDe(buf, e));

/** Archivos de un ZIP (sin las carpetas), con su ruta y su contenido. Sirve para el ZIP de imágenes de las cargas masivas. */
export async function leerZip(datos: ArrayBuffer): Promise<{ nombre: string; bytes: Uint8Array }[]> {
  const buf = new Uint8Array(datos);
  const salida: { nombre: string; bytes: Uint8Array }[] = [];
  for (const e of entradas(buf).values()) {
    if (e.nombre.endsWith("/")) continue;
    salida.push({ nombre: e.nombre, bytes: await bytesDe(buf, e) });
  }
  return salida;
}

const xml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
const hijos = (el: Element, nombre: string) => Array.from(el.getElementsByTagName(nombre));
/** Índice de columna (0 = A) de una referencia de celda ("C12"). */
const indiceColumna = (ref: string) => {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
};

/** Lee todas las hojas del libro. Lanza un `Error("zip")` o `Error("xlsx")` si el archivo no es un Excel válido. */
export async function leerXlsx(datos: ArrayBuffer): Promise<HojaLeida[]> {
  const buf = new Uint8Array(datos);
  const ent = entradas(buf);
  const texto = async (ruta: string) => {
    const e = ent.get(ruta);
    return e ? contenido(buf, e) : "";
  };
  const libro = await texto("xl/workbook.xml");
  if (!libro) throw new Error("xlsx");
  const rels = xml(await texto("xl/_rels/workbook.xml.rels"));
  const destino = new Map<string, string>();
  for (const r of hijos(rels.documentElement, "Relationship")) destino.set(r.getAttribute("Id") ?? "", (r.getAttribute("Target") ?? "").replace(/^\/?(xl\/)?/, "xl/"));

  const compartidas: string[] = [];
  const ss = await texto("xl/sharedStrings.xml");
  if (ss) for (const si of hijos(xml(ss).documentElement, "si")) compartidas.push(hijos(si, "t").map((t) => t.textContent ?? "").join(""));

  const hojas: HojaLeida[] = [];
  for (const s of hijos(xml(libro).documentElement, "sheet")) {
    const rid = s.getAttribute("r:id") ?? s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? "";
    const ruta = destino.get(rid);
    const cuerpo = ruta ? await texto(ruta) : "";
    if (!cuerpo) continue;
    const filas: string[][] = [];
    for (const fila of hijos(xml(cuerpo).documentElement, "row")) {
      const r = Number(fila.getAttribute("r") ?? filas.length + 1) - 1;
      const celdas: string[] = [];
      for (const c of hijos(fila, "c")) {
        const col = indiceColumna(c.getAttribute("r") ?? "");
        if (col < 0) continue;
        const tipo = c.getAttribute("t");
        const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
        let valor = v;
        if (tipo === "s") valor = compartidas[Number(v)] ?? "";
        else if (tipo === "inlineStr") valor = hijos(c, "t").map((t) => t.textContent ?? "").join("");
        else if (tipo === "b") valor = v === "1" ? "VERDADERO" : "FALSO";
        celdas[col] = valor.trim();
      }
      for (let i = 0; i < celdas.length; i++) celdas[i] ??= "";
      while (celdas.length && celdas[celdas.length - 1] === "") celdas.pop(); // celdas con formato pero vacías al final
      filas[r] = celdas;
    }
    for (let i = 0; i < filas.length; i++) filas[i] ??= [];
    hojas.push({ nombre: s.getAttribute("name") ?? `Hoja ${hojas.length + 1}`, filas });
  }
  if (!hojas.length) throw new Error("xlsx");
  return hojas;
}

/** Fecha de un número de serie de Excel (días desde 1899-12-30) en formato AAAA-MM-DD. */
export function serialAFecha(n: number): string {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000).toISOString().slice(0, 10);
}
