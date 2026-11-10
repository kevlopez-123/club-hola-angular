import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin, esperarCarga } from "./helpers";

/** Listas del panel que se muestran como tarjetas: todas siguen la misma anatomía. */
const LISTAS: [string, string][] = [
  ["Pedidos", "/admin/pedidos"], ["Cotizaciones", "/admin/cotizaciones"], ["Compras de puntos", "/admin/compras-puntos"],
  ["Movimientos", "/admin/movimientos"], ["Atención", "/admin/atencion"], ["Registro de cambios", "/admin/auditoria"],
  ["Importaciones", "/admin/importaciones"], ["Participantes", "/admin/participantes"], ["Productos", "/admin/productos"],
  ["Usuarios", "/admin/usuarios"], ["Reportes · pedidos", "/admin/reportes?tipo=canjes"], ["Reportes · participantes", "/admin/reportes?tipo=participantes"],
  ["Reportes · puntos", "/admin/reportes?tipo=puntos"],
];

/** Mide la primera tarjeta con datos: dónde quedan el chip de estado y el ojo respecto a su título y a su esquina. */
const medir = (page: Page) =>
  page.evaluate(() => {
    const tr = [...document.querySelectorAll<HTMLElement>(".adm-table tbody tr")].find((t) => !t.querySelector("td[colspan]") && !t.hasAttribute("aEsqueleto") && t.querySelector("td"));
    if (!tr) return null;
    const r = tr.getBoundingClientRect();
    const tds = [...tr.querySelectorAll<HTMLElement>(":scope > td")];
    const titulo = tds[0]!.getBoundingClientRect();
    const chip = tr.querySelector<HTMLElement>("td.det-chip")?.getBoundingClientRect();
    const ojo = tr.querySelector<HTMLElement>("td.det-ojo button, td.det-ojo a")?.getBoundingClientRect();
    return {
      ancho: r.width,
      desborda: tds.some((t) => t.getBoundingClientRect().right > r.right + 1),
      chipBajoTitulo: chip ? chip.top - titulo.bottom : null,
      chipSinRotulo: tr.querySelector("td.det-chip") ? getComputedStyle(tr.querySelector("td.det-chip")!, "::before").display === "none" : null,
      ojoDerecha: ojo ? r.right - ojo.right : null,
      ojoArriba: ojo ? ojo.top - r.top : null,
    };
  });

test.describe("Cards unificadas: título, estado bajo el título, ojo en la esquina", () => {
  for (const [nombre, ruta] of LISTAS) {
    test(`${nombre}: la tarjeta sigue la anatomía común`, async ({ page }) => {
      await entrarAdmin(page);
      await page.goto(ruta);
      await esperarCarga(page);
      await expect(page.locator(".adm-table tbody tr td").first()).toBeVisible();
      const m = await medir(page);
      test.skip(!m, "la demo no tiene datos en esta lista");
      expect(m!.desborda, "ninguna celda se sale de la tarjeta").toBe(false);
      if (m!.chipBajoTitulo !== null) {
        expect(m!.chipSinRotulo, "el chip de estado no lleva rótulo").toBe(true);
        expect(m!.chipBajoTitulo, "el chip va pegado bajo el título").toBeLessThan(24);
        expect(m!.chipBajoTitulo).toBeGreaterThan(-12);
      }
      if (m!.ojoDerecha !== null) {
        expect(m!.ojoDerecha, "el ojo está en la esquina derecha").toBeLessThan(28);
        expect(m!.ojoArriba, "el ojo está arriba").toBeLessThan(28);
      }
    });
  }

  test("las tarjetas tienen un solo criterio de ancho: sin columnas vacías en las filas de datos", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=canjes");
    await esperarCarga(page);
    const tr = page.locator(".adm-table tbody tr").first();
    await expect(tr).toBeVisible();
    // Fecha·hora y participante comparten fila; ítems y puntos también (como en el boceto de la tarjeta).
    const y = async (rotulo: string) => (await tr.locator(`td[data-label="${rotulo}"]`).boundingBox())!.y;
    expect(Math.abs((await y("Fecha")) - (await y("Participante")))).toBeLessThan(4);
    expect(Math.abs((await y("Ítems")) - (await y("Puntos")))).toBeLessThan(4);
  });
});
