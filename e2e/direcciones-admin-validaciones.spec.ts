import { expect, test } from "@playwright/test";
import { entrarAdmin } from "./helpers";

test.describe("Direcciones de envío: validaciones y ciudad en cascada", () => {
  test("no guarda con datos inválidos y marca cada campo", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByRole("tab", { name: "Direcciones de envío" }).click();
    await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Guardar dirección" }).click();
    for (const m of [/Completa el alias/i, /Escribe quién recibe/i, /Escribe tu teléfono/, /Completa la dirección/i, /Elige la provincia de entrega/]) await expect(d.getByText(m).first()).toBeVisible();
    await d.getByLabel("¿Quién recibe?").fill("Ana 99");
    await d.getByLabel("¿Quién recibe?").blur();
    await expect(d.getByText(/solo puede llevar letras/)).toBeVisible();
    await d.getByLabel("Teléfono de contacto").fill("12345");
    await d.getByLabel("Teléfono de contacto").blur();
    await expect(d.getByText(/faltan 4/)).toBeVisible();
    await d.getByLabel("Dirección", { exact: true }).fill("Ab");
    await d.getByLabel("Dirección", { exact: true }).blur();
    await expect(d.getByText(/al menos 5 caracteres/)).toBeVisible();
  });

  test("la ciudad depende de la provincia y se borra al cambiarla", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByRole("tab", { name: "Direcciones de envío" }).click();
    await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
    const d = page.getByRole("dialog");
    const ciudad = d.getByLabel("Ciudad", { exact: true });
    await expect(ciudad).toBeDisabled();
    await d.getByLabel("Provincia").selectOption("Guayas");
    expect(await ciudad.locator("option").allTextContents()).toContain("Guayaquil");
    await ciudad.selectOption("Guayaquil");
    await d.getByLabel("Provincia").selectOption("Pichincha");
    await expect(ciudad).toHaveValue("");
    expect(await ciudad.locator("option").allTextContents()).not.toContain("Guayaquil");
  });
});

test.describe("El panel refleja el formulario y la ficha", () => {
  test("el creador de formularios agrupa, explica las reglas y bloquea conexiones repetidas", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/formulario");
    await expect(page.getByText("campos configurados")).toBeVisible();
    for (const g of ["Datos personales", "Contacto", "Ubicación"]) await expect(page.getByText(g, { exact: true }).first()).toBeVisible();
    // fijos: solo Nombres (apellidos y teléfono se piden con los campos configurados)
    const fijos = page.locator("p", { hasText: "Campos fijos del sistema" }).locator("xpath=..");
    await expect(fijos).toContainText("Nombres");
    await expect(fijos).not.toContainText("Apellidos");
    await expect(fijos).not.toContainText("Teléfono");
    await page.getByText("Fecha de nacimiento").first().click();
    await expect(page.locator("p", { hasText: "Se valida así:" })).toContainText("18");
    await page.locator("p").filter({ hasText: /^Provincia/ }).first().click();
    await expect(page.getByText(/Lista fija: solo provincias con envío/).first()).toBeVisible();
    await expect(page.getByText(/listas fijas y dependen una de otra/)).toBeVisible();
  });

  test("lo que el participante guarda en Mis datos se ve en su ficha, ordenado, y el panel valida sus ediciones", async ({ page, context }) => {
    await page.goto("/perfil");
    await page.getByLabel("Género").selectOption("Femenino");
    await page.getByLabel("Correo electrónico *").fill("ana@correo.com");
    await page.getByLabel("N.º de celular").fill("996543210");
    await page.locator("#pf-f7").selectOption("Pichincha");
    await page.locator("#pf-f8").selectOption("Quito");
    await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Tus cambios se guardaron correctamente.")).toBeVisible();

    const admin = await context.newPage();
    await entrarAdmin(admin);
    await admin.goto("/admin/participantes/p1?tab=datos");
    const form = admin.getByRole("region", { name: "Datos del formulario" }).or(admin.locator("section[aria-labelledby='form-datos']"));
    await expect(form).toContainText("05/05/1990");
    await expect(form).toContainText("Pichincha");
    await expect(form).toContainText("Quito");
    await expect(form.getByText("Datos personales", { exact: true })).toBeVisible();
    await expect(form.getByText("Ubicación", { exact: true })).toBeVisible();

    await admin.getByLabel("Nombre completo").fill("Ana 99");
    await admin.getByRole("button", { name: "Guardar datos" }).click();
    await expect(admin.getByText(/solo puede llevar letras/)).toBeVisible();
    await admin.getByLabel("Nombre completo").fill("Ana Torres");
    await admin.locator("#ficha-celular").fill("123");
    await admin.getByRole("button", { name: "Guardar datos" }).click();
    await expect(admin.getByText(/faltan 6/)).toBeVisible();
    await admin.locator("#ficha-celular").fill("996543210");
    await admin.getByRole("button", { name: "Guardar datos" }).click();
    await expect(admin.getByText("Datos actualizados")).toBeVisible();
  });
});

test.describe("Detalles de formulario", () => {
  test("el campo de teléfono mide lo mismo que los demás campos de Mis datos", async ({ page }) => {
    await page.goto("/perfil");
    await expect(page.locator("#pf-f3")).toBeVisible();
    const alto = async (loc: import("@playwright/test").Locator) => Math.round((await loc.boundingBox())!.height);
    const correo = await alto(page.locator("#pf-f3"));
    const celular = await alto(page.locator("#pf-f4").locator("xpath=.."));
    expect(celular).toBe(correo);
  });

  test("la contraseña del panel se puede mostrar y ocultar", async ({ page }) => {
    await page.goto("/admin");
    const clave = page.getByLabel("Contraseña");
    await clave.fill("Secreta#123");
    await expect(clave).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar clave" }).click();
    await expect(clave).toHaveAttribute("type", "text");
    await expect(clave).toHaveValue("Secreta#123");
    await page.getByRole("button", { name: "Ocultar clave" }).click();
    await expect(clave).toHaveAttribute("type", "password");
  });
});

test.describe("Calendario de nacimiento y mapa por zona", () => {
  test("el calendario de nacimiento abre en la edad mínima y no ofrece 'Hoy'", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByLabel("Fecha de nacimiento").click();
    const anio = new Date().getFullYear() - 18;
    const popup = page.locator(".cd-popup");
    await expect(popup.locator("b")).toContainText(String(anio));
    await expect(popup.getByRole("button", { name: "Hoy" })).toBeDisabled();
    await popup.getByRole("button", { name: "Año anterior" }).click();
    await expect(popup.locator("b")).toContainText(String(anio - 1));
  });

  test("al elegir provincia y ciudad, el mapa busca esa zona y la búsqueda queda acotada", async ({ page }) => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await page.route("**/tile.openstreetmap.org/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: png }));
    const consultas: string[] = [];
    await page.route("**/nominatim.openstreetmap.org/search*", (r) => {
      consultas.push(decodeURIComponent(new URL(r.request().url()).searchParams.get("q") ?? ""));
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ lat: "-2.17", lon: "-79.92" }]) });
    });
    await page.goto("/perfil");
    await page.getByRole("tab", { name: "Direcciones de envío" }).click();
    await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Provincia").selectOption("Guayas");
    await expect.poll(() => consultas.some((c) => /^Guayas, Ecuador$/.test(c))).toBe(true);
    await d.getByLabel("Ciudad", { exact: true }).selectOption("Guayaquil");
    await expect.poll(() => consultas.some((c) => /^Guayaquil, Guayas, Ecuador$/.test(c))).toBe(true);
    await expect(d.getByText(/Mapa centrado en Guayaquil/)).toBeVisible();
    await d.getByLabel("Buscar dirección en el mapa").fill("Av. 9 de Octubre");
    await d.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect.poll(() => consultas.some((c) => c === "Av. 9 de Octubre, Guayaquil, Guayas, Ecuador")).toBe(true);
  });
});