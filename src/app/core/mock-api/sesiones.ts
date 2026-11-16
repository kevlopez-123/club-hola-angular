/** Sesiones del participante: una por dispositivo. Se renuevan al usarse y vencen tras 30 días sin usarse. */
export const SESION_INACTIVIDAD_MS = 30 * 24 * 60 * 60_000;

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

/** ¿La sesión sigue vigente? Si sí, se renueva (cuenta desde ahora); si venció, se elimina. */
export function usarSesion(lista: Sesion[], id: string, ahora = Date.now()): boolean {
  const i = lista.findIndex((s) => s.id === id);
  if (i < 0) return false;
  if (ahora - lista[i]!.ultimoUso > SESION_INACTIVIDAD_MS) {
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
