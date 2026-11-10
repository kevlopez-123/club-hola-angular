import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { descargarListado, entrarAdmin, textoDeArchivo } from "./helpers";

const kpi = (page: import("@playwright/test").Page, nombre: string) => page.getByLabel("Indicadores del período").locator("a-stat", { hasText: nombre });

test.describe("Reportes: datos reales, comparativo y exportación", () => {
  test("muestra indicadores calculados con los datos del programa para el período elegido", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes");
    await expect(page.getByLabel("Indicadores del período")).toBeVisible();
    await expect(kpi(page, "Puntos emitidos")).toContainText(/\d/);
    await expect(kpi(page, "Puntos canjeados")).toBeVisible();
    await expect(kpi(page, "Tasa de canje")).toContainText("%");
    await expect(kpi(page, "Pedidos")).toBeVisible();
    await expect(kpi(page, "Cotizaciones de vuelos")).toBeVisible();
  });

  test("compara con el período anterior de igual duración y se puede apagar", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes");
    await page.getByRole("group", { name: "Periodo" }).getByRole("button", { name: "90 días" }).click();
    const emitidos = kpi(page, "Puntos emitidos");
    await expect(emitidos).toContainText("vs. anterior");
    await expect(page.getByText(/\(\d{4}-\d{2}-\d{2} a \d{4}-\d{2}-\d{2}\)/)).toBeVisible(); // fechas del período anterior
    await page.getByRole("switch", { name: "Comparar con el período anterior" }).click();
    await expect(emitidos).not.toContainText("vs. anterior");
  });

  test("un rango propio recalcula el reporte (y uno invertido se rechaza con un mensaje)", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes");
    await page.getByRole("group", { name: "Periodo" }).getByRole("button", { name: "Rango" }).click();
    await page.getByLabel("Desde").fill("2026-07-01");
    await page.getByLabel("Hasta").fill("2026-07-31");
    await expect(page.getByText("2026-07-01 a 2026-07-31").first()).toBeVisible();
    await expect(kpi(page, "Puntos emitidos")).toContainText(/\d/);
    await page.getByLabel("Desde").fill("2026-08-15");
    await page.getByLabel("Hasta").fill("2026-08-01");
    await expect(page.getByRole("alert").filter({ hasText: "anterior a la final" })).toBeVisible();
  });

  test("Exportar Excel descarga un .xlsx válido con una hoja por gráfico", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes");
    await expect(kpi(page, "Puntos emitidos")).toBeVisible();
    const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar Excel" }).click()]);
    expect(d.suggestedFilename()).toMatch(/^reporte_resumen_\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const bytes = readFileSync((await d.path())!);
    expect(bytes.subarray(0, 2).toString()).toBe("PK"); // ZIP
    const texto = bytes.toString("utf8"); // las partes XML van sin comprimir
    for (const parte of ["xl/workbook.xml", "xl/worksheets/sheet4.xml", 'name="Resumen"', 'name="Participantes activos por canal"', 'name="Más canjeados (unidades)"', "Puntos emitidos", "Variación %"]) expect(texto, parte).toContain(parte);
  });

  test("canal y más canjeados se calculan con los datos del rango (y avisan si no hay)", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes");
    await page.getByRole("group", { name: "Periodo" }).getByRole("button", { name: "6 meses" }).click();
    await expect(page.getByText("Participantes activos por canal")).toBeVisible();
    await expect(page.getByText("Más canjeados (unidades)")).toBeVisible();
    await page.getByRole("group", { name: "Periodo" }).getByRole("button", { name: "Rango" }).click();
    await page.getByLabel("Desde").fill("2020-01-01");
    await page.getByLabel("Hasta").fill("2020-01-31");
    await expect(page.getByText("Sin datos en este rango.")).toHaveCount(2); // canal y más canjeados
  });

  test("las descargas de cada gráfico incluyen la comparación", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes");
    await expect(kpi(page, "Puntos emitidos")).toBeVisible();
    const d = await descargarListado(page, () => page.getByRole("button", { name: /^Descargar/ }).first().click());
    expect(d.suggestedFilename()).toMatch(/\.xlsx$/);
    expect(await textoDeArchivo(d)).toContain("EMITIDOS (PERÍODO ANTERIOR)"); // encabezados en mayúscula
  });

  test("Solo lectura puede ver y exportar reportes (tiene el permiso exportar)", async ({ page }) => {
    await entrarAdmin(page, "Solo lectura");
    await page.goto("/admin/reportes");
    await expect(kpi(page, "Puntos emitidos")).toBeVisible();
    const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar Excel" }).click()]);
    expect(d.suggestedFilename()).toMatch(/\.xlsx$/);
  });
});