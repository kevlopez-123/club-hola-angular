import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const guardado = (page: Page, id: string, campo: string) =>
  page.evaluate(([i, c]) => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.productos?.find((p: any) => p.id === i)?.[c as string], [id, campo]);

async function editarProducto(page: Page, busqueda: string) {
  await page.goto("/admin/productos");
  await page.locator("tbody tr").first().waitFor();
  await page.getByRole("textbox", { name: "Buscar producto" }).fill(busqueda);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.locator("tbody tr").first().getByRole("button", { name: "Editar" }).click();
  return page.locator("aside").last();
}

test.describe("Promoción, etiqueta propia y listas editables", () => {
  test("porcentaje: precio tachado, insignia y valores rebajados en la ficha y la card", async ({ page }) => {
    await entrarAdmin(page);
    const d = await editarProducto(page, "Galaxy A56");
    await d.getByLabel("Tipo de descuento").selectOption("porcentaje");
    await d.getByLabel("Descuento (%)").fill("20");
    await d.getByRole("button", { name: "Guardar producto" }).click();
    await expect.poll(() => guardado(page, "p7", "promoTipo")).toBe("porcentaje");
    await page.goto("/canjea/p7");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("article").first()).toContainText("-20%");
    await expect(page.locator("article").first()).toContainText("18.424 puntos");
    await expect(page.locator("article").first().locator("s", { hasText: "23.030" })).toBeVisible();
    await expect(page.locator("article").first()).toContainText("$263,20");
    await page.goto("/canjea");
    const card = page.locator("app-product-card").filter({ hasText: "Galaxy A56" }).first();
    await expect(card).toContainText("-20%");
    await expect(card.locator("s")).toHaveCount(2);
  });

  test("monto en US$: descuenta dinero y su equivalente en puntos", async ({ page }) => {
    await entrarAdmin(page);
    const d = await editarProducto(page, "Galaxy A56");
    await d.getByLabel("Tipo de descuento").selectOption("monto");
    await d.getByLabel("Descuento (US$)").fill("10");
    await d.getByRole("button", { name: "Guardar producto" }).click();
    await expect.poll(() => guardado(page, "p7", "promoTipo")).toBe("monto");
    await page.goto("/canjea/p7");
    await expect(page.locator("article").first()).toContainText("-$10");
    await expect(page.locator("article").first()).toContainText("22.330 puntos");
    await expect(page.locator("article").first()).toContainText("$319,00");
  });

  test("una promoción con fecha futura todavía no se muestra", async ({ page }) => {
    await entrarAdmin(page);
    const d = await editarProducto(page, "Galaxy A56");
    await d.getByLabel("Tipo de descuento").selectOption("porcentaje");
    await d.getByLabel("Descuento (%)").fill("30");
    await d.getByLabel("Desde (opcional)").fill("2099-01-01");
    await d.getByRole("button", { name: "Guardar producto" }).click();
    await expect.poll(() => guardado(page, "p7", "promoDesde")).toBe("2099-01-01");
    await page.goto("/canjea/p7");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("article").first()).not.toContainText("-30%");
    await expect(page.locator("article").first()).toContainText("23.030 puntos");
  });

  test("etiqueta propia con color, consideraciones y especificaciones se ven en la ficha", async ({ page }) => {
    await entrarAdmin(page);
    const d = await editarProducto(page, "Galaxy A56");
    await d.getByLabel("Texto (opcional)").fill("Solo hoy");
    await d.getByRole("combobox", { name: /^Color/ }).selectOption("verde");
    await d.getByLabel("Consideraciones (una por línea)").fill("Primera consideración\n\nSegunda consideración");
    await d.getByLabel("Especificaciones (una por línea)").fill("Memoria 128 GB");
    await d.getByRole("button", { name: "Guardar producto" }).click();
    await expect.poll(() => guardado(page, "p7", "etiqueta")).toBe("Solo hoy");
    await page.goto("/canjea/p7");
    await expect(page.getByText("Solo hoy").first()).toBeVisible();
    const sec = page.locator("section", { has: page.getByRole("heading", { name: "Consideraciones" }) });
    await expect(sec.locator("li")).toHaveCount(2); // la línea vacía se descarta
    await expect(sec).toContainText("Segunda consideración");
    await expect(page.locator("section", { has: page.getByRole("heading", { name: "Especificaciones" }) })).toContainText("Memoria 128 GB");
  });

  test("beneficio: especificaciones y etiqueta propia editables", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/beneficios");
    await page.locator("tbody tr").first().waitFor();
    await page.getByRole("textbox", { name: "Buscar beneficio" }).fill("combo familiar");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.locator("tbody tr").first().getByRole("button", { name: "Editar" }).click();
    const d = page.locator("aside").last();
    await d.getByLabel("Especificaciones (una por línea)").fill("Incluye bebida\nSolo fines de semana");
    await d.getByLabel("Texto (opcional)").fill("Nuevo");
    await d.getByRole("button", { name: "Guardar beneficio" }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.beneficios?.find((b: any) => b.id === "b1")?.etiqueta)).toBe("Nuevo");
    await page.goto("/beneficios/b1");
    await expect(page.locator("section", { has: page.getByRole("heading", { name: "Especificaciones" }) }).locator("li")).toHaveCount(2);
    await expect(page.getByText("Nuevo").first()).toBeVisible();
  });
});
