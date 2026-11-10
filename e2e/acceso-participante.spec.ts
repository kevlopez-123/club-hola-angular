import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

async function ficha(page: Page, nombre = "Ana Torres") {
  await entrarAdmin(page);
  await page.goto("/admin/participantes");
  await page.getByPlaceholder("Buscar por nombre o cédula").fill(nombre);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name: "Ver ficha" }).click();
  await expect(page.getByRole("tab", { name: "Resumen" })).toBeVisible();
  return page.locator("main");
}

test.describe("Acceso del participante desde el panel (sin contraseña)", () => {
  test("Mi perfil ya no tiene la tarjeta Mi contraseña", async ({ page }) => {
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: "Mis datos" })).toBeVisible();
    await expect(page.getByText("Mi contraseña")).toHaveCount(0);
    await expect(page.getByLabel("Nueva contraseña")).toHaveCount(0);
  });

  test("reenviar código de acceso avisa a qué correo (enmascarado) y queda en auditoría", async ({ page }) => {
    const d = await ficha(page);
    await expect(d).toContainText("No tiene contraseña que restablecer");
    await d.getByRole("button", { name: "Reenviar código de acceso" }).click();
    await expect(page.getByText(/Código de acceso enviado a an\*+@correo\.com/)).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.auditoria?.some((a: any) => /Reenvió el código de acceso a Ana Torres/.test(a.accion)))).toBe(true);
  });

  test("una cuenta bloqueada no permite reenviar el código", async ({ page }) => {
    const d = await ficha(page);
    await d.getByRole("button", { name: "Bloquear cuenta" }).click();
    await page.getByRole("button", { name: "Bloquear", exact: true }).click();
    await expect(d.getByRole("button", { name: "Reenviar código de acceso" })).toBeDisabled();
    await expect(d).toContainText("actívala para poder enviar el código");
  });

  test("cambiar el correo de acceso: valida, rechaza repetidos, cambia y los códigos van al correo nuevo", async ({ page }) => {
    const d = await ficha(page);
    await d.getByRole("button", { name: "Cambiar correo de acceso" }).click();
    const m = page.getByRole("dialog", { name: "Cambiar correo de acceso" });
    await expect(m).toContainText("ana.torres@correo.com"); // correo actual
    await expect(m.getByRole("button", { name: "Cambiar correo" })).toBeDisabled(); // vacío
    await m.getByLabel("Correo nuevo").fill("correo-malo");
    await m.getByRole("button", { name: "Cambiar correo" }).click();
    await expect(m.getByRole("alert")).toContainText("correo válido");
    await m.getByLabel("Correo nuevo").fill("carlos.andrade@correo.com"); // lo usa otro participante
    await m.getByRole("button", { name: "Cambiar correo" }).click();
    await expect(m.getByRole("alert")).toContainText("ya lo usa otro participante");
    await m.getByLabel("Correo nuevo").fill("ana.nueva@correo.com");
    await m.getByRole("button", { name: "Cambiar correo" }).click();
    await expect(page.getByText(/ahora los códigos llegan a an\*+@correo\.com/)).toBeVisible();
    await expect(m).toBeHidden();
    await expect(d).toContainText("ana.nueva@correo.com");
    // la pestaña Datos muestra el correo de solo lectura
    await d.getByRole("tab", { name: "Datos y direcciones" }).click();
    await expect(d.getByLabel("Correo de acceso (no editable aquí)")).toBeDisabled();
    await expect(d.getByLabel("Correo de acceso (no editable aquí)")).toHaveValue("ana.nueva@correo.com");
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.auditoria?.some((a: any) => /Cambió el correo de acceso de Ana Torres: ana\.torres@correo\.com → ana\.nueva@correo\.com/.test(a.accion)))).toBe(true);
    // el ingreso del participante envía el código al correo nuevo
    await page.goto("/login");
    await page.getByLabel("Número de documento").fill("1712345678");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText(/an\*+@correo\.com/)).toBeVisible();
  });
});
