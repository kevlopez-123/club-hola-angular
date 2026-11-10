import { expect, test, type Page } from "@playwright/test";
import { descargarListado, entrarAdmin, textoDeArchivo } from "./helpers";

const abrir = async (page: Page, tab: string) => {
  await entrarAdmin(page);
  await page.goto(`/admin/participantes/p1?tab=${tab}`);
};

test.describe("Ficha del participante: búsqueda, filtros, exportación y paginación", () => {
  test("movimientos: busca, filtra por tipo y fechas, ordena y pagina", async ({ page }) => {
    await abrir(page, "movimientos");
    const filas = page.getByRole("table", { name: "Movimientos" }).locator("tbody tr");
    await expect(page.getByRole("navigation", { name: "Paginación" })).toContainText("Mostrando"); // ya cargaron los datos
    const total = await filas.count();
    expect(total).toBeGreaterThan(1);

    await page.getByLabel("Buscar en movimientos").fill("zzz-no-existe");
    await expect(page.locator("td.adm-empty")).toContainText("Ningún movimiento coincide");
    await page.getByRole("button", { name: /Limpiar/ }).click();
    await expect(filas).toHaveCount(total);

    // Filtrar por el tipo de la primera fila deja solo filas de ese tipo; "todos" las devuelve.
    const tipo = (await filas.first().locator("a-pill").innerText()).trim();
    await page.getByLabel("Tipo", { exact: true }).selectOption({ label: tipo });
    for (const t of await filas.locator("a-pill").allInnerTexts()) expect(t.trim()).toBe(tipo);
    await page.getByLabel("Tipo", { exact: true }).selectOption("");
    await expect(filas).toHaveCount(total);

    await page.getByLabel("Desde").fill("2099-01-01"); // ninguno es tan futuro
    await expect(page.locator("td.adm-empty")).toBeVisible();
  });

  test("movimientos: descarga en Excel lo filtrado (no solo la página)", async ({ page }) => {
    await abrir(page, "movimientos");
    await expect(page.getByRole("table", { name: "Movimientos" }).locator("tbody tr").first()).toBeVisible();
    const d = await descargarListado(page, () => page.getByRole("button", { name: "Descargar movimientos" }).click());
    expect(d.suggestedFilename()).toMatch(/^p1-movimientos_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const xlsx = await textoDeArchivo(d);
    expect(xlsx).toContain("FECHA");
    expect((xlsx.match(/<row /g) ?? []).length).toBeGreaterThan(2);
    const pdf = await descargarListado(page, () => page.getByRole("button", { name: "Descargar movimientos" }).click(), "PDF");
    expect(pdf.suggestedFilename()).toMatch(/^p1-movimientos_\d{4}-\d{2}-\d{2}\.pdf$/);
    expect((await textoDeArchivo(pdf)).startsWith("%PDF-1.4")).toBe(true);
  });

  test("la paginación cambia de página y de tamaño", async ({ page }) => {
    await abrir(page, "movimientos");
    await expect(page.getByRole("table", { name: "Movimientos" }).locator("tbody tr").first()).toBeVisible();
    await page.getByLabel("Filas por página").selectOption("10");
    await expect(page.getByRole("navigation", { name: "Paginación" })).toContainText(/Página 1 de \d+/);
  });

  test("compras: pedidos y compras de puntos tienen cada uno su búsqueda y su exportación", async ({ page }) => {
    await abrir(page, "compras");
    await expect(page.getByLabel("Buscar en pedidos")).toBeVisible();
    await expect(page.getByLabel("Buscar en compras de puntos")).toBeVisible();
    await page.getByLabel("Buscar en pedidos").fill("BNB-");
    await expect(page.getByRole("table", { name: "Pedidos de canje" }).locator("tbody tr").first()).toContainText("BNB-");
    const d = await descargarListado(page, () => page.getByRole("button", { name: "Descargar pedidos" }).click());
    expect(d.suggestedFilename()).toMatch(/^p1-pedidos_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  test("ajustes: busca por motivo y filtra por suma o descuento", async ({ page }) => {
    await abrir(page, "ajustes");
    const lista = page.getByText("Compensación por pedido demorado");
    await expect(lista).toBeVisible();
    await expect(page.getByText("Corrección de acumulación duplicada")).toBeVisible();
    await page.getByLabel("Buscar en ajustes").fill("compensación");
    await expect(page.getByText("Corrección de acumulación duplicada")).toHaveCount(0);
    await page.getByRole("button", { name: /Limpiar/ }).click();
    await page.getByLabel("Tipo", { exact: true }).selectOption({ label: "Descuento" });
    await expect(page.getByText("Compensación por pedido demorado")).toHaveCount(0);
    await expect(page.getByText("Corrección de acumulación duplicada")).toBeVisible();
  });

  for (const [tab, etiqueta] of [["beneficios", "beneficios"], ["cotizaciones", "cotizaciones"], ["historial", "historial"]] as const) {
    test(`${tab}: tiene búsqueda y exportación`, async ({ page }) => {
      await abrir(page, tab);
      await expect(page.getByLabel(`Buscar en ${etiqueta}`)).toBeVisible();
      await expect(page.getByRole("button", { name: `Descargar ${etiqueta}` })).toBeVisible();
    });
  }
});
