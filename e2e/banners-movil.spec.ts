import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8Dwn4GBgYGJAQoAHxQBA0bAfiQAAAAASUVORK5CYII=", "base64");

async function crearBannerConMovil(page: Page, conMovil: boolean) {
  await entrarAdmin(page);
  await page.goto("/admin/contenido");
  await page.getByRole("button", { name: "Nuevo banner" }).click();
  const d = page.getByRole("dialog", { name: /Nuevo banner/ });
  await expect(d.getByText("Imagen para escritorio")).toBeVisible();
  await expect(d.getByText("Imagen para móvil (opcional)")).toBeVisible();
  await expect(d.getByText("Mínimo recomendado: 1440 × 450 px")).toBeVisible();
  await expect(d.getByText("Mínimo recomendado: 720 × 720 px")).toBeVisible();
  const subir = d.getByLabel("Subir imagen");
  await subir.first().setInputFiles({ name: "escritorio.png", mimeType: "image/png", buffer: PNG });
  if (conMovil) await subir.last().setInputFiles({ name: "movil.png", mimeType: "image/png", buffer: PNG });
  await d.getByLabel("Texto alternativo").fill("Banner de prueba");
  await d.getByRole("button", { name: "Guardar banner" }).click();
  await expect(d).toBeHidden();
}

test.describe("Banners: versión para móvil", () => {
  test("con imagen móvil el sitio la usa en celular y la caja pasa a cuadrada", async ({ page }) => {
    await crearBannerConMovil(page, true);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").catalogo?.banners?.home?.some((b: any) => b.imagenMovil))).toBe(true);
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    const slider = page.locator("section[aria-label='Promociones destacadas']");
    await expect(slider).toBeAttached();
    await expect(slider.locator("picture source[media]").first()).toHaveAttribute("srcset", /^blob:/);
    const caja = await slider.locator("div.relative").first().boundingBox();
    expect(Math.abs(caja!.width - caja!.height)).toBeLessThan(2); // cuadrada en celular
    await page.setViewportSize({ width: 1280, height: 800 });
    const ancha = await slider.locator("div.relative").first().boundingBox();
    expect(ancha!.width / ancha!.height).toBeGreaterThan(2.5); // 3:1 en escritorio
  });

  test("sin imagen móvil todo queda como antes (16:9 en celular, sin <source>)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    const slider = page.locator("section[aria-label='Promociones destacadas']");
    await expect(slider).toBeAttached();
    await expect(slider.locator("picture source")).toHaveCount(0);
    const caja = await slider.locator("div.relative").first().boundingBox();
    expect(Math.abs(caja!.width / caja!.height - 16 / 9)).toBeLessThan(0.05);
  });
});

/** Verificación de punta a punta con imágenes reales (data URL): qué archivo descarga el navegador en cada ancho. */
const svg = (color: string, texto: string, w: number, h: number) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-size="${Math.round(h / 8)}" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial">${texto}</text></svg>`);
const ESCRITORIO = svg("#1d4ed8", "VERSION ESCRITORIO", 1920, 640);
const MOVIL = svg("#b91c1c", "VERSION MOVIL", 1080, 1080);

test.describe("Banners: se descarga la imagen correcta según el ancho (web del participante)", () => {
  for (const [ruta, clave] of [["/", "home"], ["/vuelos", "vuelos"]] as const) {
    test(`${ruta}: celular usa la versión móvil y escritorio la de escritorio`, async ({ page }) => {
      await entrarAdmin(page); // el inicio de sesión escribe en el servidor simulado y deja guardada la base de datos
      await page.evaluate(([k, d, m]) => {
        const kdb = "bancosolidario_mockdb_v11";
        const db = JSON.parse(localStorage.getItem(kdb) ?? "{}");
        const lista = db.catalogo.banners[k!];
        lista[0] = { ...lista[0], imagen: d, imagenMovil: m };
        localStorage.setItem(kdb, JSON.stringify(db));
      }, [clave, ESCRITORIO, MOVIL]);

      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto(ruta);
      const img = page.locator("section[aria-label='Promociones destacadas'] picture img").first();
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
      expect(await img.evaluate((i: HTMLImageElement) => i.currentSrc)).toBe(MOVIL);
      expect(await img.evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight])).toEqual([1080, 1080]);
      await page.screenshot({ path: `test-results/banner-${clave}-movil.png` });

      await page.setViewportSize({ width: 1280, height: 800 });
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.currentSrc)).toBe(ESCRITORIO);
      await page.screenshot({ path: `test-results/banner-${clave}-escritorio.png` });
    });
  }
});