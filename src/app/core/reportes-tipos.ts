import { formatUSD } from "./format";

/**
 * Reportes por tipo. El servidor declara qué reportes existen y devuelve, para cada uno, indicadores, gráficos y la
 * definición de su tabla; el panel los dibuja sin saber de antemano cuáles son. Agregar un reporte no exige tocar la pantalla.
 */
export type Formato = "n" | "usd" | "pct" | "dec";

export interface TipoReporte {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

export interface KpiReporte {
  id: string;
  etiqueta: string;
  icono: string;
  formato: Formato;
  valor: number;
  /** Valor del período anterior; null en reportes que son una foto del momento (inventario, participantes). */
  previo: number | null;
}

export interface GraficoReporte {
  id: string;
  titulo: string;
  tipo: "line" | "bar" | "doughnut";
  horizontal?: boolean;
  etiquetas: string[];
  series: { label: string; data: number[]; color?: string; fill?: boolean }[];
}

export interface ColumnaReporte {
  k: string;
  l: string;
  /** texto (por defecto), n = número, usd = dinero, estado = etiqueta de color, cant = largo de una lista. */
  tipo?: "texto" | "n" | "usd" | "estado" | "cant";
  /** Nombre legible de cada valor guardado (p. ej. acumulacion → Acumulación). */
  etiquetas?: Record<string, string>;
  /** Cuánto ocupa en la tarjeta: media fila o la fila completa (por defecto, el texto ocupa la fila y lo demás media). */
  ancho?: "mitad" | "completo";
  /** Sin etiqueta encima (p. ej. la etiqueta de estado que va justo bajo el título de la tarjeta). */
  sinEtiqueta?: boolean;
  /** Campo por el que se ordena al pulsar la columna, si no es ella misma (p. ej. la fecha ordena por fechaISO). */
  ordenPor?: string;
}

export interface FiltroReporte {
  k: string;
  l: string;
  opciones: { v: string; l: string }[];
}

export interface ReporteTipo extends TipoReporte {
  desde: string;
  hasta: string;
  anterior: { desde: string; hasta: string } | null;
  kpis: KpiReporte[];
  graficos: GraficoReporte[];
  /** Colección de la API que alimenta la tabla (admin/q/<coleccion>); vacío si el reporte no tiene tabla. */
  coleccion: string;
  tablaTitulo: string;
  /** La tabla se limita al rango de fechas (los reportes "foto" listan todo). */
  tablaPorRango: boolean;
  /** Orden inicial de la tabla (lo más reciente primero en los reportes con fecha). */
  orden?: { k: string; dir: "asc" | "desc" };
  columnas: ColumnaReporte[];
  filtros: FiltroReporte[];
  /** Ruta del panel donde se gestiona cada fila (para "Abrir en…"). */
  gestion?: { ruta: string; etiqueta: string; /** El ojo de cada fila abre directamente esa página (p. ej. la ficha) en vez de un detalle en ventana. */ directo?: boolean };
  /** Detalle exclusivo de este reporte (p. ej. artículos del embudo): tabla ya calculada. */
  extra?: { titulo: string; columnas: ColumnaReporte[]; filas: Record<string, string | number>[] };
}

/** Entero con punto de miles también en los de cuatro cifras (9.600; el formato "es" del navegador los deja sin separador). */
export const miles = (v: number): string => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function formatear(f: Formato, v: number): string {
  switch (f) {
    case "usd": return formatUSD(v);
    case "pct": return `${v.toLocaleString("es", { maximumFractionDigits: 1 })} %`;
    case "dec": return v.toLocaleString("es", { maximumFractionDigits: 1 });
    default: return miles(v);
  }
}

/** Variación respecto al período anterior ("nuevo" si antes era 0; vacío si no hay comparación). */
export function variacion(actual: number, previo: number | null): string {
  if (previo === null) return "";
  if (!previo) return actual ? "nuevo" : "sin cambio";
  const v = ((actual - previo) / previo) * 100;
  return `${v > 0 ? "▲ +" : v < 0 ? "▼ " : ""}${v.toLocaleString("es", { maximumFractionDigits: 1 })} %`;
}

/** Alertas del Dashboard: pendientes que alguien del equipo debe atender. */
export interface AlertaDashboard {
  id: string;
  nivel: "alta" | "media" | "info";
  titulo: string;
  detalle: string;
  cantidad: number;
  enlace: string;
}

export interface Dashboard {
  hoy: string;
  desde: string;
  hasta: string;
  anterior: { desde: string; hasta: string };
  kpis: KpiReporte[];
  /** Enlace al reporte de cada indicador (id del reporte por tipo). */
  enlaces: Record<string, string>;
  alertas: AlertaDashboard[];
  serie: { x: string; ventas: number; ventasPrevio: number }[];
  canales: { name: string; value: number }[];
  topCompras: { name: string; unidades: number }[];
  embudo: { etiqueta: string; visitas: number }[];
  pedidos: { codigo: string; fecha: string; cliente: string; estadoAdmin: string; montoUSD: number; entrega: string; items: { nombre: string; marca: string; cantidad: number }[] }[];
  mensajes: { id: string; asunto: string; nombre: string; email: string; mensaje: string; fecha: string; estado: string }[];
}
