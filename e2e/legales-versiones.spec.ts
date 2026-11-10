import { expect, test } from "@playwright/test";
import { entrarAdmin, primerIngreso, publicarLegal } from "./helpers";

test.describe("Textos legales: versiones y aceptación solo en el primer ingreso", () => {
  test("el panel muestra la versión vigente y el historial de cada texto", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/legales");
    await expect(page.getByRole("heading", { name: "Textos legales" })).toBeVisible();
    await expect(page.getByText("v2", { exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Historial de Términos y condiciones" }).getByRole("row")).toHaveCount(3); // encabezado + 2 versiones
    await page.getByRole("tab", { name: "Política de privacidad" }).click();
    await expect(page.getByRole("table", { name: "Historial de Política de privacidad" }).getByRole("row")).toHaveCount(2);
  });

  test("publicar exige explicar qué cambió y no admite un texto idéntico", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/legales");
    await page.getByLabel("Texto de Términos y condiciones").fill("Texto distinto.");
    await page.getByRole("button", { name: "Publicar versión" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "mínimo 10 caracteres" })).toBeVisible();
  });

  test("publicar una versión nueva NO pide aceptar de nuevo a quien ya aceptó (la aceptación es solo en el primer ingreso)", async ({ page }) => {
    await entrarAdmin(page);
    await publicarLegal(page, "Términos y condiciones", { texto: "## Vigencia\n\nLos puntos duran 36 meses.", notas: "Se amplía la vigencia a 36 meses." });
    await page.goto("/");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.goto("/mis-puntos/compra");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.goto("/terminos");
    await expect(page.getByText(/Versión 3 · vigente desde/)).toBeVisible(); // el sitio muestra la versión nueva, sin pedir aceptarla
    await expect(page.getByText("Los puntos duran 36 meses.")).toBeVisible();
    await expect(page.getByText("Antes de continuar")).toHaveCount(0);
  });

  test("primer ingreso: aparece el aviso con una casilla por documento, no se avanza sin marcarlas y se pide una sola vez", async ({ page }) => {
    await entrarAdmin(page);
    await primerIngreso(page);
    await page.goto("/");
    const aviso = page.getByRole("alertdialog");
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText("Es tu primer ingreso");
    await expect(aviso).toContainText("Términos y condiciones");
    await expect(aviso).toContainText("Política de privacidad");
    const aceptar = aviso.getByRole("button", { name: "Aceptar y continuar" });
    await expect(aviso.getByRole("checkbox")).toHaveCount(2);
    await expect(aceptar).toBeDisabled();
    await aviso.getByRole("checkbox", { name: /Términos y condiciones/ }).check();
    await expect(aceptar).toBeDisabled(); // falta la política de privacidad
    await aviso.getByRole("checkbox", { name: /Política de privacidad/ }).check();
    await expect(aceptar).toBeEnabled();
    await aceptar.click();
    await expect(aviso).toHaveCount(0);

    // Quedó registrado con la versión, la fecha y el canal.
    const ac = await page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11")!).aceptaciones.p1);
    expect(ac.terminos).toMatchObject({ version: 2, canal: "Web" });
    expect(ac.privacidad).toMatchObject({ version: 1, canal: "Web" });
    expect(ac.terminos.fecha).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // No vuelve a salir: ni al recargar ni al navegar.
    await page.reload();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.goto("/mis-puntos/compra");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

  test("el aviso del primer ingreso aparece en cualquier página privada, se puede leer el texto y permite cerrar sesión", async ({ page }) => {
    await entrarAdmin(page);
    await primerIngreso(page);
    await page.goto("/mis-puntos/compra");
    const aviso = page.getByRole("alertdialog");
    await expect(aviso).toBeVisible();
    await expect(aviso.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await aviso.getByRole("button", { name: "Leer el texto completo" }).first().click();
    await expect(aviso.locator(".md").first()).toBeVisible();
  });

  test("sin aceptar el sitio queda bloqueado y, al aceptar, queda libre", async ({ page }) => {
    await entrarAdmin(page);
    await primerIngreso(page);
    await page.goto("/mis-puntos/compra");
    await expect(page.getByRole("alertdialog")).toBeVisible();
    // Tras aceptar, el sitio queda libre.
    const aviso = page.getByRole("alertdialog");
    for (const c of await aviso.getByRole("checkbox").all()) await c.check();
    await aviso.getByRole("button", { name: "Aceptar y continuar" }).click();
    await expect(aviso).toHaveCount(0);
  });
  test("se puede comparar una versión anterior con la vigente y restaurarla como borrador", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/legales");
    await page.getByRole("button", { name: "Comparar la versión 1 con la vigente" }).click();
    const cmp = page.getByRole("dialog");
    await expect(cmp).toContainText("líneas agregadas");
    await cmp.getByText("Cerrar", { exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Restaurar la versión 1 como borrador" }).click();
    await expect(page.getByText(/Borrador guardado por/)).toBeVisible();
  });

  test("la ficha del participante muestra qué aceptó", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes/p1");
    await expect(page.getByRole("region", { name: "Textos legales" }).or(page.locator("section[aria-label='Textos legales']"))).toContainText("Aceptó la versión 2");
  });
});
