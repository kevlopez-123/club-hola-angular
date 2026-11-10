import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="red"/></svg>';

async function editarCategoria(page: Page, nombre: string) {
  await page.goto("/admin/productos");
  await page.locator("tbody tr").first().waitFor();
  await page.getByRole("button", { name: "Categorías y subcategorías" }).click();
  await page.locator("a-panel").filter({ has: page.getByText(nombre, { exact: true }) }).first().getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("Ícono de las categorías", () => {
  test("se elige de la lista (modal con buscador) y se ve en el sitio", async ({ page }) => {
    await entrarAdmin(page);
    await editarCategoria(page, "Tecnología");
    const modal = page.getByRole("dialog");
    await modal.getByRole("button", { name: "Elegir ícono" }).click();
    await modal.getByLabel("Buscar ícono").fill("café");
    await modal.getByRole("button", { name: /café cafetería/ }).click();
    await expect(modal.getByLabel("Buscar ícono")).toHaveCount(0); // volvió al formulario
    await modal.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Categoría guardada")).toBeVisible();
    // el aviso sale antes de que el servidor simulado termine de guardar: se espera a que quede persistido
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").catalogo?.categoriasProducto?.some((c: any) => c.imagen || c.icon === "Coffee") ?? false)).toBe(true);
    await page.goto("/canjea");
    const btn = page.getByRole("button", { name: "Tecnología" }).first();
    await expect(btn.locator("svg").first()).toBeVisible();
    await expect(btn.locator("img")).toHaveCount(0);
    await expect(btn.locator("svg").first().locator("path, circle, line").first()).toBeAttached();
    // al reabrir, el ícono elegido aparece marcado
    await editarCategoria(page, "Tecnología");
    await page.getByRole("dialog").getByRole("button", { name: "Elegir ícono" }).click();
    await expect(page.getByRole("dialog").getByRole("button", { name: /café cafetería/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("sin buscar en la lista, puede subir su propio SVG y reemplaza al ícono", async ({ page }) => {
    await entrarAdmin(page);
    await editarCategoria(page, "Hogar");
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Subir SVG propio").setInputFiles({ name: "mi-icono.svg", mimeType: "image/svg+xml", buffer: Buffer.from(SVG) });
    await expect(modal.getByRole("button", { name: "Quitar SVG" })).toBeVisible();
    await modal.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Categoría guardada")).toBeVisible();
    // el aviso sale antes de que el servidor simulado termine de guardar: se espera a que quede persistido
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").catalogo?.categoriasProducto?.some((c: any) => c.imagen || c.icon === "Coffee") ?? false)).toBe(true);
    await page.goto("/canjea");    const rail = page.locator("button", { hasText: "Hogar" });
    await expect(rail.first().locator("img[src^='data:image/svg+xml']")).toBeVisible();
  });

  test("rechaza archivos que no son SVG y SVG con scripts", async ({ page }) => {
    await entrarAdmin(page);
    await editarCategoria(page, "Hogar");
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Subir SVG propio").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from("x") });
    await expect(modal.getByRole("alert")).toContainText("debe ser un SVG");
    await modal.getByLabel("Subir SVG propio").setInputFiles({ name: "malo.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') });
    await expect(modal.getByRole("alert")).toContainText("scripts");
    await expect(modal.getByRole("button", { name: "Quitar SVG" })).toHaveCount(0);
  });
});
