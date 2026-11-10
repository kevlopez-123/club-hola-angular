import { expect, test, type Page } from "@playwright/test";
import { esperarCarga } from "./helpers";

const saldo = (page: Page) => page.locator("header").getByText(/Tienes/).first();

async function agregarPrimerProducto(page: Page) {
  await page.goto("/canjea");
  await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("AGREGADO AL CARRITO");
  await page.getByRole("dialog").getByRole("link", { name: "Ver carrito" }).click();
  await expect(page).toHaveURL(/carrito$/);
}

test.describe("Acceso", () => {
  test("login con documento y código de 6 dígitos", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Número de documento").fill("1712345678");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText(/Enviamos un código de 6 dígitos/)).toBeVisible();
    for (let i = 1; i <= 6; i++) await page.getByLabel(`Dígito ${i}`).fill(String(i));
    await page.getByRole("button", { name: "Validar e ingresar" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("documento inválido y código incompleto muestran errores", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Número de documento").fill("123");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Ingresa un número de documento válido.")).toBeVisible();
    await page.getByLabel("Número de documento").fill("1712345678");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Validar e ingresar" }).click();
    await expect(page.getByText("Ingresa los 6 dígitos del código.")).toBeVisible();
  });
});

test.describe("Catálogo y búsqueda", () => {
  test("filtra por categoría y por texto", async ({ page }) => {
    await page.goto("/canjea");
    await expect(page.getByText("24 productos disponibles")).toBeVisible();
    await page.getByRole("button", { name: "Tecnología" }).click();
    await expect(page.getByText("6 productos disponibles")).toBeVisible();
    await page.getByRole("button", { name: "Tecnología" }).click(); // desmarca
    await page.locator("main").getByRole("searchbox").fill("oster");
    await expect(page.getByText("3 productos disponibles")).toBeVisible();
  });

  test("ordena por puntos y carga más resultados", async ({ page }) => {
    await page.goto("/canjea");
    await expect(page.locator("app-product-card")).toHaveCount(12);
    await page.getByRole("button", { name: "Cargar más" }).click();
    await expect(page.locator("app-product-card")).toHaveCount(20);
    await page.getByLabel("Ordenar por").selectOption("puntos-asc");
    await expect(page.locator("app-product-card").first()).toContainText("Cinemark");
  });

  test("el buscador de la cabecera sugiere y lleva a resultados", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("searchbox", { name: "Buscar productos o beneficios" }).first();
    await box.fill("sony");
    await expect(page.getByText("Ver todos los resultados")).toBeVisible();
    await box.press("Enter");
    await expect(page).toHaveURL(/buscar\?q=sony/);
    await expect(page.getByRole("heading", { name: /Resultados para/ })).toBeVisible();
    await expect(page.locator("app-product-card").first()).toBeVisible();
  });

  test("favoritos: marcar y verlos en /favoritos", async ({ page }) => {
    await page.goto("/canjea");
    await page.getByRole("button", { name: "Agregar a favoritos" }).first().click();
    await page.goto("/favoritos");
    await expect(page.getByText("1 elementos guardados.")).toBeVisible();
    await expect(page.locator("app-product-card")).toHaveCount(1);
  });
});

test.describe("Carrito y checkout", () => {
  test("canjear con puntos descuenta el saldo y queda en el historial", async ({ page }) => {
    await expect(async () => {
      await page.goto("/");
      await expect(saldo(page)).toContainText("260.000");
    }).toPass();
    await agregarPrimerProducto(page);
    await expect(page.getByRole("heading", { name: "Tu carrito" })).toBeVisible();
    await page.getByRole("button", { name: "Finalizar compra" }).click();
    await expect(page).toHaveURL(/gracias$/);
    await expect(page.getByText(/Tu orden BNB-/)).toBeVisible();
    await expect(page.getByText("214.570").first()).toBeVisible();
    await page.goto("/mis-compras");
    await expect(page.locator("article")).toHaveCount(5);
    await expect(page.locator("article").first()).toContainText("Laptop Pavilion");
  });

  test("cantidades y eliminar productos", async ({ page }) => {
    await agregarPrimerProducto(page);
    await page.getByRole("button", { name: "Agregar uno" }).click();
    await expect(page.getByText("90.860 puntos").first()).toBeVisible();
    await page.getByRole("button", { name: "Quitar uno" }).click();
    await page.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
  });

  test("el carrito se conserva al recargar", async ({ page }) => {
    await agregarPrimerProducto(page);
    await page.reload();
    await expect(page.getByText("Laptop Pavilion 15 Core i5").first()).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: "Carrito" })).toContainText("1");
  });

  test("sin puntos suficientes se bloquea el pago con puntos", async ({ page }) => {
    await page.goto("/canjea/p19");
    for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Agregar uno" }).click();
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("dialog").getByRole("link", { name: "Ver carrito" }).click();
    await expect(page.getByText(/No te alcanzan los puntos/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalizar compra" })).toBeDisabled();
    await page.getByRole("button", { name: /Pagar solo con dinero/ }).click();
    await expect(page.getByRole("button", { name: "Finalizar compra" })).toBeEnabled();
  });

  test("pago mixto pasa por la pasarela simulada", async ({ page }) => {
    await agregarPrimerProducto(page);
    await page.getByRole("button", { name: "Pagar con puntos + tarjeta" }).click();
    await page.locator('input[type="number"]').fill("10000");
    await expect(page.getByText(/A pagar con tarjeta/)).toBeVisible();
    await page.getByRole("button", { name: "Finalizar compra" }).click();
    await expect(page.getByRole("dialog")).toContainText("Pasarela de pago");
    await page.getByRole("button", { name: "Pagar ahora" }).click();
    await expect(page).toHaveURL(/gracias$/, { timeout: 10_000 });
    await expect(page.getByText("10.000").first()).toBeVisible();
  });

  test("producto digital pide correo; físico pide dirección y se puede agregar una nueva", async ({ page }) => {
    await page.goto("/canjea/p14");
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("dialog").getByRole("link", { name: "Ver carrito" }).click();
    await expect(page.getByRole("heading", { name: "Correo de entrega" })).toBeVisible();
    await page.getByRole("button", { name: "Agregar otro correo" }).click();
    await page.getByLabel("Correo electrónico").fill("nuevo@correo.com");
    await page.getByRole("button", { name: "Guardar correo" }).click();
    await expect(page.getByText("nuevo@correo.com")).toBeVisible();

    await agregarPrimerProducto(page);
    await expect(page.getByRole("heading", { name: "Dirección de envío" })).toBeVisible();
    await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
    await page.getByLabel("Alias (Casa, Oficina)").fill("Casa playa");
    await page.getByLabel("Dirección", { exact: true }).fill("Av. Malecón 123");
    await page.getByRole("button", { name: "Guardar dirección" }).click();
    await expect(page.getByText("Revisa los campos marcados antes de guardar la dirección.")).toBeVisible();
    await expect(page.getByText("Elige la provincia de entrega.")).toBeVisible();
    await page.getByLabel("¿Quién recibe?").fill("Ana");
    await page.getByLabel("Teléfono de contacto").fill("996543210");
    await page.getByLabel("Provincia").selectOption("Guayas");
    await page.getByLabel("Ciudad", { exact: true }).selectOption("Guayaquil");
    await page.getByRole("button", { name: "Guardar dirección" }).click();
    await expect(page.getByText(/Casa playa/)).toBeVisible();
  });
});

test.describe("Beneficios", () => {
  test("generar un cupón muestra el QR y la cuenta regresiva", async ({ page }) => {
    await page.goto("/beneficios/b1");
    await page.getByRole("button", { name: "Generar cupón" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
    await expect(page.getByAltText(/Código QR MOT-/)).toBeVisible();
    await expect(page.getByText("Hrs")).toBeVisible();
    await page.goto("/mis-beneficios");
    await expect(page.locator("article").first()).toContainText("Pollo Gus");
  });

  test("un beneficio de compra se agrega al carrito", async ({ page }) => {
    await page.goto("/beneficios/b6");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByRole("dialog")).toContainText("Decameron");
  });

  test("mis beneficios filtra por estado", async ({ page }) => {
    await page.goto("/mis-beneficios");
    await expect(page.locator("article")).toHaveCount(7);
    await page.getByRole("button", { name: "Activos" }).click();
    await expect(page.locator("article")).toHaveCount(3);
    await page.locator("main").getByRole("searchbox").fill("zzz");
    await expect(page.getByText("No hay beneficios con ese criterio.")).toBeVisible();
  });
});

test.describe("Puntos", () => {
  test("comprar puntos suma al saldo", async ({ page }) => {
    await page.goto("/mis-puntos/compra");
    await page.getByRole("button", { name: "Comprar puntos" }).click();
    await page.getByRole("button", { name: "Pagar ahora" }).click();
    await expect(page.getByText("¡Tus puntos ya están acreditados!")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("265.000 puntos").first()).toBeVisible();
  });

  test("historial filtra por tipo y descarga el estado de cuenta", async ({ page }) => {
    await page.goto("/mis-puntos/historial");
    await expect(page.locator("tbody tr")).toHaveCount(12);
    await page.getByLabel("Tipo de movimiento").selectOption("canje");
    await expect(page.locator("tbody tr")).toHaveCount(4);
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Estado de cuenta" }).click();
    expect((await descarga).suggestedFilename()).toMatch(/^estado-de-cuenta-puntos-.*\.pdf$/);
  });

  test("mi nivel muestra el nivel actual y abre el modal de reglas", async ({ page }) => {
    await page.goto("/mi-nivel");
    await expect(page.getByText("Tu nivel actual").first()).toBeVisible();
    await page.getByRole("button", { name: "Cómo funcionan los niveles" }).click();
    await expect(page.getByRole("dialog")).toContainText("Diamante");
  });
});

test.describe("Vuelos", () => {
  test("cotizar un vuelo de punta a punta", async ({ page }) => {
    await page.goto("/vuelos");
    await page.getByLabel("Fecha de ida").fill("2027-03-10");
    await page.getByLabel("Fecha de regreso").fill("2027-03-20");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#nom-0").fill("Ana");
    await page.locator("#ape-0").fill("Torres");
    await page.locator("#ndoc-0").fill("1712345678");
    await page.locator("#nac-0").fill("1990-05-05");
    await page.getByRole("button", { name: "Cotizar" }).click();
    await page.getByLabel("Número de teléfono").fill("996543210");
    await page.getByRole("button", { name: "Solicitar cotización" }).click();
    await expect(page.getByText(/Tu solicitud COT-/)).toBeVisible();
    await page.getByRole("link", { name: "Ver mis cotizaciones" }).click();
    await expect(page).toHaveURL(/vuelos\/cotizaciones$/);
    await expect(page.locator("article")).toHaveCount(5);
  });

  test("origen y destino no pueden ser iguales", async ({ page }) => {
    await page.goto("/vuelos");
    const destino = page.getByRole("combobox", { name: "Ciudad de destino" });
    await destino.click();
    await expect(page.getByRole("option", { name: /Quito/ })).toHaveCount(0); // excluye el origen
  });

  test("cotizaciones: filtrar por texto", async ({ page }) => {
    await page.goto("/vuelos/cotizaciones");
    await expect(page.locator("article")).toHaveCount(4);
    await page.locator("main").getByRole("searchbox").fill("Madrid");
    await expect(page.locator("article")).toHaveCount(1);
  });
});

test.describe("Cuenta y contacto", () => {
  test("perfil: agregar, editar y eliminar dirección", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByRole("tab", { name: "Direcciones de envío" }).click();
    await expect(page.locator("ul li").filter({ hasText: "Recibe:" })).toHaveCount(2);
    await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
    for (const [l, v] of [["Alias (Casa, Oficina)", "Oficina 2"], ["¿Quién recibe?", "Ana"], ["Teléfono de contacto", "996543210"], ["Dirección", "Calle 1 y Av. 2"]]) {
      await page.getByRole("dialog").getByLabel(l!, { exact: true }).fill(v!);
    }
    await page.getByRole("dialog").getByLabel("Provincia").selectOption("Pichincha");
    await page.getByRole("dialog").getByLabel("Ciudad", { exact: true }).selectOption("Quito");
    await page.getByRole("dialog").getByRole("button", { name: "Guardar dirección" }).click();
    await expect(page.getByText("Oficina 2")).toBeVisible();
    await page.getByRole("button", { name: "Editar dirección Oficina 2" }).click();
    await page.getByRole("dialog").getByLabel("Alias (Casa, Oficina)").fill("Oficina 3");
    await page.getByRole("dialog").getByRole("button", { name: "Guardar dirección" }).click();
    await expect(page.getByText("Oficina 3")).toBeVisible();
    await page.getByRole("button", { name: "Eliminar dirección Oficina 3" }).click();
    await page.getByRole("button", { name: "Sí, eliminar" }).click();
    await expect(page.getByText("Oficina 3")).toHaveCount(0);
  });

  test("perfil: guardar datos personales", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByLabel("Nombres").fill("Ana María");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Revisa los" })).toBeVisible();
    await page.getByLabel("Apellido paterno").fill("Torres");
    await page.getByLabel("Correo electrónico *").fill("ana@correo.com");
    await page.getByLabel("N.º de celular").fill("996543210");
    await page.getByLabel("Género").selectOption("Femenino");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Tus cambios se guardaron correctamente.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Nombres")).toHaveValue("Ana María");
  });

  test("contacto: el botón se habilita con datos válidos y confirma el envío", async ({ page }) => {
    await page.goto("/contacto");
    const enviar = page.getByRole("button", { name: "Enviar" });
    await expect(enviar).toBeDisabled();
    await page.getByLabel("Teléfono").fill("996543210");
    await page.getByLabel("Consulta").fill("Quisiera saber el estado de mi canje.");
    await enviar.click();
    await expect(page.getByRole("dialog")).toContainText("Consulta enviada");
  });

  test("preguntas frecuentes: acordeón", async ({ page }) => {
    await page.goto("/preguntas-frecuentes");
    await expect(page.getByText("Cada compra registrada con tu cédula")).toBeVisible();
    await page.getByRole("button", { name: "¿Los puntos caducan?" }).click();
    await expect(page.getByText(/vigencia de 12 meses calendario desde/)).toBeVisible();
    await expect(page.getByText("Cada compra registrada con tu cédula")).toHaveCount(0);
  });

  test("portada: slider avanza y las pestañas cambian los productos", async ({ page }) => {
    await page.goto("/");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Más vistos" }).click();
    await expect(page.locator("app-product-card").first()).toContainText("Xiaomi");
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    await page.getByRole("button", { name: "Ir al banner 3" }).click();
  });
});
