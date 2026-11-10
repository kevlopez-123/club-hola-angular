import { signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { catchError, of, type Observable } from "rxjs";

/**
 * Señal con el resultado de una lectura del API. Si falla (red, 5xx…) devuelve `inicial` en vez de romper la pantalla;
 * el aviso global de conexión (ConexionService) ya informa del problema. Úsalo en vez de `toSignal(api.get(...))`.
 */
export function leer<T>(origen: Observable<T>, inicial: T) {
  return toSignal(origen.pipe(catchError(() => of(inicial))), { initialValue: inicial });
}
/**
 * Lectura con estado para pantallas que cargan una sola vez: `datos` (undefined mientras carga o si falló),
 * `error` y `recargar()` para el botón Reintentar. Úsalo en vez de `toSignal(api.get(...))`.
 */
export function leerEstado<T>(origen: () => Observable<T>) {
  const datos = signal<T | undefined>(undefined);
  const error = signal(false);
  const recargar = () => {
    error.set(false);
    origen().subscribe({ next: (v) => datos.set(v), error: () => error.set(true) });
  };
  recargar();
  return { datos, error, recargar };
}