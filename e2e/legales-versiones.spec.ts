import { expect, test } from "@playwright/test";
import { entrarAdmin, publicarLegal } from "./helpers";

test.describe("Textos legales: versiones y nueva aceptación", () => {
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

  test("al publicar con aceptación, la participante debe aceptar de nuevo antes de seguir", async ({ page }) => {
    await entrarAdmin(page);
    await publicarLegal(page, "Términos y condiciones", { texto: "## Vigencia\n\nLos puntos duran 36 meses.", notas: "Se amplía la vigencia a 36 meses." });
    await page.goto("/");
    const aviso = page.getByRole("alertdialog");
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText("Se amplía la vigencia a 36 meses.");
    const aceptar = aviso.getByRole("button", { name: "Aceptar y continuar" });
    await expect(aceptar).toBeDisabled();
    await aviso.getByRole("checkbox").check();
    await aceptar.click();
    await expect(aviso).toHaveCount(0);
  });

  test("una versión solo informativa no bloquea el sitio", async ({ page }) => {
    await entrarAdmin(page);
    await publicarLegal(page, "Política de privacidad", { texto: "## Cambio menor\n\nCorrección de redacción.", notas: "Corrección de redacción.", exigeAceptacion: false });
    await page.goto("/");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.goto("/privacidad");
    await expect(page.getByText(/Versión 2 · vigente desde/)).toBeVisible();
  });

  test("el aviso aparece en cualquier página privada y permite cerrar sesión", async ({ page }) => {
    await entrarAdmin(page);
    await publicarLegal(page, "Términos y condiciones", { texto: "## Otra\n\nVersión que exige aceptar.", notas: "Texto nuevo que exige aceptar." });
    await page.goto("/mis-puntos/compra");
    const aviso = page.getByRole("alertdialog");
    await expect(aviso).toBeVisible();
    await expect(aviso.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await aviso.getByRole("button", { name: "Leer el texto completo" }).click();
    await expect(aviso.getByRole("heading", { name: "Otra" })).toBeVisible();
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
