import { expect, test } from "@playwright/test";

test.describe("Mis datos: validaciones y provincia → ciudad", () => {
  test("la ciudad depende de la provincia: lista fija y se borra al cambiar de provincia", async ({ page }) => {
    await page.goto("/perfil");
    const provincia = page.locator("#pf-f7");
    const ciudad = page.locator("#pf-f8");
    await expect(ciudad).toBeDisabled();
    await provincia.selectOption("Pichincha");
    await expect(ciudad).toBeEnabled();
    const opciones = await ciudad.locator("option").allTextContents();
    expect(opciones).toContain("Quito");
    expect(opciones).not.toContain("Guayaquil");
    await ciudad.selectOption("Quito");
    await provincia.selectOption("Guayas");
    await expect(ciudad).toHaveValue("");
    expect(await ciudad.locator("option").allTextContents()).toContain("Guayaquil");
  });

  test("fecha de nacimiento: no futura, mayor de 18 y fecha real", async ({ page }) => {
    await page.goto("/perfil");
    const f = page.getByLabel("Fecha de nacimiento");
    const alerta = page.getByRole("alert");
    await f.fill("2015-01-01");
    await f.blur();
    await expect(alerta.filter({ hasText: "al menos 18" })).toBeVisible();
    await f.fill("2099-01-01");
    await f.blur();
    await expect(alerta.filter({ hasText: "futura" }).or(alerta.filter({ hasText: "al menos 18" }))).toBeVisible();
    await f.fill("1990-05-05");
    await f.blur();
    await expect(alerta.filter({ hasText: /18|futura|válida/ })).toHaveCount(0);
    expect(await f.getAttribute("max")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("nombres, teléfono y correo se validan al salir del campo", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByLabel("Nombres").fill("Ana123");
    await page.getByLabel("Nombres").blur();
    await expect(page.getByText(/solo puede llevar letras/)).toBeVisible();
    await page.getByLabel("N.º de celular").fill("12345");
    await page.getByLabel("N.º de celular").blur();
    await expect(page.getByText(/debe tener 9 dígitos \(faltan 4\)/)).toBeVisible();
    await page.getByLabel("Correo electrónico *").fill("ana@");
    await page.getByLabel("Correo electrónico *").blur();
    await expect(page.getByText(/correo válido/)).toBeVisible();
  });

  test("no guarda con errores y guarda con datos válidos (provincia y ciudad incluidas)", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByLabel("N.º de celular").fill("12");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Revisa/ })).toBeVisible();
    await expect(page.getByText("Tus cambios se guardaron correctamente.")).toHaveCount(0);
    await page.getByLabel("Nombres").fill("Ana María");
    await page.getByLabel("Apellido paterno").fill("Torres");
    await page.getByLabel("Correo electrónico *").fill("ana@correo.com");
    await page.getByLabel("N.º de celular").fill("996543210");
    await page.getByLabel("Género").selectOption("Femenino");
    await page.locator("#pf-f7").selectOption("Pichincha");
    await page.locator("#pf-f8").selectOption("Quito");
    await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Tus cambios se guardaron correctamente.")).toBeVisible();
    await page.reload();
    await expect(page.locator("#pf-f7")).toHaveValue("Pichincha");
    await expect(page.locator("#pf-f8")).toHaveValue("Quito");
  });
});
