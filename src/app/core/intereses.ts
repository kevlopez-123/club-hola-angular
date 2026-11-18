/**
 * Intereses del participante: las categorías de beneficios de las que quiere recibir promociones destacadas
 * (push y correo). Una sola lista para los dos canales; empieza vacía.
 */
export type Intereses = {
  /** Slugs de categorías de beneficios. */
  beneficios: string[];
  /** Quiere recibir avisos push. El correo se rige por el consentimiento de novedades. */
  push: boolean;
};

export const interesesVacios = (): Intereses => ({ beneficios: [], push: false });

const unicos = (v: unknown, validos: readonly string[]): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && validos.includes(x)))] : [];

/** Deja solo categorías que existen (y están habilitadas), sin repetidas; cualquier otra cosa se descarta. */
export function sanearIntereses(entrada: unknown, beneficiosValidos: readonly string[]): Intereses {
  const e = (entrada ?? {}) as Partial<Record<keyof Intereses, unknown>>;
  return { beneficios: unicos(e.beneficios, beneficiosValidos), push: e.push === true };
}

/** Agrega o quita un slug de la lista. */
export const alternar = (lista: readonly string[], slug: string): string[] => (lista.includes(slug) ? lista.filter((s) => s !== slug) : [...lista, slug]);
