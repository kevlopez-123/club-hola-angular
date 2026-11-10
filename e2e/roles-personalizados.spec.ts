import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin, USUARIOS } from "./helpers";

async function crearRol(page: Page, nombre: string, marcar: [string, string][], descripcion = "") {
  await page.goto("/admin/roles");
  await page.getByRole("button", { name: "Nuevo rol" }).click();
  const m = page.getByRole("dialog");
  await m.getByLabel(/^Nombre del rol/).fill(nombre);
  if (descripcion) await m.getByLabel(/^Descripción/).fill(descripcion);
  for (const [accion, seccion] of marcar) await m.getByRole("checkbox", { name: `${accion} en ${seccion}`, exact: true }).check();
  await m.getByRole("button", { name: "Crear rol" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test.describe("Roles personalizados", () => {
  test("los roles del sistema no se editan ni se eliminan, pero se pueden duplicar", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/roles");
    await expect(page.getByRole("button", { name: "Editar el rol Catálogo" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Eliminar el rol Catálogo" })).toHaveCount(0);
    await page.getByRole("button", { name: "Duplicar el rol Catálogo" }).click();
    const m = page.getByRole("dialog");
    await expect(m.getByLabel(/^Nombre del rol/)).toHaveValue("Catálogo (copia)");
    await expect(m.getByRole("checkbox", { name: "Crear y editar en Productos", exact: true })).toBeChecked();
    await expect(m.getByRole("checkbox", { name: "Ver en Pedidos", exact: true })).not.toBeChecked();
  });

  test("valida nombre repetido y exige al menos un permiso", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/roles");
    await page.getByRole("button", { name: "Nuevo rol" }).click();
    const m = page.getByRole("dialog");
    await m.getByLabel(/^Nombre del rol/).fill("catálogo");
    await m.getByRole("button", { name: "Crear rol" }).click();
    await expect(m.getByText("Ya existe un rol con ese nombre.")).toBeVisible();
    await m.getByLabel(/^Nombre del rol/).fill("Sin permisos");
    await m.getByRole("button", { name: "Crear rol" }).click();
    await expect(m.getByText("Elige al menos un permiso.")).toBeVisible();
  });

  test("marcar crear o eliminar marca también ver, y quitar ver limpia la fila", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/roles");
    await page.getByRole("button", { name: "Nuevo rol" }).click();
    const m = page.getByRole("dialog");
    await m.getByRole("checkbox", { name: "Eliminar en Marcas", exact: true }).check();
    await expect(m.getByRole("checkbox", { name: "Ver en Marcas", exact: true })).toBeChecked();
    await m.getByRole("checkbox", { name: "Ver en Marcas", exact: true }).uncheck();
    await expect(m.getByRole("checkbox", { name: "Eliminar en Marcas", exact: true })).not.toBeChecked();
    await m.getByRole("checkbox", { name: "Todo en Niveles", exact: true }).check();
    for (const a of ["Ver", "Crear y editar", "Eliminar", "Exportar"]) await expect(m.getByRole("checkbox", { name: `${a} en Niveles`, exact: true })).toBeChecked();
  });

  test("un rol creado se puede asignar y manda lo que ve el usuario en el menú", async ({ page, context }) => {
    await entrarAdmin(page);
    await crearRol(page, "Editor de contenido", [["Ver", "Dashboard"], ["Crear y editar", "Contenido"]], "Solo edita el contenido del sitio.");
    const tarjeta = page.getByRole("heading", { name: "Editor de contenido", exact: true });
    await expect(tarjeta).toBeVisible();
    await page.getByRole("button", { name: "Ver los permisos del rol Editor de contenido" }).click();
    await expect(page.getByRole("table", { name: "Permisos del rol Editor de contenido" }).locator("tr", { hasText: "Contenido" }).getByLabel("Sí")).toHaveCount(2);
    await page.keyboard.press("Escape"); // ver y editar

    // Se asigna a Esteban Lara (que antes era "Solo lectura").
    await page.goto("/admin/usuarios");
    const fila = page.locator("tbody tr", { hasText: "Esteban Lara" });
    await fila.getByRole("button", { name: "Editar" }).click();
    await page.getByRole("dialog").getByLabel("Rol").selectOption("Editor de contenido");
    await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.locator("tbody tr", { hasText: "Esteban Lara" })).toContainText("Editor de contenido");

    // Ahora ingresa Esteban: ve Contenido, ya no ve Reportes, y el servidor le niega lo que no tiene.
    const otra = await context.newPage();
    await entrarAdmin(otra, "Solo lectura");
    const nav = otra.getByLabel("Navegación principal");
    await expect(nav.getByRole("link", { name: "Contenido", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Reportes", exact: true })).toHaveCount(0);
    await otra.goto("/admin/pedidos");
    await expect(otra.getByRole("heading", { name: "Pedidos", exact: true })).toHaveCount(0);
    expect(USUARIOS["Solo lectura"]!.nombre).toBe("Esteban Lara");
  });

  test("no se elimina un rol que tiene usuarios; sin usuarios sí", async ({ page }) => {
    await entrarAdmin(page);
    await crearRol(page, "Rol temporal", [["Ver", "Reportes"]]);
    await page.getByRole("button", { name: "Eliminar el rol Rol temporal" }).click();
    await expect(page.getByRole("dialog")).toContainText("Esta acción no se puede deshacer.");
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Rol temporal", exact: true })).toHaveCount(0);
  });

  test("editar los permisos de un rol personalizado se refleja en la tarjeta y queda en el registro de cambios", async ({ page }) => {
    await entrarAdmin(page);
    await crearRol(page, "Analista", [["Ver", "Reportes"]]);
    await page.getByRole("button", { name: "Editar el rol Analista" }).click();
    const m = page.getByRole("dialog");
    await expect(m.getByLabel(/^Nombre del rol/)).toBeDisabled();
    await m.getByRole("checkbox", { name: "Exportar en Reportes", exact: true }).check();
    await m.getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByRole("button", { name: "Ver los permisos del rol Analista" }).click();
    await expect(page.getByRole("table", { name: "Permisos del rol Analista" }).locator("tr", { hasText: "Reportes" }).getByLabel("Sí")).toHaveCount(2);
    await page.keyboard.press("Escape");
    await page.goto("/admin/auditoria");
    await expect(page.locator("tbody tr", { hasText: "Editó los permisos del rol «Analista»" })).toHaveCount(1);
    await expect(page.locator("tbody tr", { hasText: "Creó el rol «Analista»" })).toHaveCount(1);
  });

  test("cada rol muestra sus usuarios y sus permisos en ventanas, sin la matriz en la tarjeta", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/roles");
    await expect(page.getByRole("table")).toHaveCount(0);
    await page.getByRole("button", { name: "Ver los usuarios con el rol Atención" }).click();
    const d = page.getByRole("dialog", { name: "Usuarios con el rol Atención" });
    await expect(d).toContainText("Lucía Torres");
    await expect(d).toContainText("atencion@bancosolidario.com");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Ver los permisos del rol Atención" })).toContainText(/secciones/);
    await expect(page.getByRole("button", { name: "Duplicar el rol Atención" }).locator("svg")).toHaveCount(1);
  });
});