import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

// PNG de 2×2 px (mucho menor que cualquier mínimo recomendado)
const PNG_2X2 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8Dwn4GBgYGJAQoAHxQBA0bAfiQAAAAASUVORK5CYII=", "base64");

test.describe("Tamaño mínimo recomendado de imágenes", () => {
  test("Marca muestra el mínimo y avisa si la imagen subida es menor", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await expect(page.getByText("Mínimo recomendado: 400 × 100 px").first()).toBeVisible();
    await page.getByLabel("Subir Logo para fondo claro").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG_2X2 });
    await expect(page.getByRole("status").filter({ hasText: "se recomienda al menos 400 × 100 px" })).toBeVisible();
  });

  test("Productos muestra el mínimo y avisa en el cargador de imágenes", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await page.locator("tbody tr").first().waitFor();
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    await expect(page.getByText("Mínimo recomendado: 800 × 800 px")).toBeVisible();
    await page.getByLabel("Subir imagen").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG_2X2 });
    await expect(page.getByRole("status").filter({ hasText: "se recomienda al menos 800 × 800 px" })).toBeVisible();
  });
});
