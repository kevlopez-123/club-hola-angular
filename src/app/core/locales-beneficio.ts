/**
 * Dónde se puede canjear un beneficio. Un beneficio puede limitarse a algunos locales de su marca (`localesIds`);
 * si no elige ninguno, vale en todos los locales publicados de la marca.
 */
interface LocalMin {
  id: string;
  marca: string;
  activo?: boolean;
}
interface BeneficioMin {
  marca: string;
  localesIds?: string[] | undefined;
}

export function localesAplicables<L extends LocalMin>(b: BeneficioMin, locales: L[]): L[] {
  const deLaMarca = locales.filter((l) => l.marca === b.marca && l.activo !== false);
  const ids = b.localesIds ?? [];
  if (!ids.length) return deLaMarca;
  const elegidos = deLaMarca.filter((l) => ids.includes(l.id));
  // Si los locales elegidos ya no existen o están ocultos, el beneficio no se queda sin lugar: vale en todos los de la marca.
  return elegidos.length ? elegidos : deLaMarca;
}

/** ¿Este beneficio se puede canjear en este local? */
export const aplicaEnLocal = (b: BeneficioMin, l: LocalMin, locales: LocalMin[]): boolean => localesAplicables(b, locales).some((x) => x.id === l.id);
