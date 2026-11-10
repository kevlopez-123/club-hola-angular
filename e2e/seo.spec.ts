import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const meta = (page: Page, sel: string) => page.locator(`head meta[${sel}]`).first().getAttribute("content");
const esperarMeta = async (page: Page, sel: string, re: RegExp) => expect.poll(async () => (await meta(page, sel)) ?? "").toMatch(re);

test.describe("SEO", () => {
  test("el sitio es cerrado: el Home no se indexa y no tiene canónica; Términos sí", async ({ page }) => {
    await page.goto("/");
    await esperarMeta(page, 'name="robots"', /noindex, nofollow/);
    await expect(page.locator("head link[rel='canonical']")).toHaveCount(0);
    await page.goto("/terminos");
    await esperarMeta(page, 'name="robots"', /^index, follow$/);
    await expect(page.locator("head link[rel='canonical']")).toHaveAttribute("href", /\/terminos$/);
    await esperarMeta(page, 'property="og:title"', /Términos/);
    expect(await meta(page, 'name="theme-color"')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test("solo las páginas legales son indexables y cada una tiene su descripción", async ({ page }) => {
    const vistas = new Set<string>();
    for (const ruta of ["/terminos", "/privacidad"]) {
      await page.goto(ruta);
      await expect.poll(async () => (await meta(page, 'name="robots"')) ?? "").toBe("index, follow");
      vistas.add((await meta(page, 'name="description"')) ?? "");
    }
    expect(vistas.size).toBe(2);
    for (const ruta of ["/canjea", "/beneficios", "/vuelos", "/preguntas-frecuentes"]) {
      await page.goto(ruta);
      await esperarMeta(page, 'name="robots"', /noindex, nofollow/);
    }
  });
  test("carrito, perfil y login no se indexan y no tienen canónica", async ({ page }) => {
    for (const ruta of ["/carrito", "/perfil", "/contacto", "/login"]) {
      await page.goto(ruta);
      await esperarMeta(page, 'name="robots"', /noindex, nofollow/);
      await expect(page.locator("head link[rel='canonical']")).toHaveCount(0);
    }
  });

  test("el panel de administración no se indexa", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/pedidos");
    await esperarMeta(page, 'name="robots"', /noindex, nofollow/);
  });

  test("la ficha de producto trae título propio, Open Graph de producto y JSON-LD schema.org/Product", async ({ page }) => {
    await page.goto("/canjea/p1");
    const ld = page.locator("script#seo-jsonld");
    await expect(ld).toHaveCount(1);
    const datos = JSON.parse((await ld.textContent())!);
    expect(datos["@type"]).toBe("Product");
    expect(datos.name).toBeTruthy();
    expect(datos.offers.priceCurrency).toMatch(/^[A-Z]{3}$/);
    expect(datos.offers.price).toBeGreaterThan(0);
    await esperarMeta(page, 'property="og:type"', /^product$/);
    await esperarMeta(page, 'property="og:title"', new RegExp(datos.name.slice(0, 10)));
    await expect(page).toHaveTitle(new RegExp(datos.name.slice(0, 10)));
    await expect(page.locator("head link[rel='canonical']")).toHaveCount(0); // sitio cerrado: la ficha no se indexa
  });

  test("al salir de una ficha se quita el JSON-LD", async ({ page }) => {
    await page.goto("/canjea/p1");
    await expect(page.locator("script#seo-jsonld")).toHaveCount(1);
    await page.getByRole("link", { name: /Canjea tus puntos/ }).first().click();
    await expect(page.locator("script#seo-jsonld")).toHaveCount(0);
  });

  test("ficha de beneficio y de destino ajustan su título y descripción", async ({ page }) => {
    await page.goto("/beneficios/b1");
    await expect.poll(() => page.title()).toMatch(/ en .*\|/);
    await page.goto("/vuelos/destinos/miami");
    await expect.poll(() => page.title()).toMatch(/^Vuelos a /);
  });

  test("robots.txt y sitemap.xml se sirven y son coherentes", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<urlset");
    expect(sitemap).toMatch(/<loc>https?:\/\/[^<]+\/canjea<\/loc>/);
    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("/carrito");
  });
});