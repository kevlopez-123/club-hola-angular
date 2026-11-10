import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const aviso = (page: import("@playwright/test").Page, texto: string | RegExp) => page.getByRole("alert").filter({ hasText: texto });

test.describe("Conexión y errores de red", () => {
  test("sin internet aparece el aviso y desaparece al volver", async ({ page, context }) => {
    await page.goto("/");
    await expect(aviso(page, "Sin conexión")).toHaveCount(0);
    await context.setOffline(true);
    await expect(aviso(page, "Sin conexión")).toBeVisible();
    await context.setOffline(false);
    await expect(aviso(page, "Sin conexión")).toHaveCount(0);
  });

  test("un error 503 del servidor muestra el aviso con Reintentar tras los reintentos de lectura", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => sessionStorage.setItem("bs_fallo", "503"));
    await page.goto("/canjea");
    await expect(aviso(page, "problema con el servidor")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  test("una red caída (status 0) se avisa como sin conexión", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => sessionStorage.setItem("bs_fallo", "0"));
    await page.goto("/canjea");
    await expect(aviso(page, "Sin conexión")).toBeVisible({ timeout: 10_000 });
  });

  test("un 401 en el panel (token vencido) cierra la sesión y vuelve al ingreso", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await expect(page.getByRole("button", { name: "Menú de usuario" })).toBeVisible();
    await page.evaluate(() => sessionStorage.setItem("bs_fallo", "401"));
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("ana"); // dispara una petición al API
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible({ timeout: 10_000 });
  });

  test("con la MockAPI normal no hay avisos en las pantallas principales", async ({ page }) => {
    for (const ruta of ["/", "/canjea", "/beneficios", "/vuelos"]) {
      await page.goto(ruta);
      await expect(aviso(page, /Sin conexión|problema con el servidor/)).toHaveCount(0);
    }
  });
});
