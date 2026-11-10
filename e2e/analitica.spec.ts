import { expect, test, type Page } from "@playwright/test";
import { descargarListado, entrarAdmin, ORIGEN } from "./helpers";

const consent = (analitica: boolean) => JSON.stringify({ v: 1, analitica, marketing: false, fecha: "2026-01-01T00:00:00.000Z" });
const estado = (analitica: boolean) => ({
  cookies: [],
  origins: [{ origin: ORIGEN, localStorage: [{ name: "bs_consentimiento", value: consent(analitica) }, { name: "bs-token-participante", value: "mock.participante.p1" }] }],
});

/** Eventos de la visita actual guardados en la base simulada (la base de la demo ya trae historial de ejemplo). */
const eventosDeEstaVisita = (page: Page) =>
  page.evaluate(() => {
    const visita = sessionStorage.getItem("bs_visita");
    const db = JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}");
    return { visita, tipos: ((db.analitica ?? []) as { v: string; t: string }[]).filter((e) => e.v === visita).map((e) => e.t) };
  });
const totalEventos = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").analitica ?? []).length as number);

async function canjearDigital(page: Page) {
  await page.goto("/canjea/p14");
  await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
  await page.getByRole("dialog").getByRole("link", { name: "Ver carrito" }).click();
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await expect(page).toHaveURL(/gracias$/);
}

test.describe("Analítica: sin permiso no se registra nada", () => {
  test.use({ storageState: estado(false) });

  test("sin cookies de analítica no se envía ningún evento ni se crea identificador de visita", async ({ page }) => {
    const envios: string[] = [];
    page.on("request", (r) => { if (r.url().includes("analitica/eventos")) envios.push(r.url()); });
    await canjearDigital(page);
    expect(envios).toHaveLength(0);
    expect((await eventosDeEstaVisita(page)).visita).toBeNull();
  });
});

test.describe("Analítica: con permiso se registra el embudo", () => {
  test.use({ storageState: estado(true) });

  test("vista, carrito, inicio de pago y canje quedan en la misma visita anónima", async ({ page }) => {
    await canjearDigital(page);
    await expect.poll(async () => (await eventosDeEstaVisita(page)).tipos.sort()).toEqual(["agregar_carrito", "canje", "inicio_pago", "ver_item"]);
    const { visita } = await eventosDeEstaVisita(page);
    expect(visita).toMatch(/^v[a-z0-9]+$/); // aleatorio: no deriva del documento ni del correo
  });

  test("al retirar el permiso se borra la visita y se deja de registrar", async ({ page }) => {
    await page.goto("/canjea/p14");
    await expect.poll(async () => (await eventosDeEstaVisita(page)).tipos).toContain("ver_item");
    await page.getByRole("button", { name: "Preferencias de cookies" }).click();
    await page.getByRole("button", { name: "Solo esenciales" }).click();
    await expect.poll(async () => (await eventosDeEstaVisita(page)).visita).toBeNull();
    const antes = await totalEventos(page);
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.waitForTimeout(400);
    expect(await totalEventos(page)).toBe(antes);
  });

  test("un fallo del servicio de analítica no muestra ningún aviso", async ({ page }) => {
    await page.route("**/analitica/eventos", (r) => r.abort());
    await page.goto("/canjea/p14");
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await expect(page.getByText(/sin conexión|problema con el servidor/i)).toHaveCount(0);
  });
});

test.describe("Analítica: embudo en Reportes", () => {
  const kpi = (page: Page, nombre: string) => page.getByLabel("Indicadores del período").locator("a-stat", { hasText: nombre });
  const valor = async (page: Page, nombre: string) => Number((await kpi(page, nombre).locator("p").first().innerText()).replace(/\D/g, ""));

  test("muestra los cuatro pasos (cada uno con menos visitas que el anterior) y los artículos con más interés", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=embudo");
    await expect(kpi(page, "Vio un producto o beneficio")).toBeVisible();
    const [a, b, c, d] = [await valor(page, "Vio un producto"), await valor(page, "Lo agregó al carrito"), await valor(page, "Inició el pago"), await valor(page, "Completó el canje")];
    expect(a).toBeGreaterThan(0);
    expect(a).toBeGreaterThanOrEqual(b);
    expect(b).toBeGreaterThanOrEqual(c);
    expect(c).toBeGreaterThanOrEqual(d);
    await expect(kpi(page, "Conversión")).toContainText("%");
    await expect(page.getByRole("table", { name: "Artículos con más interés" }).locator("tbody tr").first()).toBeVisible();
  });

  test("cambiar el rango recalcula el embudo y el gráfico se descarga en Excel", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=embudo");
    await page.getByRole("group", { name: "Periodo" }).getByRole("button", { name: "Rango" }).click();
    await page.getByLabel("Desde").fill("2020-01-01");
    await page.getByLabel("Hasta").fill("2020-01-31");
    await expect(page.getByText("Todavía no hay visitas con analítica en este rango.")).toBeVisible();
    await page.getByLabel("Desde").fill("2026-09-01");
    await page.getByLabel("Hasta").fill("2026-10-28");
    await expect(page.getByRole("table", { name: "Artículos con más interés" })).toBeVisible();
    const d = await descargarListado(page, () => page.getByRole("button", { name: /Descargar Visitas únicas por paso/ }).click());
    expect(d.suggestedFilename()).toMatch(/^embudo_pasos_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
