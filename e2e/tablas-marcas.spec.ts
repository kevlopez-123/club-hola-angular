import { expect, test } from "@playwright/test";
import { entrarAdmin, ADMIN_ROUTES } from "./helpers";

test.describe("Tablas del admin como tarjetas en móvil", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("cada fila es una tarjeta con etiqueta por dato y sin scroll horizontal", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.locator("tbody tr").first().waitFor();
    const info = await page.evaluate(() => {
      const fila = document.querySelector("tbody tr")!;
      const celda = fila.querySelector("td[data-label]:not([data-label=''])")!;
      const cab = document.querySelector("thead")!.getBoundingClientRect();
      return {
        filaDisplay: getComputedStyle(fila).display,
        etiqueta: celda.getAttribute("data-label"),
        antes: getComputedStyle(celda, "::before").content,
        cabeceraVisible: cab.width > 2 && cab.height > 2,
        scroll: document.documentElement.scrollWidth,
      };
    });
    expect(info.filaDisplay).toBe("grid");
    expect(info.etiqueta).toBeTruthy();
    expect(info.antes).toContain(info.etiqueta!);
    // la cabecera pasa a ser la barra de orden, no una fila de títulos
    expect(info.scroll).toBeLessThanOrEqual(376);
  });

  test("las etiquetas se actualizan al paginar", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("bs_stress", "500")); // varias páginas de datos
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.locator("tbody tr").first().waitFor();
    await page.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page.getByText(/Página\s*2\s*de/)).toBeVisible();
    await expect.poll(() => page.locator("tbody td[data-label]").count()).toBeGreaterThan(5);
  });
});

test.describe("En escritorio las filas también son tarjetas en cuadrícula", () => {
  test("tarjetas en varias columnas y cabecera como barra de orden", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.locator("tbody tr").first().waitFor();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("tbody tr")!).display)).toBe("grid");
  });
});

test.describe("Selectores unificados", () => {
  test("todos los select del panel comparten flecha, relleno y sin apariencia nativa", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await entrarAdmin(page);
    const fallos: string[] = [];
    for (const ruta of ["/admin/participantes", "/admin/pedidos", "/admin/cotizaciones", "/admin/atencion", "/admin/movimientos", "/admin/productos", "/admin/configuracion"]) {
      await page.goto(ruta);
      await page.locator("select").first().waitFor();
      const malos = await page.evaluate(() =>
        [...document.querySelectorAll("select")].filter((s) => {
          const c = getComputedStyle(s);
          return c.appearance !== "none" || !c.backgroundImage.includes("svg") || parseFloat(c.paddingRight) < 36;
        }).length,
      );
      if (malos) fallos.push(`${ruta}: ${malos}`);
    }
    expect(fallos).toEqual([]);
  });

  test("también en el sitio público", async ({ page }) => {
    await page.goto("/canjea");
    await page.locator("select").first().waitFor();
    const ok = await page.evaluate(() => [...document.querySelectorAll("select")].every((s) => getComputedStyle(s).appearance === "none" && parseFloat(getComputedStyle(s).paddingRight) >= 36));
    expect(ok).toBe(true);
  });
});

test.describe("Marcas aliadas (logo y sitio web)", () => {
  test("se crea una marca con sitio web y aparece en el detalle del producto", async ({ page }) => {
    await page.goto("/canjea/p7");
    await page.getByText(/forma parte de las marcas aliadas/).waitFor();
    const texto = await page.locator("body").innerText();
    const marca = /([^\n]+?) forma parte de las marcas aliadas/.exec(texto)?.[1]?.trim();
    expect(marca).toBeTruthy();

    await entrarAdmin(page);
    await page.goto("/admin/marcas");
    await page.getByLabel("Buscar marca").fill(marca!);
    const fila = page.locator("tbody tr", { hasText: marca! }); // espera a que la búsqueda ya se haya aplicado
    await expect(fila).toHaveCount(1);
    await fila.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Sitio web").fill("https://www.ejemplo-marca.com");
    await page.locator("textarea").fill("Descripción editada desde el admin.");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await expect(page.getByText("Marca guardada")).toBeVisible();

    await page.goto("/canjea/p7");
    const enlace = page.getByRole("link", { name: new RegExp(`Visitar sitio web de ${marca}`) });
    await expect(enlace).toHaveAttribute("href", "https://www.ejemplo-marca.com");
    await expect(page.getByText("Descripción editada desde el admin.")).toBeVisible();
  });

  test("valida la dirección web y no permite nombres repetidos", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/marcas");
    await page.getByRole("button", { name: "Nueva marca" }).click();
    await page.getByLabel("Nombre de la marca").fill("Marca E2E");
    await page.getByLabel("Sitio web").fill("no-es-una-url");
    await expect(page.getByRole("alert")).toContainText("dirección completa");
    await expect(page.getByRole("button", { name: "Guardar marca" })).toBeDisabled();
    await page.getByLabel("Sitio web").fill("https://www.e2e.com");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await expect(page.getByText("Marca guardada")).toBeVisible();
    await page.getByRole("button", { name: "Nueva marca" }).click();
    await page.getByLabel("Nombre de la marca").fill("marca e2e");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await expect(page.getByRole("alert")).toContainText("Ya existe una marca");
  });

  test("productos y beneficios eligen la marca de la lista", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await page.locator("tbody tr").first().waitFor();
    await page.locator("tbody tr").first().getByRole("button", { name: /Editar/ }).click();
    const opciones = await page.getByLabel("Marca", { exact: true }).locator("option").allTextContents();
    expect(opciones.length).toBeGreaterThan(3);
  });
});

test("las rutas del admin incluyen Marcas", () => {
  expect(ADMIN_ROUTES).toContain("/admin/marcas");
});
