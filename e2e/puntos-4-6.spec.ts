import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Tablas y formularios del admin (puntos 4-6)", () => {
  test("los encabezados ordenables anuncian aria-sort y reordenan", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.locator("tbody tr").first().waitFor();
    const th = page.locator("th", { hasText: "Participante" });
    await expect(th).toHaveAttribute("aria-sort", "none");
    await th.getByRole("button").click();
    await expect(th).toHaveAttribute("aria-sort", "ascending");
    await th.getByRole("button").click();
    await expect(th).toHaveAttribute("aria-sort", "descending");
  });

  test("validación: error al salir del campo, resumen y foco al primer error", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await page.locator("tbody tr").first().waitFor();
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    const nombre = page.getByRole("textbox", { name: /^Nombre/ }).first();
    await nombre.focus();
    await nombre.blur();
    await expect(page.getByText("Escribe el nombre del producto.")).toBeVisible();
    await expect(nombre).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Guardar producto" }).click();
    await expect(page.locator("[data-resumen-errores]")).toContainText("Revisa");
    await expect(nombre).toBeFocused();
    await nombre.fill("Producto de prueba");
    await expect(nombre).toHaveAttribute("aria-invalid", "false");
  });

  test("cerrar un formulario modificado pide confirmar y permite seguir editando", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await page.locator("tbody tr").first().waitFor();
    await page.locator("tbody tr").first().getByRole("button", { name: "Editar" }).click();
    const nombre = page.getByRole("textbox", { name: /^Nombre/ }).first();
    await nombre.fill("Cambiado a mano");
    await page.keyboard.press("Escape");
    await expect(page.getByText("¿Descartar los cambios?")).toBeVisible();
    await page.getByRole("button", { name: "Seguir editando" }).click();
    await expect(nombre).toHaveValue("Cambiado a mano");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Descartar" }).click();
    await expect(page.getByText("¿Descartar los cambios?")).toBeHidden();
    await expect(nombre).toBeHidden();
  });

  test("sin cambios, Escape cierra sin preguntar", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await page.locator("tbody tr").first().waitFor();
    await page.locator("tbody tr").first().getByRole("button", { name: "Editar" }).click();
    await page.getByRole("textbox", { name: /^Nombre/ }).first().waitFor();
    await page.keyboard.press("Escape");
    await expect(page.getByText("¿Descartar los cambios?")).toBeHidden();
    await expect(page.getByRole("textbox", { name: /^Nombre/ })).toHaveCount(0);
  });
});


