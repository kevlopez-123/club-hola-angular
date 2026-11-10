import { LIMITES, type ClaveLimite } from "./limites";
import { normalizarEncabezado } from "./leer-archivo";
import type { ColumnaPlantilla, PlantillaDef } from "./plantillas-xlsx";
import { serialAFecha } from "./xlsx-lector";

/**
 * Motor de las cargas masivas (productos, beneficios, marcas, ajustes de puntos): convierte las filas de la hoja «Datos» en valores
 * ya validados, fila por fila y sin dejar que una fila mala frene a las demás. Es puro (sin Angular ni red) para probarlo a fondo.
 *
 * Reglas comunes: la primera fila es el encabezado; "obligatoria" se exige al CREAR (al actualizar una fila existente basta el
 * código y las celdas vacías no cambian el dato); los textos respetan los límites de `core/limites`.
 */

export type TipoColumna = "texto" | "codigo" | "entero" | "decimal" | "fecha" | "sino" | "opcion" | "lista" | "url" | "correo" | "imagenes";

export interface ColCarga {
  clave: string;
  titulo: string;
  tipo: TipoColumna;
  /** Obligatoria al crear. */
  obligatoria?: boolean;
  /** Límite de caracteres (de `LIMITES`); en listas, de cada elemento. */
  limite?: ClaveLimite;
  min?: number;
  max?: number;
  /** El entero no puede ser 0 (ajustes de puntos). */
  noCero?: boolean;
  /** Valores permitidos (tipo "opcion"). */
  opciones?: string[];
  /** Qué escribir (se muestra en las instrucciones). */
  ayuda: string;
  ejemplo: string | number;
  /** Otros nombres con los que se reconoce el encabezado. */
  alias?: string[];
  /** Se guarda como texto en Excel (documentos, códigos). */
  texto?: boolean;
}

export type Valores = Record<string, unknown>;

export interface FilaProcesada {
  /** Número de fila en el archivo (2 = primera fila de datos). */
  fila: number;
  /** Celdas tal como venían, en el orden de las columnas de la definición. */
  crudos: string[];
  /** Valores convertidos; solo las columnas con dato (las vacías no aparecen). */
  valores: Valores;
  error?: string;
}

export interface ResultadoMatriz {
  filas: FilaProcesada[];
  /** Si el archivo no se puede procesar (faltan columnas, está vacío…). */
  errorGeneral?: string;
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
export const sinAcentos = sinTildes;

/* ---- conversión de cada tipo de celda ---- */
type Conv = { ok: true; valor: unknown } | { ok: false; error: string };
const bien = (valor: unknown): Conv => ({ ok: true, valor });
const mal = (error: string): Conv => ({ ok: false, error });

const SI = new Set(["si", "s", "x", "1", "true", "verdadero", "activo", "yes"]);
const NO = new Set(["no", "n", "0", "false", "falso", "inactivo"]);

/** Fecha AAAA-MM-DD, dd/mm/aaaa o número de serie de Excel → "AAAA-MM-DD" (o error). */
export function convertirFecha(s: string): string | null {
  let iso = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) iso = s;
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, a] = s.split("/");
    iso = `${a}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  } else if (/^\d{5}(\.\d+)?$/.test(s) && +s > 20000 && +s < 90000) iso = serialAFecha(+s);
  else return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

export const separarLista = (s: string) => s.split(/[;|\n]/).map((x) => x.trim()).filter(Boolean);

function convertir(c: ColCarga, bruto: string): Conv {
  const s = bruto.trim();
  const max = c.limite ? LIMITES[c.limite] : undefined;
  const largo = (t: string, etiqueta = c.titulo) => (max !== undefined && t.length > max ? `${etiqueta} no puede tener más de ${max} caracteres (tiene ${t.length}).` : "");
  switch (c.tipo) {
    case "texto": {
      const e = largo(s);
      return e ? mal(e) : bien(s);
    }
    case "codigo": {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s)) return mal(`${c.titulo} solo puede tener letras, números, punto, guion y guion bajo, sin espacios.`);
      const e = largo(s);
      return e ? mal(e) : bien(s);
    }
    case "entero": {
      const n = Number(s.replace(/\.0+$/, ""));
      if (!/^-?\d+(\.0+)?$/.test(s) || !Number.isInteger(n)) return mal(`${c.titulo} debe ser un número entero, sin puntos ni comas.`);
      if (c.noCero && n === 0) return mal(`${c.titulo} no puede ser 0: usa un número positivo para sumar o negativo para restar.`);
      if (c.min !== undefined && n < c.min) return mal(`${c.titulo} no puede ser menor que ${c.min.toLocaleString("es")}.`);
      if (c.max !== undefined && n > c.max) return mal(`${c.titulo} no puede ser mayor que ${c.max.toLocaleString("es")}.`);
      return bien(n);
    }
    case "decimal": {
      const n = Number(s.replace(",", "."));
      if (!/^-?\d+([.,]\d+)?$/.test(s) || !Number.isFinite(n)) return mal(`${c.titulo} debe ser un número (por ejemplo 12.50).`);
      if (c.min !== undefined && n < c.min) return mal(`${c.titulo} no puede ser menor que ${c.min}.`);
      if (c.max !== undefined && n > c.max) return mal(`${c.titulo} no puede ser mayor que ${c.max}.`);
      return bien(Math.round(n * 100) / 100);
    }
    case "fecha": {
      const f = convertirFecha(s);
      return f ? bien(f) : mal(`${c.titulo} no es una fecha válida (usa AAAA-MM-DD o dd/mm/aaaa).`);
    }
    case "sino": {
      const k = sinTildes(s);
      return SI.has(k) ? bien(true) : NO.has(k) ? bien(false) : mal(`${c.titulo} debe ser Sí o No.`);
    }
    case "opcion": {
      const hallada = (c.opciones ?? []).find((o) => sinTildes(o) === sinTildes(s));
      return hallada ? bien(hallada) : mal(`${c.titulo} debe ser uno de: ${(c.opciones ?? []).join(", ")}.`);
    }
    case "lista":
    case "imagenes": {
      const items = separarLista(s);
      const largoMal = c.tipo === "lista" ? items.map((i) => largo(i, `Cada elemento de ${c.titulo}`)).find(Boolean) : "";
      return largoMal ? mal(largoMal) : bien(items);
    }
    case "url": {
      if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(s)) return mal(`${c.titulo} debe ser una dirección completa (https://…).`);
      const e = largo(s);
      return e ? mal(e) : bien(s);
    }
    case "correo": {
      if (!/^\S+@\S+\.\S+$/.test(s)) return mal(`${c.titulo} no es un correo válido.`);
      const e = largo(s);
      return e ? mal(e) : bien(s.toLowerCase());
    }
  }
}

/**
 * Procesa la matriz de la hoja «Datos». `claveCodigo` es la columna que identifica cada fila (código, nombre, documento…): las
 * repetidas dentro del archivo se rechazan a partir de la segunda. Las filas totalmente vacías se ignoran.
 */
export function procesarMatriz(cols: ColCarga[], matriz: string[][], claveCodigo?: string): ResultadoMatriz {
  const [encabezado, ...datos] = matriz;
  if (!encabezado || !encabezado.some((c) => c.trim())) return { filas: [], errorGeneral: "El archivo está vacío: no tiene encabezados." };
  const normal = encabezado.map((h) => normalizarEncabezado(h));
  const indice = cols.map((c) => normal.findIndex((h) => h === sinTildes(c.titulo) || h === sinTildes(c.clave) || (c.alias ?? []).some((a) => sinTildes(a) === h)));
  const faltan = cols.filter((c, i) => indice[i] === -1 && c.obligatoria).map((c) => c.titulo);
  if (faltan.length) return { filas: [], errorGeneral: `Faltan columnas en el archivo: ${faltan.join(", ")}. Usa la plantilla y no cambies los encabezados.` };
  if (claveCodigo && indice[cols.findIndex((c) => c.clave === claveCodigo)] === -1) return { filas: [], errorGeneral: "Falta la columna que identifica cada fila." };

  const vistos = new Map<string, number>();
  const filas: FilaProcesada[] = [];
  datos.forEach((celdas, k) => {
    if (!celdas.some((c) => (c ?? "").trim())) return;
    const fila = k + 2;
    const crudos = cols.map((_, i) => (indice[i]! >= 0 ? (celdas[indice[i]!] ?? "").trim() : ""));
    const valores: Valores = {};
    let error: string | undefined;
    cols.forEach((c, i) => {
      if (error || crudos[i] === "") return;
      const r = convertir(c, crudos[i]!);
      if (r.ok) valores[c.clave] = r.valor;
      else error = r.error;
    });
    if (!error && claveCodigo) {
      const v = String(valores[claveCodigo] ?? "").toLowerCase();
      if (!v) error = `Falta ${cols.find((c) => c.clave === claveCodigo)!.titulo}.`;
      else if (vistos.has(v)) error = `Está repetida: ya aparece en la fila ${vistos.get(v)}.`;
      else vistos.set(v, fila);
    }
    filas.push({ fila, crudos, valores, ...(error ? { error } : {}) });
  });
  return { filas };
}

/** Faltantes obligatorios de una fila que se va a CREAR. Cadena vacía si está completa. */
export function faltantesAlCrear(cols: ColCarga[], valores: Valores): string {
  const falta = cols.filter((c) => c.obligatoria && (valores[c.clave] === undefined || (Array.isArray(valores[c.clave]) && !(valores[c.clave] as unknown[]).length)));
  return falta.length ? `Faltan datos obligatorios para crearlo: ${falta.map((c) => c.titulo).join(", ")}.` : "";
}

/** Plantilla de Excel (instrucciones + Datos + Ejemplo) generada a partir de las columnas. */
export function plantillaDeColumnas(
  cols: ColCarga[],
  o: { titulo: string; descripcion: string; ejemplos?: (string | number)[][]; notas?: string[]; pasos?: string[] },
): PlantillaDef {
  const columnas: ColumnaPlantilla[] = cols.map((c) => {
    const limite = c.limite ? ` Máximo ${LIMITES[c.limite]} caracteres.` : "";
    return {
      clave: c.clave,
      titulo: c.titulo,
      obligatoria: !!c.obligatoria,
      ayuda: `${c.ayuda}${limite}`,
      ejemplo: c.ejemplo,
      ...(c.texto || c.tipo === "codigo" ? { texto: true } : {}),
      ...(c.tipo === "opcion" && c.opciones ? { opciones: c.opciones } : {}),
      ...(c.tipo === "sino" ? { opciones: ["Sí", "No"] } : {}),
    };
  });
  return { titulo: o.titulo, descripcion: o.descripcion, columnas, ...(o.ejemplos ? { ejemplos: o.ejemplos } : {}), ...(o.notas ? { notas: o.notas } : {}), ...(o.pasos ? { pasos: o.pasos } : {}) };
}
