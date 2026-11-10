import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const limpiar = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Limpiar filtros" });

test.describe("Limpiar filtros: mismo comportamiento en todas las pantallas", () => {
  test("Pedidos: aparece solo con un filtro aplicado y lo deja todo como estaba", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/pedidos");
    await expect(page.locator("tbody tr").first()).toContainText("BNB-"); // ya cargó (no es el esqueleto de carga)
    await expect(limpiar(page)).toHaveCount(0); // sin filtros no se muestra
    const total = await page.locator("tbody tr").count();
    await page.getByLabel("Estado").selectOption("Cancelado");
    await expect(limpiar(page)).toBeVisible();
    await page.getByLabel("Buscar pedido").fill("zzz");
    await expect(page.getByText("No hay pedidos").or(page.locator("tbody tr")).first()).toBeVisible();
    await limpiar(page).click();
    await expect(limpiar(page)).toHaveCount(0);
    await expect(page.getByLabel("Estado")).toHaveValue("");
    await expect(page.getByLabel("Buscar pedido")).toHaveValue("");
    await expect(page.locator("tbody tr")).toHaveCount(total);
  });

  test("Atención, Movimientos y Cotizaciones del panel también la tienen", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/atencion");
    await expect(page.locator("tbody tr", { hasText: "Pedido no llega" })).toBeVisible();
    await page.getByLabel("Estado").selectOption("En proceso");
    await expect(limpiar(page)).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Pedido no llega" })).toHaveCount(0);
    await limpiar(page).click();
    await expect(page.locator("tbody tr", { hasText: "Pedido no llega" })).toBeVisible();

    await page.goto("/admin/movimientos");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await page.getByLabel("Desde").fill("2026-10-01");
    await expect(limpiar(page)).toBeVisible();
    await limpiar(page).click();
    await expect(page.getByLabel("Desde")).toHaveValue("");
    await expect(limpiar(page)).toHaveCount(0);

    await page.goto("/admin/cotizaciones");
    await expect(page.locator("tbody tr", { hasText: "COT-100482" })).toBeVisible();
    await page.getByLabel("Estado").selectOption("Cerrada");
    await expect(page.locator("tbody tr", { hasText: "COT-100482" })).toHaveCount(0);
    await limpiar(page).click();
    await expect(page.locator("tbody tr", { hasText: "COT-100482" })).toBeVisible();
  });

  test("Registro de cambios, Compras de puntos y Productos", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/auditoria");
    await page.getByLabel("Filtrar por usuario").selectOption("Karla Núñez");
    await expect(limpiar(page)).toBeVisible();
    await limpiar(page).click();
    await expect(page.getByLabel("Filtrar por usuario")).toHaveValue("");

    await page.goto("/admin/compras-puntos");
    await page.getByLabel("Buscar compra").fill("PTS");
    await expect(limpiar(page)).toBeVisible();
    await limpiar(page).click();
    await expect(page.getByLabel("Buscar compra")).toHaveValue("");

    await page.goto("/admin/productos");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await page.locator("select").first().selectOption({ index: 1 });
    await expect(limpiar(page)).toBeVisible();
    await limpiar(page).click();
    await expect(limpiar(page)).toHaveCount(0);
  });

  test("Sitio: cotizaciones, historial de puntos, mis beneficios y catálogo", async ({ page }) => {
    await page.goto("/vuelos/cotizaciones");
    await expect(page.locator("article")).toHaveCount(4);
    await expect(limpiar(page)).toHaveCount(0);
    await page.locator("main").getByRole("searchbox").fill("Madrid");
    await expect(page.locator("article")).toHaveCount(1);
    await limpiar(page).click();
    await expect(page.locator("article")).toHaveCount(4);
    await expect(page.locator("main").getByRole("searchbox")).toHaveValue("");

    await page.goto("/mis-puntos/historial");
    await expect(limpiar(page)).toHaveCount(0); // el periodo por defecto no cuenta como filtro
    await page.getByLabel("Tipo de movimiento").selectOption("canje");
    await expect(limpiar(page)).toBeVisible();
    await limpiar(page).click();
    await expect(page.getByLabel("Tipo de movimiento")).toHaveValue("todos");

    await page.goto("/mis-beneficios");
    await page.getByRole("button", { name: "Activos" }).click();
    await expect(limpiar(page)).toBeVisible();
    await limpiar(page).click();
    await expect(page.locator("article")).toHaveCount(7);

    await page.goto("/canjea");
    await page.locator("main").getByRole("searchbox").fill("zzzz");
    await expect(limpiar(page)).toBeVisible();
  });
});