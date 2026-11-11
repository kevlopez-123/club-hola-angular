import { db } from "./db";

/** Suma (o resta, con delta negativo) cupos libres de un evento, sin salirse de 0 ni de sus cupos totales. */
export function ajustarCupos(eventoId: string, delta: number) {
  const ev = (db.admin.eventos as any[]).find((e) => e.id === eventoId);
  if (!ev) return;
  ev.cuposRestantes = Math.max(0, Math.min(Number(ev.cupos), Number(ev.cuposRestantes) + delta));
}

/** Código de pre-inscripción (EVT-XXXXXXXX). */
export const codigoEvento = () => `EVT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
