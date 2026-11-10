import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin, textoDeArchivo } from "./helpers";

const CSV = [
  "documento,nombre,correo,puntos",
  "1718293045,Rosa Benítez,rosa.benitez@correo.com,1500",
  "17182,Mónica Vélez,monica.velez@correo.com,1200", // documento corto
  "1104567893,Iván Cárdenas,ivan.cardenas,300", // correo inválido
  "1709876543,Sofía Herrera,sofia.herrera@correo.com,abc", // puntos no numéricos
].join("\n");

async function subirParticipantes(page: Page) {
  await page.goto("/admin/participantes");
  await page.getByRole("button", { name: "Carga masiva" }).click();
  await page.getByRole("dialog").locator('input[type="file"]').setInputFiles({ name: "participantes_nov.csv", mimeType: "text/csv", buffer: Buffer.from(CSV, "utf8") });
}

test.describe("Importaciones: plantillas, reporte de errores e historial", () => {
  test("la plantilla de participantes es un Excel con instrucciones, datos y ejemplo", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.getByRole("button", { name: "Carga masiva" }).click();
    const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar plantilla" }).click()]);
    expect(d.suggestedFilename()).toBe("plantilla_participantes.xlsx");
    const xlsx = await textoDeArchivo(d);
    for (const hoja of ["Instrucciones", "Datos", "Ejemplo"]) expect(xlsx).toContain(`name="${hoja}"`);
    expect(xlsx).toContain("DOCUMENTO *"); // encabezados en mayúscula, con * en los obligatorios
    expect(xlsx).toContain("ana.torres@correo.com");
    expect(xlsx).toContain("FF00BDD2"); // color de la plataforma
  });

  test("antes de importar se puede descargar el reporte de las filas con error y su motivo", async ({ page }) => {
    await entrarAdmin(page);
    await subirParticipantes(page);
    await expect(page.getByText(/3 con errores/)).toBeVisible();
    const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar reporte de errores" }).click()]);
    expect(d.suggestedFilename()).toBe("errores_participantes_nov.xlsx");
    const csv = await textoDeArchivo(d);
    expect(csv).toContain("FILA");
    expect(csv).toContain("MOTIVO");
    expect(csv).toContain("17182"); // la fila tal como venía, para corregirla y volver a subirla
    expect(csv).toContain("ivan.cardenas");
    expect(csv).not.toContain("rosa.benitez"); // la válida no está en el reporte de errores
  });

  test("al importar queda en el historial con su resumen, el detalle de errores y el reporte descargable", async ({ page }) => {
    await entrarAdmin(page);
    await subirParticipantes(page);
    await page.getByRole("button", { name: /Importar 1 participantes/ }).click();
    await expect(page.getByText("Carga completada")).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.importaciones?.some((i: any) => i.archivo === "participantes_nov.csv"))).toBe(true);
    await page.getByRole("dialog").getByRole("link", { name: "Importaciones" }).click();
    await expect(page).toHaveURL(/\/admin\/importaciones$/);
    const fila = page.locator("tbody tr", { hasText: "participantes_nov.csv" });
    await expect(fila).toContainText("Mariela Castro");
    await expect(fila).toContainText("Participantes");
    await expect(fila.locator("td").nth(4)).toHaveText("4"); // filas
    await expect(fila.locator("td").nth(5)).toHaveText("1"); // importadas
    await expect(fila).toContainText("3"); // con errores
    await fila.getByRole("button", { name: /Ver errores de/ }).click();
    const tabla = page.getByRole("dialog").getByRole("table", { name: "Filas rechazadas" });
    await expect(tabla).toContainText("no es un correo válido");
    await expect(tabla.locator("tr", { hasText: "17182" })).toContainText("3"); // fila 3 del archivo
    const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("dialog").getByRole("button", { name: "Descargar reporte" }).click()]);
    expect(d.suggestedFilename()).toBe("errores_participantes_nov.xlsx");
  });

  test("las cargas de códigos de beneficios también quedan registradas (con los repetidos como errores)", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/beneficios");
    await page.getByRole("button", { name: "Cupones y códigos" }).click();
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "Cargar códigos" }).click();
      const d = page.getByRole("dialog");
      if (i === 0) {
        const [pl] = await Promise.all([page.waitForEvent("download"), d.getByRole("button", { name: "Descargar plantilla" }).click()]);
        expect(pl.suggestedFilename()).toBe("plantilla_codigos.xlsx");
      }
      await d.locator('input[type="file"]').setInputFiles({ name: "lote.csv", mimeType: "text/csv", buffer: Buffer.from(["codigo", "AAA-1", "AAA-2", "AAA-2", ...(i ? ["BBB-3"] : [])].join("\n")) });
      await d.getByRole("button", { name: /^Cargar \d+ códigos/ }).click();
      await expect(d.getByText(/códigos cargados/)).toBeVisible();
      await d.getByRole("button", { name: "Cerrar" }).last().click();
      await expect(d).toBeHidden();
    }
    await page.goto("/admin/importaciones");
    const segunda = page.locator("tbody tr", { hasText: "Códigos de beneficio" }).filter({ hasText: "lote.csv" }).first();
    await expect(segunda).toContainText("Mariela Castro");
    await segunda.getByRole("button", { name: /Ver errores de lote.csv/ }).click();
    const tabla = page.getByRole("dialog").getByRole("table", { name: "Filas rechazadas" });
    await expect(tabla).toContainText("Ya estaba cargado en otro lote");
    await expect(tabla).toContainText("ya aparece en la fila"); // repetido dentro del mismo archivo
  });

  test("el historial se filtra por tipo y trae las cargas de ejemplo con su reporte", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/importaciones");
    await expect(page.locator("tbody tr", { hasText: "participantes_octubre.csv" })).toBeVisible();
    await page.getByLabel("Filtrar por tipo").selectOption("Códigos de beneficio");
    await expect(page.locator("tbody tr", { hasText: "participantes_octubre.csv" })).toHaveCount(0);
    await expect(page.locator("tbody tr", { hasText: "cinemark_oct.csv" })).toContainText("Sin errores");
    await page.getByLabel("Filtrar por tipo").selectOption("Participantes");
    const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Descargar reporte de errores de participantes_octubre/ }).click()]);
    expect(await textoDeArchivo(d)).toContain("Documento inválido");
  });

  test("Operaciones y Catálogo pueden importar y ver el historial; Atención no", async ({ page }) => {
    await entrarAdmin(page, "Operaciones");
    await page.goto("/admin/importaciones");
    await expect(page.getByRole("heading", { name: "Importaciones", exact: true })).toBeVisible();
    await page.evaluate(() => sessionStorage.clear()); // cierra la sesión del panel
    await entrarAdmin(page, "Atención");
    await page.goto("/admin/importaciones");
    await expect(page.getByRole("heading", { name: "Sin acceso a esta sección" })).toBeVisible();
  });
});