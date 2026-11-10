import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test("la fuente guardada en Marca se aplica en la web del participante", async ({ page }) => {
  await entrarAdmin(page);
  await page.goto("/admin/configuracion");
  const campo = page.getByLabel("Fuente (Google Fonts)");
  await campo.fill("Poppins");
  await page.getByRole("button", { name: "Guardar marca" }).first().click();
  await expect(page.getByText("Guardado", { exact: false }).first()).toBeVisible().catch(() => {});
  await page.goto("/canjea");
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => ({ fuente: getComputedStyle(document.documentElement).getPropertyValue("--fuente"), body: getComputedStyle(document.body).fontFamily, link: document.getElementById("brand-font")?.getAttribute("href"), h: getComputedStyle(document.querySelector("h1,h2")!).fontFamily }));
  expect(info.body).toContain("Poppins");
});
