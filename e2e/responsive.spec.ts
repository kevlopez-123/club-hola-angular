import { expect, test } from "@playwright/test";
import { ADMIN_ROUTES, PUBLIC_ROUTES, desbordes, entrarAdmin, esperarCarga } from "./helpers";

const VIEWPORTS = [
  { nombre: "móvil 375", width: 375, height: 800 },
  { nombre: "tablet 768", width: 768, height: 1024 },
  { nombre: "laptop 1024", width: 1024, height: 768 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Responsive ${vp.nombre}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("el sitio no tiene scroll horizontal", async ({ page }) => {
      test.setTimeout(300_000);
      const fallos: string[] = [];
      for (const ruta of PUBLIC_ROUTES) {
        await page.goto(ruta);
        await esperarCarga(page);
        const d = await desbordes(page);
        if (d.scroll > d.ancho + 1) fallos.push(`${ruta} → scroll ${d.scroll}>${d.ancho} · ${d.out.join(" | ")}`);
      }
      expect(fallos).toEqual([]);
    });

    test("el admin no tiene scroll horizontal", async ({ page }) => {
      test.setTimeout(300_000);
      await entrarAdmin(page);
      const fallos: string[] = [];
      for (const ruta of ADMIN_ROUTES) {
        await page.goto(ruta);
        await esperarCarga(page);
        const d = await desbordes(page);
        if (d.scroll > d.ancho + 1) fallos.push(`${ruta} → scroll ${d.scroll}>${d.ancho} · ${d.out.join(" | ")}`);
      }
      expect(fallos).toEqual([]);
    });
  });
}

test.describe("Responsive: comportamiento de la cabecera", () => {
  test("en móvil el menú se abre, navega y se cierra", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Mis puntos" }).click();
    await page.getByRole("link", { name: "Compra de puntos" }).click();
    await expect(page).toHaveURL(/mis-puntos\/compra$/);
    await expect(page.getByRole("button", { name: "Cerrar menú" })).toHaveCount(0);
  });

  test("en escritorio el menú móvil no se muestra y en móvil sí el buscador", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeHidden();
    await page.setViewportSize({ width: 375, height: 800 });
    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
    await expect(page.getByRole("searchbox").first()).toBeVisible();
  });

  test("a 1024 px la cabecera no se solapa", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    const nivel = await page.getByRole("link", { name: /Nivel/ }).first().boundingBox();
    const puntos = await page.getByText(/Tienes/).first().boundingBox();
    expect(nivel!.x + nivel!.width).toBeLessThanOrEqual(puntos!.x + 1);
  });

  test("el admin colapsa la barra lateral en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await entrarAdmin(page);
    await expect(page.getByRole("link", { name: "Productos", exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("link", { name: "Productos", exact: true }).click();
    await expect(page).toHaveURL(/admin\/productos$/);
  });
});
