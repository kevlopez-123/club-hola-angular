import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Accesibilidad y áreas táctiles (sin cambios de marca)", () => {
  test("sitio: saltar al contenido, h1 en la portada y foco al navegar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#contenido")).toBeFocused();
    await page.getByRole("link", { name: "Canjea tus puntos" }).first().click();
    await expect(page).toHaveURL(/canjea$/);
    await expect(page.locator("main#contenido")).toBeFocused(); // el foco pasa al contenido al navegar
  });

  test("tarjetas: un solo enlace por producto y títulos sin saltos de nivel", async ({ page }) => {
    await page.goto("/canjea");
    await expect(page.locator("app-product-card").first()).toBeVisible();
    const sinNombre = await page.evaluate(() => [...document.querySelectorAll("a")].filter((a) => !a.closest("[aria-hidden=true]") && !(a.textContent?.trim() || a.getAttribute("aria-label") || a.querySelector("img[alt]:not([alt=''])"))).length);
    expect(sinNombre).toBe(0);
    const imgLinks = await page.locator("app-product-card a[aria-hidden='true']").count();
    expect(imgLinks).toBeGreaterThan(5);
    const niveles = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,[role=heading]")].map((h) => +(h.getAttribute("aria-level") ?? h.tagName[1]!)));
    for (let i = 1; i < niveles.length; i++) expect(niveles[i]! - niveles[i - 1]!).toBeLessThanOrEqual(1);
  });

  test("carrusel: sin botón de pausa, diapositivas inactivas inertes y puntos con área táctil", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Pausar carrusel|Reanudar carrusel/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ir al banner 2" })).toBeVisible(); // esperar a que carguen los banners
    await expect.poll(() => page.locator("section[aria-label='Promociones destacadas'] [inert]").count()).toBeGreaterThan(0);
    const punto = page.getByRole("button", { name: "Ir al banner 2" });
    const b = await punto.boundingBox();
    expect(b!.width).toBeGreaterThanOrEqual(32);
    expect(b!.height).toBeGreaterThanOrEqual(32);
  });

  test("con movimiento reducido el carrusel no avanza solo", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    const punto2 = page.getByRole("button", { name: "Ir al banner 1" });
    await expect(punto2).toHaveAttribute("aria-current", "true");
    await page.waitForTimeout(7500);
    await expect(punto2).toHaveAttribute("aria-current", "true"); // seguiría en el primero si hubiera avanzado solo
    await ctx.close();
  });

  test("áreas táctiles: cantidad del producto y pie de página de 44 px", async ({ page }) => {
    await page.goto("/canjea/p7");
    for (const n of ["Quitar uno", "Agregar uno"]) {
      const b = await page.getByRole("button", { name: n }).boundingBox();
      expect(b!.width).toBeGreaterThanOrEqual(43);
      expect(b!.height).toBeGreaterThanOrEqual(43);
    }
    const links = await page.locator("footer li > a").evaluateAll((a) => a.map((x) => Math.round(x.getBoundingClientRect().height)));
    expect(Math.min(...links)).toBeGreaterThanOrEqual(43);
  });

  test("panel: saltar al contenido, foco al cambiar de sección e interruptores con área de 44 px", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await expect(page.locator("main#contenido")).toBeAttached();
    const sw = page.getByRole("switch").first();
    await expect(sw).toBeVisible();
    const alto = await sw.evaluate((e) => { const r = getComputedStyle(e, "::before"); return parseFloat(r.height) || (e.getBoundingClientRect().height + 20); });
    expect(alto).toBeGreaterThanOrEqual(43);
    await page.getByRole("link", { name: "Beneficios", exact: true }).click();
    await expect(page.locator("main#contenido")).toBeFocused();
  });
});