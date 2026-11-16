import type * as Leaflet from "leaflet";

/**
 * Carga Leaflet bajo demanda (no pesa en la carga inicial). Leaflet es CommonJS: en la compilación de producción la importación
 * dinámica entrega el módulo dentro de `default`, y en desarrollo con las funciones en la raíz. Aquí se aceptan las dos formas.
 */
export async function cargarLeaflet(): Promise<typeof Leaflet> {
  const m = (await import("leaflet")) as unknown as typeof Leaflet & { default?: typeof Leaflet };
  return m.default && typeof m.default.map === "function" ? m.default : m;
}
