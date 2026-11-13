/**
 * Documento ofuscado para mostrarlo junto al cupón: solo se ven los 4 últimos caracteres (p. ej. «****4567»).
 * El comercio lo cruza con el documento físico de quien presenta el cupón, para que no se pueda ceder a otra persona.
 */
export function ofuscarDocumento(doc: string | undefined | null): string {
  const d = String(doc ?? "").replace(/\s+/g, "");
  if (!d) return "";
  const visibles = d.slice(-4);
  return `${"*".repeat(Math.max(4, d.length - visibles.length))}${visibles}`;
}
