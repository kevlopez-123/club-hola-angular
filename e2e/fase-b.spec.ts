import { expect, test } from "@playwright/test";
import { xlsxDeExcel } from "./archivos";
import { descargarListado, entrarAdmin, esperarCarga, textoDeArchivo } from "./helpers";

test.describe("Fase B: descargas en Excel o PDF y cargas con plantilla de Excel", () => {
  test("un listado se descarga en Excel con el color de la marca o en PDF, nunca en CSV", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/pedidos");
    await esperarCarga(page);
    const boton = page.getByRole("button", { name: "Descargar" }).first();
    await expect(page.getByRole("button", { name: /CSV/ })).toHaveCount(0);

    await boton.click();
    const dialogo = page.getByRole("dialog", { name: /^Descargar/ });
    await expect(dialogo.getByRole("button", { name: /Excel/ })).toBeVisible();
    await expect(dialogo.getByRole("button", { name: /PDF/ })).toBeVisible();
    await expect(dialogo.getByRole("button", { name: /CSV/ })).toHaveCount(0);
    await page.keyboard.press("Escape");

    const xlsx = await descargarListado(page, () => boton.click(), "Excel");
    expect(xlsx.suggestedFilename()).toMatch(/^pedidos_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const x = await textoDeArchivo(xlsx);
    expect(x).toContain("CLIENTE"); // encabezados en mayúscula
    expect(x).toContain("FF00BDD2"); // color de la marca
    expect(x).toContain("state=\"frozen\""); // fila de encabezado fija

    const pdf = await descargarListado(page, () => boton.click(), "PDF");
    expect(pdf.suggestedFilename()).toMatch(/^pedidos_\d{4}-\d{2}-\d{2}\.pdf$/);
    expect((await textoDeArchivo(pdf)).startsWith("%PDF-1.4")).toBe(true);
  });

  test("el Excel y el PDF toman el color que se configuró en la marca", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    const hex = page.getByLabel("Color principal (hex)");
    await hex.fill("#e11d48");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.goto("/admin/pedidos");
    await esperarCarga(page);
    const x = await descargarListado(page, () => page.getByRole("button", { name: "Descargar" }).first().click(), "Excel");
    expect(await textoDeArchivo(x)).toContain("FFE11D48");
    // se deja la marca como estaba
    await page.goto("/admin/configuracion");
    await page.getByLabel("Color principal (hex)").fill("#00bdd2");
    await page.getByRole("button", { name: "Guardar marca" }).click();
  });

  test("la plantilla de códigos es un Excel y la carga acepta un Excel guardado por Excel (comprimido)", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/beneficios");
    await page.getByRole("button", { name: "Cupones y códigos" }).click();
    await page.getByRole("button", { name: "Cargar códigos" }).click();
    const d = page.getByRole("dialog");
    const [pl] = await Promise.all([page.waitForEvent("download"), d.getByRole("button", { name: "Descargar plantilla" }).click()]);
    expect(pl.suggestedFilename()).toBe("plantilla_codigos.xlsx");
    const x = await textoDeArchivo(pl);
    for (const parte of ["Instrucciones", "Datos", "Ejemplo", "CÓDIGO *", "ABC-0001"]) expect(x, parte).toContain(parte);

    const lote = xlsxDeExcel([["CÓDIGO *"], ["XLS-001"], ["XLS-002"], ["XLS-002"], ["XLS-003"]]);
    await d.locator('input[type="file"]').setInputFiles({ name: "lote.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: lote });
    await expect(d.getByText("3 por crear")).toBeVisible(); // lee la hoja «Datos» y salta el encabezado
    await expect(d.getByText("1 con errores")).toBeVisible(); // el repetido dentro del archivo se rechaza con su motivo
    await expect(d.getByText(/ya aparece en la fila/)).toBeVisible();
  });

  test("la carga de participantes lee un Excel y avisa si el archivo no es válido", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.getByRole("button", { name: "Carga masiva" }).click();
    const d = page.getByRole("dialog");
    const lote = xlsxDeExcel([["DOCUMENTO *", "NOMBRE *", "CORREO *", "PUNTOS *"], ["1712345678", "Ana Torres", "ana.torres@correo.com", "1000"], ["123", "Mal Documento", "mal@correo.com", "5"]]);
    await d.locator('input[type="file"]').setInputFiles({ name: "participantes.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: lote });
    await expect(d.getByText(/2 filas/)).toBeVisible();
    await expect(d.getByText(/1 por crear/)).toBeVisible();
    await expect(d.getByText(/1 con errores/)).toBeVisible();
    await d.getByRole("button", { name: "Cambiar archivo" }).click();
    await d.locator('input[type="file"]').setInputFiles({ name: "roto.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("esto no es un excel") });
    await expect(page.getByText(/No pudimos leer el archivo/)).toBeVisible();
  });

  test("los campos de texto tienen límite de caracteres y muestran el contador al acercarse", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/perfil");
    const nombre = page.getByLabel("Nombre completo");
    await expect(nombre).toHaveAttribute("maxlength", "60"); // límite explícito del campo
    await page.goto("/admin/marcas");
    await page.getByRole("button", { name: "Nueva marca" }).click();
    const campo = page.getByRole("dialog").getByLabel(/^Nombre/).first();
    const max = Number(await campo.getAttribute("maxlength"));
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(120);
    await campo.fill("x".repeat(max + 30));
    expect((await campo.inputValue()).length).toBe(max);
    await expect(page.locator(".contador-limite")).toHaveText(`${max}/${max}`);
  });
});
