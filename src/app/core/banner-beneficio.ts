import type { Slide } from "./models";

/** Lo mínimo que se necesita de un beneficio para armar su banner. */
export interface BeneficioParaBanner {
  id: string;
  marca: string;
  nombre: string;
  descuento?: string | undefined;
  imagen: string;
  activo?: boolean | undefined;
  /** Vigencia (AAAA-MM-DD, inclusive). Sin fecha = sin límite por ese lado. */
  desde?: string | undefined;
  hasta?: string | undefined;
}

/** Un beneficio se puede mostrar si está activo y hoy cae dentro de su vigencia. */
export const beneficioPublicable = (b: BeneficioParaBanner, hoy: string) => b.activo !== false && (!b.desde || b.desde <= hoy) && (!b.hasta || b.hasta >= hoy);

/**
 * Banner de un beneficio: usa la misma foto del beneficio (cuadrada) y el sitio la compone con la marca, el nombre y el botón.
 * Devuelve null si el beneficio ya no existe o no se puede mostrar hoy, para que el banner desaparezca solo del carrusel.
 */
export function slideDeBeneficio(banner: { id?: string | undefined; key?: string | undefined }, b: BeneficioParaBanner | undefined, logoMarca: string, hoy: string): Slide | null {
  if (!b || !beneficioPublicable(b, hoy)) return null;
  return {
    id: banner.id ?? banner.key ?? b.id,
    imagen: b.imagen,
    alt: `${b.marca}: ${b.nombre}`,
    to: `/beneficios/${b.id}`,
    beneficio: { marca: b.marca, nombre: b.nombre, descuento: b.descuento ?? "", logo: logoMarca },
  };
}

/** Un mismo beneficio o evento no sale dos veces en el carrusel (queda el primero); los banners de imagen propia siempre se conservan. */
export function sinRepetidos(slides: Slide[]): Slide[] {
  const vistos = new Set<string>();
  return slides.filter((s) => {
    if (!s.beneficio && !s.evento) return true;
    const k = s.to ?? s.id;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/** Iniciales para el logo circular cuando la marca no tiene logo: «Edo Sushi Bar» → «ES». */
export function inicialesDeMarca(marca: string): string {
  const palabras = marca.trim().split(/\s+/).filter(Boolean);
  return palabras.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
