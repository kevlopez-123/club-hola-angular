export interface Environment {
  produccion: boolean;
  /** `true`: el navegador usa la MockAPI (sin backend). `false`: se llama a `apiBase`. */
  usarMock: boolean;
  /** URL base del API, sin barra final. */
  apiBase: string;
  /** Reintentos automáticos de lecturas (GET) ante cortes de red o 502/503/504. */
  reintentosLectura: number;
}