import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin, esperarCarga, publicarLegal } from "./helpers";

/** Todo lo que se configura en el panel debe tener efecto en el sitio del participante. */

async function abrirContenido(page: Page, tab: string) {
  await page.goto("/admin/contenido");
  await page.getByRole("button", { name: tab, exact: true }).click();
}

test.describe("Reglas de puntos", () => {
  test("precio por punto, mínimos y máximos gobiernan la compra de puntos", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reglas");
    await page.getByLabel("Precio por punto (US$)").fill("0.05");
    await page.getByLabel("Mínimo por compra").fill("1000");
    await page.getByLabel("Máximo por compra").fill("6000");
    await page.getByRole("button", { name: "Guardar reglas" }).click();
    await page.goto("/mis-puntos/compra");
    await expect(page.getByText(/Cada punto cuesta \$0,05/)).toBeVisible();
    await page.getByRole("button", { name: /^5\.000/ }).click(); // 5.000 × 0,05
    await expect(page.getByText("$250,00").first()).toBeVisible();
    await page.locator('input[type="number"]').fill("7000");
    await expect(page.getByRole("alert")).toContainText("entre 1.000 y 6.000");
    await expect(page.getByRole("button", { name: "Comprar puntos" })).toBeDisabled();
  });

  test("desactivar la compra de puntos la deja no disponible", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reglas");
    await page.getByRole("switch", { name: "Compra de puntos activa" }).click();
    await page.getByRole("button", { name: "Guardar reglas" }).click();
    await page.goto("/mis-puntos/compra");
    await expect(page.getByText("La compra de puntos no está disponible por ahora")).toBeVisible();
  });

  test("la equivalencia puntos↔dólares cambia el pago mixto y 'solo dinero' se puede ocultar", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/reglas");
    await page.getByLabel(/Equivalencia: puntos por cada US\$ 1/).fill("100");
    await page.getByRole("switch", { name: "Solo dinero" }).click();
    await page.getByRole("button", { name: "Guardar reglas" }).click();
    await page.goto("/canjea/p4"); // Parlante: 4.130 pts
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("dialog").getByRole("link", { name: "Ver carrito" }).click();
    await page.getByRole("button", { name: "Pagar con puntos + tarjeta" }).click();
    await expect(page.getByText("Equivalencia: 100 puntos = $1.00")).toBeVisible();
    await expect(page.getByRole("button", { name: /Pagar solo con dinero/ })).toHaveCount(0);
  });
});

test.describe("Portada, textos y menú", () => {
  test("las secciones del Home se activan, desactivan y ordenan desde el admin", async ({ page }) => {
    await entrarAdmin(page);
    await abrirContenido(page, "Secciones del Home");
    await page.getByRole("switch", { name: "Visible" }).nth(2).click(); // Categorías de productos
    await page.getByRole("switch", { name: "Visible" }).nth(1).click(); // Productos destacados (off)
    await page.goto("/");
    await expect(page.getByText("Explora por")).toBeVisible();
    await expect(page.getByText("Increíbles productos solo")).toHaveCount(0);
    await page.getByRole("link", { name: "Hogar" }).first().click();
    await expect(page).toHaveURL(/canjea\?categoria=hogar/);
    await expect(page.getByText("4 productos disponibles")).toBeVisible();
  });

  test("las pestañas 'Destacados' salen del interruptor de cada producto", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await page.locator("tbody tr").first().getByRole("button", { name: "Editar" }).click();
    await page.locator("aside").last().getByRole("switch", { name: "Destacado" }).click();
    await page.locator("aside").last().getByRole("button", { name: "Guardar producto" }).click();
    await page.goto("/");
    await esperarCarga(page);
    await expect(page.locator("app-product-section app-product-card").filter({ hasText: "Laptop Pavilion" })).toHaveCount(0);
  });

  test("FAQ, términos y privacidad se editan en el admin y se ven en el sitio", async ({ page }) => {
    await entrarAdmin(page);
    await abrirContenido(page, "FAQ y legales");
    await page.getByLabel("Pregunta").first().fill("¿Cuál es el horario de atención?");
    await page.getByLabel("Respuesta").first().fill("De lunes a viernes de 9h a 18h.");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await publicarLegal(page, "Términos y condiciones", { texto: "## 1. Condiciones generales\n\nTexto **importante** con [enlace](https://example.com).\n\n- Primer punto\n- Segundo punto" });
    await page.goto("/preguntas-frecuentes");
    await expect(page.getByRole("button", { name: "¿Cuál es el horario de atención?" })).toBeVisible();
    await expect(page.getByText("De lunes a viernes de 9h a 18h.")).toBeVisible();
    await page.goto("/terminos");
    await expect(page.getByRole("heading", { name: "1. Condiciones generales" })).toBeVisible();
    await expect(page.locator("article strong", { hasText: "importante" })).toBeVisible();
    await expect(page.locator("article li")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "enlace" })).toHaveAttribute("href", "https://example.com");
  });

  test("el menú: deshabilitar Contáctanos lo oculta y bloquea la ruta", async ({ page }) => {
    await entrarAdmin(page);
    await abrirContenido(page, "Menú del sitio");
    await page.getByRole("switch", { name: "Mostrar Contáctanos", exact: true }).click();
    await page.getByRole("button", { name: "Guardar menú" }).click();
    await page.goto("/");
    await expect(page.locator("header nav").getByRole("link", { name: "Contáctanos" })).toHaveCount(0);
    await page.goto("/contacto");
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test("renombrar un ítem del menú y ordenarlo", async ({ page }) => {
    await entrarAdmin(page);
    await abrirContenido(page, "Menú del sitio");
    await page.getByLabel("Nombre del ítem").nth(1).fill("Catálogo de premios");
    await page.getByLabel("Bajar").first().click(); // Inicio pasa a segundo lugar
    await page.getByRole("button", { name: "Guardar menú" }).click();
    await page.goto("/");
    const links = page.locator("header nav > div > a");
    await expect(links.first()).toHaveText(/Catálogo de premios/);
  });

  test("el formulario de datos del admin aparece en Mi perfil", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/formulario");
    await expect(page.getByText("9 campos configurados")).toBeVisible(); // espera a que carguen los campos
    await page.getByRole("button", { name: /Área de texto/ }).click();
    await page.getByLabel("Etiqueta").fill("Cuéntanos tus intereses");
    await page.goto("/perfil");
    // una sola tarjeta "Mis datos": los campos del panel se suman a los del sistema, sin un bloque aparte
    await expect(page.getByText("Actualiza tu información")).toHaveCount(0);
    const datos = page.locator("section", { has: page.getByRole("heading", { name: "Mis datos" }) });
    await expect(datos.getByLabel("Nombres *", { exact: true })).toBeVisible();
    await expect(datos.getByLabel("N.º de celular")).toBeVisible();
    await expect(datos.getByLabel("Apellido paterno *")).toBeVisible();
    await expect(datos.getByLabel("Cuéntanos tus intereses")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mis datos" })).toHaveCount(1);
  });
});

test.describe("Sin control de stock", () => {
  test("el editor de productos ya no tiene el campo Stock ni la tarjeta lo muestra", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/productos");
    await expect(page.locator("tbody tr").first()).toContainText(/Digital|Físico/);
    await expect(page.locator("tbody tr").first()).not.toContainText(/en stock/i);
    await page.locator("tbody tr").first().getByRole("button", { name: "Editar" }).click();
    await expect(page.locator("aside").last().getByLabel("Puntos")).toBeVisible();
    await expect(page.locator("aside").last().getByLabel("Stock")).toHaveCount(0);
  });

  test("en el sitio no hay 'Agotado' ni 'Últimas unidades' y la cantidad no tiene tope", async ({ page }) => {
    await page.goto("/canjea");
    await expect(page.locator("app-product-card").first()).toBeVisible();
    await expect(page.getByText(/Agotado|Últimas/)).toHaveCount(0);
    await page.goto("/canjea/p14"); // producto digital económico: alcanza el saldo para varias unidades
    await expect(page.getByText(/Producto agotado|Últimas \d+ unidades/)).toHaveCount(0);
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Agregar uno" }).click();
    await expect(page.getByRole("button", { name: "Agregar uno" })).toBeEnabled();
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("dialog").getByRole("link", { name: "Ver carrito" }).click();
    await page.getByRole("button", { name: "Finalizar compra" }).click();
    await expect(page).toHaveURL(/gracias$/); // 5 unidades: el canje no valida inventario
  });

  test("el Dashboard no tiene el bloque de poco stock y sí uno de productos más vistos", async ({ page }) => {
    await entrarAdmin(page);
    await expect(page.getByText("Poco stock")).toHaveCount(0);
    await expect(page.getByText("Productos con poco stock")).toHaveCount(0);
    await expect(page.getByText("Más vistos", { exact: true })).toBeVisible();
  });
});
test.describe("Participantes", () => {
  async function ficha(page: Page) {
    await entrarAdmin(page);
    await page.goto("/admin/participantes");
    await page.getByPlaceholder("Buscar por nombre o cédula").fill("Ana Torres");
    await expect(page.locator("tbody tr")).toHaveCount(1); // la búsqueda se resuelve en la API
    await page.getByRole("link", { name: "Ver ficha" }).click();
    await expect(page).toHaveURL(/\/admin\/participantes\/p1/);
  }

  test("un ajuste de puntos cambia el saldo real y queda en el historial", async ({ page }) => {
    await ficha(page);
    await expect(page.locator("header").getByText("260.000").first()).toBeVisible();
    await page.getByRole("tab", { name: /^Ajustes/ }).click();
    await page.getByLabel("Puntos (+/−)").fill("1000");
    await page.getByLabel("Motivo").fill("Compensación E2E");
    await page.getByRole("button", { name: "Aplicar ajuste" }).click();
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await page.goto("/mis-puntos/historial");
    await expect(page.locator("header").getByText(/Tienes 261\.000/).first()).toBeVisible();
    await expect(page.locator("tbody").getByText("Ajuste manual: Compensación E2E")).toBeVisible();
  });

  test("bloquear la cuenta impide ingresar y canjear", async ({ page }) => {
    await page.goto("/canjea");
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click(); // carrito listo antes del bloqueo
    await ficha(page);
    await page.getByRole("button", { name: "Bloquear cuenta" }).click();
    await page.getByRole("button", { name: "Bloquear", exact: true }).click();
    await page.goto("/carrito");
    await page.getByRole("button", { name: "Finalizar compra" }).click();
    await expect(page.getByRole("alert")).toContainText("Tu cuenta está bloqueada");
    await page.goto("/login");
    await page.getByLabel("Número de documento").fill("1712345678");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Tu cuenta está bloqueada")).toBeVisible();
  });
});

test.describe("Beneficios: cupones", () => {
  test("los códigos cargados se asignan a los cupones y se agotan", async ({ page }) => {
    await entrarAdmin(page);
    await page.goto("/admin/beneficios");
    await page.getByRole("button", { name: "Cupones y códigos" }).click();
    await page.getByLabel("Dura (horas)").fill("5"); // regla general del cupón
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.getByRole("button", { name: "Cargar códigos" }).click();
    const csv = ["codigo", ...Array.from({ length: 250 }, (_, i) => `BSP-${(48213 + i * 7).toString(36).toUpperCase()}`)].join("\n");
    await page.getByRole("dialog").locator('input[type="file"]').setInputFiles({ name: "codigos.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.getByRole("button", { name: /Cargar 250 códigos/ }).click();

    await page.goto("/beneficios/b1"); // el lote se vinculó al primer beneficio (Pollo Gus)
    await page.getByRole("button", { name: "Generar cupón" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
    await expect(page.getByAltText(/Código QR BSP-/)).toBeVisible();
    await expect(page.getByText("04", { exact: true }).first()).toBeVisible(); // 5 h de vigencia → quedan 4:59:xx
  });

  test("un beneficio con lote agotado informa al participante", async ({ page }) => {
    await page.goto("/beneficios/b8"); // Supermaxi: lote de 100 con 88 usados → quedan 12
    await expect(page.getByRole("button", { name: "Generar cupón" })).toBeVisible();
    await entrarAdmin(page);
    await page.goto("/admin/beneficios");
    await page.getByRole("button", { name: "Cupones y códigos" }).click();
    await page.getByRole("button", { name: "Desactivar" }).nth(2).click(); // pide confirmar
    await page.getByRole("dialog").getByRole("button", { name: "Desactivar" }).click(); // quita el lote de Supermaxi
    await expect(page.getByText("Lote desactivado")).toBeVisible();
    await page.goto("/beneficios/b8");
    await page.getByRole("button", { name: "Generar cupón" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
    await expect(page.getByAltText(/Código QR MOT-/)).toBeVisible(); // sin lote vuelve al código genérico
  });
});