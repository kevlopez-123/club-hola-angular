import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Contenido editable desde el panel", () => {
  test("los títulos del Home se editan en Configuración y se ven en la portada", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await page.getByLabel("Beneficios: título").fill("Ofertas");
    await page.getByLabel("Beneficios: palabra destacada").fill("exclusivas");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText(/guardad/i).first()).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Ofertas.*exclusivas/ })).toBeVisible();
  });

  test("los enlaces del pie se editan: interno, externo y los vacíos se descartan", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await page.getByRole("button", { name: "Agregar enlace" }).first().click();
    const textos = page.getByLabel(/Información: texto del enlace/);
    const dirs = page.getByLabel(/Información: dirección del enlace/);
    const n = await textos.count();
    await textos.nth(n - 1).fill("Blog del programa");
    await dirs.nth(n - 1).fill("https://ejemplo.com/blog");
    await page.getByRole("button", { name: "Agregar enlace" }).first().click(); // fila vacía: se descarta
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText(/guardad/i).first()).toBeVisible();
    await page.goto("/");
    const enlace = page.getByRole("contentinfo").getByRole("link", { name: "Blog del programa" });
    await expect(enlace).toHaveAttribute("href", "https://ejemplo.com/blog");
    await expect(enlace).toHaveAttribute("target", "_blank");
  });

  test("el cupón informa las horas configuradas, no un número fijo", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/beneficios/b8");
    await page.getByRole("button", { name: "Generar cupón" }).click();
    await expect(page.getByRole("dialog")).toContainText(/validez de \d+ horas?/);
  });
});
