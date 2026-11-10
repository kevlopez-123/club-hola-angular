/** Campañas de correo masivo: audiencias y estados. Lo comparten el panel y la MockAPI. */
export type TipoAudiencia = "todos" | "nivel" | "saldo";

export interface AudienciaCampana {
  tipo: TipoAudiencia;
  /** Nombre del nivel (cuando tipo = "nivel"). */
  nivel?: string;
  /** Saldo mínimo de puntos (cuando tipo = "saldo"). */
  saldoMin?: number;
}

export interface Campana {
  id: string;
  nombre: string;
  asunto: string;
  mensaje: string;
  botonTexto?: string;
  botonUrl?: string;
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
  a.tipo === "todos" ? "Todos los participantes activos" : a.tipo === "nivel" ? `Nivel ${a.nivel ?? ""}` : `Saldo desde ${(a.saldoMin ?? 0).toLocaleString("es")} puntos`;

/** ¿Este participante entra en la audiencia? (sin contar las exclusiones por bloqueo o por no aceptar novedades). */
export function coincideAudiencia(a: AudienciaCampana, p: { puntos: number }, nombreNivel: string): boolean {
  if (a.tipo === "nivel") return nombreNivel === a.nivel;
  if (a.tipo === "saldo") return p.puntos >= (a.saldoMin ?? 0);
  return true;
}