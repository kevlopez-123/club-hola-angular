/** Campañas de correo masivo: audiencias y estados. Lo comparten el panel y la MockAPI. */
export type TipoAudiencia = "todos" | "nivel";

export interface AudienciaCampana {
  tipo: TipoAudiencia;
  /** Nombre del nivel (cuando tipo = "nivel"). */
  nivel?: string;
}

export interface Campana {
  id: string;
  nombre: string;
  asunto: string;
  mensaje: string;
  botonTexto?: string;
  botonUrl?: string;
  /** Cuántas promociones destacadas se agregan al correo (0 = ninguna). */
  promociones?: number;
  audiencia: AudienciaCampana;
  estado: "Borrador" | "Enviada";
  /** Cuántos correos se pusieron en cola al enviarla. */
  total?: number;
  /** Cuántos participantes quedaron fuera (bloqueados o que no aceptan novedades). */
  excluidos?: number;
  creadaPor?: string;
  fechaISO?: string;
  fecha?: string;
  version?: number;
}

export const etiquetaAudiencia = (a: AudienciaCampana) =>
  a.tipo === "todos" ? "Todos los participantes activos" : `Nivel ${a.nivel ?? ""}`;

/** ¿Este participante entra en la audiencia? (sin contar las exclusiones por bloqueo o por no aceptar novedades). */
export function coincideAudiencia(a: AudienciaCampana, _p: unknown, nombreNivel: string): boolean {
  if (a.tipo === "nivel") return nombreNivel === a.nivel;
  return true;
}