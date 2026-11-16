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

/** Lo que se necesita de un tipo de documento para validar su número. */
export interface TipoDocumentoNumero {
  label: string;
  /** Largo exacto en los numéricos (DNI 8, RUC 11) y largo máximo en los demás. */
  digitos: number;
  numerico: boolean;
}

/** Deja solo lo que cabe en el número: dígitos en los numéricos, letras y números (en mayúsculas) en los demás, sin pasar del largo. */
export function limpiarNumeroDocumento(tipo: TipoDocumentoNumero | undefined, valor: string): string {
  const limpio = tipo?.numerico === false ? valor.replace(/[^A-Za-z0-9]/g, "").toUpperCase() : valor.replace(/\D/g, "");
  return limpio.slice(0, tipo?.digitos ?? 12);
}

/** Mensaje de error del número de documento según su tipo, o "" si está bien. Numéricos: largo exacto; los demás: de 6 al máximo. */
export function validarNumeroDocumento(tipo: TipoDocumentoNumero | undefined, valor: string): string {
  if (!tipo) return "Elige un tipo de documento.";
  const v = valor.trim();
  if (!v) return "Ingresa tu número de documento.";
  if (tipo.numerico) {
    if (!/^\d+$/.test(v)) return `${tipo.label}: usa solo números.`;
    return v.length === tipo.digitos ? "" : `${tipo.label}: debe tener ${tipo.digitos} dígitos.`;
  }
  if (!/^[A-Za-z0-9]+$/.test(v)) return `${tipo.label}: usa solo letras y números.`;
  const min = Math.min(6, tipo.digitos);
  return v.length >= min && v.length <= tipo.digitos ? "" : `${tipo.label}: debe tener de ${min} a ${tipo.digitos} caracteres.`;
}
