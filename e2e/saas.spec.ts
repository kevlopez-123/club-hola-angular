import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Interfaz SaaS del admin", () => {
  test("paleta de comandos: Ctrl+K, filtrar, navegar con teclado", async ({ page }) => {
    await entrarAdmin(page);
    await page.keyboard.press("Control+k");
    const paleta = page.getByRole("dialog", { name: "Paleta de comandos" });
    await expect(paleta).toBeVisible();
    await page.getByLabel("Buscar comandos").fill("particip");
    await expect(paleta.getByRole("option").first()).toContainText("Participantes"); // también coincide por grupo
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/admin\/participantes$/);
    await expect(paleta).toHaveCount(0);
    // Escape la cierra y las flechas cambian la selección
    await page.keyboard.press("Control+k");
    await expect(page.getByLabel("Buscar comandos")).toBeFocused(); // el foco llega con un pequeño retraso
    await page.keyboard.press("ArrowDown");
    await expect(paleta.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await expect(paleta).toHaveCount(0);
  });

  test("la paleta solo ofrece secciones permitidas por el rol", async ({ page }) => {
    await entrarAdmin(page, "Solo lectura");
    await page.getByRole("button", { name: "Buscar y ejecutar comandos" }).click();
    await page.getByLabel("Buscar comandos").fill("Productos");
    await expect(page.getByText("Sin resultados")).toBeVisible();
  });

  test("barra lateral colapsable y recordada", async ({ page }) => {
    await entrarAdmin(page);
    const aside = page.getByLabel("Navegación principal");
    const ancho = async () => (await aside.boundingBox())!.width;
    expect(await ancho()).toBeGreaterThan(200);
    await page.getByRole("button", { name: "Contraer barra lateral" }).click();
    await expect.poll(ancho).toBeLessThan(100);
    await expect(page.getByRole("link", { name: "Productos", exact: true })).toBeVisible(); // íconos con etiqueta accesible
    await page.reload();
    await expect(page.getByRole("button", { name: "Expandir barra lateral" })).toBeVisible();
    await page.getByRole("button", { name: "Expandir barra lateral" }).click();
    await expect.poll(ancho).toBeGreaterThan(200);
  });

  test("tema oscuro: se aplica, se recuerda y cambia los colores", async ({ page }) => {
    await entrarAdmin(page);
    const fondo = () => page.evaluate(() => getComputedStyle(document.querySelector("[data-admin-tema]")!).backgroundColor);
    const claro = await fondo();
    await page.getByRole("button", { name: "Cambiar a tema oscuro" }).click();
    await expect(page.locator("[data-admin-tema]")).toHaveAttribute("data-admin-tema", "oscuro");
    expect(await fondo()).not.toBe(claro);
    await page.reload();
    await expect(page.locator("[data-admin-tema]")).toHaveAttribute("data-admin-tema", "oscuro");
    await page.getByRole("button", { name: "Cambiar a tema claro" }).click();
    await expect(page.locator("[data-admin-tema]")).toHaveAttribute("data-admin-tema", "claro");
  });

  test("notificaciones con pendientes accionables", async ({ page }) => {
    await entrarAdmin(page);
    await page.getByRole("button", { name: "Notificaciones" }).click();
    await expect(page.getByRole("menuitem", { name: /Mensajes sin responder/ })).toContainText("3");
    await page.getByRole("menuitem", { name: /Mensajes sin responder/ }).click();
    await expect(page).toHaveURL(/admin\/atencion$/);
  });

  test("sin migas de pan y con menú de usuario con correo y cierre de sesión", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await expect(page.getByLabel("Ruta de navegación")).toHaveCount(0);
    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await expect(page.getByRole("menu").getByText("admin@bancosolidario.com")).toBeVisible();
    await expect(page.getByText("Rol de demostración")).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible();
  });

  test("el logo de la marca está arriba de la barra lateral y no hay selector de workspaces", async ({ page }) => {
    await entrarAdmin(page);
    const aside = page.getByLabel("Navegación principal");
    await expect(aside.locator("img[alt='Banco Solidario']").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Cambiar de workspace" })).toHaveCount(0);
    await expect(page.getByText("Workspace")).toHaveCount(0);
    // con la barra contraída queda la inicial de la marca
    await page.getByRole("button", { name: "Contraer barra lateral" }).click();
    await expect(aside.getByText("B", { exact: true }).first()).toBeVisible();
  });
  test("responsive: en móvil la barra superior y el menú funcionan", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await entrarAdmin(page);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("link", { name: "Pedidos", exact: true }).click();
    await expect(page).toHaveURL(/admin\/pedidos$/);
    await page.getByRole("button", { name: "Buscar y ejecutar comandos" }).click();
    await expect(page.getByRole("dialog", { name: "Paleta de comandos" })).toBeVisible();
  });

  test("accesibilidad básica: landmarks, nombres accesibles y foco visible", async ({ page }) => {
    await entrarAdmin(page);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByLabel("Navegación principal")).toBeVisible();
    const sinNombre = await page.evaluate(() =>
      [...document.querySelectorAll("button, a[href]")].filter((e) => !(e.textContent?.trim() || e.getAttribute("aria-label") || e.getAttribute("title"))).length,
    );
    expect(sinNombre).toBe(0);
    await page.keyboard.press("Tab");
    const foco = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(foco).not.toBe("none");
  });
});
