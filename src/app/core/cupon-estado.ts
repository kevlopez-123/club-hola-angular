import type { EstadoBeneficio } from "./models";

/** «dd/mm/aaaa hh:mm» (o solo la fecha, que vale hasta el final del día) → milisegundos; 0 si no se puede leer. */
export function vencimientoMs(vence: string): number {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(vence);
  return m ? new Date(+m[3]!, +m[2]! - 1, +m[1]!, +(m[4] ?? 23), +(m[5] ?? 59)).getTime() : 0;
}

/**
 * Estado real de un cupón: uno guardado como «activo» cuya hora ya pasó está vencido (no debe salir en «Activos»
 * ni ofrecer su QR). Un cupón usado sigue usado aunque su fecha haya pasado.
 */
export function estadoRealCupon(estado: EstadoBeneficio, vence: string, ahora: number): EstadoBeneficio {
  if (estado === "usado") return "usado";
  return estado === "vencido" || vencimientoMs(vence) <= ahora ? "vencido" : estado;
}
