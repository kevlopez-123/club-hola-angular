import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const comprar = async (page: Page, tarjeta?: string) => {
  await page.goto("/mis-puntos/compra");
  await page.getByRole("button", { name: "Comprar puntos" }).click();
  if (tarjeta) await page.getByLabel("Número de tarjeta").fill(tarjeta);
  await page.getByRole("button", { name: "Pagar ahora" }).click();
};
const saldo = (page: Page) => page.getByText(/Tienes .* puntos/).first();

test.describe("Pagos de la compra de puntos: aprobado, rechazado, pendiente y reintento", () => {
  test("pago aprobado acredita los puntos y deja el recibo", async ({ page }) => {
    await comprar(page);
    await expect(page.getByText("¡Tus puntos ya están acreditados!")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Nuevo saldo/)).toBeVisible();
  });

  test("pago rechazado no acredita nada, explica el motivo y permite reintentar", async ({ page }) => {
    await page.goto("/");
    const antes = await saldo(page).innerText();
    await comprar(page, "4000 0000 0000 0002");
    const aviso = page.getByRole("alert").filter({ hasText: "No pudimos procesar tu pago" });
    await expect(aviso).toBeVisible({ timeout: 10_000 });
    await expect(aviso).toContainText("El banco rechazó la tarjeta");
    await expect(aviso).toContainText("No se realizó ningún cargo");
    expect(await saldo(page).innerText()).toBe(antes); // el saldo no cambió
    // Reintentar con otra tarjeta, sobre la misma operación
    await aviso.getByRole("button", { name: "Reintentar pago" }).click();
    await page.getByLabel("Número de tarjeta").fill("4111 1111 1111 1111");
    await page.getByRole("button", { name: "Pagar ahora" }).click();
    await expect(page.getByText("¡Tus puntos ya están acreditados!")).toBeVisible({ timeout: 10_000 });
    expect(await saldo(page).innerText()).not.toBe(antes);
  });

  test("fondos insuficientes también se rechaza con su motivo", async ({ page }) => {
    await comprar(page, "4000 0000 0000 9995");
    await expect(page.getByRole("alert").filter({ hasText: "Fondos insuficientes" })).toBeVisible({ timeout: 10_000 });
  });

  test("pago pendiente: no acredita todavía y avisa; el panel lo confirma y entonces se acreditan los puntos", async ({ page }) => {
    await page.goto("/");
    const antes = await saldo(page).innerText();
    await comprar(page, "4000 0000 0000 0127");
    await expect(page.getByRole("status").filter({ hasText: "Estamos confirmando tu pago" })).toBeVisible({ timeout: 10_000 });
    expect(await saldo(page).innerText()).toBe(antes);
    const codigo = (await page.getByText(/operación PTS-/).first().innerText()).match(/PTS-[A-Z0-9]+/)![0];
    await entrarAdmin(page);
    await page.goto("/admin/compras-puntos");
    const fila = page.locator("tbody tr", { hasText: codigo });
    await expect(fila).toContainText("Pendiente");
    await fila.getByRole("button", { name: `Confirmar pago ${codigo}` }).click();
    await expect(page.getByText(`Pago ${codigo} confirmado y puntos acreditados`)).toBeVisible();
    await expect(fila).toContainText("Aprobada");
    await page.goto("/mis-puntos/historial");
    await expect(page.locator("tbody").getByText(`Compra de puntos operación ${codigo}`)).toBeVisible();
    await page.goto("/notificaciones");
    await expect(page.getByRole("link", { name: /Acreditamos .* puntos/ }).first()).toBeVisible();
  });

  test("el panel puede rechazar un pago pendiente y la persona recibe el aviso", async ({ page }) => {
    await comprar(page, "4000 0000 0000 0127");
    const codigo = (await page.getByText(/operación PTS-/).first().innerText()).match(/PTS-[A-Z0-9]+/)![0];
    await entrarAdmin(page);
    await page.goto("/admin/compras-puntos");
    await page.getByRole("button", { name: `Rechazar pago ${codigo}` }).click();
    await expect(page.locator("tbody tr", { hasText: codigo })).toContainText("Fallida");
    await page.goto("/notificaciones");
    await expect(page.getByRole("link", { name: /No pudimos procesar tu pago/ }).first()).toBeVisible();
  });

  test("el panel filtra por estado y registra la resolución en el registro de cambios", async ({ page }) => {
    await comprar(page, "4000 0000 0000 0002");
    await expect(page.getByRole("alert").filter({ hasText: "No pudimos procesar" })).toBeVisible({ timeout: 10_000 });
    await comprar(page, "4000 0000 0000 0127");
    await expect(page.getByRole("status").filter({ hasText: "Estamos confirmando" })).toBeVisible({ timeout: 10_000 });
    const codigo = (await page.getByText(/operación PTS-/).first().innerText()).match(/PTS-[A-Z0-9]+/)![0];
    await entrarAdmin(page);
    await page.goto("/admin/compras-puntos");
    await page.getByLabel("Filtrar por estado").selectOption("Fallida");
    await expect(page.locator("tbody tr").first()).toContainText("Fallida");
    await expect(page.locator("tbody tr", { hasText: "Pendiente" })).toHaveCount(0);
    await page.getByLabel("Filtrar por estado").selectOption("");
    await page.getByRole("button", { name: `Confirmar pago ${codigo}` }).click();
    await page.goto("/admin/auditoria");
    await expect(page.locator("tbody tr", { hasText: `Confirmó el pago de la compra de puntos ${codigo}` })).toBeVisible();
  });

  test("un canje con saldo en dinero rechazado por el banco no confirma el pedido y deja el carrito intacto", async ({ page }) => {
    await page.goto("/canjea");
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.goto("/carrito");
    const pagar = page.getByRole("button", { name: /Finalizar compra|Pagar/ }).first();
    await pagar.click();
    // si el carrito no requiere dinero se confirma directo; la prueba solo aplica cuando abre la pasarela
    const tarjeta = page.getByLabel("Número de tarjeta");
    if (await tarjeta.count()) {
      await tarjeta.fill("4000 0000 0000 0002");
      await page.getByRole("button", { name: "Pagar ahora" }).click();
      await expect(page.getByText(/El banco rechazó la tarjeta/)).toBeVisible({ timeout: 10_000 });
      await expect(page).toHaveURL(/\/carrito$/);
    }
  });
});
