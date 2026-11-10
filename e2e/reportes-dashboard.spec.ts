import { expect, test, type Page } from "@playwright/test";
import { descargarListado, entrarAdmin, textoDeArchivo } from "./helpers";

const TIPOS = ["Resumen", "Puntos", "Ventas de puntos", "Pedidos y canjes", "Participantes", "Catálogo", "Vuelos", "Correos", "Embudo de canje"];
const kpis = (page: Page) => page.getByLabel("Indicadores del período");
const sinHorizontal = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

test.describe("Reportes por tipo", () => {
  test("los tipos vienen de la API y cada uno carga indicadores y gráficos sin errores", async ({ page }) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await entrarAdmin(page);
    await page.goto("/admin/reportes");
    for (const t of TIPOS) {
      await page.getByRole("tab", { name: t, exact: true }).click();
      await expect(page.getByRole("tab", { name: t, exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(kpis(page).locator("a-stat").first()).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    }
    expect(errores).toEqual([]);
  });

  test("el tipo elegido queda en la dirección y se puede abrir directo", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=vuelos");
    await expect(page.getByRole("tab", { name: "Vuelos", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Correos", exact: true }).click();
    await expect(page).toHaveURL(/tipo=correos/);
  });

  test("la tabla se busca y se filtra en el servidor, y se limpia", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=canjes");
    const tabla = page.getByRole("table", { name: "Pedidos", exact: true });
    const filas = tabla.locator("tbody tr");
    await expect(filas.first()).toContainText("BNB-"); // ya cargó (no es el esqueleto)
    const total = await filas.count();
    expect(total).toBeGreaterThan(1);
    await page.getByLabel("Estado", { exact: true }).selectOption({ label: "Entregado" });
    await expect.poll(() => filas.count()).toBeLessThan(total);
    for (const t of await filas.allInnerTexts()) expect(t).toContain("Entregado");
    await page.getByRole("button", { name: /Limpiar/ }).click();
    await expect.poll(() => filas.count()).toBe(total);
    await page.getByLabel("Buscar en Pedidos").fill("zzzz-no-existe");
    await expect(page.locator("td.adm-empty", { hasText: "Sin resultados" })).toBeVisible();
  });

  test("filtrar por novedades muestra a quienes no las aceptan", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=participantes");
    await page.getByLabel("Novedades", { exact: true }).selectOption({ label: "No aceptan" });
    const filas = page.getByRole("table", { name: "Participantes", exact: true }).locator("tbody tr");
    await expect.poll(() => filas.count()).toBeGreaterThanOrEqual(3); // la demo trae 3 que no aceptan
  });

  test("cada fila abre un detalle con su enlace de gestión", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=canjes");
    await page.getByRole("button", { name: /Ver detalle de/ }).first().click();
    const d = page.getByRole("dialog", { name: "Detalle · Pedidos" });
    await expect(d).toContainText("Participante");
    await expect(d).toContainText("Productos y beneficios del pedido");
    await expect(d.getByRole("link", { name: "Gestionar en Pedidos" })).toHaveAttribute("href", "/admin/pedidos");
    await page.keyboard.press("Escape");
    await expect(d).toHaveCount(0);
  });

  test("participantes: el ojo (y el nombre) abren la ficha del participante", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=participantes");
    const ojo = page.getByRole("link", { name: /^Ver ficha de / }).first();
    await expect(ojo).toBeVisible();
    await ojo.click();
    await expect(page).toHaveURL(/\/admin\/participantes\/p\d+$/);
    await page.goBack();
    await page.getByRole("table", { name: "Participantes", exact: true }).getByRole("link").nth(1).click(); // el nombre también lleva a la ficha
    await expect(page).toHaveURL(/\/admin\/participantes\/p\d+$/);
  });

  test("los pedidos salen por fecha, lo más reciente primero, con el estado bajo el código", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=canjes");
    const tarjetas = page.getByRole("table", { name: "Pedidos", exact: true }).locator("tbody tr");
    await expect(tarjetas.first()).toContainText("BNB-");
    const fechas = (await tarjetas.evaluateAll((trs) => trs.map((t) => (t.textContent ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/)))).map((m) => (m ? `${m[3]}-${m[2]}-${m[1]}` : ""));
    expect(fechas.length).toBeGreaterThan(1);
    expect(fechas).toEqual([...fechas].sort().reverse());
    const primera = tarjetas.first();
    const yCodigo = (await primera.getByRole("button").first().boundingBox())!.y;
    const yEstado = (await primera.locator("a-pill").boundingBox())!.y;
    expect(yEstado).toBeGreaterThan(yCodigo); // el chip va debajo del código
    expect(yEstado - yCodigo).toBeLessThan(60); // y pegado a él, no al final de la tarjeta
  });

  test("la tabla filtrada se descarga en Excel", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=canjes");
    await expect(page.getByRole("table", { name: "Pedidos", exact: true }).locator("tbody tr").first()).toBeVisible();
    const d = await descargarListado(page, () => page.getByRole("button", { name: "Exportar tabla" }).click());
    expect(d.suggestedFilename()).toMatch(/^canjes_\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const xlsx = await textoDeArchivo(d);
    expect(xlsx).toContain("CÓDIGO");
    expect((xlsx.match(/<row /g) ?? []).length).toBeGreaterThan(2);
  });

  test("los gráficos de anillo traen su leyenda al lado con cantidad y porcentaje, y reparten la fila", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=participantes");
    const leyendas = page.getByRole("list", { name: /^Detalle de / });
    await expect(leyendas.first()).toBeVisible();
    expect(await leyendas.count()).toBe(3);
    await expect(leyendas.first().locator("li").first()).toContainText("%");
    // Reparten el ancho: ningún panel queda mucho más angosto que otro de su fila.
    const anchos = await page.locator("a-panel", { has: leyendas.first() }).evaluateAll((ps) => ps.map((p) => p.getBoundingClientRect().width));
    expect(Math.min(...anchos)).toBeGreaterThan(250);
  });

  test("los indicadores de la última fila llenan el ancho (sin tarjetas colgadas con espacio vacío)", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=participantes");
    const caja = kpis(page);
    await expect(caja.locator("a-stat").first()).toBeVisible();
    const { derecha, ancho } = await caja.evaluate((el) => {
      const hijos = [...el.children].map((c) => c.getBoundingClientRect());
      return { derecha: Math.max(...hijos.map((r) => r.right)), ancho: el.getBoundingClientRect().right };
    });
    expect(derecha).toBeGreaterThan(ancho - 4); // la fila de abajo también llega al borde derecho
  });

  test("un reporte de estado actual no ofrece comparar con otro período", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reportes?tipo=catalogo");
    await expect(page.getByText("Este reporte muestra el estado actual")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Comparar con el período anterior" })).toHaveCount(0);
  });

  test("quien solo puede ver reportes ve también las tablas (sin permiso a cada módulo)", async ({ page }) => {
    await entrarAdmin(page, "Solo lectura");
    await page.goto("/admin/reportes?tipo=canjes");
    await expect(page.getByRole("table", { name: "Pedidos", exact: true }).locator("tbody tr").first()).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

test.describe("Dashboard", () => {
  test("muestra indicadores reales, alertas y los widgets", async ({ page }) => {
    await entrarAdmin(page);
    await expect(kpis(page).locator("a-stat")).toHaveCount(9);
    await expect(page.getByText("Requiere atención")).toBeVisible();
    await expect(page.getByRole("link", { name: /Pedidos por atender/ })).toBeVisible();
    for (const w of ["Puntos emitidos y canjeados", "Embudo de canje", "Últimos pedidos", "Mensajes sin atender", "Más canjeados", "Más vistos"]) await expect(page.getByText(w, { exact: true }).first()).toBeVisible();
  });

  test("un indicador lleva a su reporte", async ({ page }) => {
    await entrarAdmin(page);
    await page.getByRole("link", { name: "Puntos emitidos: ver el reporte" }).click();
    await expect(page).toHaveURL(/\/admin\/reportes\?tipo=puntos/);
    await expect(page.getByRole("tab", { name: "Puntos", exact: true })).toHaveAttribute("aria-selected", "true");
  });

  test("una alerta lleva al módulo donde se atiende", async ({ page }) => {
    await entrarAdmin(page);
    await page.getByRole("link", { name: /Pedidos por atender/ }).click();
    await expect(page).toHaveURL(/\/admin\/pedidos$/);
  });

  for (const ancho of [1280, 900, 800]) {
    test(`con "Rango" todo queda cuadrado a ${ancho}px (sin desbordes ni título apretado)`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      await entrarAdmin(page);
      await page.getByRole("group", { name: "Periodo" }).getByRole("button", { name: "Rango" }).click();
      await expect(page.getByLabel("Desde")).toBeVisible();
      await expect(kpis(page).locator("a-stat").first()).toBeVisible();
      expect(await sinHorizontal(page)).toBe(true);
      const desc = await page.locator("a-header p").first().boundingBox();
      expect(desc!.width).toBeGreaterThan(250); // la descripción no se aprieta en una columna angosta
      const fecha = await page.getByLabel("Desde").boundingBox();
      expect(fecha!.width).toBeLessThan(220); // las fechas no ocupan toda la fila
    });
  }

  test("un rango invertido se explica y se recupera al corregirlo", async ({ page }) => {
    await entrarAdmin(page);
    await page.getByRole("group", { name: "Periodo" }).getByRole("button", { name: "Rango" }).click();
    await page.getByLabel("Desde").fill("2026-10-20");
    await page.getByLabel("Hasta").fill("2026-10-01");
    await expect(page.getByRole("alert")).toContainText("anterior a la final");
    await page.getByLabel("Hasta").fill("2026-10-28");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(kpis(page).locator("a-stat")).toHaveCount(9);
  });

  test("los últimos pedidos y los mensajes abren su detalle", async ({ page }) => {
    await entrarAdmin(page);
    await page.getByRole("button", { name: /Ver detalle del pedido/ }).first().click();
    const p = page.getByRole("dialog", { name: /^Pedido / });
    await expect(p).toContainText("Productos y beneficios");
    await expect(p.getByRole("link", { name: "Gestionar en Pedidos" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Pedido no llega/ }).click();
    await expect(page.getByRole("dialog", { name: "Pedido no llega" })).toContainText("Responder en Atención");
  });

  test("se puede personalizar qué bloques ver y se recuerda", async ({ page }) => {
    await entrarAdmin(page);
    await expect(page.getByText("Más vistos", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Personalizar" }).click();
    await page.getByRole("dialog", { name: "Personalizar el Dashboard" }).getByLabel("Más vistos").uncheck();
    await page.getByRole("button", { name: "Listo" }).click();
    await expect(page.getByText("Más vistos", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(kpis(page).locator("a-stat").first()).toBeVisible();
    await expect(page.getByText("Más vistos", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Personalizar" }).click();
    await page.getByRole("button", { name: "Mostrar todos" }).click();
    await page.getByRole("button", { name: "Listo" }).click();
    await expect(page.getByText("Más vistos", { exact: true })).toBeVisible();
  });
});

test.describe("Modales de detalle", () => {
  test("movimientos de puntos", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/movimientos");
    await page.getByRole("button", { name: /Ver detalle del movimiento/ }).first().click();
    const d = page.getByRole("dialog", { name: "Detalle del movimiento" });
    await expect(d).toContainText("Participante");
    await expect(d).toContainText("Puntos");
    await d.getByRole("button", { name: "Cerrar", exact: true }).last().click();
    await expect(d).toHaveCount(0);
  });

  test("compras de puntos: la operación abre su detalle con el enlace a la ficha", async ({ page }) => {
    await page.goto("/mis-puntos/compra");
    await page.getByRole("button", { name: "Comprar puntos" }).click();
    await page.getByRole("button", { name: "Pagar ahora" }).click();
    await expect(page.getByText("¡Tus puntos ya están acreditados!")).toBeVisible({ timeout: 10_000 });
    await entrarAdmin(page);
    await page.goto("/admin/compras-puntos");
    await page.getByRole("button", { name: /Ver detalle de la operación PTS-/ }).first().click();
    const d = page.getByRole("dialog", { name: /^Operación PTS-/ });
    await expect(d).toContainText("Aprobada");
    await expect(d.getByRole("link", { name: "Ver ficha del participante" })).toHaveAttribute("href", /\/admin\/participantes\/p1$/);
  });

  test("lotes de códigos de beneficios", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/beneficios");
    await page.getByRole("button", { name: "Cupones y códigos" }).click();
    await page.getByRole("button", { name: /Ver detalle del lote/ }).first().click();
    const d = page.getByRole("dialog", { name: "Detalle del lote de códigos" });
    await expect(d).toContainText("disponibles");
    await expect(d.getByRole("img", { name: /Uso del lote/ })).toBeVisible();
  });

  test("campañas: el detalle muestra el mensaje y lleva a los correos de esa campaña", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/correos");
    await page.getByRole("tab", { name: "Campañas" }).click();
    await page.getByRole("button", { name: "Nueva campaña" }).click();
    const n = page.getByRole("dialog", { name: "Nueva campaña" });
    await n.getByLabel("Nombre interno").fill("Campaña con detalle");
    await n.getByLabel("Asunto del correo").fill("Mira lo nuevo");
    await n.getByLabel("Mensaje").fill("Hola {nombre}, tenemos novedades.");
    await n.getByRole("button", { name: "Enviar campaña" }).click();
    await page.getByRole("dialog", { name: "¿Enviar la campaña?" }).getByRole("button", { name: "Enviar ahora" }).click();
    await page.getByRole("button", { name: "Ver detalle de la campaña Campaña con detalle" }).click();
    const d = page.getByRole("dialog", { name: "Campaña: Campaña con detalle" });
    await expect(d).toContainText("Hola {nombre}, tenemos novedades.");
    await d.getByRole("button", { name: "Ver los correos enviados" }).click();
    await expect(page.getByRole("tab", { name: "Enviados" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Buscar correo")).toHaveValue("Campaña con detalle");
  });

  test("ficha del participante: muestra las respuestas del Formulario de datos", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByLabel("Apellido paterno").fill("Torres");
    await page.getByLabel("Correo electrónico *").fill("ana@correo.com");
    await page.getByLabel("N.º de celular").fill("0991234567");
    await page.getByLabel("Género").selectOption("Femenino");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Tus cambios se guardaron correctamente.")).toBeVisible();
    await entrarAdmin(page);
    await page.goto("/admin/participantes/p1?tab=datos");
    const sec = page.getByRole("region", { name: "Datos del formulario" });
    await expect(sec).toContainText("Apellido paterno");
    await expect(sec).toContainText("Torres");
    await expect(sec).toContainText("Femenino");
  });
});
