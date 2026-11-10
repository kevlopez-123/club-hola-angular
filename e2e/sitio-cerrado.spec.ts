import { ORIGEN } from "./helpers";
import { expect, test } from "@playwright/test";

const sinSesion = { cookies: [], origins: [{ origin: ORIGEN, localStorage: [{ name: "bs_consentimiento", value: JSON.stringify({ v: 1, analitica: false, marketing: false, fecha: "2026-01-01T00:00:00.000Z" }) }] }] };

test.describe("Sitio cerrado: sin iniciar sesión no se puede navegar", () => {
  test.use({ storageState: sinSesion });

  for (const ruta of ["/", "/canjea", "/canjea/p1", "/beneficios", "/beneficios/b1", "/buscar?q=sony", "/vuelos", "/vuelos/destinos/galapagos", "/preguntas-frecuentes", "/carrito", "/perfil"]) {
    test(`${ruta} lleva al ingreso`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("button", { name: /Ingresar|Continuar|Enviar código/i }).first()).toBeVisible();
    });
  }

  test("al entrar se vuelve a la página que se había pedido", async ({ page }) => {
    await page.goto("/canjea/p1");
    await expect(page).toHaveURL(/\/login\?volver=%2Fcanjea%2Fp1/);
  });

  test("los textos legales y la baja de correos siguen abiertos, sin menú ni buscador", async ({ page }) => {
    for (const ruta of ["/terminos", "/privacidad", "/baja"]) {
      await page.goto(ruta);
      await expect(page).toHaveURL(new RegExp(ruta));
    }
    await page.goto("/terminos");
    await expect(page.getByRole("heading", { name: /Términos y condiciones/ }).first()).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Buscar productos o beneficios" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Canjea tus puntos" })).toHaveCount(0);
  });

  test("solo los textos legales se pueden indexar", async ({ page }) => {
    await page.goto("/terminos");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await page.goto("/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("Con sesión el sitio funciona como siempre", () => {
  test("se ve el catálogo, el menú y el buscador", async ({ page }) => {
    await page.goto("/canjea");
    await expect(page).toHaveURL(/\/canjea$/);
    await expect(page.locator("app-product-card").first()).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Buscar productos o beneficios" }).first()).toBeVisible();
  });
});