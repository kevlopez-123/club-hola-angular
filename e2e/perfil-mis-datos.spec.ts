import { expect, test } from "@playwright/test";

test("Mi perfil: un campo obligatorio vacío muestra su error junto al campo al guardar", async ({ page }) => {
  await page.goto("/perfil");
  const datos = page.locator("section", { has: page.getByRole("heading", { name: "Mis datos" }) });
  await expect(datos.getByLabel("N.º de celular")).toBeVisible();
  await expect(datos.getByRole("alert")).toHaveCount(0);
  await datos.getByLabel("Apellido paterno *").fill("");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(datos.getByText("Escribe apellido paterno.").first()).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /Revisa (el|los)/ })).toBeVisible();
});
