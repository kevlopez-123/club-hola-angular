import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Página Contáctanos", () => {
  test("horario, teléfonos y correo se configuran en el panel y se ven en la página", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await page.getByLabel("Horario de atención").fill("Lunes a sábado de 8h a 20h");
    await page.getByLabel("Teléfonos", { exact: true }).fill("1800 111 222");
    await page.getByLabel("Correo", { exact: true }).fill("hola@bancosolidario.test");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Configuración guardada")).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").config?.contacto?.correo)).toBe("hola@bancosolidario.test");
    await page.goto("/contacto");
    const tarjeta = page.locator("section", { has: page.getByRole("heading", { name: "Contáctanos", exact: true }) });
    await expect(tarjeta).toContainText("Lunes a sábado de 8h a 20h");
    await expect(tarjeta).toContainText("1800 111 222");
    await expect(tarjeta).toContainText("hola@bancosolidario.test");
  });

  test("si el correo y los teléfonos quedan vacíos se usan los de soporte del pie", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await page.getByLabel("Teléfonos", { exact: true }).fill("");
    await page.getByLabel("Correo", { exact: true }).fill("");
    await page.getByLabel("Horario de atención").fill("");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Configuración guardada")).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").config?.contacto?.horario)).toBe("");
    await page.goto("/contacto");
    const tarjeta = page.locator("section", { has: page.getByRole("heading", { name: "Contáctanos", exact: true }) });
    await expect(tarjeta).toContainText("servicioalcliente@banco-solidario.com"); // correo de soporte del pie
    await expect(tarjeta).toContainText("1800 SOLIDARIO");
    await expect(tarjeta.locator("svg").first()).toBeVisible();
  });

  test("una consulta enviada desde Contáctanos llega a Atención con el participante, su teléfono y WhatsApp", async ({ page }) => {
    await page.goto("/contacto");
    await page.getByLabel("Teléfono").fill("996543210");
    await page.getByLabel("Consulta").fill("No me llegó el correo con mi cupón de Cinemark");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByRole("dialog", { name: "Consulta enviada" })).toBeVisible();

    await entrarAdmin(page);
    await page.goto("/admin/atencion");
    const fila = page.locator("tbody tr", { hasText: "No me llegó el correo con mi cupón" }).first();
    await expect(fila).toBeVisible();
    await expect(fila).toContainText("Nuevo");
    await fila.getByRole("button", { name: /Ver|Abrir|Responder|Gestionar/ }).first().click();
    const d = page.locator("aside").last();
    await expect(d).toContainText("Recibido desde: Contáctanos");
    await expect(d).toContainText("99654");
    await expect(d.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/593996543210\?text=/);
    await expect(d.getByRole("link", { name: "Correo" })).toHaveAttribute("href", /^mailto:.+subject=Re/);
  });
});
