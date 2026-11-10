import { expect, test } from "@playwright/test";

/** Uniformidad de colores y tamaños de texto entre la ficha de producto y la de beneficio. */
const color = (loc: import("@playwright/test").Locator) => loc.evaluate((e) => getComputedStyle(e).color + "|" + getComputedStyle(e).fontSize);

test("fichas: secciones de detalle con el mismo color y tamaño de texto", async ({ page }) => {
  await page.goto("/canjea/p7");
  await page.getByRole("heading", { level: 1 }).waitFor();
  const prodLista = await color(page.locator("section", { has: page.getByRole("heading", { name: "Especificaciones" }) }).locator("li").first());
  const prodPrecio = await color(page.getByText(/con tu tarjeta/).first());
  await page.goto("/beneficios/b1");
  await page.getByRole("heading", { level: 1 }).waitFor();
  const benLista = await color(page.locator("section", { has: page.getByRole("heading", { name: "Especificaciones" }) }).locator("li").first());
  const benTerminos = await color(page.locator("section", { has: page.getByRole("heading", { name: "Términos y condiciones" }) }).locator("p"));
  expect(benLista).toBe(prodLista);
  expect(benTerminos).toBe(prodLista);
  expect(prodPrecio.split("|")[1]).toBe("14px"); // mismo tamaño que el texto secundario del beneficio
});
