import { ORIGEN } from "./helpers";
import { expect, test } from "@playwright/test";

// Estas pruebas parten SIN sesión (visitante) y sin haber respondido el aviso de cookies.
test.use({ storageState: { cookies: [], origins: [{ origin: ORIGEN, localStorage: [{ name: "bs_consentimiento", value: JSON.stringify({ v: 1, analitica: false, marketing: false, fecha: "2026-01-01T00:00:00.000Z" }) }] }] } });

async function ingresar(page: import("@playwright/test").Page) {
  await page.getByLabel("Número de documento").fill("1712345678");
  await page.getByRole("button", { name: "Continuar" }).click();
  for (let i = 1; i <= 6; i++) await page.getByLabel(`Dígito ${i}`).fill(String(i));
  await page.getByRole("button", { name: "Validar e ingresar" }).click();
}

test.describe("Sesión del participante: ingreso, rutas privadas y cierre", () => {
  test("el visitante no ve el catálogo: pasa al ingreso, sin puntos ni campanita", async ({ page }) => {
    await page.goto("/canjea");
    await expect(page).toHaveURL(/\/login\?volver=%2Fcanjea$/);
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
    await expect(page.getByText(/Tienes .* puntos/)).toHaveCount(0);
    await expect(page.locator("app-campanita")).toHaveCount(0);
  });

  test("una ruta privada sin sesión lleva al ingreso recordando a dónde volver", async ({ page }) => {
    await page.goto("/mis-compras");
    await expect(page).toHaveURL(/\/login\?volver=%2Fmis-compras$/);
    await expect(page.getByRole("heading", { name: "Ingresa a tu cuenta" })).toBeVisible();
  });

  test("todas las rutas piden ingreso, salvo Términos, Privacidad y baja", async ({ page }) => {
    for (const r of ["/", "/canjea", "/beneficios", "/vuelos", "/preguntas-frecuentes", "/carrito", "/favoritos", "/perfil", "/mi-nivel", "/notificaciones", "/mis-beneficios", "/mis-puntos/historial", "/mis-puntos/compra", "/contacto", "/vuelos/cotizaciones"]) {
      await page.goto(r);
      await expect(page, r).toHaveURL(/\/login/);
    }
    for (const r of ["/terminos", "/privacidad"]) {
      await page.goto(r);
      await expect(page, r).not.toHaveURL(/\/login/);
    }
  });

  test("al ingresar con el código se vuelve a la página que se pedía y se ven los datos de la cuenta", async ({ page }) => {
    await page.goto("/mis-compras");
    await ingresar(page);
    await expect(page).toHaveURL(/\/mis-compras$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Historial de compras/ })).toBeVisible();
    await expect(page.getByText(/Tienes .* puntos/).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("bs-token-participante"))).toMatch(/^mock\.participante\./);
    await page.reload(); // la sesión se recuerda
    await expect(page.getByRole("heading", { name: /Historial de compras/ })).toBeVisible();
  });

  test("el parámetro volver solo acepta rutas internas (no otros dominios)", async ({ page }) => {
    await page.goto("/login?volver=https%3A%2F%2Fmalo.example");
    await ingresar(page);
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 15_000 });
  });

  test("Cerrar sesión borra el token y vuelve al ingreso", async ({ page }) => {
    await page.goto("/login");
    await ingresar(page);
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 15_000 });
    await page.getByRole("link", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem("bs-token-participante"))).toBeNull();
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/login\?volver=/);
  });

  test("una ficha sin sesión pide ingresar y recuerda la página", async ({ page }) => {
    await page.goto("/beneficios/b8");
    await expect(page).toHaveURL(/\/login\?volver=%2Fbeneficios%2Fb8$/);
  });

  test("si el servidor responde 401 en una acción de cuenta, se pide ingresar de nuevo", async ({ page }) => {
    await page.goto("/login");
    await ingresar(page);
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 15_000 });
    await page.evaluate(() => localStorage.removeItem("bs-token-participante")); // el token deja de ser válido
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("bs-token-participante", "mock.vencido")); // token inválido: la API responde 401
    await page.goto("/notificaciones");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
