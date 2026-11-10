import { expect, test } from "@playwright/test";
import { ADMIN_ROUTES, desbordes, entrarAdmin, esperarCarga, vigilarErrores } from "./helpers";

const RUTAS = [...ADMIN_ROUTES, "/admin/importaciones", "/admin/correos", "/admin/reportes?tipo=participantes", "/admin/reportes?tipo=embudo"];

test.describe("Diseño conectado: tema claro y oscuro", () => {
  test("el botón de tema muestra luna en claro y sol en oscuro", async ({ page }) => {
    await entrarAdmin(page);
    const boton = page.getByRole("button", { name: "Cambiar a tema oscuro" });
    await expect(boton.locator("svg circle")).toHaveCount(0); // la luna es un solo trazo
    await boton.click();
    await expect(page.getByRole("button", { name: "Cambiar a tema claro" }).locator("svg circle")).toHaveCount(1); // el sol lleva su círculo
  });

  test("la paleta de comandos ofrece cada tipo de reporte y lleva a él", async ({ page }) => {
    await entrarAdmin(page);
    await page.getByRole("button", { name: "Buscar y ejecutar comandos" }).click();
    await page.getByLabel("Buscar comandos").fill("Reporte: Ventas");
    await page.getByRole("option", { name: /Reporte: Ventas de puntos/ }).or(page.getByText("Reporte: Ventas de puntos")).first().click();
    await expect(page).toHaveURL(/\/admin\/reportes\?tipo=ventas/);
  });

  test("en tema oscuro ninguna pantalla del panel falla ni se desborda", async ({ page }) => {
    test.setTimeout(240_000);
    await page.addInitScript(() => localStorage.setItem("bs_admin_oscuro", "1"));
    const errores = vigilarErrores(page);
    await entrarAdmin(page);
    await expect(page.locator("[data-admin-tema='oscuro']")).toBeVisible();
    for (const ruta of RUTAS) {
      await page.goto(ruta);
      await esperarCarga(page);
      const d = await desbordes(page);
      expect(d.scroll, `${ruta} se desborda: ${d.out.join(" | ")}`).toBeLessThanOrEqual(d.ancho + 1);
    }
    expect(errores.filter((e) => !/favicon|Failed to load resource/.test(e))).toEqual([]);
  });

  test("al alternar el tema, los gráficos toman los colores del tema nuevo", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=puntos");
    await expect(page.locator("a-chart canvas").first()).toBeVisible();
    const color = () => page.locator("a-chart").first().evaluate((el) => getComputedStyle(el).getPropertyValue("--muted-foreground").trim());
    const claro = await color();
    await page.getByRole("button", { name: "Cambiar a tema oscuro" }).click();
    await expect.poll(color).not.toBe(claro); // el gráfico vive dentro del contenedor que cambia de tema
  });
});
