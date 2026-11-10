import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const abrirDiseno = async (page: Page) => {
  await entrarAdmin(page);
  await page.goto("/admin/correos");
  await page.getByRole("tab", { name: "Diseño" }).click();
};
const html = (page: Page) => page.locator("iframe").first().evaluate((f) => (f as HTMLIFrameElement).srcdoc);

test.describe("Correos: tipografía y redes del diseño", () => {
  test("se puede elegir la tipografía de la marca o una de Google Fonts, con la alternativa segura", async ({ page }) => {
    await abrirDiseno(page);
    const sel = page.getByLabel("Tipografía del correo");
    expect(await html(page)).not.toContain("fonts.googleapis.com"); // por defecto, solo fuentes seguras

    await sel.selectOption("__marca__");
    await expect(page.getByText(/Gmail y Outlook no descargan fuentes web/)).toBeVisible();
    await expect.poll(() => html(page)).toContain("fonts.googleapis.com");

    await sel.selectOption("__google__");
    await page.getByLabel("Nombre de la fuente en Google Fonts").fill("Inter");
    await expect.poll(() => html(page)).toMatch(/family=Inter/);
    expect(await html(page)).toMatch(/font-family|font:700 24px\/1\.3 'Inter', Arial/);

    await page.getByLabel("Nombre de la fuente en Google Fonts").fill("<script>");
    await expect(page.getByRole("alert").filter({ hasText: "Usa solo letras" })).toBeVisible();
    expect(await html(page)).not.toContain("<script>"); // un nombre raro no entra al correo
  });

  test("volver a una fuente segura quita la fuente web", async ({ page }) => {
    await abrirDiseno(page);
    await page.getByLabel("Tipografía del correo").selectOption("__marca__");
    await expect.poll(() => html(page)).toContain("fonts.googleapis.com");
    await page.getByLabel("Tipografía del correo").selectOption({ label: "Georgia (clásica)" });
    await expect.poll(() => html(page)).not.toContain("fonts.googleapis.com");
  });

  test("sin redes configuradas, el diseño lo explica y enlaza a Configuración", async ({ page }) => {
    await abrirDiseno(page);
    const aviso = page.getByRole("status").filter({ hasText: "no muestra nada en el pie" });
    await expect(aviso).toBeVisible();
    await expect(aviso.getByRole("link", { name: /Redes sociales/ })).toHaveAttribute("href", "/admin/configuracion");
  });

  test("con una red configurada, el pie del correo la muestra y el diseño la nombra", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await page.getByLabel("Instagram").first().fill("https://instagram.com/mi_programa");
    await page.getByRole("button", { name: /Guardar/ }).first().click();
    await page.goto("/admin/correos");
    await page.getByRole("tab", { name: "Diseño" }).click();
    await expect(page.getByText(/Se muestran las que tienen enlace.*Instagram/)).toBeVisible();
    await expect.poll(() => html(page)).toContain("instagram.com/mi_programa");
  });
});
