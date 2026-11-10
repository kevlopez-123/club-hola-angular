import type { Environment } from "./environment.model";

/** Producción. Mientras no haya backend sigue usando la MockAPI; al conectarlo: usarMock false y apiBase real. */
export const environment: Environment = {
  produccion: true,
  usarMock: true,
  apiBase: "/api",
  reintentosLectura: 2,
};