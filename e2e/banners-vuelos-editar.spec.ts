import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8Dwn4GBgYGJAQoAHxQBA0bAfiQAAAAASUVORK5CYII=", "base64");

test("banners de vuelos: se pueden editar (texto e imagen móvil) conservando posición y estado", async ({ page }) => {
  await entrarAdmin(page);
  await page.goto("/admin/destinos");
  await page.getByRole("button", { name: "Banners de vuelos" }).click();
  const paneles = page.locator("a-panel").filter({ has: page.getByRole("button", { name: "Editar" }) });
  await paneles.first().waitFor();
  const total = await paneles.count();
  expect(total).toBeGreaterThan(1);
  const segundo = paneles.nth(1);
  const alt0 = (await segundo.locator("img").first().getAttribute("alt")) ?? "";
  await segundo.getByRole("button", { name: "Editar" }).click();
  const d = page.getByRole("dialog", { name: "Editar banner de vuelos" });
  await expect(d.getByLabel("Texto alternativo")).toHaveValue(alt0);
  await expect(d.getByText("Imagen para móvil (opcional)")).toBeVisible();
  await d.getByLabel("Texto alternativo").fill("Banner de vuelos editado");
  await d.getByLabel("Subir imagen").last().setInputFiles({ name: "movil.png", mimeType: "image/png", buffer: PNG });
  await d.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Banner actualizado")).toBeVisible();
  await expect(paneles).toHaveCount(total); // no se duplicó
  await expect(paneles.nth(1)).toContainText("Banner de vuelos editado"); // misma posición
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").catalogo?.banners?.vuelos?.some((b: any) => b.alt === "Banner de vuelos editado" && b.imagenMovil))).toBe(true);
});
