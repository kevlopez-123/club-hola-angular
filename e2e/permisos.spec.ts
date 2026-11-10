import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Permisos por rol, sección y acción", () => {
  test("Solo lectura: menú reducido, aviso de solo lectura en reportes y sin acceso a otras secciones", async ({ page }) => {
    await entrarAdmin(page, "Solo lectura");
    const menu = page.getByRole("navigation").first();
    await expect(menu.getByRole("link", { name: "Reportes" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Pedidos" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Usuarios" })).toHaveCount(0);
    await page.goto("/admin/reportes");
    await expect(page.getByText(/Solo lectura\. Tu rol \(Solo lectura\)/)).toBeVisible();
    await page.goto("/admin/pedidos");
    await expect(page.getByRole("heading", { name: "Sin acceso a esta sección" })).toBeVisible();
  });

  test("Catálogo gestiona productos pero no ve participantes ni configuración", async ({ page }) => {
    await entrarAdmin(page, "Catálogo");
    const menu = page.getByRole("navigation").first();
    await expect(menu.getByRole("link", { name: "Productos" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Participantes" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Configuración" })).toHaveCount(0);
    await page.goto("/admin/productos");
    await expect(page.getByText(/Solo lectura\./)).toHaveCount(0);
    await page.goto("/admin/configuracion");
    await expect(page.getByRole("heading", { name: "Sin acceso a esta sección" })).toBeVisible();
  });

  test("Operaciones ve compras de puntos en solo lectura pero edita pedidos", async ({ page }) => {
    await entrarAdmin(page, "Operaciones");
    await page.goto("/admin/compras-puntos");
    await expect(page.getByText(/Solo lectura\./)).toBeVisible();
    await page.goto("/admin/pedidos");
    await expect(page.getByText(/Solo lectura\./)).toHaveCount(0);
  });

  test("el servidor rechaza con 403 una escritura sin permiso aunque la pantalla la permita", async ({ page }) => {
    await entrarAdmin(page); // Administrador
    await page.goto("/admin/reglas");
    await expect(page.getByRole("button", { name: "Guardar reglas" })).toBeVisible();
    // Un token de otro rol (p. ej. rol cambiado mientras la pestaña seguía abierta): el servidor es quien decide.
    await page.evaluate(() => sessionStorage.setItem("bs-token", "mock.Solo%20lectura.u5"));
    await page.getByRole("button", { name: "Guardar reglas" }).click();
    await expect(page.getByText("Tu rol (Solo lectura) no puede crear o editar en esta sección.")).toBeVisible();
    await expect(page.getByText("Reglas guardadas")).toHaveCount(0);
  });

  test("sin token el panel responde 401 y vuelve al ingreso", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await page.evaluate(() => sessionStorage.removeItem("bs-token"));
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("ana");
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible({ timeout: 10_000 });
  });

  test("Roles muestra la matriz de permisos por sección y acción", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/roles");
    await page.getByRole("button", { name: "Ver los permisos del rol Catálogo" }).click();
    const tabla = page.getByRole("table", { name: "Permisos del rol Catálogo" });
    await expect(tabla).toBeVisible();
    await expect(tabla.getByRole("columnheader", { name: "Eliminar" })).toBeVisible();
    await expect(tabla.locator("tr", { hasText: "Productos" }).getByLabel("Sí")).toHaveCount(4);
    await expect(tabla.getByText("Pedidos")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Ver los permisos del rol Solo lectura" }).click();
    const lectura = page.getByRole("table", { name: "Permisos del rol Solo lectura" });
    await expect(lectura.locator("tr", { hasText: "Reportes" }).getByLabel("Sí")).toHaveCount(2); // ver y exportar
  });
});
