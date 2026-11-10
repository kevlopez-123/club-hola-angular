/** Historial de cargas masivas (participantes, códigos de beneficios…): qué se subió, qué entró y qué se rechazó y por qué. */
export interface ErrorImportacion {
  /** Número de fila en el archivo (1 = encabezado) o "—" si no aplica. */
  fila: number | string;
  motivo: string;
  /** Valores de la fila tal como venían. */
  datos: string[];
}

export interface Importacion {
  id: string;
  /** Qué se importó: "Participantes", "Códigos de beneficio"… */
  tipo: string;
  archivo: string;
  usuario: string;
  ts: string;
  fecha: string;
  fechaISO: string;
  total: number;
  importadas: number;
  conErrores: number;
  errores: ErrorImportacion[];
  /** Columnas esperadas (para el encabezado del reporte de errores). */
  columnas?: string[];
}

/** Filas del CSV "reporte de errores": las filas rechazadas con su motivo, listas para corregir y volver a subir. */
export function filasReporteErrores(columnas: string[], errores: ErrorImportacion[]): (string | number)[][] {
  return [["fila", "motivo", ...columnas], ...errores.map((e) => [e.fila, e.motivo, ...columnas.map((_, i) => e.datos[i] ?? "")])];
}