import { expect, test, type Page } from "@playwright/test";
import { USUARIOS, entrarAdmin, esperarCarga } from "./helpers";

async function comprarDigital(page: Page) {
  await page.goto("/canjea/p14");
  await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
  await page.getByRole("dialog").getByRole("link", { name: "Ver carrito" }).click();
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await expect(page).toHaveURL(/gracias$/);
}

test.describe("Acceso y roles", () => {
  test("ingresa, muestra el usuario y cierra sesión", async ({ page }) => {
    await entrarAdmin(page);
    await expect(page.getByText("Mariela Castro")).toBeVisible();
    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible();
  });

  test("el rol 'Solo lectura' no ve ni abre las secciones de catálogo", async ({ page }) => {
    await entrarAdmin(page, "Solo lectura");
    await expect(page.getByRole("link", { name: "Reportes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Productos", exact: true })).toHaveCount(0);
    await page.goto("/admin/productos");
    await expect(page.getByText("Sin acceso a esta sección")).toBeVisible();
  });

  test("contraseña incorrecta no permite el ingreso", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Correo").fill("admin@bancosolidario.com");
    await page.getByLabel("Contraseña").fill("incorrecta");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByRole("alert")).toContainText("Correo o contraseña incorrectos");
    await expect(page.getByRole("button", { name: "Menú de usuario" })).toHaveCount(0);
  });

  for (const [rol, u] of Object.entries(USUARIOS)) {
    test(`cada rol ingresa con su usuario: ${rol}`, async ({ page }) => {
      await entrarAdmin(page, rol);
      await expect(page.getByText(u.nombre).first()).toBeVisible();
      await page.getByRole("button", { name: "Menú de usuario" }).click();
      await expect(page.getByRole("menu").getByText(u.email)).toBeVisible();
    });
  }

  test("Atención solo ve mensajes, cotizaciones y participantes", async ({ page }) => {
    await entrarAdmin(page, "Atención");
    const nav = page.getByLabel("Navegación principal");
    for (const l of ["Atención", "Cotizaciones de vuelos", "Participantes"]) await expect(nav.getByRole("link", { name: l, exact: true })).toBeVisible();
    for (const l of ["Productos", "Pedidos", "Configuración"]) await expect(nav.getByRole("link", { name: l, exact: true })).toHaveCount(0);
    await page.goto("/admin/pedidos");
    await expect(page.getByText("Sin acceso a esta sección")).toBeVisible();
  });

  test("recuperación de contraseña responde igual exista o no el correo", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
    await page.getByLabel("Correo").fill("nadie@ejemplo.com");
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByText("Revisa tu correo")).toBeVisible();
    await expect(page.getByText(/pertenece a un usuario del panel/)).toBeVisible();
  });});

test.describe("Lo que se administra se refleja en el sitio", () => {
  test("desactivar un producto lo quita del catálogo público", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await expect(page.locator("tbody tr")).toHaveCount(24);
    await page.locator("tbody tr").first().getByRole("switch").click();
    await page.goto("/canjea");
    await expect(page.getByText("23 productos disponibles")).toBeVisible();
  });

  test("crear un producto lo publica en el catálogo", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    const d = page.locator("aside").last();
    await d.getByLabel("Nombre").fill("Producto de prueba E2E");
    await d.getByLabel("Marca").selectOption({ index: 1 }); // la marca se elige de la lista de Marcas aliadas
    await d.getByLabel("Puntos").fill("1234");
    await d.getByRole("button", { name: "Guardar producto" }).click();
    await page.goto("/canjea");
    await page.locator("main").getByRole("searchbox").fill("prueba e2e");
    await expect(page.getByText("1 productos disponibles")).toBeVisible();
  });

  test("editar el nombre de un nivel cambia la página Mi nivel", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/niveles");
    await page.locator("input.font-bold").first().fill("Básico");
    await page.getByRole("button", { name: "Guardar niveles" }).click();
    await page.goto("/mi-nivel");
    await expect(page.getByRole("heading", { name: "Básico" })).toBeVisible();
  });

  test("configuración: correo, WhatsApp y redes se muestran en el sitio", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await page.getByLabel(/Correo de soporte/).fill("ayuda@bancosolidario.test");
    await page.getByLabel(/WhatsApp de soporte/).fill("+593 98 765 4321");
    await page.getByLabel("Facebook").fill("https://facebook.com/bancosolidario.test");
    await page.getByLabel("YouTube").fill("https://youtube.com/@bancosolidario");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.goto("/");
    await expect(page.locator("footer")).toContainText("ayuda@bancosolidario.test");
    await expect(page.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", "https://facebook.com/bancosolidario.test");
    await expect(page.getByRole("link", { name: "YouTube" })).toHaveAttribute("href", "https://youtube.com/@bancosolidario");
    await expect(page.getByRole("link", { name: "Instagram" })).toHaveCount(0); // sin URL no se muestra
    await expect(page.getByRole("link", { name: "Escríbenos por WhatsApp" })).toHaveAttribute("href", "https://wa.me/593987654321");
  });

  test("configuración: ciudades y texto de agencias del pie son editables", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/configuracion");
    await page.getByLabel(/Ciudades con agencia/).fill("Loja · Ambato");
    await page.getByLabel("Texto del enlace a las agencias").fill("Visita una oficina");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.goto("/");
    const pie = page.locator("footer");
    await expect(pie).toContainText("Loja · Ambato");
    await expect(pie.getByRole("link", { name: "Visita una oficina" })).toBeVisible();
    await expect(pie.locator("app-icon[ng-reflect-name=Phone], svg").first()).toBeVisible();
  });

  test("pausar un banner lo quita del slider de la portada", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Siguiente", exact: true })).toBeVisible();
    await entrarAdmin(page);
    await page.goto("/admin/contenido");
    await page.locator("a-panel").filter({ hasText: "Home" }).first().getByRole("switch").click();
    await page.goto("/");
    await esperarCarga(page);
    await expect(page.getByRole("button", { name: "Siguiente", exact: true })).toHaveCount(0);
  });

  test("destinos: desactivar uno lo quita de Vuelos", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/destinos");
    await page.locator("article").first().getByRole("switch").click();
    await page.goto("/vuelos");
    await expect(page.getByRole("heading", { name: "Destinos recomendados" })).toBeVisible();
    await expect(page.locator("section article")).toHaveCount(3);
  });
});

test.describe("Operación", () => {
  test("un canje del sitio llega a Pedidos y se puede avanzar de estado", async ({ page }) => {
    await comprarDigital(page);
    await entrarAdmin(page);
    await page.goto("/admin/pedidos");
    const fila = page.locator("tbody tr").first();
    await expect(fila).toContainText("Confirmado");
    await fila.getByRole("button", { name: "Ver detalle" }).click();
    await page.getByRole("button", { name: "Marcar como Digital enviado" }).click();
    await page.locator("aside").last().getByRole("button", { name: "Cerrar" }).click();
    await expect(page.locator("tbody tr").first()).toContainText("Digital enviado");
  });

  test("cancelar un pedido físico exige confirmación", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/pedidos");
    await page.locator("tbody tr").first().getByRole("button", { name: "Ver detalle" }).click();
    await page.getByRole("button", { name: "Cancelar pedido" }).click();
    await page.getByLabel("Motivo").fill("Sin stock");
    await page.getByRole("button", { name: "Sí, cancelar" }).click();
    await expect(page.getByText("Cancelado").first()).toBeVisible();
  });

  test("participantes: buscar, ajustar puntos y bloquear", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("Ana Torres");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("link", { name: "Ver ficha" }).click();
    await expect(page).toHaveURL(/\/admin\/participantes\/p1$/);
    await page.getByRole("tab", { name: /^Ajustes/ }).click();
    await page.getByLabel("Puntos (+/−)").fill("1000");
    await page.getByLabel("Motivo").fill("Prueba E2E");
    await page.getByRole("button", { name: "Aplicar ajuste" }).click();
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await expect(page.getByText("Prueba E2E").first()).toBeVisible();
    await page.getByRole("tab", { name: "Resumen" }).click();
    await page.getByRole("button", { name: "Bloquear cuenta" }).click();
    await page.getByRole("button", { name: "Bloquear", exact: true }).click();
    await expect(page.getByText("Bloqueado").first()).toBeVisible();
  });

  test("participantes: carga masiva valida filas", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.getByRole("button", { name: "Carga masiva" }).click();
    const csv = [
      "documento,nombre,correo,puntos",
      "1718293045,Rosa Benítez,rosa.benitez@correo.com,1500",
      "0923456781,Pedro Guamán,pedro.guaman@correo.com,800",
      "17182,Mónica Vélez,monica.velez@correo.com,1200", // documento corto
      "1104567893,Iván Cárdenas,ivan.cardenas,300", // correo inválido
      "1709876543,Sofía Herrera,sofia.herrera@correo.com,abc", // puntos no numéricos
      "1311111111,Luis Mora,luis.mora@correo.com,500",
    ].join("\n");
    await page.getByRole("dialog").locator('input[type="file"]').setInputFiles({ name: "participantes.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
    await expect(page.getByText(/3 con errores/)).toBeVisible();
    await page.getByRole("button", { name: /Importar 3 participantes/ }).click();
    await expect(page.getByText("Carga completada")).toBeVisible();
    await page.getByRole("button", { name: "Cerrar", exact: true }).last().click();
    await expect(page.getByText("18 participantes registrados")).toBeVisible();
  });

  test("atención: responder cambia el estado del mensaje", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/atencion");
    const fila = page.locator("tbody tr", { hasText: "Pedido no llega" });
    await expect(fila).toContainText("Nuevo");
    await fila.getByRole("button", { name: "Ver detalle" }).click();
    await page.getByLabel("Respuesta", { exact: true }).fill("Estamos revisando su caso.");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.getByText("Respuesta enviada por correo")).toBeVisible();
    await expect(fila).toContainText("Respondido");
  });

  test("cotizaciones: tomar, cotizar y cerrar", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/cotizaciones");
    await page.getByRole("button", { name: "Gestionar" }).nth(1).click(); // COT-100455 (En revisión)
    await page.getByPlaceholder("Ej. 850.00").fill("850");
    await page.locator('input[type="file"]').setInputFiles({ name: "cotizacion.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await page.getByRole("button", { name: "Enviar cotización" }).click();
    await expect(page.getByText(/→ Cotizada/)).toBeVisible();
  });

  test("usuarios: invitar valida duplicados y registra el cambio", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/usuarios");
    await page.getByRole("button", { name: "Invitar usuario" }).click();
    const m = page.getByRole("dialog");
    await m.getByLabel("Nombre completo").fill("Nuevo Usuario");
    await m.getByLabel("Correo electrónico").fill("admin@bancosolidario.com");
    await expect(m.getByText("Ya existe un usuario con este correo.")).toBeVisible();
    await expect(m.getByRole("button", { name: "Enviar invitación" })).toBeDisabled();
    await m.getByLabel("Correo electrónico").fill("nuevo@motiva.com");
    await m.getByRole("button", { name: "Enviar invitación" }).click();
    await expect(page.getByText("Invitación enviada a nuevo@motiva.com")).toBeVisible();
    await page.goto("/admin/auditoria"); // el cambio queda en el Registro de cambios
    await expect(page.getByText("Invitó a Nuevo Usuario como Operaciones")).toBeVisible();
  });
});

test.describe("Catálogos y contenido", () => {
  test("beneficios: carga de códigos desde un archivo CSV", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/beneficios");
    await page.getByRole("button", { name: "Cupones y códigos" }).click();
    await page.getByRole("button", { name: "Cargar códigos" }).click();
    const csv = ["codigo", ...Array.from({ length: 250 }, (_, i) => `BSP-${(48213 + i * 7).toString(36).toUpperCase()}`)].join("\n");
    await page.getByRole("dialog").locator('input[type="file"]').setInputFiles({ name: "codigos.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.getByRole("button", { name: /Cargar 250 códigos/ }).click();
    await expect(page.locator("tbody tr")).toHaveCount(4);
  });

  test("ciudades: autocompletado con la lista oficial; solo se ofrecen las que aún no están agregadas", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/destinos");
    await page.getByRole("button", { name: "Ciudades del buscador" }).click();
    await page.getByRole("button", { name: "Nueva ciudad" }).click();
    await expect(page.getByLabel("IATA", { exact: true })).toHaveCount(0); // sin campos de texto para código, ciudad ni país
    const combo = page.getByRole("combobox", { name: "Ciudad o aeropuerto" });
    const lista = page.getByRole("listbox", { name: "Ciudades disponibles" });
    await combo.focus();
    await expect(lista.getByRole("option").first()).toBeVisible(); // sugerencias al enfocar
    await expect(lista.getByRole("option")).toHaveCount(8);
    await combo.fill("UIO"); // Quito (UIO) ya está agregada: no se ofrece
    await expect(lista).toContainText("No hay ciudades disponibles que coincidan");
    await combo.fill("madrid"); // MAD también está en la base
    await expect(lista.getByRole("option")).toHaveCount(0);
    await combo.fill("Bogota"); // BOG está agregada
    await expect(lista.getByRole("option")).toHaveCount(0);
    await combo.fill("Londres"); // sin tildes ni mayúsculas; Heathrow y Gatwick
    await expect(lista.getByRole("option")).toHaveCount(2);
    await expect(lista.locator("mark").first()).toContainText(/londres/i); // coincidencia resaltada
  });

  test("ciudades: el autocompletado se maneja con el teclado", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/destinos");
    await page.getByRole("button", { name: "Ciudades del buscador" }).click();
    await page.getByRole("button", { name: "Nueva ciudad" }).click();
    const combo = page.getByRole("combobox", { name: "Ciudad o aeropuerto" });
    await combo.fill("sant");
    const lista = page.getByRole("listbox", { name: "Ciudades disponibles" });
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await expect(lista.getByRole("option", { selected: true })).toHaveCount(1);
    const primero = await lista.getByRole("option").first().innerText();
    await combo.press("ArrowDown");
    await expect(lista.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
    await combo.press("ArrowUp");
    await combo.press("Escape"); // cierra la lista, no el modal
    await expect(lista).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Nueva ciudad" })).toBeVisible();
    await combo.press("ArrowDown"); // vuelve a abrir
    await combo.press("Enter");
    const codigo = primero.split("\n")[0]!.trim();
    await expect(page.getByRole("dialog")).toContainText(codigo);
    await expect(page.getByRole("button", { name: "Cambiar", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true })).toBeEnabled();
  });

  test("cards de ciudades: orden alfabético por defecto, orden por columna y acciones con ícono y nombre accesible", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/destinos");
    await page.getByRole("button", { name: "Ciudades del buscador" }).click();
    const filas = page.locator("tbody tr");
    await filas.first().waitFor();
    await expect(filas.first()).toContainText("Baltra"); // ordenadas por ciudad
    await expect(filas.nth(1)).toContainText("Bogotá");
    await expect(page.getByRole("button", { name: "Editar Bogotá" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Eliminar Bogotá" })).toBeVisible();
    const rotulo = await filas.first().locator("td").nth(3).evaluate((td) => getComputedStyle(td, "::before").content);
    expect(rotulo).toContain("En buscador"); // el interruptor lleva su nombre
    await page.locator("th", { hasText: "País" }).getByRole("button").click();
    await expect(page.locator("th", { hasText: "País" })).toHaveAttribute("aria-sort", "ascending");
  });
  test("ciudades: elegir un aeropuerto la agrega con su código, ciudad y país, y sale en el buscador de vuelos", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/destinos");
    await page.getByRole("button", { name: "Ciudades del buscador" }).click();
    await page.getByRole("button", { name: "Nueva ciudad" }).click();
    await page.getByRole("combobox", { name: "Ciudad o aeropuerto" }).fill("Lisboa");
    await page.getByRole("option", { name: /LIS/ }).getByRole("button").click();
    const modal = page.getByRole("dialog");
    await expect(modal).toContainText("LIS");
    await expect(modal).toContainText("Lisboa");
    await expect(modal).toContainText("Portugal");
    await modal.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Ciudad guardada")).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bancosolidario_mockdb_v11") ?? "{}").vuelos?.ciudades?.some((c: any) => c.codigo === "LIS" && c.ciudad === "Lisboa" && c.pais === "Portugal"))).toBe(true);
    await page.goto("/vuelos");
    await page.getByRole("combobox", { name: "Ciudad de destino" }).click();
    await page.getByRole("combobox", { name: "Ciudad de destino" }).fill("Lisboa");
    await expect(page.getByRole("option", { name: /Lisboa/ })).toBeVisible();
  });

  test("formulario de datos: agregar y eliminar un campo", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/formulario");
    await expect(page.getByText("9 campos configurados")).toBeVisible();
    await page.getByRole("button", { name: /Área de texto/ }).click();
    await expect(page.getByText("10 campos configurados")).toBeVisible();
    await page.getByRole("button", { name: "Eliminar campo" }).click();
    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByText("9 campos configurados")).toBeVisible();
  });

  test("dashboard: el filtro de periodo cambia las cifras", async ({ page }) => {
    await entrarAdmin(page);
    const antes = await page.locator("a-stat").first().innerText();
    await page.getByRole("button", { name: "7 días" }).click(); // el Dashboard abre en 6 meses
    await expect.poll(() => page.locator("a-stat").first().innerText()).not.toBe(antes);
  });

  test("los datos persisten al recargar y se pueden restablecer", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/niveles");
    await page.locator("input.font-bold").first().fill("Persistente");
    await page.getByRole("button", { name: "Guardar niveles" }).click();
    await page.goto("/mi-nivel");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Persistente" })).toBeVisible();
    await page.goto("/admin/configuracion");
    await page.getByRole("button", { name: "Restablecer datos iniciales" }).click();
    await page.goto("/mi-nivel");
    await expect(page.getByRole("heading", { name: "Clásico" })).toBeVisible();
  });
});
