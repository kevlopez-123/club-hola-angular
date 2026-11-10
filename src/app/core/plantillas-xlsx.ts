import type { ErrorImportacion } from "./importaciones";
import type { Celda, HojaXlsx } from "./xlsx";

/**
 * Plantillas de carga masiva en Excel: tres hojas con el formato de la marca.
 *  - "Instrucciones": para qué sirve, cómo llenarla y una tabla de columnas (obligatoria, qué poner, ejemplo).
 *  - "Datos": la hoja que se sube (encabezados con * en los obligatorios, filas con formato y listas desplegables).
 *  - "Ejemplo": filas de muestra que NO se importan.
 * El lector de cargas toma la hoja "Datos" (o la primera si el archivo no es de la plantilla).
 */
export interface ColumnaPlantilla {
  clave: string;
  titulo: string;
  obligatoria?: boolean;
  /** Qué debe ir en la columna (formato, límites, valores permitidos). */
  ayuda: string;
  ejemplo: string | number;
  /** Se guarda como texto en Excel (documentos, códigos, teléfonos: conservan ceros a la izquierda). */
  texto?: boolean;
  /** Valores permitidos: la columna lleva lista desplegable. */
  opciones?: string[];
}

export interface PlantillaDef {
  titulo: string;
  descripcion: string;
  pasos?: string[];
  columnas: ColumnaPlantilla[];
  /** Filas de ejemplo adicionales (la primera sale de `ejemplo` de cada columna). */
  ejemplos?: (string | number)[][];
  /** Avisos que se muestran al final de las instrucciones. */
  notas?: string[];
  /** Filas con formato en la hoja Datos (por defecto 300). */
  filasDatos?: number;
  /** Datos que ya vienen llenos en la hoja Datos (exportar lo que hay para editarlo y volver a subirlo). */
  filas?: (string | number)[][];
}

export const HOJA_DATOS = "Datos";
const LINEA = 125; // caracteres por línea aproximados del texto combinado A:D

const altoTexto = (t: string) => Math.max(1, Math.ceil(t.length / LINEA)) * 15 + 4;

export function hojasPlantilla(def: PlantillaDef): HojaXlsx[] {
  const cols = def.columnas;
  const pasos = def.pasos ?? [
    `Descarga esta plantilla y llena solo la hoja «${HOJA_DATOS}», a partir de la fila 2 (no cambies los encabezados).`,
    "Las columnas con * son obligatorias. Mira la tabla de abajo para saber qué escribir en cada una.",
    "En la hoja «Ejemplo» hay filas de muestra que no se importan.",
    "Guarda el archivo como Excel (.xlsx) y súbelo en la pantalla de carga: antes de importar verás una revisión fila por fila.",
  ];
  const filas: Celda[][] = [];
  const altos: Record<number, number> = {};
  const nota = (t: string, e: "nota" | "texto" | "normal" = "normal") => {
    altos[filas.length] = altoTexto(t);
    filas.push([{ v: t, e: e === "normal" ? "texto" : e }, { v: null, e: "texto" }, { v: null, e: "texto" }, { v: null, e: "texto" }]);
  };
  filas.push([{ v: def.titulo, e: "titulo" }]);
  altos[0] = 28;
  nota(def.descripcion, "nota");
  filas.push([]);
  filas.push([{ v: "CÓMO LLENARLA", e: "etiqueta" }, { v: null, e: "etiqueta" }, { v: null, e: "etiqueta" }, { v: null, e: "etiqueta" }]);
  const combinar = ["A1:D1", "A2:D2", "A4:D4"];
  pasos.forEach((p, i) => {
    combinar.push(`A${filas.length + 1}:D${filas.length + 1}`);
    nota(`${i + 1}. ${p}`);
  });
  filas.push([]);
  filas.push(["COLUMNA", "OBLIGATORIA", "QUÉ ESCRIBIR", "EJEMPLO"].map((v) => ({ v, e: "encabezado" as const })));
  for (const c of cols) {
    filas.push([{ v: c.titulo, e: "etiqueta" }, { v: c.obligatoria ? "Sí" : "No", e: "texto" }, { v: c.opciones ? `${c.ayuda} Valores: ${c.opciones.join(", ")}.` : c.ayuda, e: "texto" }, { v: c.ejemplo, e: c.texto ? "codigoEjemplo" : "ejemplo" }]);
  }
  if (def.notas?.length) {
    filas.push([]);
    filas.push([{ v: "TEN EN CUENTA", e: "etiqueta" }, { v: null, e: "etiqueta" }, { v: null, e: "etiqueta" }, { v: null, e: "etiqueta" }]);
    combinar.push(`A${filas.length}:D${filas.length}`);
    for (const n of def.notas) {
      combinar.push(`A${filas.length + 1}:D${filas.length + 1}`);
      nota(`• ${n}`);
    }
  }
  const instrucciones: HojaXlsx = { nombre: "Instrucciones", filas, anchos: [26, 14, 70, 30], combinar, altos, sinBordes: true };

  const encabezados = cols.map((c) => ({ v: `${c.titulo.toUpperCase()}${c.obligatoria ? " *" : ""}`, e: c.obligatoria ? ("obligatorio" as const) : ("encabezado" as const) }));
  const llenas: Celda[][] = (def.filas ?? []).map((f) => cols.map((c, i) => ({ v: f[i] === "" ? null : (f[i] ?? null), e: c.texto ? ("codigo" as const) : ("borde" as const) })));
  const n = llenas.length + (def.filasDatos ?? (llenas.length ? 100 : 300));
  const vacias: Celda[][] = [...llenas, ...Array.from({ length: n - llenas.length }, () => cols.map((c) => ({ v: null, e: c.texto ? ("codigo" as const) : ("borde" as const) })))];
  const anchos = cols.map((c) => Math.min(48, Math.max(16, c.titulo.length + 6, String(c.ejemplo).length + 4)));
  const listas = cols.flatMap((c, i) => (c.opciones ? [{ columna: i, desde: 2, hasta: n + 1, opciones: c.opciones }] : []));
  const datos: HojaXlsx = { nombre: HOJA_DATOS, filas: [encabezados, ...vacias], encabezado: 0, anchos, listas };

  const muestra = [cols.map((c) => c.ejemplo), ...(def.ejemplos ?? [])].map((f) => f.map((v, i) => ({ v, e: cols[i]?.texto ? ("codigoEjemplo" as const) : ("ejemplo" as const) })));
  const ejemplo: HojaXlsx = { nombre: "Ejemplo", filas: [encabezados, ...muestra], encabezado: 0, anchos };
  return [instrucciones, datos, ejemplo];
}

/** Hoja de Excel con las filas rechazadas de una carga y el motivo, lista para corregir y volver a subir. */
export function hojaErrores(columnas: string[], errores: ErrorImportacion[]): HojaXlsx {
  const cab = ["FILA", "MOTIVO", ...columnas.map((c) => c.toUpperCase())];
  return { nombre: "Errores", encabezado: 0, anchos: [8, 48, ...columnas.map(() => 22)], filas: [cab, ...errores.map((e) => [e.fila, e.motivo, ...columnas.map((_, i) => e.datos[i] ?? "")])] };
}
