import type { Slide } from "./models";

/** Lo mínimo que se necesita de un evento para armar su banner. */
export interface EventoParaBanner {
  id: string;
  nombre: string;
  tipo: string;
  imagen: string;
  /** AAAA-MM-DD */
  fechaISO: string;
  lugar?: string | undefined;
  distrito?: string | undefined;
  activo?: boolean | undefined;
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "2026-12-12" → "12 dic" */
export const fechaCorta = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? `${d} ${MESES_CORTOS[m - 1]}` : iso;
};

/** Un evento se puede anunciar si está publicado y todavía no pasó. */
export const eventoPublicable = (e: EventoParaBanner, hoy: string) => e.activo !== false && e.fechaISO >= hoy;

/**
 * Banner de un evento: usa la foto del evento y el sitio la compone con su categoría, nombre, fecha, lugar y el botón (sin logo).
 * Devuelve null si el evento ya no existe, se despublicó o ya pasó, para que el banner salga solo del carrusel.
 */
export function slideDeEvento(banner: { id?: string | undefined; key?: string | undefined }, e: EventoParaBanner | undefined, categorias: readonly { slug: string; label: string }[], hoy: string): Slide | null {
  if (!e || !eventoPublicable(e, hoy)) return null;
  return {
    id: banner.id ?? banner.key ?? e.id,
    imagen: e.imagen,
    alt: e.nombre,
    to: `/eventos/${e.id}`,
    evento: {
      nombre: e.nombre,
      categoria: categorias.find((c) => c.slug === e.tipo)?.label ?? e.tipo,
      fecha: fechaCorta(e.fechaISO),
      lugar: [e.lugar, e.distrito].filter(Boolean).join(" · "),
    },
  };
}
