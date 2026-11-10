import { expect, test } from "@playwright/test";
import { entrarAdmin, publicarLegal } from "./helpers";

test.describe("Textos legales en markdown", () => {
  test("en el login, Términos y Política son enlaces que abren un modal con el texto configurado", async ({ page }) => {
    await page.goto("/login");
    const nota = page.getByText("Al ingresar aceptas", { exact: false });
    await expect(nota).toBeVisible();
    await nota.getByRole("link", { name: "Términos y Condiciones" }).click();
    const modal = page.getByRole("dialog", { name: "Términos y condiciones" });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "1. Del programa" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await nota.getByRole("link", { name: "Política de Privacidad" }).click();
    await expect(page.getByRole("dialog", { name: "Política de privacidad" }).getByRole("heading", { name: /Responsable del tratamiento/ })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("el modal del login muestra lo que se edite en el panel", async ({ page }) => {
    await entrarAdmin(page);
    await publicarLegal(page, "Términos y condiciones", { texto: "## Reglas nuevas\n\nSolo esto." });
    await page.goto("/login");
    await page.getByRole("link", { name: "Términos y Condiciones" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Reglas nuevas" })).toBeVisible();
  });

  test("el markdown no ejecuta HTML", async ({ page }) => {
    await entrarAdmin(page);
    await publicarLegal(page, "Política de privacidad", { texto: "<script>window.__x=1</script><img src=x onerror=\"window.__x=1\">\n\n[malo](javascript:window.__x=1)" });
    await page.goto("/privacidad");
    await expect(page.locator("article")).toContainText("<script>");
    expect(await page.evaluate(() => (window as any).__x)).toBeUndefined();
    await expect(page.locator("article a")).toHaveCount(0);
  });

  test("el subtítulo de Preguntas frecuentes se edita en el panel", async ({ page }) => {
    await page.goto("/preguntas-frecuentes");
    await expect(page.getByText("Todo lo que necesitas saber sobre cómo funciona Banco Solidario Puntos.")).toBeVisible();
    await entrarAdmin(page);
    await page.goto("/admin/contenido");
    await page.getByRole("button", { name: "FAQ y legales" }).click();
    await page.getByLabel("Subtítulo de la página").fill("Resolvemos tus dudas al instante.");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.goto("/preguntas-frecuentes");
    await expect(page.getByText("Resolvemos tus dudas al instante.")).toBeVisible();
  });

  test("el subtítulo de Términos y de Privacidad se edita en el panel", async ({ page }) => {
    await entrarAdmin(page);
    await publicarLegal(page, "Términos y condiciones", { texto: "## Texto de prueba\n\nUno.", intro: "Vigentes desde enero 2027." });
    await publicarLegal(page, "Política de privacidad", { texto: "## Texto de prueba\n\nDos.", intro: "Cumplimos la ley de datos personales." });
    await page.goto("/terminos");
    await expect(page.getByText("Vigentes desde enero 2027.")).toBeVisible();
    await page.goto("/privacidad");
    await expect(page.getByText("Cumplimos la ley de datos personales.")).toBeVisible();
  });

  test("Preguntas frecuentes queda centrada", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preguntas-frecuentes");
    const h1 = await page.getByRole("heading", { name: "Preguntas frecuentes" }).boundingBox();
    const lista = await page.locator("main ul").first().boundingBox();
    expect(Math.abs(h1!.x + h1!.width / 2 - 640)).toBeLessThan(40);
    expect(Math.abs(lista!.x + lista!.width / 2 - 640)).toBeLessThan(20);
  });
});
