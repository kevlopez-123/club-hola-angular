import { expect, test } from "@playwright/test";

test("Mi nivel no repite las reglas: están solo en el modal de Cómo funcionan los niveles", async ({ page }) => {
  await page.goto("/mi-nivel");
  await expect(page.getByRole("heading", { name: "Rangos y beneficios por nivel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cómo funcionan los niveles", exact: true })).toHaveCount(0);
  await expect(page.getByText("Canjear productos no reduce tu nivel")).toHaveCount(0);
  await page.getByRole("button", { name: "Cómo funcionan los niveles" }).click();
  await expect(page.getByRole("dialog").getByText("Canjear productos no reduce tu nivel")).toBeVisible();
});
