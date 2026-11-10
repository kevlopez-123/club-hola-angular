import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const esperarCarga = async (page: import("@playwright/test").Page) => {
  await page.locator("app-product-section app-product-card").first().waitFor();
};

async function crearProducto(page: import("@playwright/test").Page, nombre: string) {
  await page.goto("/admin/productos");
  await page.locator("tbody tr").first().waitFor();
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByRole("textbox", { name: /^Nombre/ }).first().fill(nombre);
  await page.getByRole("spinbutton", { name: /^Puntos/ }).fill("1500");
  await page.getByRole("spinbutton", { name: /^Precio/ }).fill("20");
}

test.describe("Pestañas del Home: mezcla de automático y manual", () => {
  test("un producto nuevo aparece solo en Novedades (y no en Más vistos ni Destacados)", async ({ page }) => {
    await entrarAdmin(page);
    await crearProducto(page, "Producto Recién Llegado");
    await page.getByRole("button", { name: "Guardar producto" }).click();
    await page.goto("/");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Novedades" }).click();
    await expect(page.locator("app-product-section app-product-card").first()).toContainText("Producto Recién Llegado");
    await page.getByRole("button", { name: "Más vistos" }).click();
    await expect(page.locator("app-product-section app-product-card").filter({ hasText: "Producto Recién Llegado" })).toHaveCount(0);
    await page.getByRole("button", { name: "Destacados" }).click();
    await expect(page.locator("app-product-section app-product-card").filter({ hasText: "Producto Recién Llegado" })).toHaveCount(0);
  });

  test("Fijar en Más vistos lo pone primero; Fijar en Novedades también", async ({ page }) => {
    await entrarAdmin(page);
    await crearProducto(page, "Producto Fijado");
    await page.getByRole("switch", { name: "Fijar en Más vistos" }).click();
    await page.getByRole("button", { name: "Guardar producto" }).click();
    await page.goto("/");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Más vistos" }).click();
    await expect(page.locator("app-product-section app-product-card").first()).toContainText("Producto Fijado");
  });

  test("abrir la ficha de un producto suma una vista", async ({ page }) => {
    const vistas = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.productos?.find((p: any) => p.id === "p7")?.vistas ?? 0);
    await page.goto("/canjea/p7");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(vistas).toBeGreaterThan(0);
    const antes = await vistas();
    await page.goto("/canjea/p7");
    await expect.poll(vistas).toBeGreaterThan(antes);
  });
});
