import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Textos editables de la pantalla de ingreso", () => {
  test("se editan en Configuración y se ven en /login; vacío usa el original y la nota legal se puede ocultar", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await page.getByLabel("Título del formulario", { exact: true }).fill("Bienvenido de vuelta");
    await page.getByLabel("Título del banner lateral").fill("Tus {unidad} en {banco}");
    await page.getByRole("switch", { name: "Ocultar la nota legal" }).click();
    await page.getByLabel("Texto de ayuda del número de documento").fill("Escribe tu documento");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Bienvenido de vuelta" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Tus .+ en Banco Solidario$/ })).toBeAttached();
    await expect(page.getByPlaceholder("Escribe tu documento")).toBeVisible();
    await expect(page.getByText("Al ingresar aceptas")).toHaveCount(0);
    // lo que no se editó conserva el texto original
    await expect(page.getByText("Selecciona tu tipo de documento e ingresa tu número para continuar.")).toBeVisible();
  });

  test("Restaurar textos originales devuelve los de fábrica", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await page.getByLabel("Título del formulario", { exact: true }).fill("Otro título");
    await page.getByRole("button", { name: "Restaurar textos originales" }).click();
    await expect(page.getByLabel("Título del formulario", { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Ingresa a tu cuenta" })).toBeVisible();
    await expect(page.getByText("Al ingresar aceptas")).toBeVisible();
  });
});
