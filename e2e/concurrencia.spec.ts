import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

/** Dos pestañas del mismo navegador comparten la "base" simulada, como dos usuarios compartirían un servidor. */
async function dosUsuarios(context: import("@playwright/test").BrowserContext) {
  const a = await context.newPage();
  const b = await context.newPage();
  await entrarAdmin(a);
  await entrarAdmin(b);
  return { a, b };
}
const reglas = async (p: Page) => {
  await p.goto("/admin/reglas");
  await expect(p.getByLabel("Precio por punto (US$)")).toBeVisible();
};

test.describe("Concurrencia: otro usuario modificó esto", () => {
  test("si otro guarda antes, tu guardado se rechaza con aviso y no pisa su cambio", async ({ context }) => {
    const { a, b } = await dosUsuarios(context);
    await reglas(a);
    await reglas(b);
    await b.getByLabel("Precio por punto (US$)").fill("0.07");
    await b.getByRole("button", { name: "Guardar reglas" }).click();
    await expect(b.getByText(/guardad/i).first()).toBeVisible();
    // A sigue con la versión vieja y guarda otro valor
    await a.getByLabel("Mínimo por compra").fill("900");
    await a.getByRole("button", { name: "Guardar reglas" }).click();
    const aviso = a.getByRole("dialog", { name: "Otro usuario modificó esto" });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText("Tu cambio no se guardó");
    // el cambio de B sigue ahí (A no lo pisó)
    await aviso.getByRole("button", { name: "Recargar" }).click();
    await expect(a.getByLabel("Precio por punto (US$)")).toHaveValue("0.07");
    await expect(a.getByLabel("Mínimo por compra")).not.toHaveValue("900");
  });

  test("tras recargar se puede guardar de nuevo (ya con la versión actual)", async ({ context }) => {
    const { a, b } = await dosUsuarios(context);
    await reglas(a);
    await reglas(b);
    await b.getByLabel("Precio por punto (US$)").fill("0.07");
    await b.getByRole("button", { name: "Guardar reglas" }).click();
    await expect(b.getByText(/guardad/i).first()).toBeVisible();
    await a.getByLabel("Mínimo por compra").fill("900");
    await a.getByRole("button", { name: "Guardar reglas" }).click();
    await a.getByRole("dialog", { name: "Otro usuario modificó esto" }).getByRole("button", { name: "Recargar" }).click();
    await expect(a.getByLabel("Mínimo por compra")).toBeVisible();
    await a.getByLabel("Mínimo por compra").fill("900");
    await a.getByRole("button", { name: "Guardar reglas" }).click();
    await expect(a.getByRole("dialog", { name: "Otro usuario modificó esto" })).toHaveCount(0);
    await expect(a.getByText(/guardad/i).first()).toBeVisible();
  });

  test("guardar varias veces seguidas en la misma pestaña no genera conflicto consigo mismo", async ({ page }) => {
    await entrarAdmin(page);
    await reglas(page);
    for (const v of ["0.03", "0.04", "0.05"]) {
      await page.getByLabel("Precio por punto (US$)").fill(v);
      await page.getByRole("button", { name: "Guardar reglas" }).click();
      await expect(page.getByText(/guardad/i).first()).toBeVisible();
    }
    await expect(page.getByRole("dialog", { name: "Otro usuario modificó esto" })).toHaveCount(0);
  });

  test("también en registros de una lista: dos usuarios editan el mismo participante", async ({ context }) => {
    const { a, b } = await dosUsuarios(context);
    const abrir = async (p: Page) => {
      await p.goto("/admin/participantes");
      await p.getByPlaceholder("Buscar por nombre o cédula").fill("Ana Torres");
      await expect(p.locator("tbody tr")).toHaveCount(1);
      await p.getByRole("link", { name: "Ver ficha" }).click();
      await expect(p.locator("main").getByRole("button", { name: "Bloquear cuenta" })).toBeVisible();
    };
    await abrir(a);
    await abrir(b);
    await b.locator("main").getByRole("button", { name: "Bloquear cuenta" }).click();
    await b.getByRole("button", { name: "Bloquear", exact: true }).click();
    await expect(b.getByText("Cuenta bloqueada")).toBeVisible();
    await expect.poll(() => b.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.participantes?.find((p: any) => p.nombre === "Ana Torres")?.estado)).toBe("Bloqueado");
    // A todavía ve la cuenta activa y también intenta bloquearla
    await a.locator("main").getByRole("button", { name: "Bloquear cuenta" }).click();
    await a.getByRole("button", { name: "Bloquear", exact: true }).click();
    await expect(a.getByRole("dialog", { name: "Otro usuario modificó esto" })).toBeVisible();
  });
});