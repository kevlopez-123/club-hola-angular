import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { entrarAdmin } from "./helpers";

/** El participante solicita una cotización con un pasajero (opcionalmente con discapacidad) y devuelve su código. */
async function solicitar(page: Page, opciones: { asistencia?: boolean } = {}) {
  await page.goto("/vuelos");
  await page.getByLabel("Fecha de ida").fill("2027-03-10");
  await page.getByLabel("Fecha de regreso").fill("2027-03-20");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#nom-0").fill("Ana");
  await page.locator("#ape-0").fill("Torres");
  await page.locator("#ndoc-0").fill("1712345678");
  await page.locator("#nac-0").fill("1990-05-05");
  if (opciones.asistencia) await page.getByLabel(/requiere asistencia/).check();
  await page.getByRole("button", { name: "Cotizar" }).click();
  await page.getByLabel("Número de teléfono").fill("996543210");
  await page.getByRole("button", { name: "Solicitar cotización" }).click();
  const texto = await page.getByText(/Tu solicitud COT-/).innerText();
  return texto.match(/COT-\d+/)![0];
}

async function abrirEnAdmin(page: Page, codigo: string) {
  await page.goto("/admin/cotizaciones");
  await page.getByPlaceholder("Código, participante o ciudad").fill(codigo);
  const fila = page.locator("tbody tr", { hasText: codigo }); // espera a que la búsqueda ya se haya aplicado
  await expect(fila).toHaveCount(1);
  await fila.getByRole("button", { name: "Gestionar" }).click();
}

const edad = (iso: string) => {
  const n = new Date(`${iso}T12:00:00`);
  const h = new Date();
  return h.getFullYear() - n.getFullYear() - (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate()) ? 1 : 0);
};

test.describe("Cotizaciones de vuelos: de punta a punta", () => {
  test("el panel muestra cada pasajero con documento, fecha de nacimiento, edad y si requiere asistencia", async ({ page }) => {
    const codigo = await solicitar(page, { asistencia: true });
    await entrarAdmin(page);
    await abrirEnAdmin(page, codigo);
    const pasajeros = page.getByLabel("Pasajeros", { exact: true });
    await expect(pasajeros).toContainText("Ana Torres");
    await expect(pasajeros).toContainText("Cédula · 1712345678");
    await expect(pasajeros).toContainText("05/05/1990");
    await expect(pasajeros).toContainText(`${edad("1990-05-05")} años`);
    await expect(pasajeros).toContainText("Requiere asistencia");
  });

  test("pasajeros sin discapacidad se ven sin requerimientos y datos antiguos conservan sus pasajeros", async ({ page }) => {
    await entrarAdmin(page);
    await abrirEnAdmin(page, "COT-100482");
    const pasajeros = page.getByLabel("Pasajeros", { exact: true });
    await expect(pasajeros.locator("li")).toHaveCount(3);
    await expect(pasajeros).toContainText("Mateo Torres Ruiz");
    await expect(pasajeros).toContainText("Requiere asistencia"); // la abuela
    await expect(pasajeros).toContainText("Sin requerimientos especiales");
  });

  test("sin chat: el detalle del participante muestra Pasajeros, Seguimiento y contacto por WhatsApp o correo", async ({ page }) => {
    await page.goto("/vuelos/cotizaciones");
    const tarjeta = page.getByRole("article", { name: "Cotización COT-100455" });
    await tarjeta.getByRole("button", { name: "Ver detalle", exact: true }).click();
    await expect(tarjeta.getByRole("heading", { name: "Pasajeros" })).toBeVisible();
    await expect(tarjeta.getByRole("heading", { name: "Seguimiento" })).toBeVisible();
    await expect(tarjeta.getByLabel("Mensajes")).toHaveCount(0);
    await expect(tarjeta.getByLabel("Mensaje para la ejecutiva")).toHaveCount(0);
    await expect(tarjeta.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=.*COT-100455/);
    await expect(tarjeta.getByRole("link", { name: "Correo" })).toHaveAttribute("href", /^mailto:.+\?subject=/);
  });

  test("el panel no tiene conversación: ofrece WhatsApp y correo con mensaje armado y deja constancia del contacto", async ({ page }) => {
    await entrarAdmin(page);
    await abrirEnAdmin(page, "COT-100482"); // cotizada, de Ana Torres
    await expect(page.getByText("Conversación con el participante")).toHaveCount(0);
    const wa = page.getByRole("link", { name: "Escribir por WhatsApp" });
    await expect(wa).toHaveAttribute("href", /^https:\/\/wa\.me\/593\d+\?text=.*COT-100482.*1\.850/);
    await expect(page.getByRole("link", { name: "Enviar correo" })).toHaveAttribute("href", /^mailto:.+subject=/);
    await wa.evaluate((a: HTMLAnchorElement) => a.addEventListener("click", (e) => e.preventDefault())); // no abrir otra pestaña en la prueba
    await wa.click();
    await expect(page.getByLabel("Contactos registrados")).toContainText("WhatsApp · Mariela Castro");
  });
  test("el participante descarga el PDF de una cotización de ejemplo (se genera con sus datos)", async ({ page }) => {
    await page.goto("/vuelos/cotizaciones");
    const tarjeta = page.getByRole("article", { name: "Cotización COT-100482" });
    await tarjeta.getByRole("button", { name: "Ver detalle", exact: true }).click();
    const [descarga] = await Promise.all([page.waitForEvent("download"), tarjeta.getByRole("button", { name: /Descargar cotizacion-COT-100482\.pdf/ }).click()]);
    expect(descarga.suggestedFilename()).toBe("cotizacion-COT-100482.pdf");
    const pdf = (await readFile((await descarga.path())!)).toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("Cotizacion COT-100482");
    expect(pdf).toContain("1.850");
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  test("estados: tomar asigna a quien la toma, cotizar publica monto y PDF, y el participante lo ve todo", async ({ page }) => {
    const codigo = await solicitar(page);
    await entrarAdmin(page);
    await abrirEnAdmin(page, codigo);
    await page.getByRole("button", { name: "Tomar solicitud" }).click();
    await expect(page.getByText(/→ En revisión/)).toBeVisible();
    await expect(page.getByLabel("Ejecutiva asignada")).toHaveValue("u1"); // Mariela Castro, quien está en sesión
    await page.getByPlaceholder("Ej. 850.00").fill("850");
    await page.locator('input[type="file"]').setInputFiles({ name: "cotizacion.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await page.getByRole("button", { name: "Enviar cotización" }).click();
    await expect(page.getByText(/→ Cotizada/)).toBeVisible();
    await expect(page.getByLabel("Historial de estados")).toContainText("Cotizada");
    await expect(page.getByLabel("Historial de estados")).toContainText("Mariela Castro");

    await page.goto("/vuelos/cotizaciones");
    const tarjeta = page.getByRole("article", { name: `Cotización ${codigo}` });
    await expect(tarjeta).toContainText("Cotizada");
    await tarjeta.getByRole("button", { name: "Ver detalle", exact: true }).click();
    await expect(tarjeta).toContainText("Atendida por: Mariela Castro");
    await expect(tarjeta).toContainText("Cotización adjunta");
    await expect(tarjeta).toContainText("850");
    const [descarga] = await Promise.all([page.waitForEvent("download"), tarjeta.getByRole("button", { name: /Descargar cotizacion\.pdf/ }).click()]);
    expect(descarga.suggestedFilename()).toBe("cotizacion.pdf");
    expect((await readFile((await descarga.path())!)).toString("latin1")).toContain("%PDF-1.4"); // el que adjuntó la ejecutiva
  });

  test("cerrar muestra el aviso al participante y reabrir lo quita", async ({ page }) => {
    const codigo = await solicitar(page);
    await entrarAdmin(page);
    await abrirEnAdmin(page, codigo);
    await page.getByRole("button", { name: "Cerrar", exact: true }).last().click(); // el del pie del panel
    await expect(page.getByText(/→ Cerrada/)).toBeVisible();
    await page.goto("/vuelos/cotizaciones");
    const tarjeta = page.getByRole("article", { name: `Cotización ${codigo}` });
    await tarjeta.getByRole("button", { name: "Ver detalle", exact: true }).click();
    await expect(tarjeta).toContainText("Esta cotización está cerrada");

    await abrirEnAdmin(page, codigo);
    await page.getByRole("button", { name: "Reabrir" }).click();
    await expect(page.getByText(/→ En revisión/)).toBeVisible();
  });

  test("las ejecutivas salen de los usuarios del panel y se asignan desde la cotización", async ({ page }) => {
    await entrarAdmin(page);
    await abrirEnAdmin(page, "COT-100455");
    const opciones = await page.getByLabel("Ejecutiva asignada").locator("option").allTextContents();
    expect(opciones.join(" | ")).toContain("Lucía Torres · Atención");
    expect(opciones.join(" | ")).toContain("Karla Núñez · Operaciones");
    expect(opciones.join(" | ")).not.toContain("Roberto Peña"); // rol Catálogo
    await page.getByLabel("Ejecutiva asignada").selectOption("u4");
    await page.getByRole("button", { name: "Guardar gestión" }).click();
    await expect(page.getByText("Gestión guardada")).toBeVisible();
    await page.locator("aside").last().getByRole("button", { name: "Cerrar" }).first().click().catch(() => undefined);
    await page.goto("/admin/cotizaciones");
    await expect(page.locator("tbody tr", { hasText: "COT-100455" })).toContainText("Lucía Torres");
  });
});