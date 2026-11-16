import type * as QRCode from "qrcode";

/**
 * Carga la librería de QR bajo demanda (no pesa en la carga inicial). Es CommonJS: en la compilación de producción la importación
 * dinámica entrega el módulo dentro de `default`, y en desarrollo con las funciones en la raíz. Aquí se aceptan las dos formas.
 */
export async function cargarQr(): Promise<typeof QRCode> {
  const m = (await import("qrcode")) as unknown as typeof QRCode & { default?: typeof QRCode };
  return m.default && typeof m.default.toDataURL === "function" ? m.default : m;
}
