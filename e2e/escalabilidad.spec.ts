import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin, vigilarErrores } from "./helpers";

/**
 * Pruebas de escalabilidad del panel con volúmenes extremos.
 * Se activan con `localStorage.bs_stress = N` (N = participantes): se generan N participantes,
 * 2N pedidos, 3N movimientos, N/10 productos y N/20 beneficios, todo en memoria.
 *
 *   STRESS_N=100000 (por defecto)   →  100.000 participantes · 200.000 pedidos · 300.000 movimientos · 10.000 productos
 *   STRESS_N=500000 npm run e2e -- escalabilidad   →  prueba extrema
 *
 * Los presupuestos de tiempo son generosos porque corren contra el servidor de desarrollo sin optimizar.
 */
const N = Number(process.env["STRESS_N"] ?? 100_000);
const TOTAL_PARTICIPANTES = N + 1; // N generados + la participante demo
const FORMATO = (n: number) => n.toLocaleString("es");

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1280, height: 900 } });

async function conStress(page: Page, n = N) {
  await page.addInitScript((x) => localStorage.setItem("bs_stress", String(x)), n);
}

/** Navega y mide cuánto tarda la primera fila de la tabla. */
async function medirCarga(page: Page, ruta: string) {
  const t0 = Date.now();
  await page.goto(ruta);
  await page.locator("tbody tr").first().waitFor({ timeout: 60_000 });
  return Date.now() - t0;
}
const filasEnDom = (page: Page) => page.evaluate(() => document.querySelectorAll("tbody tr").length);
const nodosEnDom = (page: Page) => page.evaluate(() => document.getElementsByTagName("*").length);

test.describe(`Panel con ${FORMATO(N)} participantes`, () => {
  test.setTimeout(180_000);

  test("Participantes: carga rápida y DOM acotado", async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await conStress(page);
    await entrarAdmin(page);
    const ms = await medirCarga(page, "/admin/participantes");
    info.annotations.push({ type: "carga participantes (ms)", description: String(ms) });
    await expect(page.getByText(`${FORMATO(TOTAL_PARTICIPANTES)} participantes registrados`)).toBeVisible();
    expect(await filasEnDom(page)).toBeLessThanOrEqual(25); // solo la página visible
    expect(await nodosEnDom(page)).toBeLessThan(4000);
    expect(ms).toBeLessThan(25_000);
    expect(errores.filter((e) => !/favicon|fonts/i.test(e))).toEqual([]);
  });

  test("Participantes: búsqueda exacta, paginación y tamaño de página", async ({ page }, info) => {
    await conStress(page);
    await entrarAdmin(page);
    await medirCarga(page, "/admin/participantes");

    const t0 = Date.now();
    await page.getByPlaceholder("Buscar por nombre o cédula").fill(`usuario${N - 1}@correo.com`);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    info.annotations.push({ type: "búsqueda entre todos (ms)", description: String(Date.now() - t0) });
    expect(Date.now() - t0).toBeLessThan(8_000);
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("");
    await expect(page.locator("tbody tr")).toHaveCount(25);

    await page.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page.getByText(/Página\s*2\s*de/)).toBeVisible();
    await page.getByRole("button", { name: "Última página" }).click();
    await expect(page.getByText(`de ${FORMATO(TOTAL_PARTICIPANTES)}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Página siguiente" })).toBeDisabled();

    await page.getByLabel("Filas por página").selectOption("100");
    await expect(page.locator("tbody tr")).toHaveCount(100);
    expect(await nodosEnDom(page)).toBeLessThan(12_000);
  });

  test("Participantes: tecleo rápido no mezcla respuestas viejas", async ({ page }) => {
    await conStress(page);
    await entrarAdmin(page);
    await medirCarga(page, "/admin/participantes");
    const caja = page.getByPlaceholder("Buscar por nombre o cédula");
    await caja.pressSequentially("usuario5", { delay: 15 });
    await caja.pressSequentially("0000@correo.com", { delay: 15 });
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText("usuario50000@correo.com");
  });

  test("Participantes: editar un solo registro no depende del tamaño de la base", async ({ page }, info) => {
    await conStress(page);
    await entrarAdmin(page);
    await medirCarga(page, "/admin/participantes");
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("usuario777@correo.com");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("link", { name: "Ver ficha" }).click();
    await page.getByRole("tab", { name: /^Ajustes/ }).click();
    await page.getByLabel("Puntos (+/−)").fill("500");
    await page.getByLabel("Motivo").fill("Prueba de carga");
    await page.getByRole("button", { name: "Aplicar ajuste" }).click();
    const t0 = Date.now();
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await expect(page.getByText("Prueba de carga").first()).toBeVisible();
    info.annotations.push({ type: "ajuste de puntos (ms)", description: String(Date.now() - t0) });
    expect(Date.now() - t0).toBeLessThan(3_000);
  });

  test("Pedidos (2×N): filtro por estado y búsqueda por código", async ({ page }, info) => {
    await conStress(page);
    await entrarAdmin(page);
    const ms = await medirCarga(page, "/admin/pedidos");
    info.annotations.push({ type: "carga pedidos (ms)", description: String(ms) });
    await expect(page.getByText(/de\s+[\d.,]{7,}/)).toBeVisible(); // cientos de miles
    await page.getByLabel("Estado").selectOption("Cancelado");
    await expect(page.locator("tbody tr").first()).toContainText("Cancelado");
    await page.getByLabel("Estado").selectOption({ index: 0 }); // el pedido buscado puede no estar cancelado: se busca entre todos
    await page.getByPlaceholder("Código o cliente").fill("BNB-S0000042");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.locator("tbody tr").first().getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.locator("aside").last().getByText("BNB-S0000042")).toBeVisible();
    expect(await filasEnDom(page)).toBeLessThanOrEqual(25);
  });

  test("Movimientos (3×N): filtro por fechas y tipo", async ({ page }, info) => {
    await conStress(page);
    await entrarAdmin(page);
    const ms = await medirCarga(page, "/admin/movimientos");
    info.annotations.push({ type: "carga movimientos (ms)", description: String(ms) });
    await page.getByLabel("Tipo").selectOption("canje");
    await expect(page.locator("tbody tr").first()).toContainText("Canje");
    const hoy = new Date().toISOString().slice(0, 10);
    await page.getByLabel("Desde").fill(hoy);
    await page.getByLabel("Hasta").fill(hoy);
    await expect(page.getByText(/Mostrando|Sin resultados/)).toBeVisible();
    expect(await filasEnDom(page)).toBeLessThanOrEqual(25);
  });

  test("Productos (N/10) y Beneficios (N/20): listados y búsqueda", async ({ page }, info) => {
    await conStress(page);
    await entrarAdmin(page);
    const ms = await medirCarga(page, "/admin/productos");
    info.annotations.push({ type: "carga productos (ms)", description: String(ms) });
    await page.getByPlaceholder("Buscar producto").fill("Producto 7777");
    await expect(page.locator("tbody tr").first()).toContainText("Producto 7777");
    await page.locator("tbody tr").first().getByRole("switch").click(); // alta/baja de un solo producto
    await page.goto("/admin/beneficios");
    await page.locator("tbody tr").first().waitFor();
    await page.getByPlaceholder("Buscar beneficio o comercio").fill("masivo 999");
    await expect(page.locator("tbody tr").first()).toContainText("Beneficio masivo 999");
  });

  test("Dashboard y navegación no degradan la memoria (sin fugas)", async ({ page }, info) => {
    await conStress(page);
    await entrarAdmin(page);
    await medirCarga(page, "/admin/participantes");
    const heap = () => page.evaluate(() => ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0) / 1e6);
    const base = await heap();
    for (let i = 0; i < 12; i++) {
      for (const link of ["Dashboard", "Pedidos", "Participantes", "Productos"]) await page.getByRole("link", { name: link, exact: true }).first().click();
    }
    await page.getByRole("link", { name: "Dashboard", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    const final = await heap();
    info.annotations.push({ type: "memoria JS (MB)", description: `${Math.round(base)} → ${Math.round(final)}` });
    expect(final).toBeLessThan(base * 1.8 + 150); // sin crecimiento descontrolado tras 48 navegaciones
  });

  test("El sitio del participante sigue funcionando con el catálogo masivo", async ({ page }, info) => {
    await conStress(page);
    const t0 = Date.now();
    await page.goto("/canjea");
    await page.locator("app-product-card").first().waitFor({ timeout: 60_000 });
    info.annotations.push({ type: "catálogo público (ms)", description: String(Date.now() - t0) });
    expect(await page.locator("app-product-card").count()).toBeLessThanOrEqual(12); // paginación incremental
    await page.locator("main").getByRole("searchbox").fill("Producto 4242");
    await expect(page.locator("app-product-card").first()).toContainText("Producto 4242", { timeout: 15_000 });
    await expect(page.getByText(/productos disponibles/)).toBeVisible();
  });
});
