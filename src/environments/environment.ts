/**
 * Configuración por entorno. Para conectar el backend real:
 *  1. `usarMock: false`  (el sitio y el panel dejan de usar la MockAPI en el navegador)
 *  2. `apiBase`: URL del API, p. ej. "https://api.midominio.com/v1"
 * `environment.prod.ts` reemplaza a este archivo en `ng build` (ver angular.json → fileReplacements).
 */
import type { Environment } from "./environment.model";

export const environment: Environment = {
  produccion: false,
  usarMock: true,
  apiBase: "/api",
  /** Reintentos automáticos de lecturas (GET) ante cortes de red o 502/503/504. */
  reintentosLectura: 2,
};
