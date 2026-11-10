import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin } from "./helpers";

/** La plataforma es replicable: colores, logos, imágenes, país, moneda y documentos se configuran sin tocar código. */

const cssVar = (page: Page, v: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), v);

async function abrirEditor(page: Page) {
  await entrarAdmin(page);
  await page.goto("/admin/configuracion");
  await expect(page.getByRole("button", { name: "Guardar marca" })).toBeVisible();
}

const dato = (page: Page, nombre: string) => page.getByLabel("Datos del país (solo lectura)").locator("div", { has: page.getByText(nombre, { exact: true }) }).locator("dd");

test.describe("Marca y localización", () => {
  test("el color principal se previsualiza al instante y se publica en el sitio", async ({ page }) => {
    await abrirEditor(page);
    await page.getByLabel("Color principal (hex)").fill("#7c3aed");
    expect(await cssVar(page, "--primary")).toBe("#7c3aed"); // vista previa en vivo
    await expect(page.getByLabel("Vista previa de la marca")).toContainText("Botón principal");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.goto("/");
    await expect(page.locator("header").first()).toBeVisible();
    expect(await cssVar(page, "--primary")).toBe("#7c3aed");
    const fondoCabecera = await page.evaluate(() => getComputedStyle(document.querySelector("header")!).backgroundColor);
    expect(fondoCabecera).toBe("rgb(124, 58, 237)");
    await page.reload(); // se aplica antes del primer render, sin parpadeo de colores por defecto
    expect(await cssVar(page, "--primary")).toBe("#7c3aed");
  });

  test("descartar restaura la marca guardada", async ({ page }) => {
    await abrirEditor(page);
    await page.getByLabel("Color principal (hex)").fill("#ff0000");
    expect(await cssVar(page, "--primary")).toBe("#ff0000");
    await page.getByRole("button", { name: "Descartar cambios" }).click();
    expect(await cssVar(page, "--primary")).toBe("#00bdd2");
  });

  test("la letra de los botones primarios es blanca por defecto y se puede cambiar", async ({ page }) => {
    await abrirEditor(page);
    expect(await cssVar(page, "--primary-foreground")).toBe("#ffffff");
    await page.getByLabel("Color principal (hex)").fill("#fde047"); // el color de la letra no cambia solo
    expect(await cssVar(page, "--primary-foreground")).toBe("#ffffff");
    await page.getByLabel("Letra de botones primarios (hex)").fill("#111827");
    expect(await cssVar(page, "--primary-foreground")).toBe("#111827");
    const color = await page.getByLabel("Vista previa de la marca").getByText("Botón principal").evaluate((e) => getComputedStyle(e).color);
    expect(color).toBe("rgb(17, 24, 39)");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.goto("/");
    await expect(page.locator("header").first()).toBeVisible();
    expect(await cssVar(page, "--primary-foreground")).toBe("#111827");
  });
  test("nombres del programa y de la empresa llegan a títulos, cabecera, login y pie", async ({ page }) => {
    await abrirEditor(page);
    await page.getByLabel("Nombre del programa").fill("Mi Programa VIP");
    await page.getByLabel("Texto legal del pie").fill("Mi Empresa 2027 · Todos los derechos reservados");
    await page.getByLabel("Unidad del programa (puntos, millas…)").fill("millas");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.goto("/mi-nivel");
    await expect(page).toHaveTitle(/Mi Programa VIP/);
    await expect(page.locator("footer")).toContainText("Mi Empresa 2027");
    await page.goto("/login");
    await expect(page.getByText("Mi Programa VIP").first()).toBeVisible();
    await expect(page.getByText(/Tus millas valen más/)).toBeVisible();
  });

  test("logos e imágenes: por URL, y sin logo se usa el nombre de la empresa", async ({ page }) => {
    await abrirEditor(page);
    const svg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><rect width='120' height='40' fill='%23ff6600'/></svg>";
    await page.getByLabel("Logo para fondo de color (URL)").fill(svg);
    await page.getByLabel("Logo para fondo claro (URL)").fill("");
    await page.getByLabel("Imagen del ingreso (URL)").fill("img/hero-cine.jpg");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.goto("/");
    await expect(page.locator("header img[alt='Banco Solidario']").first()).toHaveAttribute("src", /data:image\/svg/);
    await page.goto("/login");
    await expect(page.locator("main span:visible", { hasText: "Banco Solidario" }).first()).toBeVisible(); // wordmark de texto
    await expect(page.locator("aside img")).toHaveAttribute("src", "img/hero-cine.jpg");
  });

  test("subir un logo desde archivo (máx. 1,5 MB)", async ({ page }) => {
    await abrirEditor(page);
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await page.getByLabel("Subir Favicon").setInputFiles({ name: "icono.png", mimeType: "image/png", buffer: png });
    await expect(page.getByLabel("Favicon (URL)")).toHaveValue("(imagen subida)");
    await page.getByLabel("Subir Logo para fondo claro").setInputFiles({ name: "gigante.png", mimeType: "image/png", buffer: Buffer.alloc(1_600_000) });
    await expect(page.getByRole("alert")).toContainText("supera 1,5 MB");
  });

  test("País: Perú cambia código, moneda, símbolo, prefijo, dígitos y documentos", async ({ page }) => {
    await abrirEditor(page);
    await page.getByLabel("País", { exact: true }).selectOption("PE");
    await expect(dato(page, "Moneda")).toHaveText("PEN");
    await expect(dato(page, "Símbolo")).toHaveText("S/");
    await expect(dato(page, "Prefijo telefónico")).toHaveText("+51");
    await expect(dato(page, "Dígitos del celular")).toHaveText("9");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await expect(page.getByText("Marca publicada en el sitio y el panel")).toBeVisible(); // esperar a que se guarde antes de salir de la página

    await page.goto("/login");
    const opciones = await page.locator("#tipo-doc option").allTextContents();
    expect(opciones).toContain("DNI");
    expect(opciones).not.toContain("Cédula de Identidad");
    await page.locator("#tipo-doc").selectOption("dni");
    await page.getByLabel("Número de documento").fill("123456789012");
    await expect(page.getByLabel("Número de documento")).toHaveValue("12345678"); // 8 dígitos

    await page.goto("/contacto");
    await expect(page.locator("main img[alt='Perú']").first()).toBeVisible(); // bandera de la librería, no emoji
    await expect(page.getByText("+51", { exact: true }).first()).toBeVisible();
    await page.goto("/canjea/p7");
    await expect(page.getByText(/S\/\s?329/)).toBeVisible();
  });

  test("los 11 países están disponibles con sus datos y su bandera", async ({ page }) => {
    await abrirEditor(page);
    const esperados: Record<string, [string, string, string]> = {
      EC: ["USD", "+593", "9"], PE: ["PEN", "+51", "9"], CO: ["COP", "+57", "10"], CL: ["CLP", "+56", "9"], BO: ["BOB", "+591", "8"],
      MX: ["MXN", "+52", "10"], PA: ["USD", "+507", "8"], GT: ["GTQ", "+502", "8"], ES: ["EUR", "+34", "9"], AR: ["ARS", "+54", "10"], BR: ["BRL", "+55", "11"],
    };
    const select = page.getByLabel("País", { exact: true });
    expect(await select.locator("option").count()).toBe(11);
    for (const [cod, [moneda, prefijo, digitos]] of Object.entries(esperados)) {
      await select.selectOption(cod);
      await expect(dato(page, "Código ISO")).toHaveText(cod);
      await expect(dato(page, "Moneda")).toHaveText(moneda);
      await expect(dato(page, "Prefijo telefónico")).toHaveText(prefijo);
      await expect(dato(page, "Dígitos del celular")).toHaveText(digitos);
      await expect.poll(() => page.locator(`img[src='flags/${cod.toLowerCase()}.svg']`).first().evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    }
  });

  test("no existe la opción de idioma y Ecuador es el país por defecto", async ({ page }) => {
    await abrirEditor(page);
    await expect(page.getByText(/idioma/i)).toHaveCount(0);
    await expect(page.getByLabel("País", { exact: true })).toHaveValue("EC");
  });

  test("provincias con envío: lista oficial fija, solo se activa el envío y llega al formulario del participante", async ({ page }) => {
    await abrirEditor(page);
    await expect(page.getByRole("button", { name: "Agregar provincia" })).toHaveCount(0);
    await expect(page.getByLabel("Nombre de la provincia")).toHaveCount(0);
    await expect(page.getByRole("switch", { name: /^Envío a/ })).toHaveCount(24); // Ecuador completo
    await page.getByRole("button", { name: "Desactivar todas" }).click();
    await page.getByRole("switch", { name: "Envío a Azuay" }).click();
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.goto("/perfil");
    // el formulario público ofrece solo las provincias con envío
    await expect
      .poll(async () => (await page.locator("#pf-f7").locator("option").allTextContents()).filter((o) => o !== "Selecciona").sort())
      .toEqual(["Azuay"]);
  });
  test("la moneda sale del país elegido y los datos del país no se editan", async ({ page }) => {
    await abrirEditor(page);
    await expect(page.getByLabel("Símbolo de moneda")).toHaveCount(0);
    await expect(page.getByLabel("Emoji de la bandera")).toHaveCount(0);
    await page.getByLabel("País", { exact: true }).selectOption("ES");
    await expect(page.getByText(/Ejemplo con la configuración actual: €1.*EUR/)).toBeVisible();
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.goto("/canjea/p7");
    await expect(page.getByText(/€329/)).toBeVisible();
  });

  test("documentos de identidad: agregar y quitar", async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole("button", { name: "Agregar documento" }).click();
    await page.getByLabel("Nombre del documento").last().fill("Licencia de conducir");
    await page.getByRole("button", { name: "Quitar documento" }).first().click();
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.goto("/login");
    await page.locator("#tipo-doc").waitFor();
    const opciones = await page.locator("#tipo-doc option").allTextContents();
    expect(opciones).toContain("Licencia de conducir");
    expect(opciones).not.toContain("Cédula de Identidad");
  });

  test("exportar e importar la configuración como JSON (replicar en otro proyecto)", async ({ page }) => {
    await abrirEditor(page);
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar JSON" }).click();
    const d = await descarga;
    expect(d.suggestedFilename()).toBe("tenant-ecuador.json");
    const contenido = JSON.parse(await (await import("node:fs/promises")).readFile((await d.path())!, "utf8"));
    expect(contenido.tema.primario).toBe("#00bdd2");
    expect(contenido.pais.moneda.codigo).toBe("USD");

    const nuevo = { ...contenido, id: "demo", marca: { ...contenido.marca, nombre: "Cliente Importado", programa: "Importado Plus" }, tema: { ...contenido.tema, primario: "#0f766e" } };
    await page.getByLabel("Importar configuración de marca").setInputFiles({ name: "t.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(nuevo)) });
    await expect(page.getByText("Configuración importada")).toBeVisible();
    expect(await cssVar(page, "--primary")).toBe("#0f766e");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.goto("/mi-nivel");
    await expect(page).toHaveTitle(/Importado Plus/);

    await page.goto("/admin/configuracion");
    await page.getByLabel("Importar configuración de marca").setInputFiles({ name: "malo.json", mimeType: "application/json", buffer: Buffer.from("{ no es json") });
    await expect(page.getByRole("alert")).toContainText("no es una configuración de marca válida");
  });

  test("el admin también adopta la marca (logo, colores, nombre)", async ({ page }) => {
    await abrirEditor(page);
    await page.getByLabel("Color principal (hex)").fill("#16a34a");
    await page.getByLabel("Nombre de la empresa").fill("Cooperativa Verde");
    await page.getByRole("button", { name: "Guardar marca" }).click();
    await page.reload();
    await expect(page.getByLabel("Navegación principal").getByRole("link", { name: /Cooperativa Verde/ })).toBeVisible();
    const botonActivo = await page.evaluate(() => getComputedStyle(document.querySelector("a[aria-label='Configuración']")!).backgroundColor);
    expect(botonActivo).toBe("rgb(22, 163, 74)");
  });
});
