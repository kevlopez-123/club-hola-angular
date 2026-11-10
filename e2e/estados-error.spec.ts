import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const fallo = (page: import("@playwright/test").Page, v: string | null) =>
  page.evaluate((x) => (x === null ? sessionStorage.removeItem("bs_fallo") : sessionStorage.setItem("bs_fallo", x)), v);

test.describe("Estados de error y reintento", () => {
  test("Canjea: si el catálogo no carga se ve el error con Reintentar (no un skeleton infinito) y reintentar lo recupera", async ({ page }) => {
    await page.goto("/");
    await fallo(page, "503");
    await page.goto("/canjea");
    const estado = page.getByRole("alert").filter({ hasText: "No pudimos cargar la información" });
    await expect(estado).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("No encontramos productos")).toHaveCount(0); // el error no se disfraza de "sin resultados"
    await fallo(page, null);
    await estado.getByRole("button", { name: "Reintentar" }).click();
    await expect(estado).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Agregar al carrito" }).first()).toBeVisible();
  });

  test("Beneficios: mismo estado de error con Reintentar", async ({ page }) => {
    await page.goto("/");
    await fallo(page, "503");
    await page.goto("/beneficios");
    await expect(page.getByRole("alert").filter({ hasText: "No pudimos cargar la información" })).toBeVisible({ timeout: 10_000 });
  });

  test("las pantallas de cuenta no se rompen cuando el API falla (sin errores de JavaScript)", async ({ page }) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto("/");
    await fallo(page, "503");
    for (const ruta of ["/mis-compras", "/mis-puntos/historial", "/mis-beneficios", "/vuelos/cotizaciones"]) {
      await page.goto(ruta);
      await expect(page.getByRole("alert").filter({ hasText: "problema con el servidor" })).toBeVisible({ timeout: 10_000 });
    }
    expect(errores).toEqual([]);
  });

  test("Admin: una lista que falla muestra el error y Reintentar, no 'sin resultados'", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await fallo(page, "503");
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("ana");
    const error = page.getByRole("alert").filter({ hasText: "No pudimos cargar los datos" });
    await expect(error).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".adm-empty")).toBeHidden();
    await fallo(page, null);
    await error.getByRole("button", { name: "Reintentar" }).click();
    await expect(error).toHaveCount(0);
    await expect(page.locator("tbody tr").first()).toContainText("Ana");
  });
  for (const [ruta, titulo] of [["/admin", "Dashboard"], ["/admin/reportes", "Reportes"]]) {
    test(`Admin: ${titulo} muestra el error con Reintentar si el API falla y se recupera`, async ({ page }) => {
      const errores: string[] = [];
      page.on("pageerror", (e) => errores.push(e.message));
      await entrarAdmin(page);
      await fallo(page, "503");
      await page.goto(ruta);
      const error = page.getByRole("alert").filter({ hasText: "No pudimos cargar los datos" });
      await expect(error).toBeVisible({ timeout: 10_000 });
      await fallo(page, null);
      await error.getByRole("button", { name: "Reintentar" }).click();
      await expect(error).toHaveCount(0);
      await expect(page.getByRole("heading", { name: titulo, exact: true })).toBeVisible();
      expect(errores).toEqual([]);
    });
  }
  for (const [ruta, titulo] of [["/admin/reglas", "Reglas de puntos"], ["/admin/configuracion", "Configuración"], ["/admin/usuarios", "Usuarios"], ["/admin/contenido", "Contenido"], ["/admin/roles", "Roles"], ["/admin/auditoria", "Registro de cambios"]]) {
    test(`Admin: ${titulo} no se rompe si el API falla${titulo === "Roles" || titulo === "Registro de cambios" ? "" : " y ofrece Reintentar"}`, async ({ page }) => {
      const errores: string[] = [];
      page.on("pageerror", (e) => errores.push(e.message));
      await entrarAdmin(page);
      await fallo(page, "503");
      await page.goto(ruta);
      await expect(page.getByRole("heading", { name: titulo, exact: true })).toBeVisible({ timeout: 10_000 });
      if (titulo !== "Roles" && titulo !== "Registro de cambios") {
        const error = page.getByRole("alert").filter({ hasText: "No pudimos cargar los datos de esta pantalla" });
        await expect(error).toBeVisible({ timeout: 10_000 });
        await fallo(page, null);
        await error.getByRole("button", { name: "Reintentar" }).click();
        await expect(error).toHaveCount(0);
      }
      expect(errores).toEqual([]);
    });
  }
});
