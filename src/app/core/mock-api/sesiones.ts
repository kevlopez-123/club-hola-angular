/**
 * Sesiones del participante: una por dispositivo. Duran como máximo 5 días desde que se inicia la sesión (tope absoluto:
 * usarla no la alarga); pasado ese plazo hay que volver a validar documento y código.
 */
export const SESION_MAX_DIAS = 5;
export const SESION_MAX_MS = SESION_MAX_DIAS * 24 * 60 * 60_000;

export interface Sesion {
  id: string;
  dispositivo: string;
  creada: number;
  ultimoUso: number;
}

export function nuevaSesion(lista: Sesion[], dispositivo: string, ahora = Date.now(), id: string = crypto.randomUUID().replaceAll("-", "").slice(0, 16)): Sesion {
  const s: Sesion = { id, dispositivo: dispositivo.slice(0, 60) || "Dispositivo", creada: ahora, ultimoUso: ahora };
  lista.push(s);
  return s;
}

/** ¿La sesión sigue vigente? Vence a los 5 días de iniciada, se use o no; si venció, se elimina. Usarla solo anota el último uso. */
export function usarSesion(lista: Sesion[], id: string, ahora = Date.now()): boolean {
  const i = lista.findIndex((s) => s.id === id);
  if (i < 0) return false;
  if (ahora - lista[i]!.creada > SESION_MAX_MS) {
    lista.splice(i, 1);
    return false;
  }
  lista[i]!.ultimoUso = ahora;
  return true;
}

export function cerrarSesion(lista: Sesion[], id: string): void {
  const i = lista.findIndex((s) => s.id === id);
  if (i >= 0) lista.splice(i, 1);
}

export function cerrarTodasLasSesiones(lista: Sesion[]): void {
  lista.length = 0;
}
