import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const correo = (page: import("@playwright/test").Page) => page.getByRole("dialog").locator("iframe[title='Correo renderizado']");

test.describe("Correos: diseño, plantillas y enviados", () => {
  test("la vista previa es el correo real y cambia entre escritorio y móvil", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await entrarAdmin(page);
    await page.goto("/admin/correos");
    await page.getByRole("button", { name: "Editar Bienvenida" }).click();
    const dlg = page.getByRole("dialog");
    await expect(correo(page)).toHaveAttribute("data-modo", "desktop");
    const marco = dlg.frameLocator("iframe[title='Correo renderizado']");
    await expect(marco.getByText("Hola María Fernanda")).toBeVisible(); // variables con datos de ejemplo
    await expect(marco.getByRole("link", { name: /Ingresar a/ })).toBeVisible(); // botón de llamada a la acción
    await expect(marco.locator("img").first()).toBeVisible(); // logo de la marca
    const real = () => correo(page).evaluate((el: HTMLElement) => el.offsetWidth); // ancho real del correo, sin la reducción para que quepa
    expect(await real()).toBe(640);
    const visibleD = (await correo(page).boundingBox())!.width;
    await dlg.getByRole("button", { name: "Móvil" }).click();
    await expect(correo(page)).toHaveAttribute("data-modo", "mobile");
    expect(await real()).toBe(375);
    expect((await correo(page).boundingBox())!.width).toBeLessThan(visibleD + 1);
  });

  test("editar bloques: texto, orden, agregar y quitar; se guarda y restaurar vuelve al original", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/correos");
    await page.getByRole("button", { name: "Editar Cuenta bloqueada" }).click();
    const dlg = page.getByRole("dialog");
    const marco = dlg.frameLocator("iframe[title='Correo renderizado']");
    await dlg.getByLabel("Asunto").fill("Aviso importante, {nombre}");
    await expect(dlg.getByText("Aviso importante, María Fernanda")).toBeVisible();
    await dlg.getByLabel("Texto del título 1").fill("Tu cuenta, {nombre}");
    await expect(marco.getByText("Tu cuenta, María Fernanda")).toBeVisible();
    await dlg.getByRole("button", { name: "Agregar bloque Botón" }).click();
    await dlg.getByLabel(/Texto del botón/).fill("Contactar a atención");
    await dlg.getByLabel(/Enlace del botón/).fill("https://ejemplo.com/ayuda");
    await expect(marco.getByRole("link", { name: "Contactar a atención" })).toHaveAttribute("href", "https://ejemplo.com/ayuda");
    await dlg.getByRole("button", { name: "Agregar bloque Divisor" }).click();
    await dlg.getByRole("button", { name: /Quitar Divisor/ }).click();
    await dlg.getByRole("button", { name: "Subir Botón 3" }).click(); // el botón pasa antes del texto
    await dlg.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Plantilla guardada")).toBeVisible();
    await page.getByRole("button", { name: "Editar Cuenta bloqueada" }).click();
    await expect(page.getByRole("dialog").getByLabel("Texto del título 1")).toHaveValue("Tu cuenta, {nombre}");
    await expect(page.getByRole("dialog").getByLabel("Enlace del botón 2")).toHaveValue("https://ejemplo.com/ayuda");
    await page.getByRole("dialog").getByRole("button", { name: "Restaurar diseño original" }).click();
    await expect(page.getByRole("dialog").getByLabel("Asunto")).toHaveValue(/fue bloqueada/);
    await expect(page.getByRole("dialog").getByLabel(/Texto del botón/)).toHaveCount(0);
  });

  test("el diseño de marca (colores y pie) se aplica a todos los correos y se guarda", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/correos");
    await page.getByRole("tab", { name: "Diseño" }).click();
    const marco = page.frameLocator("iframe[title='Correo renderizado']");
    await page.getByLabel("Color de los botones").evaluate((el: HTMLInputElement) => { el.value = "#7c3aed"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.getByLabel("Texto del pie").fill("Soporte: ayuda@banco.com");
    await expect(marco.getByText("Soporte: ayuda@banco.com")).toBeVisible();
    await expect(marco.getByRole("link", { name: /Ingresar a/ })).toHaveCSS("background-color", "rgb(124, 58, 237)");
    await page.getByRole("button", { name: "Guardar diseño" }).click();
    await expect(page.getByText("Diseño de correos guardado")).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.disenoCorreo?.colorBoton)).toBe("#7c3aed");
    await page.getByRole("tab", { name: "Plantillas" }).click();
    await page.getByRole("button", { name: "Editar Cupón generado" }).click();
    await expect(page.getByRole("dialog").frameLocator("iframe[title='Correo renderizado']").getByRole("link", { name: "Ver mis beneficios" })).toHaveCSS("background-color", "rgb(124, 58, 237)");
  });

  test("los envíos del sistema quedan en Enviados con su diseño y se pueden ver y reenviar", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("Ana Torres");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("link", { name: "Ver ficha" }).click();
    await page.locator("main").getByRole("button", { name: "Reenviar código de acceso" }).click();
    await expect(page.getByText(/Código de acceso enviado a/)).toBeVisible();
    await page.goto("/admin/correos");
    await page.getByRole("tab", { name: "Enviados" }).click();
    const fila = page.locator("tbody tr", { hasText: "Código de acceso" }).first();
    await expect(fila).toContainText("ana.torres@correo.com");
    await expect(fila).toContainText("Enviado");
    await fila.getByRole("button", { name: /Ver correo/ }).click();
    await expect(page.getByRole("dialog").frameLocator("iframe[title='Correo renderizado']").getByText(/Tu código de acceso es/)).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar", exact: true }).last().click();
    await fila.getByRole("button", { name: /Reenviar correo/ }).click();
    await expect(page.getByText(/Correo reenviado a ana\.torres@correo\.com/)).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Código de acceso" })).toHaveCount(2);
  });

  for (const activa of [true, false]) {
    test(`bloquear una cuenta ${activa ? "envía" : "no envía"} el aviso con la plantilla ${activa ? "activa" : "desactivada"}`, async ({ page }) => {
      await entrarAdmin(page);
      if (!activa) {
        await page.goto("/admin/correos");
        await page.getByRole("switch", { name: "Activar Cuenta bloqueada" }).click();
        await expect(page.getByText("Cuenta bloqueada: desactivado")).toBeVisible();
      }
      await page.goto("/admin/participantes");
      await page.getByPlaceholder("Buscar por nombre o cédula").fill("Ana Torres");
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await page.getByRole("link", { name: "Ver ficha" }).click();
      const d = page.locator("main");
      await d.getByRole("button", { name: "Bloquear cuenta" }).click();
      await page.getByRole("button", { name: "Bloquear", exact: true }).click();
      await expect(d.getByRole("button", { name: "Reenviar código de acceso" })).toBeDisabled();
      await page.goto("/admin/correos");
      await page.getByRole("tab", { name: "Enviados" }).click();
      await expect(page.locator("tbody tr", { hasText: "Cuenta bloqueada" })).toHaveCount(activa ? 1 : 0);
    });
  }
});
