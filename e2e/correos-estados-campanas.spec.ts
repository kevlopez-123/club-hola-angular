import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const enviarPrueba = async (page: Page, correo: string) => {
  await page.goto("/admin/correos");
  await page.getByRole("button", { name: "Editar Bienvenida" }).click();
  await page.getByRole("dialog").getByLabel("Enviar una prueba a").fill(correo);
  await page.getByRole("dialog").getByRole("button", { name: "Enviar prueba" }).click();
  await expect(page.getByText("Correo de prueba enviado")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Enviados" }).click();
};
const fila = (page: Page, correo: string) => page.locator("tbody tr", { hasText: correo }).first();

test.describe("Correos: estados reales y reintentos", () => {
  test("una dirección normal pasa de en cola a enviado", async ({ page }) => {
    await entrarAdmin(page);
    await enviarPrueba(page, "ok@correo.com");
    await expect(fila(page, "ok@correo.com")).toContainText("Enviado", { timeout: 15_000 });
  });

  test("un buzón inexistente rebota, explica el motivo y no ofrece reintentar", async ({ page }) => {
    await entrarAdmin(page);
    await enviarPrueba(page, "rebote@correo.com");
    const f = fila(page, "rebote@correo.com");
    await expect(f).toContainText("Rebotado", { timeout: 15_000 });
    await expect(f).toContainText("El buzón no existe");
    await expect(f.getByRole("button", { name: /Reintentar envío/ })).toHaveCount(0);
  });

  test("un error temporal se reintenta solo y se entrega en el segundo intento", async ({ page }) => {
    await entrarAdmin(page);
    await enviarPrueba(page, "reintento@correo.com");
    const f = fila(page, "reintento@correo.com");
    await expect(f).toContainText("Enviado", { timeout: 20_000 });
    await expect(f).toContainText("2 intentos");
  });

  test("si el proveedor sigue fallando queda fallido tras los intentos y se puede reintentar a mano", async ({ page }) => {
    await entrarAdmin(page);
    await enviarPrueba(page, "falla@correo.com");
    const f = fila(page, "falla@correo.com");
    await expect(f).toContainText("Fallido", { timeout: 30_000 });
    await expect(f).toContainText("3 intentos");
    await f.getByRole("button", { name: /Reintentar envío/ }).click();
    await expect(page.getByText("Envío puesto en cola de nuevo")).toBeVisible();
    await expect(page.getByLabel("Resumen de envíos").getByText(/reintentando|en cola|fallidos/).first()).toBeVisible();
  });

  test("el resumen cuenta los envíos por estado y se puede filtrar", async ({ page }) => {
    await entrarAdmin(page);
    await enviarPrueba(page, "rebote@correo.com");
    await expect(fila(page, "rebote@correo.com")).toContainText("Rebotado", { timeout: 15_000 });
    await expect(page.getByLabel("Resumen de envíos").locator("li", { hasText: "rebotados" })).toContainText("1");
    await page.getByLabel("Filtrar por estado").selectOption("Rebotado");
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });
});

test.describe("Correos: campañas masivas", () => {
  async function nuevaCampana(page: Page) {
    await page.goto("/admin/correos");
    await page.getByRole("tab", { name: "Campañas" }).click();
    await page.getByRole("button", { name: "Nueva campaña" }).click();
    const d = page.getByRole("dialog", { name: "Nueva campaña" });
    await d.getByLabel("Nombre interno").fill("Promo de fin de año");
    await d.getByLabel("Asunto del correo").fill("Tu beneficio de fin de año, {nombre}");
    await d.getByLabel("Mensaje").fill("Hola {nombre},\n\nTenemos descuentos nuevos para ti.");
    return d;
  }

  test("el alcance se calcula en vivo y excluye bloqueados y quienes no aceptan novedades", async ({ page }) => {
    await entrarAdmin(page);
    const d = await nuevaCampana(page);
    const alcance = d.getByLabel("Alcance de la audiencia");
    await expect(alcance).toContainText("Llegará a");
    await expect(alcance).toContainText("quedan fuera");
    const todos = Number((await alcance.innerText()).match(/Llegará a (\d+)/)![1]);
    await d.getByLabel("Tipo de audiencia").selectOption("saldo");
    await d.getByLabel("Saldo mínimo (puntos)").fill("50000");
    await expect.poll(async () => Number((await alcance.innerText()).match(/Llegará a (\d+)/)![1])).toBeLessThan(todos);
  });

  test("la vista previa usa el diseño de marca y el botón opcional", async ({ page }) => {
    await entrarAdmin(page);
    const d = await nuevaCampana(page);
    await d.getByLabel("Texto del botón (opcional)").fill("Ver ofertas");
    await d.getByLabel("Enlace del botón").fill("{sitio}/canjea");
    const marco = d.frameLocator("iframe[title='Correo renderizado']");
    await expect(marco.getByText("Tu beneficio de fin de año, María Fernanda").first()).toBeVisible();
    await expect(marco.getByRole("link", { name: "Ver ofertas" })).toHaveAttribute("href", /\/canjea$/);
  });

  test("enviar pide confirmar, encola un correo por destinatario y la lista muestra el resultado", async ({ page }) => {
    await entrarAdmin(page);
    const d = await nuevaCampana(page);
    const total = Number((await d.getByLabel("Alcance de la audiencia").innerText()).match(/Llegará a (\d+)/)![1]);
    await d.getByRole("button", { name: "Enviar campaña" }).click();
    const confirmar = page.getByRole("dialog", { name: "¿Enviar la campaña?" });
    await expect(confirmar).toContainText(String(total));
    await confirmar.getByRole("button", { name: "Enviar ahora" }).click();
    await expect(page.getByText(`Campaña enviada: ${total} correos en cola`)).toBeVisible();
    const fila = page.locator("tbody tr", { hasText: "Promo de fin de año" });
    await expect(fila).toContainText("Enviada");
    await expect(fila).toContainText(`${total}`);
    await expect(fila).toContainText(new RegExp(`${total} enviados`), { timeout: 20_000 });
    // y cada correo está en Enviados con la campaña como referencia
    await page.getByRole("tab", { name: "Enviados" }).click();
    await page.getByLabel("Buscar correo").fill("Promo de fin de año");
    await expect(page.locator("tbody tr").first()).toContainText("Campaña: Promo de fin de año");
  });

  test("no se puede enviar sin asunto o mensaje, y una prueba va solo a la dirección indicada", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/correos");
    await page.getByRole("tab", { name: "Campañas" }).click();
    await page.getByRole("button", { name: "Nueva campaña" }).click();
    const d = page.getByRole("dialog", { name: "Nueva campaña" });
    await expect(d.getByRole("button", { name: "Enviar campaña" })).toBeDisabled();
    await d.getByLabel("Nombre interno").fill("Solo prueba");
    await d.getByLabel("Asunto del correo").fill("Asunto");
    await d.getByLabel("Mensaje").fill("Mensaje");
    await d.getByLabel("Enviar una prueba a").fill("equipo@correo.com");
    await d.getByRole("button", { name: "Enviar prueba" }).click();
    await expect(page.getByText("Correo de prueba enviado")).toBeVisible();
    await page.keyboard.press("Escape"); // hay texto escrito: pide confirmar antes de descartar
    await page.getByRole("button", { name: "Descartar" }).click();
    await page.getByRole("tab", { name: "Enviados" }).click();
    await expect(page.locator("tbody tr", { hasText: "equipo@correo.com" }).first()).toContainText("Campaña: Solo prueba");
    await expect(page.locator("tbody tr", { hasText: "Campaña: Solo prueba" })).toHaveCount(1); // no salió a nadie más
  });
});

test.describe("Vigencia de puntos editable en Reglas", () => {
  test("la vigencia y los días de aviso se guardan y gobiernan 'Avisar ahora'", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reglas");
    await expect(page.getByLabel("Vigencia de los puntos (meses)")).toHaveValue("24");
    await page.getByLabel("Vigencia de los puntos (meses)").fill("12");
    await page.getByLabel("Avisar puntos por vencer (días antes)").fill("45");
    await page.getByRole("button", { name: "Guardar reglas" }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();
    // un acumulado de hace 12 meses menos 40 días vence dentro de 40 días: entra con 45 de aviso (y con 24 meses no vencería)
    await page.evaluate(() => {
      const k = "bancosolidario_mockdb_v11";
      const d = JSON.parse(localStorage.getItem(k)!);
      const f = new Date(); f.setMonth(f.getMonth() - 12); f.setDate(f.getDate() + 40);
      d.admin.movimientos.unshift({ id: "mv-vig", fechaISO: f.toISOString().slice(0, 10), fecha: "", detalle: "Acumulación", tipo: "ajuste", puntos: 900, cliente: "Ana Torres" });
      localStorage.setItem(k, JSON.stringify(d));
    });
    await page.goto("/admin/correos");
    await page.getByRole("button", { name: "Avisar ahora puntos por vencer" }).click();
    await expect(page.getByText(/1 aviso\(s\) de puntos por vencer enviados/)).toBeVisible();
  });
});