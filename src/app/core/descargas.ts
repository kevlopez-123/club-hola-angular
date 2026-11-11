import { Injectable, effect, inject, signal } from "@angular/core";
import { BrandService } from "./brand.service";
import { pdfTabla } from "./pdf-tabla";
import { crearXlsx, type HojaXlsx } from "./xlsx";

/**
 * Descargas de la plataforma: solo Excel (.xlsx) o PDF, nunca CSV. Los listados del panel piden el formato en un diálogo
 * (a-descarga-dialog) y los dos formatos salen con el color de la marca. Con un servidor real, el mismo contrato lo cubriría el backend.
 */
export type FormatoDescarga = "xlsx" | "pdf";

export interface TablaDescarga {
  /** Nombre del archivo sin extensión (se le agrega la fecha). */
  nombre: string;
  /** Título que se ve en el PDF y en la hoja de Excel. */
  titulo: string;
  subtitulo?: string;
  columnas: string[];
  filas: (string | number)[][];
}

let colorActual = "#00bdd2";
let programaActual = "Club Hola";
let servicio: DescargaService | undefined;

/** Color de la marca vigente (para los Excel y PDF que se arman fuera de un componente). */
export const colorMarca = () => colorActual;

const hoy = () => new Date().toISOString().slice(0, 10);
const ahora = () => new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

export function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Hoja de Excel con encabezado de marca (en mayúscula), filtro y fila fija. */
export function hojaDeTabla(t: Pick<TablaDescarga, "titulo" | "columnas" | "filas">, nombreHoja?: string): HojaXlsx {
  return { nombre: nombreHoja ?? t.titulo, filas: [t.columnas.map((c) => c.toUpperCase()), ...t.filas], encabezado: 0 };
}

export function descargarExcel(t: TablaDescarga) {
  guardarArchivo(new Blob([crearXlsx([hojaDeTabla(t)], colorActual) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${t.nombre}_${hoy()}.xlsx`);
}

export function descargarPdf(t: TablaDescarga) {
  guardarArchivo(pdfTabla({ programa: programaActual, titulo: t.titulo, ...(t.subtitulo ? { subtitulo: t.subtitulo } : {}), generado: ahora(), color: colorActual, columnas: t.columnas, filas: t.filas }), `${t.nombre}_${hoy()}.pdf`);
}

export function descargarTablaEn(t: TablaDescarga, formato: FormatoDescarga) {
  if (formato === "pdf") descargarPdf(t);
  else descargarExcel(t);
}

/**
 * Pide al usuario el formato (Excel o PDF) y descarga la tabla. `filas` trae el encabezado en la primera fila, como el antiguo
 * `descargarCsv`, para cambiar las llamadas sin tocar los datos.
 */
export function descargarTabla(nombre: string, filas: (string | number)[][], titulo?: string, subtitulo?: string) {
  const [columnas = [], ...datos] = filas;
  const t: TablaDescarga = { nombre: nombre.replace(/\.(csv|xlsx|pdf)$/i, ""), titulo: titulo ?? nombre.replace(/\.(csv|xlsx|pdf)$/i, "").replace(/[-_]+/g, " "), ...(subtitulo ? { subtitulo } : {}), columnas: columnas.map(String), filas: datos };
  if (servicio) servicio.pedir(t);
  else descargarExcel(t);
}

@Injectable({ providedIn: "root" })
export class DescargaService {
  private readonly brand = inject(BrandService);
  /** Tabla que espera que se elija el formato. */
  readonly pendiente = signal<TablaDescarga | null>(null);

  constructor() {
    servicio = this;
    effect(() => {
      colorActual = this.brand.tenant().tema.primario || colorActual;
      programaActual = this.brand.programa();
    });
  }
  pedir(t: TablaDescarga) {
    this.pendiente.set(t);
  }
  elegir(formato: FormatoDescarga) {
    const t = this.pendiente();
    this.pendiente.set(null);
    if (t) descargarTablaEn(t, formato);
  }
}
