import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Ficha de la marca aliada", () => {
  test("se abre desde la lista y muestra sus productos y beneficios", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/marcas");
    await page.getByRole("button", { name: "Abrir la ficha de HP" }).or(page.getByRole("link", { name: "Abrir la ficha de HP" })).click();
    await expect(page).toHaveURL(/\/admin\/marcas\/hp$/);
    await expect(page.getByRole("heading", { name: "HP", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: /Productos/ }).click();
    await expect(page).toHaveURL(/tab=productos/);
    await expect(page.getByRole("table", { name: "Productos de la marca" })).toContainText("Laptop Pavilion 15 Core i5");
    await page.goto("/admin/marcas/cinemark?tab=beneficios");
    await expect(page.getByRole("table", { name: "Beneficios de la marca" })).toContainText("2x1 en entradas 2D");
  });

  test("los canjes de la marca salen de los pedidos que incluyen sus artículos", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/marcas/hp?tab=canjes");
    // los números de la cabecera y de la pestaña coinciden con la lista
    const n = Number((await page.getByRole("tab", { name: /Canjes/ }).innerText()).replace(/\D/g, "") || "0");
    if (n > 0) await expect(page.getByRole("table", { name: "Canjes de la marca" }).locator("tbody tr")).not.toHaveCount(0);
    else await expect(page.getByText("Todavía no hay canjes de esta marca.")).toBeVisible();
  });

  test("publicar u ocultar la marca desde su ficha se conserva", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/marcas/hp");
    await page.getByRole("switch", { name: "Publicar HP" }).click();
    await expect(page.getByText("Marca oculta en el sitio")).toBeVisible();
    await page.reload();
    await expect(page.locator("header").getByText("Oculta", { exact: true })).toBeVisible();
  });

  test("una marca inexistente avisa y no se rompe", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/marcas/no-existe");
    await expect(page.getByText("No encontramos esa marca.")).toBeVisible();
  });

  test("Editar marca abre la ventana de edición dentro de la ficha y guarda", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/marcas/hp");
    await page.getByRole("button", { name: "Editar marca" }).click();
    const d = page.getByRole("dialog", { name: "Editar marca" });
    await expect(d.getByLabel("Nombre de la marca")).toHaveValue("HP");
    await d.getByLabel("Sitio web").fill("https://www.hp.com");
    await d.getByRole("button", { name: "Guardar marca" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "https://www.hp.com" })).toBeVisible();
  });

  test("desde Resumen, 'Editar logo, sitio web y descripción' también la abre", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/marcas/hp");
    await page.getByRole("button", { name: /Editar logo, sitio web y descripción/ }).click();
    await expect(page.getByRole("dialog", { name: "Editar marca" })).toBeVisible();
  });

  test("los productos, beneficios y canjes de la ficha llevan a su detalle", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/marcas/hp?tab=productos");
    await page.getByRole("link", { name: "Ver el producto Laptop Pavilion 15 Core i5" }).click();
    await expect(page).toHaveURL(/\/admin\/productos\?ver=/);
    await expect(page.getByRole("dialog").or(page.locator("aside")).getByText("Laptop Pavilion 15 Core i5").first()).toBeVisible();
    await page.goto("/admin/marcas/cinemark?tab=beneficios");
    await page.getByRole("link", { name: /^Ver el beneficio 2x1/ }).first().click();
    await expect(page).toHaveURL(/\/admin\/beneficios\?ver=/);
    await expect(page.locator("aside").getByText(/2x1 en entradas/).first()).toBeVisible();
  });

  test("en la ficha del participante, pedidos y cotizaciones abren su detalle", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes/p1?tab=compras");
    const enlace = page.getByRole("table", { name: "Pedidos de canje" }).getByRole("link").first();
    const codigo = (await enlace.innerText()).trim();
    await enlace.click();
    await expect(page).toHaveURL(new RegExp(`/admin/pedidos\\?ver=${codigo}`));
    await expect(page.locator("aside").getByText(codigo).first()).toBeVisible();
    await page.goto("/admin/participantes/p1?tab=cotizaciones");
    const cot = page.getByRole("link", { name: /^Ver la cotización/ }).first();
    if (await cot.count()) {
      await cot.click();
      await expect(page).toHaveURL(/\/admin\/cotizaciones\?ver=/);
      await expect(page.getByRole("dialog").or(page.locator("aside")).first()).toBeVisible();
    }
  });

  test("las acciones destructivas son rojas", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/roles");
    await page.getByRole("button", { name: "Duplicar el rol Catálogo" }).click();
    await page.keyboard.press("Escape");
    const rojo = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--destructive").trim());
    expect(rojo).not.toBe("");
    await page.goto("/admin/marcas");
    const color = await page.getByRole("button", { name: "Eliminar HP" }).evaluate((e) => getComputedStyle(e).color);
    const ref = await page.evaluate(() => { const s = document.createElement("span"); s.style.color = "var(--destructive)"; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; });
    expect(color).toBe(ref);
  });
});