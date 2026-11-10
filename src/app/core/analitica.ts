/** Eventos del embudo de canje. Son anónimos: no llevan nombre, documento ni correo, solo un identificador de visita. */
export type TipoEvento = "ver_item" | "agregar_carrito" | "inicio_pago" | "canje";

export interface EventoAnalitica {
  tipo: TipoEvento;
  /** Producto o beneficio al que se refiere (no aplica al inicio de pago). */
  itemId?: string;
  itemTipo?: "producto" | "beneficio";
}

/** Pasos del embudo, en orden. */
export const PASOS_EMBUDO: { tipo: TipoEvento; etiqueta: string }[] = [
  { tipo: "ver_item", etiqueta: "Vio un producto o beneficio" },
  { tipo: "agregar_carrito", etiqueta: "Lo agregó al carrito" },
  { tipo: "inicio_pago", etiqueta: "Inició el pago" },
  { tipo: "canje", etiqueta: "Completó el canje" },
];

export const TIPOS_EVENTO: readonly TipoEvento[] = PASOS_EMBUDO.map((p) => p.tipo);

/** Resultado de `admin/reportes/embudo`. */
export interface Embudo {
  desde: string;
  hasta: string;
  pasos: { tipo: TipoEvento; etiqueta: string; visitas: number; previo: number; /** % respecto al paso anterior */ pasoAnterior: number; /** % respecto al primer paso */ global: number }[];
  top: { itemId: string; nombre: string; tipo: "producto" | "beneficio"; vistas: number; carritos: number; canjes: number }[];
  eventos: number;
}

/**
 * Embudo estricto: una visita cuenta en un paso solo si también hizo todos los anteriores.
 * `porVisita` agrupa los tipos de evento de cada visita.
 */
export function visitasPorPaso(porVisita: Iterable<Set<TipoEvento>>): number[] {
  const n = PASOS_EMBUDO.map(() => 0);
  for (const tipos of porVisita) {
    for (let i = 0; i < PASOS_EMBUDO.length; i++) {
      if (!tipos.has(PASOS_EMBUDO[i]!.tipo)) break;
      n[i]!++;
    }
  }
  return n;
}

/** Porcentaje con un decimal; 0 si no hay base. */
export const porcentaje = (parte: number, total: number) => (total ? Math.round((parte / total) * 1000) / 10 : 0);
