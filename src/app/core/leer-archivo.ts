import { HOJA_DATOS } from "./plantillas-xlsx";
import { leerXlsx } from "./xlsx-lector";

/**
 * Lee un archivo de carga masiva y lo devuelve como matriz de textos. Excel (.xlsx): la hoja «Datos» de la plantilla o, si no
 * existe, la primera. Se acepta también texto separado por coma, punto y coma o tabulador (.csv / .txt) para archivos
 * exportados de otros sistemas; las descargas de la plataforma son siempre Excel o PDF.
 * Lanza `Error("formato")` si el archivo no se puede leer.
 */
export async function leerFilasArchivo(f: File): Promise<string[][]> {
  const esExcel = /\.xlsx$/i.test(f.name) || f.type.includes("spreadsheetml");
  if (esExcel) {
    try {
      const hojas = await leerXlsx(await f.arrayBuffer());
      const h = hojas.find((x) => x.nombre.trim().toLowerCase() === HOJA_DATOS.toLowerCase()) ?? hojas[0]!;
      return h.filas.filter((fila) => fila.some((c) => c !== ""));
    } catch {
      throw new Error("formato");
    }
  }
  if (/\.xls$/i.test(f.name)) throw new Error("formato"); // Excel antiguo: pedir que lo guarden como .xlsx
  const texto = await f.text();
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/[;,\t]/).map((x) => x.trim()));
}

/** Compara un encabezado de columna ignorando mayúsculas, acentos y el asterisco de "obligatorio". */
export const normalizarEncabezado = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\*/g, "").trim().toLowerCase();
