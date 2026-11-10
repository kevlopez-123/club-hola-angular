import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const campanita = (page: Page) => page.getByRole("button", { name: /^Notificaciones/ });
const lista = (page: Page) => page.getByRole("region", { name: "Lista de notificaciones" });

test.describe("Notificaciones dentro del sitio", () => {
  test("la campanita muestra el contador de avisos sin leer y la lista", async ({ page }) => {
    await page.goto("/");
    await expect(campanita(page)).toHaveAccessibleName("Notificaciones, 2 sin leer");
    await campanita(page).click();
    await expect(lista(page).getByText("Tu pedido BNB-4F82KDL1 está en camino")).toBeVisible();
    await expect(lista(page).getByText("Tu cotización COT-100501 fue cotizada")).toBeVisible();
    await expect(lista(page).getByText(/hace 4[5-7] min/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(lista(page)).toHaveCount(0);
  });

  test("abrir un aviso lo marca como leído y lleva a su pantalla", async ({ page }) => {
    await page.goto("/");
    await campanita(page).click();
    await lista(page).getByRole("link", { name: /Tu pedido BNB-4F82KDL1/ }).click();
    await expect(page).toHaveURL(/\/mis-compras\/BNB-4F82KDL1$/);
    await expect(campanita(page)).toHaveAccessibleName("Notificaciones, 1 sin leer");
    await page.reload(); // el estado queda guardado en el servidor
    await expect(campanita(page)).toHaveAccessibleName("Notificaciones, 1 sin leer");
  });

  test("Marcar todas como leídas quita el contador", async ({ page }) => {
    await page.goto("/");
    await campanita(page).click();
    await lista(page).getByRole("button", { name: "Marcar todas como leídas" }).click();
    await expect(campanita(page)).toHaveAccessibleName("Notificaciones");
    await expect(lista(page).getByRole("button", { name: "Marcar todas como leídas" })).toHaveCount(0);
  });

  test("la página Notificaciones lista todo y filtra por sin leer", async ({ page }) => {
    await page.goto("/notificaciones");
    await expect(page.getByRole("heading", { name: "Notificaciones", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Acreditamos 2 500 puntos/ })).toBeVisible();
    await page.getByRole("tab", { name: /Sin leer/ }).click();
    await expect(page.getByRole("link", { name: /Acreditamos 2 500 puntos/ })).toHaveCount(0); // ya estaba leída
    await expect(page.getByRole("link", { name: /Tu pedido BNB-4F82KDL1/ })).toBeVisible();
    await page.getByRole("button", { name: "Marcar todas como leídas" }).click();
    await expect(page.getByText("No tienes notificaciones sin leer.")).toBeVisible();
  });

  test("un evento del sitio (generar un cupón) crea su aviso con enlace", async ({ page }) => {
    await page.goto("/beneficios/b8");
    await page.getByRole("button", { name: "Generar cupón" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
    await expect(page.getByAltText(/Código QR/)).toBeVisible();
    await page.goto("/notificaciones");
    const aviso = page.getByRole("link", { name: /Tu cupón de/ });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText("válido por 3 horas");
    await aviso.click();
    await expect(page).toHaveURL(/\/mis-beneficios$/);
  });

  test("desde el panel se puede apagar el aviso de una plantilla y ya no se crea", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/correos");
    await page.getByRole("button", { name: "Editar Cupón generado" }).click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByText("Aviso dentro del sitio (campanita)")).toBeVisible();
    await expect(dlg.getByLabel("Título del aviso")).toHaveValue("Tu cupón de {beneficio}");
    await dlg.getByRole("switch", { name: "Activar aviso dentro del sitio" }).click();
    await dlg.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Plantilla guardada")).toBeVisible();
    await page.goto("/beneficios/b8");
    await page.getByRole("button", { name: "Generar cupón" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
    await expect(page.getByAltText(/Código QR/)).toBeVisible();
    await page.goto("/notificaciones");
    await expect(page.getByRole("link", { name: /Tu cupón de/ })).toHaveCount(0);
  });

  test("el aviso funciona aunque el correo de esa plantilla esté desactivado", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/correos");
    await page.getByRole("switch", { name: "Activar Cupón generado" }).click(); // apaga solo el correo
    await expect(page.getByText("Cupón generado: desactivado")).toBeVisible();
    await page.goto("/beneficios/b8");
    await page.getByRole("button", { name: "Generar cupón" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
    await expect(page.getByAltText(/Código QR/)).toBeVisible();
    await page.goto("/notificaciones");
    await expect(page.getByRole("link", { name: /Tu cupón de/ })).toBeVisible();
  });

  test("en el panel nunca aparece la campanita del sitio ni la del participante", async ({ page }) => {
    await entrarAdmin(page);
    await expect(page.locator("app-campanita")).toHaveCount(0);
  });
});