import { expect, test, type Page } from "@playwright/test";
import { descargarListado, entrarAdmin, textoDeArchivo } from "./helpers";

async function cambiarReglas(page: Page) {
  await page.goto("/admin/reglas");
  await page.getByLabel("Precio por punto (US$)").fill("0.05");
  await page.getByLabel("Mínimo por compra").fill("1000");
  await page.getByRole("button", { name: "Guardar reglas" }).click();
  await expect(page.getByText(/guardad/i).first()).toBeVisible();
}

test.describe("Registro de cambios completo", () => {
  test("cada cambio queda registrado con quién, cuándo y el antes y después", async ({ page }) => {
    await entrarAdmin(page);
    await cambiarReglas(page);
    await page.goto("/admin/auditoria");
    const fila = page.locator("tbody tr", { hasText: "Editó las reglas de puntos" }).first();
    await expect(fila).toContainText("Mariela Castro");
    await expect(fila).toContainText("Administrador");
    await fila.getByRole("button", { name: /Ver qué cambió/ }).click();
    const detalle = page.getByRole("dialog");
    const tabla = detalle.getByRole("table", { name: "Campos modificados" });
    const precio = tabla.locator("tr", { hasText: "precio" }).first();
    await expect(precio).toContainText("0.02");
    await expect(precio).toContainText("0.05");
    await expect(tabla.locator("tr", { hasText: "min" }).first()).toContainText("1000");
    await expect(detalle.getByText("Sección: ")).toBeVisible();
  });

  test("lo que antes no se registraba (productos, contenido, correos) ahora sí, y los accesos también", async ({ page }) => {
    await entrarAdmin(page);
    // Correos: guardar el diseño
    await page.goto("/admin/correos");
    await page.getByRole("tab", { name: "Diseño" }).click();
    await page.getByLabel("Texto del pie").fill("Pie de prueba de auditoría");
    await page.getByRole("button", { name: "Guardar diseño" }).click();
    await expect(page.getByText("Diseño de correos guardado")).toBeVisible();
    await page.goto("/admin/auditoria");
    await expect(page.locator("tbody tr", { hasText: "Editó el diseño de los correos" }).first()).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Ingresó al panel" }).first()).toBeVisible();
  });

  test("un ingreso fallido queda registrado sin guardar la contraseña", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Correo").fill("admin@bancosolidario.com");
    await page.getByLabel("Contraseña").fill("clave-equivocada-123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
    await entrarAdmin(page);
    await page.goto("/admin/auditoria");
    await expect(page.locator("tbody tr", { hasText: "Intento fallido de ingreso (admin@bancosolidario.com)" }).first()).toBeVisible();
    const guardado = await page.evaluate(() => localStorage.getItem("bancosolidario_mockdb_v11") ?? "");
    expect(guardado).not.toContain("clave-equivocada-123");
  });

  test("se filtra por usuario, sección y rango de fechas", async ({ page }) => {
    await entrarAdmin(page);
    await cambiarReglas(page);
    await page.goto("/admin/auditoria");
    await page.getByLabel("Filtrar por usuario").selectOption("Mariela Castro");
    await expect(page.locator("tbody tr").first()).toContainText("Mariela Castro");
    await page.getByLabel("Filtrar por sección").selectOption("Reglas de puntos");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByLabel("Filtrar por sección").selectOption("");
    await page.getByLabel("Filtrar por usuario").selectOption("");
    const hoy = new Date().toISOString().slice(0, 10);
    await page.getByLabel("Desde").fill(hoy);
    await expect(page.locator("tbody tr", { hasText: "Editó las reglas de puntos" }).first()).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Editó nivel Oro" })).toHaveCount(0); // de octubre
    await page.getByLabel("Desde").fill("2026-10-28");
    await page.getByLabel("Hasta").fill("2026-10-28");
    await expect(page.locator("tbody tr", { hasText: "Editó nivel Oro" })).toHaveCount(1);
    await expect(page.locator("tbody tr", { hasText: "Editó las reglas de puntos" })).toHaveCount(0);
  });

  test("lo más reciente aparece primero y Descargar entrega en Excel todo lo filtrado con el detalle", async ({ page }) => {
    await entrarAdmin(page);
    await cambiarReglas(page);
    await page.goto("/admin/auditoria");
    await expect(page.locator("tbody tr").first()).toContainText(/Editó las reglas de puntos|Ingresó al panel/);
    const descarga = await descargarListado(page, () => page.getByRole("button", { name: "Descargar" }).click());
    expect(descarga.suggestedFilename()).toMatch(/^registro-de-cambios_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const xlsx = await textoDeArchivo(descarga);
    expect(xlsx).toContain("QUÉ CAMBIÓ"); // encabezados en mayúscula
    expect(xlsx).toMatch(/Editó las reglas de puntos[\s\S]*precio: 0\.02 → 0\.05/);
    expect(xlsx).toContain("Editó nivel Oro"); // también lo anterior, no solo la primera página
  });

  test("una pantalla que describe su propio cambio no duplica el registro automático", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("Ana Torres");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("link", { name: "Ver ficha" }).click();
    await page.locator("main").getByRole("button", { name: "Bloquear cuenta" }).click();
    await page.getByRole("button", { name: "Bloquear", exact: true }).click();
    await expect(page.getByText("Cuenta bloqueada")).toBeVisible();
    // el aviso de la pantalla llega al servidor un instante después: se espera a que quede guardado
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.auditoria?.some((r: any) => r.descrita && /Bloqueó la cuenta de Ana Torres/.test(r.accion) && r.despues))).toBe(true);
    await page.goto("/admin/auditoria");
    await expect(page.locator("tbody tr", { hasText: "Bloqueó la cuenta de Ana Torres" })).toHaveCount(1);
  });
});
