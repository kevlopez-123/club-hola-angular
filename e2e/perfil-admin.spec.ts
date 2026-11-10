import { expect, test } from "@playwright/test";
import { entrarAdmin, USUARIOS } from "./helpers";

test.describe("Mi perfil del panel", () => {
  test("se abre desde el menú de usuario y muestra los datos de la sesión", async ({ page }) => {
    await entrarAdmin(page, "Atención");
    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await page.getByRole("menuitem", { name: "Mi perfil" }).click();
    await expect(page).toHaveURL(/\/admin\/perfil$/);
    await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
    await expect(page.getByLabel("Correo de acceso")).toHaveValue(USUARIOS["Atención"]!.email);
    await expect(page.getByRole("list", { name: "Secciones a las que tienes acceso" })).toContainText("Atención");
  });

  test("cualquier rol puede abrirlo, incluso Solo lectura", async ({ page }) => {
    await entrarAdmin(page, "Solo lectura");
    await page.goto("/admin/perfil");
    await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
  });

  test("cambiar el nombre lo valida, se refleja en el menú y queda en el registro de cambios", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/perfil");
    const campo = page.getByLabel("Nombre completo");
    await campo.fill("Mariela 99");
    await campo.blur();
    await expect(page.getByText(/solo puede llevar letras/)).toBeVisible();
    await campo.fill("Mariela Castro Vega");
    await page.getByRole("button", { name: "Guardar nombre" }).click();
    await expect(page.getByText("Nombre actualizado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Menú de usuario" })).toContainText("Mariela Castro Vega");
    await page.goto("/admin/auditoria");
    await expect(page.locator("tbody tr", { hasText: "Cambió su nombre en Mi perfil" })).toHaveCount(1);
  });

  test("la contraseña pide la actual, cumple requisitos y sirve para volver a entrar", async ({ page, context }) => {
    await entrarAdmin(page);
    await page.goto("/admin/perfil");
    await page.getByLabel("Contraseña actual").fill("equivocada");
    await page.getByLabel("Contraseña nueva", { exact: true }).fill("corta");
    await expect(page.getByRole("list", { name: "Requisitos de la contraseña" })).toContainText("Al menos 10 caracteres");
    await page.getByLabel("Repite la contraseña nueva").fill("corta");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("todavía no cumple todos los requisitos")).toBeVisible();

    const nueva = "Nueva#Clave2026";
    await page.getByLabel("Contraseña nueva", { exact: true }).fill(nueva);
    await page.getByLabel("Repite la contraseña nueva").fill("otra");
    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
    await page.getByLabel("Repite la contraseña nueva").fill(nueva);
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("La contraseña actual no es correcta.")).toBeVisible();

    await page.getByLabel("Contraseña actual").fill(USUARIOS["Administrador"]!.clave);
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("Contraseña actualizada")).toBeVisible();

    // con la nueva se entra; con la vieja ya no
    const otra = await context.newPage();
    await otra.goto("/admin");
    await otra.getByLabel("Correo").fill(USUARIOS["Administrador"]!.email);
    await otra.getByLabel("Contraseña").fill(USUARIOS["Administrador"]!.clave);
    await otra.getByRole("button", { name: "Ingresar" }).click();
    await expect(otra.getByText("Correo o contraseña incorrectos.")).toBeVisible();
    await otra.getByLabel("Contraseña").fill(nueva);
    await otra.getByRole("button", { name: "Ingresar" }).click();
    await expect(otra.getByRole("button", { name: "Menú de usuario" })).toBeVisible();
  });

  test("cada contraseña se puede mostrar u ocultar", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/perfil");
    const nueva = page.getByLabel("Contraseña nueva", { exact: true });
    await nueva.fill("Visible#123");
    await expect(nueva).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar clave: nueva" }).click();
    await expect(nueva).toHaveAttribute("type", "text");
  });
});
