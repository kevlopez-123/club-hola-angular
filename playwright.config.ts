import { defineConfig } from "@playwright/test";

/**
 * Pruebas e2e. Usan el Microsoft Edge instalado en el sistema (sin descargar navegadores);
 * cambia `channel` a "chrome" o quítalo y ejecuta `npx playwright install chromium` si prefieres otro.
 */
/** Las pruebas parten con la sesión del participante iniciada (token simulado) y el aviso de cookies ya respondido (si no, taparía la parte baja de cada pantalla). Las de cookies lo quitan. */
const CONSENTIMIENTO = JSON.stringify({ v: 1, analitica: false, marketing: false, fecha: "2026-01-01T00:00:00.000Z" });

/** Puerto de la app bajo prueba (por defecto 4200; E2E_PORT permite usar otro si ese ya está ocupado por otro proyecto). */
const PUERTO = process.env["E2E_PORT"] ?? "4200";
const ORIGEN = `http://localhost:${PUERTO}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 }, // el servidor de desarrollo va más lento con varios navegadores a la vez
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: {
    baseURL: ORIGEN,
    channel: "msedge",
    viewport: { width: 1280, height: 800 },
    locale: "es-EC",
    trace: "retain-on-failure",
    storageState: {
      cookies: [],
      origins: [{ origin: ORIGEN, localStorage: [{ name: "bs_consentimiento", value: CONSENTIMIENTO }, { name: "bs-token-participante", value: "mock.participante.p1" }] }],
    },
  },
  webServer: {
    command: "npm start",
    env: { PORT: PUERTO },
    url: ORIGEN,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
