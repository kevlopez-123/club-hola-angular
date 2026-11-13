/**
 * A quién se le muestra un banner. Un banner puede dirigirse a uno o más niveles (segmentos) y/o a quienes tienen ciertos intereses
 * (categorías de beneficios que marcaron como favoritos o canjearon). Sin segmento ni intereses es para todos, incluso sin sesión.
 */
export interface Audiencia {
  segmentos?: string[] | undefined;
  intereses?: string[] | undefined;
}

export interface Visitante {
  /** Nivel del participante con sesión iniciada; sin sesión, undefined. */
  nivel?: string | undefined;
  /** Categorías que le interesan. */
  intereses: string[];
}

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const incluye = (lista: string[], x: string) => lista.some((y) => igual(y, x));

export const esDirigido = (b: Audiencia) => !!(b.segmentos?.length || b.intereses?.length);

/** ¿Este visitante ve el banner? Si pide nivel o intereses, hace falta haber iniciado sesión y cumplirlos. */
export function bannerVisible(b: Audiencia, v: Visitante): boolean {
  if (!esDirigido(b)) return true;
  if (b.segmentos?.length && (!v.nivel || !incluye(b.segmentos, v.nivel))) return false;
  if (b.intereses?.length && !b.intereses.some((i) => incluye(v.intereses, i))) return false;
  return true;
}

/** Los banners pensados para esta persona van primero; el resto conserva el orden del panel. */
export function ordenarPorAudiencia<T extends Audiencia>(lista: T[]): T[] {
  return [...lista.filter(esDirigido), ...lista.filter((b) => !esDirigido(b))];
}

/** Texto corto de la audiencia, para el panel: «Todos», «Oro, Diamante» o «Interés: Cine». */
export function textoAudiencia(b: Audiencia): string {
  const partes: string[] = [];
  if (b.segmentos?.length) partes.push(b.segmentos.join(", "));
  if (b.intereses?.length) partes.push(`Interés: ${b.intereses.join(", ")}`);
  return partes.length ? partes.join(" · ") : "Todos";
}
