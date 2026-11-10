import { expect, test, type Page } from "@playwright/test";

async function paso2(page: Page, cantidad = 1) {
  await page.goto("/vuelos");
  await page.getByLabel("Fecha de ida").fill("2027-03-10");
  await page.getByLabel("Fecha de regreso").fill("2027-03-20");
  for (let i = 1; i < cantidad; i++) await page.getByRole("button", { name: "Agregar pasajero" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator("#nom-0")).toBeVisible();
}
const llenar = async (page: Page, i: number, nombre: string, doc: string, nac: string) => {
  await page.locator(`#nom-${i}`).fill(nombre);
  await page.locator(`#ape-${i}`).fill("Torres");
  await page.locator(`#ndoc-${i}`).fill(doc);
  await page.locator(`#nac-${i}`).fill(nac);
};

test.describe("Cotización de vuelos: validaciones en tiempo real", () => {
  test("paso 1: avisa qué falta, marca el campo y lleva el foco al primero", async ({ page }) => {
    await page.goto("/vuelos");
    await page.getByRole("button", { name: "Continuar" }).click();
    const resumen = page.getByRole("status").filter({ hasText: "Revisa" });
    await expect(resumen).toContainText("Fecha de ida");
    await expect(resumen).toContainText("Fecha de regreso");
    await expect(page.locator("#ida")).toBeFocused();
    await expect(page.locator("#ida")).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("Fecha de ida").fill("2027-03-10");
    await expect(resumen).not.toContainText("Fecha de ida"); // se actualiza al instante
    await page.getByLabel("Fecha de regreso").fill("2027-03-20");
    await expect(resumen).toHaveCount(0);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.locator("#nom-0")).toBeVisible();
  });

  test("el error de un campo aparece al salir de él, sin esperar al botón", async ({ page }) => {
    await paso2(page);
    await page.locator("#ndoc-0").focus();
    await page.locator("#ndoc-0").fill("12345");
    await page.locator("#ndoc-0").blur();
    await expect(page.getByRole("alert").filter({ hasText: "La cédula debe tener 10 dígitos." })).toBeVisible();
    await page.locator("#ndoc-0").fill("1712345678");
    await expect(page.getByText("La cédula debe tener 10 dígitos.")).toHaveCount(0);
  });

  test("al menos un pasajero debe ser mayor de 18 años", async ({ page }) => {
    await paso2(page, 2);
    await llenar(page, 0, "Mateo", "1723456780", "2015-09-30");
    await llenar(page, 1, "Sofía", "1712345678", "2012-01-10");
    await expect(page.getByText("Al menos un pasajero debe ser mayor de 18 años.").first()).toBeVisible();
    await page.getByRole("button", { name: "Cotizar" }).click();
    await expect(page.getByRole("dialog", { name: "Datos de contacto" })).toHaveCount(0); // no avanza
    await page.locator("#nac-1").fill("1985-06-01"); // ahora hay un adulto
    await expect(page.getByText("Al menos un pasajero debe ser mayor de 18 años.")).toHaveCount(0);
    await page.getByRole("button", { name: "Cotizar" }).click();
    await expect(page.getByRole("dialog", { name: "Datos de contacto" })).toBeVisible();
  });

  test("los documentos no pueden repetirse entre pasajeros", async ({ page }) => {
    await paso2(page, 2);
    await llenar(page, 0, "Ana", "1712345678", "1990-05-05");
    await llenar(page, 1, "Luis", "1712345678", "1992-02-02");
    await expect(page.getByRole("alert").filter({ hasText: /ya está en el pasajero 1; no puede repetirse/ })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: /ya está en el pasajero 2; no puede repetirse/ })).toBeVisible();
    await page.getByRole("button", { name: "Cotizar" }).click();
    await expect(page.getByRole("dialog", { name: "Datos de contacto" })).toHaveCount(0);
    await page.locator("#ndoc-1").fill("1723456780");
    await expect(page.getByText(/no puede repetirse/)).toHaveCount(0);
  });

  test("contacto: correo y teléfono se validan en vivo y el resumen cuenta lo que falta", async ({ page }) => {
    await paso2(page);
    await llenar(page, 0, "Ana", "1712345678", "1990-05-05");
    await page.getByRole("button", { name: "Cotizar" }).click();
    await page.locator("#cot-correo").fill("correo-malo");
    await page.locator("#cot-correo").blur();
    await expect(page.getByRole("alert").filter({ hasText: /El correo no es válido/ })).toBeVisible();
    await page.getByLabel("Número de teléfono").fill("99654");
    await page.getByLabel("Número de teléfono").blur();
    await expect(page.getByRole("alert").filter({ hasText: /faltan 4/ })).toBeVisible();
    await page.getByRole("button", { name: "Solicitar cotización" }).click();
    await expect(page.getByText(/Tu solicitud COT-/)).toHaveCount(0);
    await page.locator("#cot-correo").fill("ana@correo.com");
    await page.getByLabel("Número de teléfono").fill("996543210");
    await page.getByRole("button", { name: "Solicitar cotización" }).click();
    await expect(page.getByText(/Tu solicitud COT-/)).toBeVisible();
  });
});
