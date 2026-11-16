import { ApiError } from "./types";

const marcas = new Map<string, number[]>();

/**
 * Límite de consultas por ventana de tiempo (el backend real lo aplica por IP). Evita que alguien barra documentos
 * para saber cuáles ya aceptaron los textos legales. Pasado el máximo responde 429.
 */
export function limitar(clave: string, max = 5, ventanaMs = 60_000, ahora = Date.now()): void {
  const recientes = (marcas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= max) {
    marcas.set(clave, recientes);
    throw new ApiError(429, "Demasiadas consultas. Espera un momento.");
  }
  recientes.push(ahora);
  marcas.set(clave, recientes);
}

export const reiniciarLimites = () => marcas.clear();
