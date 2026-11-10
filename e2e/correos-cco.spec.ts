import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const ajustes = async (page: Page) => {
  await entrarAdmin(page);
  await page.goto("/admin/correos");
  await page.getByRole("tab", { name: "Ajustes" }).click();
};
const agregar = async (page: Page, dir: string) => {
  await page.getByLabel("Agregar dirección en copia oculta").fill(dir);
  await page.getByRole("button", { name: "Agregar" }).click();
};
const enviados = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").admin?.correosEnviados ?? []) as { cco?: string[]; plantillaId: string; campanaId?: string; para: string }[]);

test.describe("Correos: copia oculta (CCO)", () => {
  test("se agregan, validan y quitan direcciones, y se guardan", async ({ page }) => {
    await ajustes(page);
    await agregar(page, "no-es-un-correo");
    await expect(page.getByRole("alert")).toContainText("dirección de correo válida");
    await agregar(page, "auditoria@banco.com");
    await agregar(page, "AUDITORIA@banco.com");
    await expect(page.getByRole("alert")).toContainText("ya está en la lista");
    await page.getByLabel("Agregar dirección en copia oculta").fill("");
    await page.getByRole("button", { name: "Agregar" }).click();
    await agregar(page, "archivo@banco.com");
    await page.getByRole("button", { name: "Quitar archivo@banco.com" }).click();
    await expect(page.getByRole("list", { name: "Direcciones en copia oculta" })).toContainText("auditoria@banco.com");
    await expect(page.getByRole("list", { name: "Direcciones en copia oculta" })).not.toContainText("archivo@banco.com");
    await page.getByRole("switch", { name: "Enviar copia oculta" }).click();
    await page.getByRole("button", { name: "Guardar ajustes" }).click();
    await expect(page.getByText("Ajustes de correos guardados")).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "Ajustes" }).click();
    await expect(page.getByRole("list", { name: "Direcciones en copia oculta" })).toContainText("auditoria@banco.com");
  });

  test("no se puede activar sin direcciones", async ({ page }) => {
    await ajustes(page);
    await page.getByRole("switch", { name: "Enviar copia oculta" }).click();
    await page.getByRole("button", { name: "Guardar ajustes" }).click();
    await expect(page.getByRole("alert")).toContainText("Agrega al menos una dirección");
  });

  test("con CCO activo, los correos salen con copia y el detalle la muestra; sin CCO no", async ({ page }) => {
    await ajustes(page);
    await agregar(page, "auditoria@banco.com");
    await page.getByRole("switch", { name: "Enviar copia oculta" }).click();
    await page.getByRole("button", { name: "Guardar ajustes" }).click();
    await expect(page.getByText("Ajustes de correos guardados")).toBeVisible();

    // Un correo del sistema: se reenvía el código de acceso de un participante.
    await page.goto("/admin/participantes/p2");
    await page.getByRole("button", { name: "Reenviar código de acceso" }).click();
    await expect.poll(async () => (await enviados(page)).some((c) => c.cco?.includes("auditoria@banco.com"))).toBe(true);

    await page.goto("/admin/correos");
    await page.getByRole("tab", { name: "Enviados" }).click();
    await page.getByRole("button", { name: /Ver correo/ }).first().click();
    await expect(page.getByRole("dialog", { name: "Correo enviado" })).toContainText("CCO: auditoria@banco.com");
  });

  test("el alcance se respeta: sin 'campañas' marcado, la campaña no lleva copia", async ({ page }) => {
    await ajustes(page);
    await agregar(page, "auditoria@banco.com");
    await page.getByRole("switch", { name: "Enviar copia oculta" }).click();
    await page.getByLabel("Campañas masivas").uncheck();
    await page.getByRole("button", { name: "Guardar ajustes" }).click();
    await expect(page.getByText("Ajustes de correos guardados")).toBeVisible();
    await page.getByRole("tab", { name: "Campañas" }).click();
    await page.getByRole("button", { name: "Nueva campaña" }).click();
    const d = page.getByRole("dialog", { name: "Nueva campaña" });
    await d.getByLabel("Nombre interno").fill("Sin copia");
    await d.getByLabel("Asunto del correo").fill("Hola");
    await d.getByLabel("Mensaje").fill("Hola {nombre}");
    await d.getByRole("button", { name: "Enviar campaña" }).click();
    await page.getByRole("dialog", { name: "¿Enviar la campaña?" }).getByRole("button", { name: "Enviar ahora" }).click();
    await expect.poll(async () => (await enviados(page)).filter((c) => c.campanaId).length).toBeGreaterThan(0);
    expect((await enviados(page)).filter((c) => c.campanaId).every((c) => !c.cco?.length)).toBe(true);
  });

  test("una plantilla con su propia copia la envía solo a esas direcciones, aunque la general esté apagada", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/correos");
    await page.getByRole("button", { name: "Editar Código de acceso" }).click();
    const m = page.getByRole("dialog");
    await m.getByLabel("Quién recibe copia de este correo").selectOption("propio");
    await m.getByLabel("Agregar dirección de copia de esta plantilla").fill("mala");
    await m.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(m.getByRole("alert")).toContainText("dirección de correo válida");
    await m.getByLabel("Agregar dirección de copia de esta plantilla").fill("comercial@banco.com");
    await m.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(m.getByRole("list", { name: "Direcciones de copia de esta plantilla" })).toContainText("comercial@banco.com");
    await m.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Plantilla guardada")).toBeVisible();

    await page.goto("/admin/participantes/p2");
    await page.getByRole("button", { name: "Reenviar código de acceso" }).click();
    await expect.poll(async () => (await enviados(page)).some((c) => c.plantillaId === "otp" && c.cco?.join() === "comercial@banco.com")).toBe(true);
  });

  test("con la plantilla en 'Sin copia', no lleva CCO aunque la general esté activa", async ({ page }) => {
    await ajustes(page);
    await agregar(page, "auditoria@banco.com");
    await page.getByRole("switch", { name: "Enviar copia oculta" }).click();
    await page.getByRole("button", { name: "Guardar ajustes" }).click();
    await expect(page.getByText("Ajustes de correos guardados")).toBeVisible();
    await page.getByRole("tab", { name: "Plantillas" }).click();
    await page.getByRole("button", { name: "Editar Código de acceso" }).click();
    const m = page.getByRole("dialog");
    await m.getByLabel("Quién recibe copia de este correo").selectOption("ninguno");
    await m.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Plantilla guardada")).toBeVisible();
    await page.goto("/admin/participantes/p2");
    await page.getByRole("button", { name: "Reenviar código de acceso" }).click();
    await expect.poll(async () => (await enviados(page)).filter((c) => c.plantillaId === "otp").length).toBeGreaterThan(0);
    expect((await enviados(page)).filter((c) => c.plantillaId === "otp").every((c) => !c.cco?.length)).toBe(true);
  });
});