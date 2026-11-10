import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin, ORIGEN } from "./helpers";

const DB = "bancosolidario_mockdb_v11";
const ficha = (page: Page, id = "p1") =>
  page.evaluate(([k, id]) => (JSON.parse(localStorage.getItem(k as string) ?? "{}").admin?.participantes ?? []).find((p: { id: string }) => p.id === id), [DB, id]);

test.describe("Novedades por correo: consentimiento", () => {
  test("el participante puede dejar de recibir novedades desde Mi perfil y se conserva", async ({ page }) => {
    await page.goto("/perfil");
    const caja = page.getByRole("checkbox", { name: /Quiero recibir novedades/ });
    await expect(caja).toBeChecked();
    await caja.uncheck();
    await expect(page.getByText("Preferencia guardada.")).toBeVisible();
    expect(await ficha(page)).toMatchObject({ recibeNovedades: false, novedadesCambio: { origen: "participante" } });
    await page.reload();
    await expect(page.getByRole("checkbox", { name: /Quiero recibir novedades/ })).not.toBeChecked();
  });

  test("el admin ve y cambia la preferencia en la ficha, y queda el origen del cambio", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes/p4");
    await page.getByRole("tab", { name: "Datos y direcciones" }).click();
    const caja = page.getByRole("checkbox", { name: "Acepta novedades por correo" });
    await expect(caja).not.toBeChecked(); // el cuarto participante de la demo no las acepta
    await caja.check();
    await expect.poll(async () => (await ficha(page, "p4"))?.recibeNovedades).toBe(true);
    expect(await ficha(page, "p4")).toMatchObject({ novedadesCambio: { origen: "admin" } });
    await expect(page.getByText(/panel de administración/)).toBeVisible();
  });
});

test.describe("Enlace de baja de las campañas", () => {
  test("una campaña incluye el enlace; abrirlo y confirmar da de baja y se puede deshacer", async ({ page, browser }) => {
    await entrarAdmin(page);
    await page.goto("/admin/correos");
    await page.getByRole("tab", { name: "Campañas" }).click();
    await page.getByRole("button", { name: "Nueva campaña" }).click();
    const d = page.getByRole("dialog", { name: "Nueva campaña" });
    await d.getByLabel("Nombre interno").fill("Prueba de baja");
    await d.getByLabel("Asunto del correo").fill("Novedades para ti");
    await d.getByLabel("Mensaje").fill("Hola {nombre}, mira lo nuevo.");
    await expect(d.locator("iframe").first()).toBeVisible();
    await d.getByRole("button", { name: "Enviar campaña" }).click();
    await page.getByRole("dialog", { name: "¿Enviar la campaña?" }).getByRole("button", { name: "Enviar ahora" }).click();

    // Se busca el correo de la participante demo en la base simulada y se extrae su enlace de baja.
    const enlace = await page.evaluate(async (k) => {
      for (let i = 0; i < 40; i++) {
        const db = JSON.parse(localStorage.getItem(k) ?? "{}");
        const m = (db.admin?.correosEnviados ?? []).find((c: { referencia?: string; participanteId?: string }) => c.referencia === "Prueba de baja" && c.participanteId === "p1");
        if (m) return /href="([^"]*\/baja\?t=[^"]+)"/.exec(m.html)?.[1] ?? "";
        await new Promise((r) => setTimeout(r, 100));
      }
      return "";
    }, DB);
    expect(enlace).toMatch(/\/baja\?t=p1\./);

    const lector = await browser.newContext(); // quien abre el correo puede no tener sesión
    const p2 = await lector.newPage();
    await p2.goto(enlace.replace(/^https?:\/\/[^/]+/, ORIGEN));
    await expect(p2.getByRole("button", { name: "Dejar de recibir novedades" })).toBeVisible();
    await p2.getByRole("button", { name: "Dejar de recibir novedades" }).click();
    await expect(p2.getByText("ya no recibirás novedades")).toBeVisible();
    await p2.getByRole("button", { name: /volver a recibirlas/ }).click();
    await expect(p2.getByRole("button", { name: "Dejar de recibir novedades" })).toBeVisible();
    await lector.close();
  });

  test("un enlace alterado o incompleto se rechaza con un mensaje", async ({ page }) => {
    await page.goto("/baja?t=p1.firmafalsa");
    await expect(page.getByRole("alert")).toContainText("no es válido");
    await page.goto("/baja");
    await expect(page.getByRole("alert")).toContainText("incompleto");
  });

  test("quien se dio de baja aparece como excluido en el alcance de la siguiente campaña", async ({ page }) => {
    const excluidos = async () => {
      await page.goto("/admin/correos");
      await page.getByRole("tab", { name: "Campañas" }).click();
      await page.getByRole("button", { name: "Nueva campaña" }).click();
      const alcance = page.getByRole("dialog", { name: "Nueva campaña" }).getByLabel("Alcance de la audiencia");
      await expect(alcance).toContainText("Llegará a");
      return Number((await alcance.innerText()).match(/(\d+) quedan fuera/)?.[1] ?? 0);
    };
    await entrarAdmin(page);
    const antes = await excluidos();
    await page.goto("/perfil");
    const caja = page.getByRole("checkbox", { name: /Quiero recibir novedades/ });
    await expect(caja).toBeChecked(); // espera a que cargue la preferencia guardada
    await caja.uncheck();
    await expect(page.getByText("Preferencia guardada.")).toBeVisible();
    expect(await excluidos()).toBe(antes + 1);
  });
});

test("Preferencias de cookies está debajo de Política de privacidad en el pie, con el mismo tamaño", async ({ page }) => {
  await page.goto("/preguntas-frecuentes");
  const pie = page.locator("footer");
  const privacidad = pie.getByRole("link", { name: "Política de privacidad" });
  const cookies = pie.getByRole("button", { name: "Preferencias de cookies" });
  const a = (await privacidad.boundingBox())!;
  const b = (await cookies.boundingBox())!;
  expect(b.y).toBeGreaterThan(a.y);
  expect(Math.abs(b.x - a.x)).toBeLessThan(2);
  const tam = (l: typeof cookies) => l.evaluate((e) => getComputedStyle(e).fontSize);
  expect(await tam(cookies)).toBe(await tam(privacidad));
});
