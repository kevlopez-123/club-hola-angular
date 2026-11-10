import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const display = (page: import("@playwright/test").Page) =>
  page.evaluate(() => ({ fila: getComputedStyle(document.querySelector("tbody tr")!).display, tabla: getComputedStyle(document.querySelector("table.adm-table")!).display, desborde: document.documentElement.scrollWidth > document.documentElement.clientWidth }));

test.describe("Vista de tabla en los módulos", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Pedidos cambia entre tarjetas y tabla y recuerda la elección", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/pedidos");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    expect((await display(page)).fila).toBe("grid");
    await page.getByRole("button", { name: "Tabla", exact: true }).click();
    const t = await display(page);
    expect(t.fila).toBe("table-row");
    expect(t.tabla).toBe("table");
    await expect(page.getByRole("button", { name: "Tabla", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    expect((await display(page)).fila).toBe("table-row");
    await page.getByRole("button", { name: "Tarjetas", exact: true }).click();
    expect((await display(page)).fila).toBe("grid");
  });

  test("la elección es de cada módulo: Pedidos en tabla no cambia Participantes", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/pedidos");
    await page.getByRole("button", { name: "Tabla", exact: true }).click();
    await page.goto("/admin/participantes");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    expect((await display(page)).fila).toBe("grid");
  });

  for (const [ruta, modulo] of [["/admin/cotizaciones", "Cotizaciones"], ["/admin/compras-puntos", "Compras de puntos"], ["/admin/movimientos", "Movimientos"], ["/admin/auditoria", "Registro de cambios"], ["/admin/importaciones", "Importaciones"]] as const) {
    test(`${modulo} ofrece el selector de vista`, async ({ page }) => {
      await entrarAdmin(page);
      await page.goto(ruta);
      await expect(page.getByRole("group", { name: "Vista de la lista" })).toBeVisible();
    });
  }
});
