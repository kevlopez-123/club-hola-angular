import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Calendario propio en los campos de fecha", () => {
  test("el clic abre un calendario propio, elige el día y dispara el cambio", async ({ page }) => {
    await page.goto("/vuelos/cotizaciones");
    const desde = page.getByLabel("Desde");
    await desde.click();
    const cal = page.getByRole("dialog", { name: "Elegir fecha" });
    await expect(cal).toBeVisible();
    await expect(cal.getByText(/^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre) \d{4}$/)).toBeVisible();
    await expect(cal.locator(".cd-sem span")).toHaveText(["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]);
    await cal.locator(".cd-dia:not(.cd-fuera)", { hasText: /^15$/ }).click();
    await expect(cal).toHaveCount(0);
    await expect(desde).toHaveValue(/^\d{4}-\d{2}-15$/);
    // la lista se filtró: el cambio llegó a la pantalla
    await expect(page.getByText("No encontramos cotizaciones con esos criterios.")).toBeVisible();
  });

  test("resalta el rango entre Desde y Hasta y respeta el mínimo", async ({ page }) => {
    await page.goto("/vuelos/cotizaciones");
    await page.getByLabel("Desde").fill("2026-07-01");
    await page.getByLabel("Hasta").fill("2026-07-10");
    await page.getByLabel("Desde").click();
    const cal = page.getByRole("dialog", { name: "Elegir fecha" });
    await expect(cal.getByText("Julio 2026")).toBeVisible();
    await expect(cal.locator(".cd-rango")).toHaveCount(8); // del 2 al 9
    await expect(cal.locator(".cd-sel")).toHaveText("1");
    await page.keyboard.press("Escape");
    await expect(cal).toHaveCount(0);

    await page.goto("/vuelos");
    const ida = page.getByLabel("Fecha de ida");
    await ida.fill("2027-03-10");
    await page.getByLabel("Fecha de regreso").click();
    const c2 = page.getByRole("dialog", { name: "Elegir fecha" });
    await expect(c2.getByText("Marzo 2027")).toBeVisible();
    await expect(c2.locator('.cd-dia[data-dia="2027-03-09"]')).toBeDisabled(); // el regreso no puede ser antes de la ida
    await c2.locator('.cd-dia[data-dia="2027-03-20"]').click();
    await expect(page.getByLabel("Fecha de regreso")).toHaveValue("2027-03-20");
  });

  test("teclado: abrir, moverse, elegir; Hoy y Borrar; escribir sigue funcionando", async ({ page }) => {
    await page.goto("/vuelos/cotizaciones");
    const desde = page.getByLabel("Desde");
    await desde.fill("2026-05-10");
    await desde.focus();
    await page.keyboard.press("Enter");
    const cal = page.getByRole("dialog", { name: "Elegir fecha" });
    await expect(cal).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(desde).toHaveValue("2026-05-18");
    await desde.click();
    await page.getByRole("button", { name: "Borrar" }).click();
    await expect(desde).toHaveValue("");
    await desde.click();
    await page.getByRole("button", { name: "Hoy" }).click();
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    await expect(desde).toHaveValue(iso);
  });

  test("en el panel: filtros de fecha y fechas de banners usan el mismo calendario", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/movimientos");
    await page.getByLabel("Desde").click();
    await expect(page.getByRole("dialog", { name: "Elegir fecha" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/admin/contenido");
    await page.getByRole("button", { name: "Nuevo banner" }).click();
    await page.getByRole("dialog", { name: /Nuevo banner/ }).getByLabel("Inicio").click();
    await expect(page.locator(".cd-popup")).toBeVisible();
    const z = await page.locator(".cd-popup").evaluate((e) => getComputedStyle(e).zIndex);
    expect(Number(z)).toBeGreaterThan(60); // queda por encima del modal
  });
});

test.describe("Casillas, deslizadores y números con estilo propio", () => {
  test("las casillas son propias y se marcan con el color de la marca", async ({ page }) => {
    await page.goto("/canjea");
    const caja = page.getByLabel(/Mostrar solo lo que puedo canjear/);
    await expect(caja).toBeAttached();
    const antes = await caja.evaluate((e) => ({ ap: getComputedStyle(e).appearance, borde: getComputedStyle(e).borderRadius }));
    expect(antes.ap).toBe("none");
    expect(parseFloat(antes.borde)).toBeGreaterThan(2);
    await caja.check();
    await expect.poll(() => caja.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(0, 189, 210)"); // color de la marca (tras la transición)
    expect(await caja.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain("polyline");
  });

  test("los campos numéricos no muestran las flechas del navegador", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reglas");
    const n = page.getByLabel("Mínimo por compra");
    await expect(n).toBeVisible();
    const ap = await n.evaluate((e) => getComputedStyle(e).appearance);
    expect(ap).toBe("textfield");
  });
});