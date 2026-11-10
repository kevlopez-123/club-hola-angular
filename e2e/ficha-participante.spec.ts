import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

async function abrirLista(page: Page, nombre: string) {
  await entrarAdmin(page);
  await page.goto("/admin/participantes");
  await page.getByPlaceholder("Buscar por nombre o cédula").fill(nombre);
  await expect(page.locator("tbody tr")).toHaveCount(1);
}

test.describe("Ficha del participante en su propia página", () => {
  test("Ver ficha abre /admin/participantes/:id con cabecera y pestañas; el enlace se puede compartir", async ({ page }) => {
    await abrirLista(page, "Ana Torres");
    await page.getByRole("link", { name: "Ver ficha" }).click();
    await expect(page).toHaveURL(/\/admin\/participantes\/p1$/);
    await expect(page.getByRole("heading", { name: "Ana Torres", level: 1 })).toBeVisible();
    for (const t of ["Resumen", "Datos y direcciones", "Movimientos", "Compras", "Beneficios", "Cotizaciones", "Historial", "Ajustes"]) {
      await expect(page.getByRole("tab", { name: new RegExp(`^${t}`) })).toBeVisible();
    }
    await expect(page.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: /^Movimientos/ }).click();
    await expect(page).toHaveURL(/tab=movimientos/);
    // abrir el enlace directo (recarga) deja la misma pestaña
    await page.reload();
    await expect(page.getByRole("tab", { name: /^Movimientos/ })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("link", { name: "Participantes", exact: true }).first().click();
    await expect(page).toHaveURL(/\/admin\/participantes$/);
  });

  test("cada ficha muestra SOLO la información de ese participante", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes/p1?tab=movimientos");
    await expect(page.getByRole("heading", { name: "Ana Torres", level: 1 })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toContainText(/Compra|Canje|Acumulación/);
    // otro participante: no hereda los movimientos ni los beneficios de Ana
    await page.goto("/admin/participantes");
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("Diego Salazar");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("link", { name: "Ver ficha" }).click();
    await expect(page.getByRole("heading", { name: "Diego Salazar", level: 1 })).toBeVisible();
    await page.getByRole("tab", { name: /^Beneficios/ }).click();
    await expect(page.getByText("Este participante no ha generado cupones.")).toBeVisible();
    await page.getByRole("tab", { name: /^Cotizaciones/ }).click();
    await expect(page.getByText(/COT-100482/)).toHaveCount(0); // las cotizaciones son de Ana
    await page.getByRole("tab", { name: /^Compras/ }).click();
    await expect(page.locator("tbody").getByText("BNB-4F82KDL1")).toHaveCount(0);
  });

  test("las pestañas Compras, Beneficios, Cotizaciones e Historial muestran lo de Ana", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes/p1?tab=compras");
    await expect(page.locator("tbody").getByText("BNB-4F82KDL1").first()).toBeVisible();
    await page.getByRole("tab", { name: /^Cotizaciones/ }).click();
    await expect(page.getByText(/COT-100482/)).toBeVisible();
    await page.getByRole("tab", { name: /^Beneficios/ }).click();
    await expect(page.getByRole("list").getByRole("listitem").first()).toBeVisible();
    await page.getByRole("tab", { name: "Resumen" }).click();
    await page.getByRole("button", { name: "Reenviar código de acceso" }).click();
    await page.getByRole("tab", { name: /^Historial/ }).click();
    await expect(page.getByText(/Reenvió el código de acceso a Ana Torres/)).toBeVisible();
  });

  test("un participante inexistente muestra un mensaje y el enlace de regreso", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes/no-existe");
    await expect(page.getByText("No encontramos a este participante")).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver a Participantes" })).toBeVisible();
  });

  test("la barra lateral mantiene Participantes activo dentro de una ficha", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes/p1");
    await expect(page.getByLabel("Navegación principal").getByRole("link", { name: "Participantes" })).toHaveAttribute("aria-current", "page");
  });
});
