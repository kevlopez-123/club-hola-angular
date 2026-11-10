import { TIPOS_EVENTO, type TipoEvento } from "../analitica";

/** Evento guardado de forma compacta: fecha, visita, tipo, artículo y su clase (p = producto, b = beneficio). */
export interface EventoGuardado { f: string; v: string; t: TipoEvento; i?: string; k?: "p" | "b" }

export const MAX_EVENTOS = 4000;

/** Generador pseudoaleatorio con semilla fija: la demo siempre muestra los mismos números. */
const lcg = (semilla: number) => () => ((semilla = (semilla * 1664525 + 1013904223) >>> 0) / 2 ** 32);

/**
 * Historial de ejemplo de los últimos 56 días para que el embudo del panel no aparezca vacío:
 * cada visita ve un artículo; el 38 % lo agrega al carrito, el 62 % de ellas inicia el pago y el 78 % de estas termina el canje.
 */
export function analiticaSemilla(hoy: string, productos: string[], beneficios: string[]): EventoGuardado[] {
  const rnd = lcg(20261);
  const eventos: EventoGuardado[] = [];
  const base = new Date(hoy + "T00:00:00Z").getTime();
  const items = [...productos.slice(0, 12).map((id) => ({ id, k: "p" as const })), ...beneficios.slice(0, 8).map((id) => ({ id, k: "b" as const }))];
  if (!items.length) return eventos;
  for (let d = 55; d >= 0; d--) {
    const f = new Date(base - d * 864e5).toISOString().slice(0, 10);
    const visitas = 6 + Math.floor(rnd() * 9) + (d < 28 ? 3 : 0); // un poco más de actividad en el último mes
    for (let n = 0; n < visitas; n++) {
      const v = `s${f.replace(/-/g, "")}${n}`;
      const it = items[Math.floor(rnd() * rnd() * items.length)]!; // los primeros artículos se ven más
      const ev = (t: TipoEvento, conItem: boolean) => eventos.push(conItem ? { f, v, t, i: it.id, k: it.k } : { f, v, t });
      ev("ver_item", true);
      if (rnd() < 0.38) {
        ev("agregar_carrito", true);
        if (rnd() < 0.62) {
          ev("inicio_pago", false);
          if (rnd() < 0.78) ev("canje", true);
        }
      }
    }
  }
  return eventos.slice(-MAX_EVENTOS);
}

export const esTipoEvento = (t: unknown): t is TipoEvento => (TIPOS_EVENTO as readonly unknown[]).includes(t);
