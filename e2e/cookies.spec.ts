import { expect, test } from "@playwright/test";

// Estas pruebas parten SIN haber respondido el aviso.
test.use({ storageState: { cookies: [], origins: [] } });

const aviso = (page: import("@playwright/test").Page) => page.getByRole("dialog", { name: /Tu privacidad en/ });
const guardado = (page: import("@playwright/test").Page) => page.evaluate(() => JSON.parse(localStorage.getItem("bs_consentimiento") ?? "null"));

test.describe("Consentimiento de cookies", () => {
  test("la primera visita muestra el aviso; Aceptar todas lo guarda y no vuelve a aparecer", async ({ page }) => {
    await page.goto("/terminos");
    await expect(aviso(page)).toBeVisible();
    await page.getByRole("button", { name: "Aceptar todas" }).click();
    await expect(aviso(page)).toHaveCount(0);
    expect(await guardado(page)).toMatchObject({ v: 1, analitica: true, marketing: true });
    await page.reload();
    await expect(page.getByRole("button", { name: "Preferencias de cookies" })).toBeVisible();
    await expect(aviso(page)).toHaveCount(0);
  });

  test("Solo esenciales rechaza analítica y marketing", async ({ page }) => {
    await page.goto("/terminos");
    await page.getByRole("button", { name: "Solo esenciales" }).click();
    expect(await guardado(page)).toMatchObject({ analitica: false, marketing: false });
    await expect(aviso(page)).toHaveCount(0);
  });

  test("Configurar permite elegir por categoría; las esenciales no se pueden desactivar", async ({ page }) => {
    await page.goto("/terminos");
    await page.getByRole("button", { name: "Configurar" }).click();
    await expect(page.getByLabel("Cookies esenciales (siempre activas)")).toBeDisabled();
    await page.getByLabel("Cookies de analítica").check();
    await page.getByRole("button", { name: "Guardar mi elección" }).click();
    expect(await guardado(page)).toMatchObject({ analitica: true, marketing: false });
  });

  test("el pie permite reabrir las preferencias y cambiar la elección", async ({ page }) => {
    await page.goto("/terminos");
    await page.getByRole("button", { name: "Aceptar todas" }).click();
    await page.getByRole("button", { name: "Preferencias de cookies" }).click();
    await expect(aviso(page)).toBeVisible();
    await page.getByRole("button", { name: "Solo esenciales" }).click();
    expect(await guardado(page)).toMatchObject({ analitica: false, marketing: false });
  });

  test("también aparece en el ingreso (/login), primera pantalla de muchas visitas", async ({ page }) => {
    await page.goto("/login");
    await expect(aviso(page)).toBeVisible();
  });

  test("el aviso no tapa el panel de administración ni aparece allí", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible();
    await expect(aviso(page)).toHaveCount(0);
  });
});