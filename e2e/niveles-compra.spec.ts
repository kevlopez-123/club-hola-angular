import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Niveles", () => {
  test("no hay multiplicadores: ni en Mi nivel ni en el modal", async ({ page }) => {
    await page.goto("/mi-nivel");
    await expect(page.getByText("Tu nivel actual").first()).toBeVisible();
    await expect(page.getByText(/Acumula\s*\d/)).toHaveCount(0);
    await page.getByRole("button", { name: "Cómo funcionan los niveles" }).click();
    await expect(page.getByRole("dialog")).not.toContainText(/Acumula/);
    await expect(page.getByRole("dialog")).not.toContainText(/\d(\.\d+)?x\b/);
  });

  test("subtítulo, introducción, reglas y beneficios se editan en el panel y se ven igual en todo el sitio", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/niveles");
    await page.getByLabel("Meses considerados para calcular el nivel").fill("6");
    await page.getByLabel(/Subtítulo de Mi nivel/).fill("Subir de nivel en {empresa} toma {meses} meses de {unidad}.");
    await page.getByLabel(/Introducción de/).fill("Intro propia de {programa}.");
    await page.getByLabel(/Reglas: “Cómo funcionan/).fill("Regla uno a {meses} meses\nRegla dos");
    await page.locator("textarea").nth(4).fill("Beneficio nuevo A\n\nBeneficio nuevo B"); // primer nivel (las líneas vacías se descartan)
    await page.getByRole("button", { name: "Guardar niveles" }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();

    await page.goto("/mi-nivel");
    await expect(page.getByText("Subir de nivel en Banco Solidario toma 6 meses de puntos.")).toBeVisible();
    await expect(page.getByText("Regla uno a 6 meses")).toHaveCount(0); // las reglas viven solo en el modal
    await expect(page.getByText("Beneficio nuevo A")).toBeVisible();
    await expect(page.getByText("Beneficio nuevo B")).toBeVisible();

    await page.getByRole("button", { name: "Cómo funcionan los niveles" }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toContainText("Intro propia de Banco Solidario Puntos.");
    await expect(modal).toContainText("Regla uno a 6 meses");
    await expect(modal).toContainText("Beneficio nuevo A"); // el modal usa los mismos beneficios que Mi nivel
  });

  test("al guardar, el sitio refleja el cambio sin recargar (Mi nivel ya cargada)", async ({ page, context }) => {
    const sitio = await context.newPage();
    await sitio.goto("/mi-nivel");
    await expect(sitio.getByText("Tu nivel actual").first()).toBeVisible();
    await entrarAdmin(page);
    await page.goto("/admin/niveles");
    await page.getByLabel(/Introducción de/).fill("Texto sincronizado.");
    await page.getByRole("button", { name: "Guardar niveles" }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();
    await page.goto("/mi-nivel");
    await page.getByRole("button", { name: "Cómo funcionan los niveles" }).click();
    await expect(page.getByRole("dialog")).toContainText("Texto sincronizado.");
  });
});

test.describe("Compra de puntos", () => {
  test("opciones rápidas, mínimo, máximo y tope mensual se configuran en Reglas de puntos", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reglas");
    await page.getByLabel(/Opciones rápidas de compra/).fill("3000, 1000, 3000, 70000, 0");
    await page.getByLabel("Mínimo por compra").fill("1000");
    await page.getByLabel("Máximo por compra").fill("50000");
    await page.getByLabel("Máximo mensual por participante").fill("5000");
    await page.getByRole("button", { name: "Guardar reglas" }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();

    await page.goto("/mis-puntos/compra");
    const opciones = page.locator("main button").filter({ hasText: /^\s*[\d.]+\s*\$/ });
    await expect(opciones).toHaveCount(2); // 70.000 queda fuera del máximo; repetidos y ceros se descartan
    await expect(opciones.first()).toContainText("1.000");
    await expect(page.getByText(/entre 1\.000 y 50\.000/)).toBeVisible();
  });

  test("cada compra queda en el historial del participante y en Compras de puntos del panel, con su monto", async ({ page }) => {
    await page.goto("/mis-puntos/compra");
    await page.getByRole("button", { name: "Comprar puntos" }).click();
    await page.getByRole("button", { name: "Pagar ahora" }).click();
    await expect(page.getByText("¡Tus puntos ya están acreditados!")).toBeVisible({ timeout: 10_000 });
    const codigo = (await page.getByText(/Operación PTS-/).innerText()).match(/PTS-\S+/)![0];

    await page.goto("/mis-puntos/historial");
    await expect(page.locator("td:visible, p:visible", { hasText: `Compra de puntos operación ${codigo}` }).first()).toBeVisible();

    await entrarAdmin(page);
    await page.goto("/admin/compras-puntos");
    await page.getByLabel("Buscar compra").fill(codigo);
    const fila = page.locator("tbody tr", { hasText: codigo });
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText("Aprobada");
    await expect(fila).toContainText("$"); // monto pagado

    await page.goto("/admin/movimientos");
    await expect(page.locator("td:visible, p:visible", { hasText: `Compra de puntos operación ${codigo}` }).first()).toBeVisible();
  });

  test("el tope mensual se aplica en la compra", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reglas");
    await page.getByLabel("Máximo mensual por participante").fill("6000");
    await page.getByRole("button", { name: "Guardar reglas" }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();
    await page.goto("/mis-puntos/compra");
    await page.getByRole("button", { name: "Comprar puntos" }).click();
    await page.getByRole("button", { name: "Pagar ahora" }).click();
    await expect(page.getByText("¡Tus puntos ya están acreditados!")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Comprar más puntos" }).click();
    // la segunda compra supera el tope: se rechaza al crearla, antes de abrir la pasarela (no se cobra nada)
    await page.getByRole("button", { name: "Comprar puntos" }).click();
    await expect(page.getByText(/Superas el máximo mensual/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Pagar ahora" })).toHaveCount(0);
  });
});