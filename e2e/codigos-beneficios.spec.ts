import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

async function cargarLote(page: Page, codigos: string[], vence: string) {
  await page.getByRole("button", { name: "Cargar códigos" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Vencimiento de los códigos").fill(vence);
  await d.locator('input[type="file"]').setInputFiles({ name: "lote.csv", mimeType: "text/csv", buffer: Buffer.from(["codigo", ...codigos].join("\n")) });
  await d.getByRole("button", { name: /^Cargar \d+ códigos/ }).click();
  await expect(d.getByText(/códigos cargados/)).toBeVisible();
  await d.getByRole("button", { name: "Cerrar" }).last().click();
  await expect(d).toBeHidden();
}

const generar = async (page: Page) => {
  await page.goto("/beneficios/b1");
  await page.getByRole("button", { name: "Generar cupón" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
};
const liberarCupon = (page: Page) =>
  page.evaluate(() => {
    const k = "bancosolidario_mockdb_v11";
    const d = JSON.parse(localStorage.getItem(k)!);
    d.cupones = {};
    localStorage.setItem(k, JSON.stringify(d));
  });

test.describe("Carga de códigos de beneficios por lotes (FIFO)", () => {
  test("varios lotes de un beneficio se usan en orden de carga y, al agotarse todos, se informa", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/beneficios");
    await page.getByRole("button", { name: "Cupones y códigos" }).click();
    // el primero que se carga vence DESPUÉS: FIFO es por orden de carga, no por vencimiento
    await cargarLote(page, ["LOTEA-1"], "2027-12-31");
    await page.waitForTimeout(30);
    await cargarLote(page, ["LOTEB-1"], "2026-12-31");
    await expect(page.getByText("En uso").first()).toBeVisible();
    await expect(page.getByText("En espera").first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.lotes?.filter((l: any) => l.beneficioId === "b1").length)).toBe(2);

    await generar(page);
    await expect(page.getByAltText(/Código QR LOTEA-1/)).toBeVisible();
    await liberarCupon(page);
    await generar(page);
    await expect(page.getByAltText(/Código QR LOTEB-1/)).toBeVisible();
    await liberarCupon(page);
    await generar(page);
    await expect(page.getByText(/se agotaron/)).toBeVisible();
  });

  test("un código ya cargado en otro lote del mismo beneficio se omite", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/beneficios");
    await page.getByRole("button", { name: "Cupones y códigos" }).click();
    await cargarLote(page, ["DUP-1", "DUP-2"], "2027-12-31");
    await cargarLote(page, ["DUP-2", "NUEVO-3"], "2027-12-31");
    // El que ya estaba en otro lote se rechaza en la revisión y el resto se carga.
    const totales = await page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.lotes?.filter((l: any) => l.beneficioId === "b1").map((l: any) => l.total));
    expect(totales?.sort()).toEqual([1, 2]);
  });
});
