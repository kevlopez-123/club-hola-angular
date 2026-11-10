import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

const K = "bancosolidario_mockdb_v11";
const retocarDb = (page: Page, fn: (d: any) => void) =>
  page.evaluate(([k, src]) => {
    const d = JSON.parse(localStorage.getItem(k as string)!);
    new Function("d", src as string)(d);
    localStorage.setItem(k as string, JSON.stringify(d));
  }, [K, `(${fn.toString()})(d)`]);

async function enviados(page: Page) {
  await page.goto("/admin/correos");
  await page.getByRole("tab", { name: "Enviados" }).click();
  return page.locator("tbody tr");
}

test.describe("Correos: eventos conectados", () => {
  test("alta masiva de participantes envía la bienvenida a cada correo válido", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.getByRole("button", { name: "Carga masiva" }).click();
    const csv = ["documento,nombre,correo,puntos", "1718293045,Rosa Benítez,rosa.benitez@correo.com,1500", "0923456781,Pedro Guamán,pedro.guaman@correo.com,800"].join("\n");
    await page.getByRole("dialog").locator('input[type="file"]').setInputFiles({ name: "p.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
    await page.getByRole("button", { name: /Importar 2 participantes/ }).click();
    await expect(page.getByText("Carga completada")).toBeVisible();
    const filas = await enviados(page);
    await expect(filas.filter({ hasText: "Bienvenida" })).toHaveCount(2);
    await expect(filas.filter({ hasText: "rosa.benitez@correo.com" })).toHaveCount(1);
  });

  test("invitar a un usuario del panel envía la invitación con su rol", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/usuarios");
    await page.getByRole("button", { name: "Invitar usuario" }).click();
    const m = page.getByRole("dialog");
    await m.getByLabel("Nombre completo").fill("Nuevo Usuario");
    await m.getByLabel("Correo electrónico").fill("nuevo@motiva.com");
    await m.getByRole("button", { name: "Enviar invitación" }).click();
    await expect(page.getByText("Invitación enviada a nuevo@motiva.com")).toBeVisible();
    const filas = await enviados(page);
    const f = filas.filter({ hasText: "Invitación al panel" });
    await expect(f).toHaveCount(1);
    await expect(f).toContainText("nuevo@motiva.com");
  });

  test("un ajuste que cruza el umbral de nivel avisa del cambio de nivel", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("Ana Torres");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("link", { name: "Ver ficha" }).click();
    await page.getByRole("tab", { name: /^Ajustes/ }).click();
    await page.getByLabel("Puntos (+/−)").fill("50000"); // 260.000 → 310.000: pasa de nivel
    await page.getByLabel("Motivo").fill("Premio E2E");
    await page.getByRole("button", { name: "Aplicar ajuste" }).click();
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await expect(page.getByText(/ajuste/i).first()).toBeVisible();
    const filas = await enviados(page);
    await expect(filas.filter({ hasText: "Cambio de nivel" })).toHaveCount(1);
  });

  test("al quedar pocos códigos en un lote se avisa al equipo una sola vez", async ({ page }) => {
    await entrarAdmin(page);
    await retocarDb(page, (d) => { d.admin.lotes.find((l: any) => l.id === "l3").usados = 90; }); // quedan 10 → el siguiente deja 9
    await page.goto("/beneficios/b8");
    await page.getByRole("button", { name: "Generar cupón" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
    await expect(page.getByAltText(/Código QR/)).toBeVisible();
    const filas = await enviados(page);
    const f = filas.filter({ hasText: "Lote de códigos con poco stock" });
    await expect(f).toHaveCount(1);
    await expect(f).toContainText("Quedan 9 códigos");
  });

  test("Avisar ahora envía los puntos por vencer solo a quien vencen en los próximos 30 días", async ({ page }) => {
    await entrarAdmin(page);
    await retocarDb(page, (d) => {
      const v = new Date(); v.setMonth(v.getMonth() - 24); v.setDate(v.getDate() + 10); // vence en 10 días
      d.admin.movimientos.unshift({ id: "mv-e2e", fechaISO: v.toISOString().slice(0, 10), fecha: "", detalle: "Acumulación", tipo: "ajuste", puntos: 700, cliente: "Ana Torres" });
    });
    await page.goto("/admin/correos");
    await page.getByRole("button", { name: "Avisar ahora puntos por vencer" }).click();
    await expect(page.getByText(/1 aviso\(s\) de puntos por vencer enviados/)).toBeVisible();
    await page.getByRole("tab", { name: "Enviados" }).click();
    const f = page.locator("tbody tr", { hasText: "Puntos por vencer" });
    await expect(f).toHaveCount(1);
    await expect(f).toContainText("ana.torres@correo.com");
  });
});
