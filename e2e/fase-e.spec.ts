import { expect, test, type Page } from "@playwright/test";
import { pngValido } from "./archivos";
import { entrarAdmin, esperarCarga } from "./helpers";

const K = "bancosolidario_mockdb_v11";
const leerDb = (page: Page, ruta: string) => page.evaluate(([k, r]) => { let v: any = JSON.parse(localStorage.getItem(k!)!); for (const p of r!.split(".")) v = v?.[p]; return v; }, [K, ruta]);
const dia = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

/** Cambia a otra persona del panel sin perder la base simulada (la sesión del panel vive en sessionStorage). */
async function cambiarDePersona(page: Page, rol: string) {
  await page.evaluate(() => { sessionStorage.clear(); });
  await entrarAdmin(page, rol);
}

/** Crea un pop-up desde el panel con el contenido de la web; devuelve la tarjeta. */
async function crearPopup(page: Page, o: { nombre: string; titulo: string; mensaje?: string; boton?: string; enlace?: string; frecuencia?: string; desde?: string; hasta?: string; paginas?: string }) {
  await page.goto("/admin/popups");
  await esperarCarga(page);
  await page.getByRole("button", { name: "Nuevo pop-up" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Nombre interno (solo lo ve el panel)").fill(o.nombre);
  if (o.desde) await d.getByLabel("Inicio", { exact: true }).fill(o.desde);
  if (o.hasta) await d.getByLabel("Fin", { exact: true }).fill(o.hasta);
  if (o.frecuencia) await d.getByLabel("Frecuencia", { exact: true }).selectOption(o.frecuencia);
  if (o.paginas) await d.getByLabel("Dónde sale").selectOption(o.paginas);
  await d.getByLabel("Título", { exact: true }).fill(o.titulo);
  if (o.mensaje) await d.getByLabel("Mensaje").fill(o.mensaje);
  if (o.boton) await d.getByLabel("Texto del botón (opcional)").fill(o.boton);
  if (o.enlace) await d.getByLabel("Enlace del botón").fill(o.enlace);
  await d.getByRole("button", { name: "Guardar pop-up" }).click();
  await expect(page.getByText("Pop-up guardado")).toBeVisible();
}

const dialogoDelSitio = (page: Page, titulo: string) => page.getByRole("dialog", { name: titulo });

test.describe("Fase E: pop-ups", () => {
  test.beforeEach(async ({ page }) => {
    await entrarAdmin(page);
  });

  test("se crea desde el panel, sale en el inicio del sitio, el botón lleva a su enlace y cuenta vista y clic", async ({ page }) => {
    await crearPopup(page, { nombre: "Promo de prueba", titulo: "Gran promo", mensaje: "Solo esta semana", boton: "Ver beneficios", enlace: "/beneficios" });
    await expect(page.locator("a-panel", { hasText: "Promo de prueba" })).toContainText("Vigente");
    await page.goto("/");
    const p = dialogoDelSitio(page, "Gran promo");
    await expect(p).toBeVisible();
    await expect(p).toContainText("Solo esta semana");
    await p.getByRole("link", { name: "Ver beneficios" }).click();
    await expect(page).toHaveURL(/\/beneficios$/);
    await expect(dialogoDelSitio(page, "Gran promo")).toHaveCount(0);
    const pop = await leerDb(page, "admin.popups").then((l: any[]) => l.find((x) => x.nombre === "Promo de prueba"));
    expect(pop.vistas.web).toBe(1);
    expect(pop.clics.web).toBe(1);
  });

  test("frecuencia «una vez por sesión»: se cierra con Escape y no vuelve a salir; «siempre» sale cada vez", async ({ page }) => {
    await crearPopup(page, { nombre: "Una vez", titulo: "Aviso único", frecuencia: "sesion", mensaje: "m" });
    await page.goto("/");
    await expect(dialogoDelSitio(page, "Aviso único")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialogoDelSitio(page, "Aviso único")).toHaveCount(0);
    await page.goto("/");
    await esperarCarga(page);
    await expect(dialogoDelSitio(page, "Aviso único")).toHaveCount(0); // misma sesión: no vuelve

    await crearPopup(page, { nombre: "Siempre", titulo: "Aviso siempre", frecuencia: "siempre", mensaje: "m" });
    for (let i = 0; i < 2; i++) {
      await page.goto("/");
      await expect(dialogoDelSitio(page, "Aviso siempre")).toBeVisible();
      await dialogoDelSitio(page, "Aviso siempre").getByRole("button", { name: "Cerrar", exact: true }).first().click();
    }
  });

  test("vigencia y pausa: uno programado, uno vencido y uno pausado no salen; el de «solo inicio» no sale en otras páginas", async ({ page }) => {
    await crearPopup(page, { nombre: "Futuro", titulo: "Aviso futuro", desde: dia(5), frecuencia: "siempre", mensaje: "m" });
    await crearPopup(page, { nombre: "Pasado", titulo: "Aviso pasado", hasta: dia(-2), frecuencia: "siempre", mensaje: "m" });
    await crearPopup(page, { nombre: "Solo inicio", titulo: "Aviso inicio", frecuencia: "siempre", paginas: "inicio", mensaje: "m" });
    await page.goto("/admin/popups");
    await expect(page.locator("a-panel", { hasText: "Futuro" })).toContainText("Programado");
    await expect(page.locator("a-panel", { hasText: "Pasado" })).toContainText("Vencido");
    await page.goto("/");
    await expect(dialogoDelSitio(page, "Aviso inicio")).toBeVisible();
    await expect(dialogoDelSitio(page, "Aviso futuro")).toHaveCount(0);
    await expect(dialogoDelSitio(page, "Aviso pasado")).toHaveCount(0);
    await page.goto("/beneficios");
    await esperarCarga(page);
    await expect(dialogoDelSitio(page, "Aviso inicio")).toHaveCount(0);

    // Pausarlo en el panel lo saca del sitio.
    await page.goto("/admin/popups");
    await page.locator("a-panel", { hasText: "Solo inicio" }).getByRole("switch", { name: "Activo" }).click();
    await expect(page.locator("a-panel", { hasText: "Solo inicio" })).toContainText("Pausado");
    await page.goto("/");
    await esperarCarga(page);
    await expect(dialogoDelSitio(page, "Aviso inicio")).toHaveCount(0);
  });

  test("contenido distinto para web y app: lo de la app no sale en la web", async ({ page }) => {
    await page.goto("/admin/popups");
    await page.getByRole("button", { name: "Nuevo pop-up" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Nombre interno (solo lo ve el panel)").fill("Doble");
    await d.getByLabel("Frecuencia", { exact: true }).selectOption("siempre");
    await d.getByLabel("Título", { exact: true }).fill("Texto de la web");
    await d.getByLabel("Mensaje").fill("para la web");
    await d.getByRole("tab", { name: /App/ }).click();
    await d.getByRole("button", { name: "Agregar contenido para la app" }).click();
    await d.getByLabel("Título", { exact: true }).fill("Texto de la app");
    await d.getByLabel("Mensaje").fill("para la app");
    await d.getByRole("button", { name: "Guardar pop-up" }).click();
    await expect(page.getByText("Pop-up guardado")).toBeVisible();
    const guardado = await leerDb(page, "admin.popups").then((l: any[]) => l.find((x) => x.nombre === "Doble"));
    expect(guardado.web.titulo).toBe("Texto de la web");
    expect(guardado.app.titulo).toBe("Texto de la app");
    await page.goto("/");
    await expect(dialogoDelSitio(page, "Texto de la web")).toBeVisible();
    await expect(page.getByText("Texto de la app")).toHaveCount(0);
  });

  test("formato «solo imagen»: la imagen es todo el pop-up, es clicable y el título hace de texto alternativo", async ({ page }) => {
    await page.goto("/admin/popups");
    await page.getByRole("button", { name: "Nuevo pop-up" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Nombre interno (solo lo ve el panel)").fill("Solo imagen");
    await d.getByLabel("Frecuencia", { exact: true }).selectOption("siempre");
    await d.getByLabel("Formato").selectOption("imagen");
    await expect(d.getByLabel("Mensaje")).toHaveCount(0); // en este formato no hay mensaje ni botón
    await d.getByLabel("Título (texto alternativo de la imagen)").fill("Promo de verano");
    await expect(d.getByRole("alert")).toContainText("sube la imagen");
    await d.getByLabel("Subir imagen").setInputFiles({ name: "promo.png", mimeType: "image/png", buffer: pngValido(800, 1000) });
    await d.getByLabel("Enlace al tocar la imagen (opcional)").fill("/beneficios");
    await expect(d.getByRole("alert")).toHaveCount(0);
    await d.getByRole("button", { name: "Guardar pop-up" }).click();
    await expect(page.getByText("Pop-up guardado")).toBeVisible();
    await page.goto("/");
    const p = dialogoDelSitio(page, "Promo de verano");
    await expect(p).toBeVisible();
    await expect(p.getByRole("img", { name: "Promo de verano" })).toBeVisible();
    await expect(p.getByRole("heading")).toHaveCount(0); // sin título ni mensaje a la vista
    await p.getByRole("link").first().click(); // tocar la imagen lleva al enlace
    await expect(page).toHaveURL(/\/beneficios$/);
  });

  test("valida: el botón necesita enlace, el enlace no puede ser javascript: y las fechas deben ser coherentes", async ({ page }) => {
    await page.goto("/admin/popups");
    await page.getByRole("button", { name: "Nuevo pop-up" }).click();
    const d = page.getByRole("dialog");
    const guardar = d.getByRole("button", { name: "Guardar pop-up" });
    await expect(guardar).toBeDisabled(); // sin nombre
    await d.getByLabel("Nombre interno (solo lo ve el panel)").fill("Prueba");
    await expect(d.getByRole("alert")).toContainText("escribe el título");
    await d.getByLabel("Título", { exact: true }).fill("T");
    await d.getByLabel("Mensaje").fill("m");
    await d.getByLabel("Texto del botón (opcional)").fill("Ir");
    await expect(d.getByRole("alert")).toContainText("necesita un enlace");
    await d.getByLabel("Enlace del botón").fill("javascript:alert(1)");
    await expect(d.getByRole("alert")).toContainText("ruta como /beneficios");
    await d.getByLabel("Enlace del botón").fill("/beneficios");
    await expect(d.getByRole("alert")).toHaveCount(0);
    await d.getByLabel("Inicio", { exact: true }).fill(dia(10));
    await d.getByLabel("Fin", { exact: true }).fill(dia(2));
    await expect(d.getByRole("alert")).toContainText("anterior");
    await expect(guardar).toBeDisabled();
  });

  test("duplicar y eliminar", async ({ page }) => {
    await crearPopup(page, { nombre: "Original", titulo: "Para duplicar", mensaje: "m" });
    await page.locator("a-panel", { hasText: "Original" }).getByRole("button", { name: "Duplicar" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Nombre interno (solo lo ve el panel)")).toHaveValue("Original (copia)");
    await d.getByRole("button", { name: "Guardar pop-up" }).click();
    await expect(page.locator("a-panel", { hasText: "Original (copia)" })).toContainText("Pausado"); // la copia parte pausada
    await page.locator("a-panel", { hasText: "Original (copia)" }).getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("dialog", { name: "¿Eliminar pop-up?" }).getByRole("button", { name: "Eliminar" }).click();
    await expect(page.locator("a-panel", { hasText: "Original (copia)" })).toHaveCount(0);
  });
});

test.describe("Fase E: centro de ayuda", () => {
  test("cada rol ve solo las guías que le tocan y puede buscar y leerlas", async ({ page }) => {
    await entrarAdmin(page, "Atención");
    await page.goto("/admin/ayuda");
    await esperarCarga(page);
    await expect(page.getByRole("button", { name: /Gestionar pedidos y cotizaciones/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Crear roles y dar permisos/ })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Administrar" })).toHaveCount(0);
    await page.getByLabel("Buscar en la ayuda").fill("cotizaciones");
    await expect(page.getByRole("button", { name: /Gestionar pedidos y cotizaciones/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cómo moverte por el panel/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Gestionar pedidos y cotizaciones/ }).click();
    const g = page.getByRole("dialog", { name: "Gestionar pedidos y cotizaciones" });
    await expect(g.getByRole("heading", { name: "Pedidos", exact: true })).toBeVisible(); // el contenido se muestra con formato
    await page.keyboard.press("Escape");
    await expect(g).toBeHidden();
  });

  test("el administrador crea una guía para un rol, esa persona la ve, y al despublicarla desaparece", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/ayuda");
    await page.getByRole("tab", { name: "Administrar" }).click();
    await page.getByRole("button", { name: "Nueva guía" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByRole("button", { name: "Guardar guía" })).toBeDisabled();
    await d.getByLabel("Título", { exact: true }).fill("Cómo responder un reclamo");
    await d.getByLabel("Categoría").fill("Atención al participante");
    await d.getByLabel("Resumen (se ve en la lista)").fill("Pasos para cerrar un caso.");
    await d.getByRole("switch", { name: "Todos los roles" }).click();
    await d.getByRole("button", { name: "Atención", exact: true }).click();
    await d.getByLabel(/^Contenido/).fill("## Paso 1\n\nLee el mensaje.\n\n- Responde en **48 horas**");
    await expect(d.getByRole("heading", { name: "Paso 1" })).toBeVisible(); // vista previa
    await d.getByRole("button", { name: "Guardar guía" }).click();
    await expect(page.getByText("Guía guardada")).toBeVisible();
    expect(await leerDb(page, "admin.guias").then((l: any[]) => l.find((x) => x.titulo === "Cómo responder un reclamo"))).toMatchObject({ roles: ["Atención"], publicada: true, categoria: "Atención al participante" });

    await cambiarDePersona(page, "Atención");
    await page.goto("/admin/ayuda");
    await expect(page.getByRole("button", { name: /Cómo responder un reclamo/ })).toBeVisible();
    await cambiarDePersona(page, "Catálogo");
    await page.goto("/admin/ayuda");
    await esperarCarga(page);
    await expect(page.getByRole("button", { name: /Cómo responder un reclamo/ })).toHaveCount(0); // no es para su rol

    await cambiarDePersona(page, "Administrador");
    await page.goto("/admin/ayuda");
    await page.getByRole("tab", { name: "Administrar" }).click();
    await page.locator("tr", { hasText: "Cómo responder un reclamo" }).getByRole("switch", { name: "Publicada" }).click();
    await cambiarDePersona(page, "Atención");
    await page.goto("/admin/ayuda");
    await esperarCarga(page);
    await expect(page.getByRole("button", { name: /Cómo responder un reclamo/ })).toHaveCount(0);
  });

  test("las guías se abren por enlace (?ver=id) y se pueden eliminar", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/ayuda?ver=colores");
    await expect(page.getByRole("dialog", { name: "Cambiar los colores y el logo del sitio" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Administrar" }).click();
    await page.locator("tr", { hasText: "Descargar listados en Excel o PDF" }).getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("dialog", { name: "¿Eliminar guía?" }).getByRole("button", { name: "Eliminar" }).click();
    await expect(page.locator("tr", { hasText: "Descargar listados en Excel o PDF" })).toHaveCount(0);
  });

  test("el menú tiene «Ayuda» y «Pop-ups» según el rol", async ({ page }) => {
    await entrarAdmin(page, "Solo lectura");
    await expect(page.getByRole("link", { name: "Ayuda" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Pop-ups" })).toHaveCount(0);
    await cambiarDePersona(page, "Catálogo");
    await expect(page.getByRole("link", { name: "Pop-ups" }).first()).toBeVisible();
  });
});
