import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin, vigilarErrores } from "./helpers";

/**
 * Escalabilidad de Atención, Cotizaciones, Destinos, Ciudades y Marcas.
 * Con STRESS_N = N: N/5 mensajes, N/4 cotizaciones, N/50 destinos, N/100 ciudades y 50 marcas extra.
 *   STRESS_N=500000 npm run e2e -- escalabilidad-extra
 */
const N = Number(process.env["STRESS_N"] ?? 100_000);
const F = (n: number) => n.toLocaleString("es");

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1280, height: 900 } });
test.setTimeout(180_000);

const conStress = (page: Page) => page.addInitScript((x) => localStorage.setItem("bs_stress", String(x)), N);
const filas = (page: Page) => page.evaluate(() => document.querySelectorAll("tbody tr").length);
const nodos = (page: Page) => page.evaluate(() => document.getElementsByTagName("*").length);

async function medir(page: Page, ruta: string, selector = "tbody tr") {
  const t0 = Date.now();
  await page.goto(ruta);
  await page.locator(selector).first().waitFor({ timeout: 60_000 });
  return Date.now() - t0;
}

test("Cotizaciones: paginación, búsqueda, filtros y conteos globales", async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await conStress(page);
  await entrarAdmin(page);
  const ms = await medir(page, "/admin/cotizaciones", "text=COT-S0000000");
  info.annotations.push({ type: "carga cotizaciones (ms)", description: String(ms) });
  expect(await filas(page)).toBeLessThanOrEqual(15);
  expect(await nodos(page)).toBeLessThan(4000);
  await expect(page.getByText(/de\s+[\d.,]{5,}/)).toBeVisible();

  const t0 = Date.now();
  await page.getByPlaceholder("Código, participante o ciudad").fill("COT-S0000042");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("COT-S0000042");
  info.annotations.push({ type: "búsqueda cotización (ms)", description: String(Date.now() - t0) });
  await page.getByPlaceholder("Código, participante o ciudad").fill("");
  await page.getByLabel("Estado").selectOption("Cotizada");
  await expect(page.locator("tbody tr").first()).toContainText("Cotizada");
  await page.getByRole("button", { name: "Última página" }).click();
  await expect(page.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
  expect(errores.filter((e) => !/favicon|fonts/i.test(e))).toEqual([]);
});

test("Cotizaciones: gestionar una cotización no depende del tamaño", async ({ page }, info) => {
  await conStress(page);
  await entrarAdmin(page);
  await medir(page, "/admin/cotizaciones", "text=COT-S0000000");
  await page.getByLabel("Estado").selectOption("Enviada"); // solo estas se pueden tomar
  await expect(page.locator("tbody tr").first()).toContainText("Enviada");
  await page.locator("tbody tr").first().getByRole("button", { name: "Gestionar" }).click();
  const t0 = Date.now();
  await page.getByRole("button", { name: "Tomar solicitud" }).click();
  await expect(page.getByText(/→ En revisión/)).toBeVisible();
  info.annotations.push({ type: "cambio de estado (ms)", description: String(Date.now() - t0) });
  expect(Date.now() - t0).toBeLessThan(3000);
});

test("Atención: tabla paginada, filtro por estado y respuesta", async ({ page }, info) => {
  await conStress(page);
  await entrarAdmin(page);
  const ms = await medir(page, "/admin/atencion", "text=#0");
  info.annotations.push({ type: "carga atención (ms)", description: String(ms) });
  expect(await filas(page)).toBeLessThanOrEqual(15);
  await expect(page.getByText(/mensajes nuevos · [\d.,]{5,} en total/)).toBeVisible();
  await page.getByLabel("Estado").selectOption("Respondido");
  await expect(page.locator("tbody tr").first()).toContainText("Respondido");
  await page.getByLabel("Estado").selectOption(""); // quita el filtro para buscar entre todos
  await page.getByLabel("Buscar mensaje").fill("#4242");
  const fila = page.locator("tbody tr", { hasText: "#4242" });
  await expect(fila).toHaveCount(1);
  await fila.getByRole("button", { name: "Ver detalle" }).click();
  await page.getByLabel("Respuesta", { exact: true }).fill("Resuelto");
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(page.getByText("Respuesta enviada por correo")).toBeVisible();
});
test("Destinos y ciudades: paginados con búsqueda", async ({ page }, info) => {
  await conStress(page);
  await entrarAdmin(page);
  const ms = await medir(page, "/admin/destinos", "article");
  info.annotations.push({ type: "carga destinos (ms)", description: String(ms) });
  expect(await page.locator("article").count()).toBeLessThanOrEqual(12);
  await page.getByLabel("Buscar destino").fill("Destino masivo 77");
  await expect(page.locator("article").first()).toContainText("Destino masivo 77");
  await page.getByRole("button", { name: "Ciudades del buscador" }).click();
  await page.locator("tbody tr").first().waitFor();
  expect(await filas(page)).toBeLessThanOrEqual(25);
  await page.getByLabel("Buscar ciudad").fill("Ciudad masiva 55");
  await expect(page.locator("tbody tr").first()).toContainText("Ciudad masiva 55");
  // una ciudad ya agregada no se ofrece aunque no esté en la página visible
  await page.getByLabel("Buscar ciudad").fill("");
  await page.getByRole("button", { name: "Nueva ciudad" }).click();
  // con miles de ciudades solo se ve una página, pero el autocompletado conoce todas las agregadas y no ofrece UIO
  await page.getByRole("combobox", { name: "Ciudad o aeropuerto" }).fill("UIO");
  await expect(page.getByRole("listbox", { name: "Ciudades disponibles" })).toContainText("No hay ciudades disponibles");
});

test("Marcas: listado paginado y búsqueda", async ({ page }, info) => {
  await conStress(page);
  await entrarAdmin(page);
  const ms = await medir(page, "/admin/marcas");
  info.annotations.push({ type: "carga marcas (ms)", description: String(ms) });
  await page.getByLabel("Buscar marca").fill("Marca masiva 37");
  await expect(page.locator("tbody tr").first()).toContainText("Marca masiva 37");
  expect(F(1)).toBe("1");
});
