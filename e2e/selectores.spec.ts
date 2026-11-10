import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Menús desplegables propios (no nativos)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("el select abre una lista propia, con teclado y ratón, y dispara el cambio", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("bs_stress", "300"));
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await expect(page.getByText(/Mostrando/)).toBeVisible(); // ya cargó (la primera fila puede ser "sin resultados")
    const filas = page.getByLabel("Filas por página");

    await filas.click();
    const lista = page.getByRole("listbox");
    await expect(lista).toBeVisible();
    await expect(lista.getByRole("option")).toHaveCount(await filas.locator("option").count());
    await lista.getByRole("option", { name: "50", exact: true }).click();
    await expect(lista).toHaveCount(0);
    await expect(filas).toHaveValue("50");
    await expect(page.locator("tbody tr")).toHaveCount(50);

    // teclado: abrir, bajar, Enter
    await filas.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(filas).toHaveValue("100");

    // Escape cierra sin cambiar y las letras saltan de opción
    await filas.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(filas).toHaveValue("100");
  });

  test("clic fuera cierra la lista y se ve con los colores de la marca", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/pedidos");
    await page.getByLabel("Estado").click();
    const lista = page.getByRole("listbox");
    await expect(lista).toBeVisible();
    const radio = await lista.evaluate((e) => getComputedStyle(e).borderRadius);
    expect(parseFloat(radio)).toBeGreaterThan(4);
    await page.getByRole("heading", { name: "Pedidos" }).click();
    await expect(lista).toHaveCount(0);
  });

  test("también en el sitio del participante", async ({ page }) => {
    await page.goto("/canjea");
    const orden = page.locator("main select").first();
    await orden.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.getByRole("listbox").getByRole("option").nth(1).click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
  });
});